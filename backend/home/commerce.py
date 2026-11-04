"""Authoritative checkout and order transitions shared by every API entry point."""
import hashlib
import json
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import F
from rest_framework.exceptions import ValidationError

from .models import DeliveryZone, Order, OrderItem, Product, User, Notification, SettlementLine, Payout, Vendor, Delivery


def delivery_quote(address):
    zone = DeliveryZone.objects.filter(
        province__iexact=address.get('province', '').strip(),
        city__iexact=address.get('city', '').strip(), is_active=True,
    ).first()
    if zone:
        return zone.fee
    if settings.DEBUG and not DeliveryZone.objects.exists():
        return Decimal('200.00')
    raise ValidationError({'delivery_address': 'Delivery is not available for this city yet.'})


def priced_items(items, lock=False):
    quantities = {}
    for item in items:
        key = str(item['product_id'])
        quantities[key] = quantities.get(key, 0) + item['quantity']
    if not quantities or len(quantities) > 100 or any(q > 100 for q in quantities.values()):
        raise ValidationError({'items': 'Use 1–100 products and at most 100 units per product.'})
    products = Product.objects.filter(pk__in=quantities).order_by('pk')
    if lock:
        products = products.select_for_update()
    products = list(products)
    if len(products) != len(quantities):
        raise ValidationError({'items': 'One or more products no longer exist.'})
    lines = []
    for product in products:
        quantity = quantities[str(product.pk)]
        if (product.status != 'approved' or not product.is_active or
                product.vendor.status != 'approved' or not product.cod_available):
            raise ValidationError({'items': f'{product.name} is not available for cash on delivery.'})
        if product.price <= 0 or product.stock_quantity < quantity:
            raise ValidationError({'items': f'Insufficient stock for {product.name}.'})
        lines.append((product, quantity))
    return lines


@transaction.atomic
def place_order(user, data, idempotency_key=None):
    # Serializing checkouts per customer also serializes identical retry keys.
    User.objects.select_for_update().get(pk=user.pk)
    digest = hashlib.sha256(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()
    key = None
    if idempotency_key:
        if len(idempotency_key) > 128:
            raise ValidationError({'idempotency_key': 'Key is too long.'})
        key = hashlib.sha256(f'{user.pk}:{idempotency_key}'.encode()).hexdigest()
        existing = Order.objects.filter(checkout_key=key).first()
        if existing:
            if existing.checkout_hash != digest:
                raise ValidationError({'idempotency_key': 'This key was already used for a different order.'})
            return existing
    address = data['delivery_address']
    fee = delivery_quote(address)
    lines = priced_items(data['items'], lock=True)
    subtotal = sum((p.price * q for p, q in lines), Decimal('0.00'))
    if 'expected_total' in data and data['expected_total'] != subtotal + fee:
        raise ValidationError({'expected_total': 'Prices changed. Please review a new quote.'})
    order = Order.objects.create(
        customer=user, customer_name=data.get('customer_name') or user.full_name,
        customer_phone=user.phone, delivery_address=address['address'],
        city=address['city'], province=address['province'],
        delivery_notes=data.get('delivery_notes', ''), payment_method='COD',
        subtotal=subtotal, delivery_fee=fee, total_amount=subtotal + fee,
        checkout_key=key, checkout_hash=digest,
    )
    for product, quantity in lines:
        OrderItem.objects.create(order=order, product=product, vendor=product.vendor,
                                 quantity=quantity, price_at_order=product.price,
                                 product_name=product.name,
                                 commission_rate=product.vendor.commission_rate)
        Product.objects.filter(pk=product.pk).update(stock_quantity=F('stock_quantity') - quantity)
    for vendor_id in {p.vendor.user_id for p, _ in lines}:
        Notification.objects.create(user_id=vendor_id, notification_type='order_placed',
                                    title='New order received', message=f'Order {order.order_id}',
                                    link=f'/vendor/orders/{order.pk}')
    return order


TRANSITIONS = {
    'pending': {'confirmed', 'cancelled'},
    'confirmed': {'processing', 'picked', 'cancelled'},
    'processing': {'picked', 'shipped', 'cancelled'},
    'picked': {'shipped', 'delivered'},
    'shipped': {'delivered'},
    'delivered': set(), 'cancelled': set(),
}


@transaction.atomic
def transition_order(order, new_status):
    order = Order.objects.select_for_update().get(pk=order.pk)
    if new_status == order.status:
        return order
    if new_status not in TRANSITIONS.get(order.status, set()):
        raise ValidationError({'status': f'Cannot change {order.status} to {new_status}.'})
    if new_status == 'cancelled':
        for item in order.items.order_by('product_id'):
            if item.product_id:
                Product.objects.filter(pk=item.product_id).update(stock_quantity=F('stock_quantity') + item.quantity)
    if new_status == 'delivered':
        for item in order.items.order_by('product_id'):
            gross = item.price_at_order * item.quantity
            commission = (gross * item.commission_rate / Decimal('100')).quantize(Decimal('0.01'))
            if item.vendor_id:
                SettlementLine.objects.get_or_create(item=item, defaults={
                    'vendor_id': item.vendor_id, 'gross': gross, 'commission': commission, 'net': gross - commission})
            if item.product_id:
                Product.objects.filter(pk=item.product_id).update(sales_count=F('sales_count') + item.quantity)
    order.status = new_status
    order.save(update_fields=['status', 'updated_at'])
    return order


@transaction.atomic
def update_delivery(delivery, target, collected_amount=None):
    from django.utils import timezone
    delivery = Delivery.objects.select_for_update().get(pk=delivery.pk)
    allowed = {'assigned': {'picked', 'failed'}, 'picked': {'on_the_way', 'delivered', 'failed'},
               'on_the_way': {'delivered', 'failed'}, 'failed': {'assigned'}, 'delivered': set()}
    if target not in allowed.get(delivery.status, set()):
        raise ValidationError({'status': 'Invalid delivery transition.'})
    if target == 'picked':
        transition_order(delivery.order, 'picked')
    if target == 'on_the_way':
        transition_order(delivery.order, 'shipped')
    if target == 'delivered':
        try:
            amount = Decimal(str(collected_amount))
        except Exception:
            raise ValidationError({'collected_amount': 'Enter the amount collected in AFN.'})
        if not amount.is_finite() or amount != delivery.order.total_amount:
            raise ValidationError({'collected_amount': 'Collected cash must match the order total.'})
        transition_order(delivery.order, 'delivered')
        delivery.collected_amount = amount
        delivery.delivered_at = timezone.now()
    delivery.status = target
    delivery.save()
    return delivery


@transaction.atomic
def create_payout(vendor, period_start, period_end):
    Vendor.objects.select_for_update().get(pk=vendor.pk)
    lines = list(SettlementLine.objects.select_for_update().filter(vendor=vendor, payout__isnull=True,
                 created_at__date__gte=period_start, created_at__date__lte=period_end).order_by('pk'))
    if not lines:
        raise ValidationError('There are no unsettled delivered sales in this period.')
    payout = Payout.objects.create(vendor=vendor, period_start=period_start, period_end=period_end,
                                  amount=sum((line.net for line in lines), Decimal('0.00')))
    SettlementLine.objects.filter(pk__in=[line.pk for line in lines]).update(payout=payout)
    return payout


@transaction.atomic
def mark_payout_paid(payout, actor, reference):
    from django.utils import timezone
    payout = Payout.objects.select_for_update().get(pk=payout.pk)
    if payout.status == 'paid':
        raise ValidationError('This payout is already paid.')
    if not reference or len(reference.strip()) > 200:
        raise ValidationError({'payment_reference': 'Enter the transfer or signed cash receipt reference.'})
    payout.status, payout.paid_at, payout.paid_by = 'paid', timezone.now(), actor
    payout.payment_reference = reference.strip()
    payout.save()
    return payout

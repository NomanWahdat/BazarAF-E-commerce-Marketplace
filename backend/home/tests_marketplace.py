from decimal import Decimal
from django.test import TestCase, override_settings
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Vendor, Product, Category, Order, OrderItem, Payout, DeliveryZone


class MarketplaceRegressionTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.buyer = User.objects.create_user(phone='+93701000001', full_name='Buyer', password='Strong!Test123')
        self.other = User.objects.create_user(phone='+93701000002', full_name='Other', password='Strong!Test123')
        self.seller = User.objects.create_user(phone='+93701000003', full_name='Seller', password='Strong!Test123', role='vendor')
        self.admin = User.objects.create_user(phone='+93701000004', full_name='Admin', password='Strong!Test123', role='admin')
        self.vendor = self.seller.vendor_profile
        self.vendor.status = 'approved'
        self.vendor.save()
        self.category = Category.objects.first()
        self.product = Product.objects.create(vendor=self.vendor, category=self.category, name='Tea',
                                               price=100, stock_quantity=10, status='approved', is_active=True)
        DeliveryZone.objects.create(province='Kabul', city='Kabul', fee=50)
        self.payload = {'customer_name': 'Buyer', 'customer_phone': self.buyer.phone,
                        'delivery_address': {'province': 'Kabul', 'city': 'Kabul', 'address': 'District 3, landmark'},
                        'items': [{'product_id': str(self.product.pk), 'quantity': 2, 'price': 1}],
                        'total': 1, 'delivery_fee': 0, 'subtotal': 1}
        self.client.force_authenticate(self.buyer)

    def checkout(self, **kwargs):
        return self.client.post('/api/orders/checkout/', self.payload, format='json', **kwargs)

    def test_checkout_ignores_tampered_money_and_names(self):
        response = self.checkout()
        self.assertEqual(response.status_code, 201, response.data)
        order = Order.objects.get()
        self.assertEqual(order.total_amount, Decimal('250.00'))
        self.assertEqual(order.items.get().price_at_order, Decimal('100.00'))
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 8)

    def test_missing_product_rejected_without_mutation(self):
        self.payload['items'][0]['product_id'] = '00000000-0000-0000-0000-000000000000'
        self.assertEqual(self.checkout().status_code, 400)
        self.assertFalse(Order.objects.exists())

    def test_duplicate_lines_cannot_bypass_stock(self):
        self.payload['items'] = [{'product_id': str(self.product.pk), 'quantity': 6}] * 2
        self.assertEqual(self.checkout().status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 10)

    def test_zero_and_negative_quantity_rejected(self):
        for quantity in [0, -1, 1.5, 101]:
            self.payload['items'][0]['quantity'] = quantity
            self.assertEqual(self.checkout().status_code, 400)

    def test_retry_creates_one_order(self):
        first = self.checkout(HTTP_IDEMPOTENCY_KEY='same-checkout')
        second = self.checkout(HTTP_IDEMPOTENCY_KEY='same-checkout')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.data['order']['uuid'], first.data['order']['uuid'])
        self.assertEqual(Order.objects.count(), 1)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 8)
        self.payload['items'][0]['quantity'] = 3
        self.assertEqual(self.checkout(HTTP_IDEMPOTENCY_KEY='same-checkout').status_code, 400)

    def test_customer_cannot_change_order_or_bulk_status(self):
        self.checkout()
        order = Order.objects.get()
        self.assertEqual(self.client.patch(f'/api/orders/{order.pk}/', {'status': 'delivered'}).status_code, 403)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post('/api/orders/bulk-update-status/',
                         {'order_ids': [str(order.pk)], 'status': 'delivered'}, format='json').status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending')

    def test_cancel_restores_inventory_once(self):
        self.checkout()
        order = Order.objects.get()
        self.assertEqual(self.client.post(f'/api/orders/{order.pk}/cancel/').status_code, 200)
        self.assertEqual(self.client.post(f'/api/orders/{order.pk}/cancel/').status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 10)

    def test_tracking_requires_ownership(self):
        self.checkout()
        path = f'/api/orders/track/{Order.objects.get().order_id}/'
        self.assertEqual(self.client.get(path).status_code, 200)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(path).status_code, 404)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(path).status_code, 401)

    def test_public_catalog_never_contains_seller_documents(self):
        self.client.force_authenticate(None)
        response = self.client.get(f'/api/products/{self.product.slug}/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn('identity_document', response.data['vendor'])
        self.assertNotIn('user', response.data['vendor'])
        self.assertNotIn('commission_rate', response.data['vendor'])

    def test_suspended_seller_hidden_and_unorderable(self):
        self.vendor.status = 'suspended'
        self.vendor.save()
        self.assertEqual(self.checkout().status_code, 400)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f'/api/products/{self.product.slug}/').status_code, 404)

    def test_vendor_cannot_publish_or_feature(self):
        self.client.force_authenticate(self.seller)
        response = self.client.post('/api/products/', {'name': 'New Tea', 'description': 'Fresh tea',
            'price': 50, 'stock_quantity': 1, 'category': str(self.category.pk), 'status': 'approved'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Product.objects.get(name='New Tea').status, 'pending')
        self.assertEqual(self.client.post(f'/api/products/{self.product.slug}/toggle_featured/').status_code, 403)

    def test_vendor_cannot_pay_themselves(self):
        payout = Payout.objects.create(vendor=self.vendor, amount=100, period_start='2026-10-01', period_end='2026-10-20')
        self.client.force_authenticate(self.seller)
        self.assertEqual(self.client.post(f'/api/payouts/{payout.pk}/mark_paid/').status_code, 403)

    def test_invalid_price_is_client_error(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/products/?min_price=oops').status_code, 400)
        self.assertEqual(self.client.get('/api/products/?ordering=average_rating').status_code, 200)

    def test_review_requires_purchased_product(self):
        self.checkout()
        order = Order.objects.get()
        order.status = 'delivered'
        order.save()
        other_product = Product.objects.create(vendor=self.vendor, category=self.category, name='Rice', price=100)
        response = self.client.post('/api/user/reviews/', {'order_id': str(order.pk),
            'product_id': str(other_product.pk), 'rating': 5, 'comment': 'Not purchased'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_logout_blacklists_refresh(self):
        token = RefreshToken.for_user(self.buyer)
        self.assertEqual(self.client.post('/api/auth/logout/', {'refresh': str(token)}).status_code, 200)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post('/api/auth/token/refresh/', {'refresh': str(token)}).status_code, 401)

    @override_settings(DEBUG=False)
    def test_unsupported_delivery_area_rejected(self):
        self.payload['delivery_address']['city'] = 'Unknown'
        self.assertEqual(self.checkout().status_code, 400)

    def test_quote_matches_order(self):
        quote = self.client.post('/api/orders/quote/', self.payload, format='json')
        self.assertEqual(quote.status_code, 200)
        self.assertEqual(quote.data['total'], self.checkout().data['order']['total'])

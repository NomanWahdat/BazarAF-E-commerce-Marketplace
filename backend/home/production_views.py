import logging
from decimal import Decimal
from django.conf import settings
from django.core import signing
from django.db import connection
from django.http import FileResponse, Http404, JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .commerce import delivery_quote, priced_items
from .models import DeliveryZone
from .serializer import CheckoutOrderSerializer
from .storage import PrivateDocumentStorage
from rest_framework import serializers, generics
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from .models import SupportRequest, NewsletterSubscription, Vendor, Order, Product, Review
from .serializer import PublicVendorSerializer, ProductListSerializer
from rest_framework.pagination import PageNumberPagination


def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        return JsonResponse({'status': 'ok'})
    except Exception:
        return JsonResponse({'status': 'unavailable'}, status=503)


def document_download(request):
    try:
        ticket = signing.loads(request.GET.get('ticket', ''), salt='private-document', max_age=60)
        storage = PrivateDocumentStorage()
        document = storage.open(ticket['name'], 'rb')
    except (signing.BadSignature, KeyError, OSError, ValueError):
        raise Http404
    logging.getLogger('home').info('Private document downloaded: %s', ticket['name'])
    response = FileResponse(document, as_attachment=True)
    response['Cache-Control'] = 'private, no-store'
    response['Referrer-Policy'] = 'no-referrer'
    return response


class DeliveryZonesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        zones = list(DeliveryZone.objects.filter(is_active=True).values('province', 'city', 'fee'))
        return Response({'zones': zones, 'development_fallback': settings.DEBUG and not DeliveryZone.objects.exists()})


class CheckoutQuoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckoutOrderSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        lines = priced_items(data['items'])
        subtotal = sum((p.price * q for p, q in lines), Decimal('0.00'))
        fee = delivery_quote(data['delivery_address'])
        return Response({'subtotal': str(subtotal), 'delivery_fee': str(fee),
                         'total': str(subtotal + fee), 'currency': 'AFN',
                         'items': [{'product_id': str(p.pk), 'name': p.name,
                                    'quantity': q, 'price': str(p.price)} for p, q in lines]})


class SupportRequestSerializer(serializers.ModelSerializer):
    order_reference = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = SupportRequest
        fields = ['id', 'order_reference', 'kind', 'subject', 'message', 'status', 'response', 'created_at']
        read_only_fields = ['id', 'status', 'response', 'created_at']
        extra_kwargs = {'message': {'max_length': 5000}}

    def validate(self, data):
        reference = data.pop('order_reference', '')
        if reference:
            order = Order.objects.filter(order_id=reference, customer=self.context['request'].user).first()
            if not order:
                raise serializers.ValidationError({'order_reference': 'Order not found.'})
            data['order'] = order
        if data.get('kind') == 'return' and (not data.get('order') or data['order'].status != 'delivered'):
            raise serializers.ValidationError({'order_reference': 'Choose one of your delivered orders.'})
        return data


class SupportRequestsView(generics.ListCreateAPIView):
    serializer_class = SupportRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SupportRequest.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class StorefrontView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, identifier):
        import uuid
        vendors = Vendor.objects.filter(status='approved', user__is_active=True)
        try:
            vendor = get_object_or_404(vendors, pk=uuid.UUID(identifier))
        except ValueError:
            matches = [v for v in vendors if slugify(v.shop_name, allow_unicode=True) == identifier]
            if len(matches) != 1:
                raise Http404
            vendor = matches[0]
        products = Product.objects.filter(vendor=vendor, status='approved', is_active=True).select_related('vendor', 'category').prefetch_related('images').order_by('-created_at')
        paginator = PageNumberPagination()
        paginator.page_size = 100
        page = paginator.paginate_queryset(products, request)
        reviews = Review.objects.filter(product__vendor=vendor, order__status='delivered').select_related('user').order_by('-created_at')[:10]
        result = paginator.get_paginated_response(ProductListSerializer(page, many=True, context={'request': request}).data)
        result.data['vendor'] = PublicVendorSerializer(vendor, context={'request': request}).data
        result.data['reviews'] = [{'id': str(r.pk), 'customerName': r.user.full_name.split()[0], 'rating': r.rating, 'comment': r.comment, 'date': r.created_at.isoformat(), 'helpful': 0} for r in reviews]
        return result


class NewsletterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = serializers.EmailField().run_validation(request.data.get('email')).lower()
        vendor_id = serializers.UUIDField().run_validation(request.data.get('vendor_id'))
        vendor = get_object_or_404(Vendor, pk=vendor_id, status='approved')
        subscription, created = NewsletterSubscription.objects.get_or_create(vendor=vendor, email=email)
        if created:
            from .emails import _send_email_async
            token = signing.dumps({'id': str(subscription.pk)}, salt='newsletter')
            base = request.build_absolute_uri('/api/newsletter/confirm/')
            _send_email_async('Confirm your BazaarAF subscription', f'Confirm: {base}?token={token}', settings.DEFAULT_FROM_EMAIL, [email])
        return Response({'message': 'If confirmation is needed, a message has been queued.'}, status=202)


def confirm_newsletter(request):
    try:
        payload = signing.loads(request.GET.get('token', ''), salt='newsletter', max_age=86400)
        subscription = get_object_or_404(NewsletterSubscription, pk=payload['id'])
    except (signing.BadSignature, KeyError):
        raise Http404
    subscription.confirmed_at = timezone.now()
    subscription.save(update_fields=['confirmed_at'])
    return JsonResponse({'message': 'Subscription confirmed.'})

from .onboarding import approve_application
from .commerce import transition_order
"""
Admin API Views - Custom admin dashboard endpoints
Handles all admin operations for dashboard modules
"""
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, Count, Avg, F, DecimalField, ExpressionWrapper
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.db import transaction
from datetime import timedelta, datetime
from uuid import UUID
import re

from rest_framework import viewsets, status, permissions, filters, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from home.models import (
    SellerApplication, Product, Order, OrderItem, Delivery, Vendor, 
    User, Review, Payout
)
from home.admin_models import (
    CommissionHistory, ReviewModeration, VendorAuditLog, AdminDashboardStats
)
from home.serializer import (
    SellerApplicationSerializer, ProductSerializer, OrderSerializer,
    VendorSerializer
)



UUID_PATTERN = re.compile(
    r'^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$'
)


def _is_uuid(value):
    if not isinstance(value, str):
        return False

    candidate = value.strip()
    if not candidate:
        return False

    # Only consider exact UUID strings for id lookups
    if not UUID_PATTERN.fullmatch(candidate):
        return False

    try:
        UUID(candidate)
        return True
    except (ValueError, TypeError):
        return False


# ============================================
# PERMISSIONS
# ============================================

class IsAdminUser(permissions.BasePermission):
    """Only allow admin users to access"""
    def has_permission(self, request, view):
        return request.user and (request.user.is_superuser or request.user.role == 'admin')


# ============================================
# SERIALIZERS
# ============================================

class AdminDashboardSummarySerializer(serializers.Serializer):
    """Summary stats for admin homepage"""
    pending_sellers = serializers.IntegerField()
    pending_products = serializers.IntegerField()
    pending_orders = serializers.IntegerField()
    active_orders = serializers.IntegerField()
    flagged_reviews = serializers.IntegerField()
    total_vendors = serializers.IntegerField()
    total_sales = serializers.DecimalField(max_digits=12, decimal_places=2)


class CommissionHistorySerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.shop_name', read_only=True)
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True)

    class Meta:
        model = CommissionHistory
        fields = [
            'id', 'vendor', 'vendor_name', 'old_rate', 'new_rate', 
            'effective_date', 'reason', 'changed_by', 'changed_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ReviewModerationSerializer(serializers.ModelSerializer):
    review_data = serializers.SerializerMethodField()
    flagged_by_name = serializers.CharField(source='flagged_by.full_name', read_only=True)

    class Meta:
        model = ReviewModeration
        fields = [
            'id', 'review', 'review_data', 'is_flagged', 'flag_category', 
            'reason', 'flagged_by', 'flagged_by_name', 'created_at', 
            'unflagged_at', 'deletion_reason', 'deleted_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_review_data(self, obj):
        """Include review details"""
        review = obj.review
        product = review.product
        vendor = getattr(product, 'vendor', None) if product else None
        category = getattr(product, 'category', None) if product else None
        return {
            'id': str(review.id),
            'product_name': product.name if product else '',
            'user_name': review.user.full_name,
            'vendor_name': vendor.shop_name if vendor else '',
            'category': category.name if category else '',
            'rating': review.rating,
            'comment': review.comment[:200] + '...' if len(review.comment) > 200 else review.comment,
            'created_at': review.created_at
        }


class VendorAuditLogSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.shop_name', read_only=True)
    admin_name = serializers.CharField(source='admin_user.full_name', read_only=True)

    class Meta:
        model = VendorAuditLog
        fields = [
            'id', 'vendor', 'vendor_name', 'action_type', 'old_value', 'new_value',
            'reason', 'admin_user', 'admin_name', 'ip_address', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'admin_user', 'ip_address']


class AdminOrderSerializer(serializers.ModelSerializer):
    """Order details for admin operations"""
    customer_info = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    source_vendors = serializers.SerializerMethodField()
    delivery_info = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'customer_info', 'total_amount', 'status',
            'delivery_address', 'city', 'province', 'items', 'source_vendors', 'delivery_info',
            'created_at', 'updated_at'
        ]

    def update(self, instance, validated_data):
        if set(validated_data) != {'status'}:
            raise serializers.ValidationError('Order details are immutable after checkout.')
        return transition_order(instance, validated_data['status'])

    def get_customer_info(self, obj):
        return {
            'name': obj.customer_name or obj.customer.full_name if obj.customer else 'Unknown',
            'phone': obj.customer_phone or obj.customer.phone if obj.customer else '',
            'email': obj.customer.email if obj.customer else ''
        }

    def get_items(self, obj):
        """Get all order items with vendor info"""
        items = obj.items.all()
        return [{
            'id': str(item.id),
            'product_name': item.product_name or item.product.name if item.product else '',
            'vendor_name': item.vendor.shop_name if item.vendor else '',
            'quantity': item.quantity,
            'price': str(item.price_at_order)
        } for item in items]

    def get_source_vendors(self, obj):
        vendor_names = list(obj.items.values_list('vendor__shop_name', flat=True))
        unique_names = []
        for name in vendor_names:
            if name and name not in unique_names:
                unique_names.append(name)
        return unique_names

    def get_delivery_info(self, obj):
        """Get delivery details if exists"""
        delivery = getattr(obj, 'delivery', None)
        if delivery:
            return {
                'id': str(delivery.id),
                'rider_name': delivery.rider.full_name if delivery.rider else 'Unassigned',
                'rider_phone': delivery.rider.phone if delivery.rider else '',
                'status': delivery.status,
                'collected_amount': str(delivery.collected_amount),
                'delivered_at': delivery.delivered_at
            }
        return None


class AdminVendorCommissionSerializer(serializers.ModelSerializer):
    sales_volume = serializers.SerializerMethodField()
    pending_payout = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = [
            'id', 'shop_name', 'status', 'commission_rate',
            'sales_volume', 'pending_payout', 'created_at'
        ]

    def _total_sales(self, vendor, start_date=None):
        items = OrderItem.objects.filter(
            vendor=vendor,
            order__status='delivered'
        )
        if start_date:
            items = items.filter(order__created_at__gte=start_date)

        total = items.aggregate(
            total=Sum(
                ExpressionWrapper(
                    F('price_at_order') * F('quantity'),
                    output_field=DecimalField(max_digits=12, decimal_places=2)
                )
            )
        )['total'] or 0
        return float(total)

    def get_sales_volume(self, obj):
        return self._total_sales(obj)

    def get_pending_payout(self, obj):
        total = Payout.objects.filter(
            vendor=obj,
            status='pending'
        ).aggregate(total=Sum('amount'))['total'] or 0
        return float(total)


class AdminVendorPerformanceSerializer(serializers.ModelSerializer):
    rating = serializers.SerializerMethodField()
    total_sales = serializers.SerializerMethodField()
    this_month_sales = serializers.SerializerMethodField()
    order_completion_rate = serializers.SerializerMethodField()
    avg_delivery_time = serializers.SerializerMethodField()
    cancellation_rate = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = [
            'id', 'shop_name', 'status', 'rating', 'total_sales',
            'this_month_sales', 'order_completion_rate', 'avg_delivery_time',
            'cancellation_rate', 'products_count', 'created_at'
        ]

    def _total_sales(self, vendor, start_date=None):
        items = OrderItem.objects.filter(
            vendor=vendor,
            order__status='delivered'
        )
        if start_date:
            items = items.filter(order__created_at__gte=start_date)

        total = items.aggregate(
            total=Sum(
                ExpressionWrapper(
                    F('price_at_order') * F('quantity'),
                    output_field=DecimalField(max_digits=12, decimal_places=2)
                )
            )
        )['total'] or 0
        return float(total)

    def _orders_base(self, vendor):
        return Order.objects.filter(items__vendor=vendor).distinct()

    def get_rating(self, obj):
        avg_rating = Review.objects.filter(
            product__vendor=obj
        ).aggregate(Avg('rating'))['rating__avg'] or 0
        return round(float(avg_rating), 2)

    def get_total_sales(self, obj):
        return self._total_sales(obj)

    def get_this_month_sales(self, obj):
        month_ago = timezone.now() - timedelta(days=30)
        return self._total_sales(obj, start_date=month_ago)

    def get_order_completion_rate(self, obj):
        base = self._orders_base(obj)
        total = base.count()
        if total == 0:
            return 0
        completed = base.filter(status='delivered').count()
        return round((completed / total) * 100, 2)

    def get_cancellation_rate(self, obj):
        base = self._orders_base(obj)
        total = base.count()
        if total == 0:
            return 0
        cancelled = base.filter(status='cancelled').count()
        return round((cancelled / total) * 100, 2)

    def get_avg_delivery_time(self, obj):
        delivered = Delivery.objects.filter(
            order__items__vendor=obj,
            status='delivered'
        )
        if delivered.exists():
            avg_delta = delivered.aggregate(
                avg=Avg(F('delivered_at') - F('created_at'))
            )['avg'] or timedelta(0)
            return avg_delta.days
        return 0

    def get_products_count(self, obj):
        return obj.products.count()


# ============================================
# VIEWSETS
# ============================================

class AdminDashboardViewSet(viewsets.GenericViewSet):
    """Admin dashboard summary and statistics"""
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get dashboard summary stats"""
        today = timezone.now()
        week_ago = today - timedelta(days=7)

        # Count stats
        pending_sellers = SellerApplication.objects.filter(status='pending').count()
        pending_products = Product.objects.filter(status='pending').count()
        pending_orders = Order.objects.filter(status='pending').count()
        active_orders = Order.objects.filter(status__in=['confirmed', 'processing', 'picked', 'shipped']).count()
        pending_reviews = Review.objects.filter(moderation__isnull=True).count()
        flagged_reviews = ReviewModeration.objects.filter(is_flagged=True).count()
        total_vendors = Vendor.objects.filter(status='approved').count()

        # Revenue stats: only completed delivered orders should count for total sales
        total_sales = Order.objects.filter(
            status='delivered'
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0

        data = {
            'pending_sellers': pending_sellers,
            'pending_products': pending_products,
            'pending_orders': pending_orders,
            'active_orders': active_orders,
            'pending_reviews': pending_reviews,
            'flagged_reviews': flagged_reviews,
            'total_vendors': total_vendors,
            'total_sales': total_sales,
            'timestamp': today
        }
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def order_trends(self, request):
        """Get daily order count for past 7 days"""
        today = timezone.now()
        trends = []
        
        for i in range(6, -1, -1):
            date = (today - timedelta(days=i)).date()
            count = Order.objects.filter(
                created_at__date=date
            ).count()
            trends.append({
                'date': date,
                'count': count
            })
        
        return Response(trends, status=status.HTTP_200_OK)


class SellerApplicationAdminViewSet(viewsets.ModelViewSet):
    """Admin operations on seller applications"""
    permission_classes = [IsAdminUser]
    queryset = SellerApplication.objects.all()
    serializer_class = SellerApplicationSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['full_name', 'email', 'shop_name', 'city']
    ordering_fields = ['created_at', 'status']
    ordering = ['-created_at']
    pagination_class = PageNumberPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'all':
            queryset = queryset.filter(status=status_param)
        
        # Filter by city
        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(city__icontains=city)
        
        # Filter by date range
        from_date = self.request.query_params.get('from_date')
        to_date = self.request.query_params.get('to_date')
        if from_date:
            queryset = queryset.filter(created_at__gte=from_date)
        if to_date:
            queryset = queryset.filter(created_at__lte=to_date)
        
        return queryset

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def approve(self, request, pk=None):
        application, created = approve_application(self.get_object(), request.user)
        return Response({'message': 'Application approved successfully',
                         'vendor_id': str(application.vendor_id), 'user_created': created})

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def reject(self, request, pk=None):
        """Reject seller application"""
        application = self.get_object()
        reason = request.data.get('reason', '')
        
        if len(reason) < 10:
            return Response(
                {'error': 'Rejection reason must be at least 10 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if application.status != 'pending':
            return Response(
                {'error': 'Only pending applications can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        application.status = 'rejected'
        application.rejection_reason = reason
        application.reviewed_at = timezone.now()
        application.save()
        
        return Response(
            {'message': 'Application rejected successfully'},
            status=status.HTTP_200_OK
        )

    def _get_client_ip(self, request):
        """Extract client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ProductModerationViewSet(viewsets.ModelViewSet):
    """Admin operations on product moderation"""
    permission_classes = [IsAdminUser]
    queryset = Product.objects.filter(status__in=['pending', 'approved', 'rejected'])
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'vendor__shop_name']
    ordering_fields = ['created_at', 'status']
    ordering = ['-created_at']
    pagination_class = PageNumberPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'all':
            queryset = queryset.filter(status=status_param)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            if _is_uuid(category):
                queryset = queryset.filter(category__id=category)
            else:
                queryset = queryset.filter(category__name__icontains=category)
        
        # Filter by vendor
        vendor = self.request.query_params.get('vendor')
        if vendor:
            if _is_uuid(vendor):
                queryset = queryset.filter(vendor__id=vendor)
            else:
                queryset = queryset.filter(vendor__shop_name__icontains=vendor)
        
        # Filter by stock status
        stock_status = self.request.query_params.get('stock_status')
        if stock_status == 'low':
            queryset = queryset.filter(stock_quantity__gt=0, stock_quantity__lte=F('low_stock_threshold'))
        elif stock_status == 'out':
            queryset = queryset.filter(stock_quantity=0)
        elif stock_status == 'in':
            queryset = queryset.filter(stock_quantity__gt=F('low_stock_threshold'))
        
        return queryset

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve product"""
        product = self.get_object()
        product.status = 'approved'
        product.save()
        
        # Notify the vendor
        Notification.objects.create(
            user=product.vendor.user,
            notification_type='product_approved',
            title=_('Product Approved ✅'),
            message=_('Your product "') + product.name + _('" has been approved and is now live on the platform.'),
            link=f'/vendor/products/{product.id}'
        )
        
        return Response(
            {'message': str(_('Product approved successfully'))},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject product with optional note"""
        product = self.get_object()
        note = request.data.get('note', '')
        
        product.status = 'rejected'
        product.save()
        
        # Notify the vendor
        message = _('Your product "') + product.name + _('" has been rejected.')
        if note:
            message += _(' Reason: ') + note
        
        Notification.objects.create(
            user=product.vendor.user,
            notification_type='product_rejected',
            title=_('Product Rejected ❌'),
            message=str(message),
            link=f'/vendor/products/{product.id}'
        )
        
        return Response(
            {'message': str(_('Product rejected successfully'))},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'])
    def bulk_approve(self, request):
        """Bulk approve multiple products"""
        product_ids = request.data.get('product_ids', [])
        if not product_ids:
            return Response(
                {'error': str(_('No product IDs provided'))},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated = Product.objects.filter(
            id__in=product_ids,
            status='pending'
        ).update(status='approved')
        
        return Response(
            {'message': f'{updated} ' + str(_('products approved'))},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'])
    def bulk_reject(self, request):
        """Bulk reject multiple products"""
        product_ids = request.data.get('product_ids', [])
        note = request.data.get('note', '')
        
        if not product_ids:
            return Response(
                {'error': str(_('No product IDs provided'))},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated = Product.objects.filter(
            id__in=product_ids,
            status='pending'
        ).update(status='rejected')
        
        return Response(
            {'message': f'{updated} ' + str(_('products rejected'))},
            status=status.HTTP_200_OK
        )


class OrderOperationsViewSet(viewsets.ModelViewSet):
    """Admin operations on orders"""
    permission_classes = [IsAdminUser]
    queryset = Order.objects.all()
    serializer_class = AdminOrderSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['order_id', 'customer_name']
    ordering_fields = ['created_at', 'status', 'total_amount']
    ordering = ['-created_at']
    pagination_class = PageNumberPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter by city
        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(city__icontains=city)

        vendor = self.request.query_params.get('vendor')
        if vendor:
            if _is_uuid(vendor):
                queryset = queryset.filter(items__vendor__id=vendor)
            else:
                queryset = queryset.filter(items__vendor__shop_name__icontains=vendor)
            queryset = queryset.distinct()
        
        # Filter by date range
        from_date = self.request.query_params.get('from_date')
        to_date = self.request.query_params.get('to_date')
        if from_date:
            queryset = queryset.filter(created_at__gte=from_date)
        if to_date:
            queryset = queryset.filter(created_at__lte=to_date)

        date_range = self.request.query_params.get('date_range')
        if date_range and date_range != 'all':
            now = timezone.now()
            if date_range == 'today':
                queryset = queryset.filter(created_at__date=now.date())
            elif date_range == 'week':
                queryset = queryset.filter(created_at__gte=now - timedelta(days=7))
            elif date_range == 'month':
                queryset = queryset.filter(created_at__gte=now - timedelta(days=30))
        
        return queryset

    @action(detail=True, methods=['post'])
    def assign_rider(self, request, pk=None):
        """Assign rider to order delivery"""
        order = self.get_object()
        rider_id = request.data.get('rider_id')
        
        if not rider_id:
            return Response(
                {'error': 'Rider ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            delivery = order.delivery
            rider = User.objects.get(id=rider_id, role='rider')
            delivery.rider = rider
            delivery.save()
            
            return Response(
                {'message': 'Rider assigned successfully'},
                status=status.HTTP_200_OK
            )
        except Delivery.DoesNotExist:
            return Response(
                {'error': 'No delivery found for this order'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'Rider not found'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update order status with validation"""
        order = self.get_object()
        new_status = request.data.get('status')
        
        # Valid state transitions
        valid_transitions = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['processing', 'cancelled'],
            'processing': ['picked', 'cancelled'],
            'picked': ['shipped', 'cancelled'],
            'shipped': ['delivered', 'cancelled'],
            'delivered': [],
            'cancelled': [],
        }
        
        if new_status not in valid_transitions.get(order.status, []):
            return Response(
                {'error': f'Cannot transition from {order.status} to {new_status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        transition_order(order, new_status)
        
        return Response(
            {'message': 'Order status updated successfully'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'])
    def batch_update_status(self, request):
        """Batch update status for multiple orders"""
        order_ids = request.data.get('order_ids', [])
        new_status = request.data.get('status')
        
        if not order_ids or not new_status:
            return Response(
                {'error': 'Order IDs and status are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update all selected orders to new status
        with transaction.atomic():
            orders = list(self.get_queryset().filter(id__in=order_ids).order_by('pk'))
            for order in orders:
                transition_order(order, new_status)
            updated = len(orders)
        
        return Response(
            {'message': f'{updated} orders updated to {new_status}'},
            status=status.HTTP_200_OK
        )


class CommissionManagementViewSet(viewsets.ModelViewSet):
    """Admin operations on vendor commissions"""
    permission_classes = [IsAdminUser]
    queryset = Vendor.objects.filter(status='approved')
    serializer_class = AdminVendorCommissionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['shop_name', 'user__full_name']
    ordering_fields = ['commission_rate', 'created_at']
    ordering = ['-created_at']
    pagination_class = PageNumberPagination

    @action(detail=True, methods=['post'])
    def update_commission(self, request, pk=None):
        """Update vendor commission rate"""
        vendor = self.get_object()
        new_rate = request.data.get('rate')
        effective_date = request.data.get('effective_date')
        reason = request.data.get('reason', '')
        
        if new_rate is None:
            return Response(
                {'error': 'Commission rate is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_rate = vendor.commission_rate
        vendor.commission_rate = new_rate
        vendor.save()
        
        # Record history
        CommissionHistory.objects.create(
            vendor=vendor,
            old_rate=old_rate,
            new_rate=new_rate,
            effective_date=effective_date or timezone.now().date(),
            reason=reason,
            changed_by=request.user
        )
        
        # Log audit
        VendorAuditLog.objects.create(
            vendor=vendor,
            action_type='commission_update',
            old_value={'commission_rate': str(old_rate)},
            new_value={'commission_rate': str(new_rate)},
            reason=reason,
            admin_user=request.user,
            ip_address=self._get_client_ip(request)
        )
        
        return Response(
            {'message': 'Commission rate updated successfully'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['get'])
    def commission_history(self, request, pk=None):
        """Get commission history for vendor"""
        vendor = self.get_object()
        history = CommissionHistory.objects.filter(vendor=vendor).order_by('-created_at')
        serializer = CommissionHistorySerializer(history, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def preview_payout_impact(self, request, pk=None):
        """Preview estimated payout impact of commission change"""
        vendor = self.get_object()
        new_rate = request.data.get('rate')
        
        if new_rate is None:
            return Response(
                {'error': 'New commission rate is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate pending payouts with new rate
        pending_payouts = Payout.objects.filter(
            vendor=vendor,
            status='pending'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Estimate impact
        current_commission = float(vendor.commission_rate)
        new_commission = float(new_rate)
        
        impact = {
            'current_rate': str(current_commission),
            'new_rate': str(new_commission),
            'current_estimated_commission': str(pending_payouts * (current_commission / 100)),
            'new_estimated_commission': str(pending_payouts * (new_commission / 100)),
            'difference': str(pending_payouts * ((new_commission - current_commission) / 100))
        }
        
        return Response(impact, status=status.HTTP_200_OK)

    def _get_client_ip(self, request):
        """Extract client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ReviewModerationViewSet(viewsets.ModelViewSet):
    """Admin operations on review moderation"""
    permission_classes = [IsAdminUser]
    queryset = ReviewModeration.objects.all()
    serializer_class = ReviewModerationSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'flag_category']
    ordering = ['-created_at']
    pagination_class = PageNumberPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by flagged status
        flagged_status = self.request.query_params.get('flagged_status')
        if flagged_status in ['flagged', 'unflagged']:
            queryset = queryset.filter(is_flagged=flagged_status == 'flagged')
        else:
            is_flagged = self.request.query_params.get('is_flagged')
            if is_flagged is not None:
                queryset = queryset.filter(is_flagged=is_flagged.lower() == 'true')

        rating = self.request.query_params.get('rating')
        if rating:
            queryset = queryset.filter(review__rating=rating)

        category = self.request.query_params.get('category')
        if category:
            if _is_uuid(category):
                queryset = queryset.filter(review__product__category__id=category)
            else:
                queryset = queryset.filter(review__product__category__name__icontains=category)

        vendor = self.request.query_params.get('vendor')
        if vendor:
            if _is_uuid(vendor):
                queryset = queryset.filter(review__product__vendor__id=vendor)
            else:
                queryset = queryset.filter(review__product__vendor__shop_name__icontains=vendor)

        flag_category = self.request.query_params.get('flag_category')
        if flag_category:
            queryset = queryset.filter(flag_category=flag_category)
        
        return queryset

    def _get_unmoderated_reviews(self):
        queryset = Review.objects.filter(moderation__isnull=True)
        rating = self.request.query_params.get('rating')
        if rating:
            queryset = queryset.filter(rating=rating)

        category = self.request.query_params.get('category')
        if category:
            if _is_uuid(category):
                queryset = queryset.filter(product__category__id=category)
            else:
                queryset = queryset.filter(product__category__name__icontains=category)

        vendor = self.request.query_params.get('vendor')
        if vendor:
            if _is_uuid(vendor):
                queryset = queryset.filter(product__vendor__id=vendor)
            else:
                queryset = queryset.filter(product__vendor__shop_name__icontains=vendor)

        return queryset

    def _serialize_unmoderated_review(self, review):
        product = review.product
        vendor = getattr(product, 'vendor', None) if product else None
        category = getattr(product, 'category', None) if product else None
        return {
            'id': str(review.id),
            'review': str(review.id),
            'review_data': {
                'id': str(review.id),
                'product_name': product.name if product else '',
                'user_name': review.user.full_name,
                'vendor_name': vendor.shop_name if vendor else '',
                'category': category.name if category else '',
                'rating': review.rating,
                'comment': review.comment[:200] + '...' if len(review.comment) > 200 else review.comment,
                'created_at': review.created_at,
            },
            'is_flagged': False,
            'flag_category': None,
            'reason': '',
            'flagged_by': None,
            'flagged_by_name': None,
            'created_at': review.created_at,
            'unflagged_at': None,
            'deletion_reason': None,
            'deleted_at': None,
        }

    def list(self, request, *args, **kwargs):
        flagged_status = request.query_params.get('flagged_status')
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginator.paginate_queryset(queryset, request)
        serialized = self.get_serializer(page, many=True).data

        review_items = list(serialized)
        if flagged_status != 'flagged':
            unmoderated_reviews = self._get_unmoderated_reviews()
            for review in unmoderated_reviews:
                review_items.append(self._serialize_unmoderated_review(review))

        review_items.sort(
            key=lambda item: item['review_data']['created_at'],
            reverse=True
        )

        return self.paginator.get_paginated_response(review_items)

    @action(detail=True, methods=['post'])
    def flag_review(self, request, pk=None):
        """Flag a review as inappropriate"""
        review = Review.objects.get(id=pk)
        category = request.data.get('category')
        reason = request.data.get('reason', '')
        
        moderation, created = ReviewModeration.objects.get_or_create(review=review)
        moderation.is_flagged = True
        moderation.flag_category = category
        moderation.reason = reason
        moderation.flagged_by = request.user
        moderation.save()
        
        serializer = self.get_serializer(moderation)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def unflag_review(self, request, pk=None):
        """Remove flag from a review"""
        moderation = self.get_object()
        moderation.is_flagged = False
        moderation.unflagged_at = timezone.now()
        moderation.save()
        
        serializer = self.get_serializer(moderation)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def delete_review(self, request, pk=None):
        """Delete a review with reason tracking"""
        moderation = self.get_object()
        reason = request.data.get('reason')
        
        if not reason:
            return Response(
                {'error': 'Deletion reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        moderation.deleted_at = timezone.now()
        moderation.deletion_reason = reason
        moderation.save()
        
        # Also delete the actual review
        moderation.review.delete()
        
        return Response(
            {'message': 'Review deleted successfully'},
            status=status.HTTP_200_OK
        )


class VendorPerformanceViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin monitoring of vendor performance metrics"""
    permission_classes = [IsAdminUser]
    queryset = Vendor.objects.all()
    serializer_class = AdminVendorPerformanceSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['shop_name', 'user__full_name']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    pagination_class = PageNumberPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by status
        vendor_status = self.request.query_params.get('status')
        if vendor_status and vendor_status != 'all':
            queryset = queryset.filter(status=vendor_status)
        
        # Filter by rating
        rating_range = self.request.query_params.get('rating_range')
        if rating_range and rating_range != 'all':
            queryset = queryset.annotate(avg_rating=Avg('products__reviews__rating'))
            if rating_range == 'below-2.5':
                queryset = queryset.filter(avg_rating__lt=2.5)
            else:
                parts = rating_range.split('-')
                if len(parts) == 2:
                    try:
                        min_val = float(parts[0])
                        max_val = float(parts[1])
                        queryset = queryset.filter(
                            avg_rating__gte=min_val,
                            avg_rating__lte=max_val
                        )
                    except ValueError:
                        pass
        
        return queryset

    @action(detail=True, methods=['get'])
    def performance_metrics(self, request, pk=None):
        """Get detailed performance metrics for a vendor"""
        vendor = self.get_object()
        
        # Calculate metrics
        total_products = vendor.products.filter(status='approved').count()
        total_sales = Order.objects.filter(
            items__vendor=vendor
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        
        # Completion rate
        total_orders = Order.objects.filter(items__vendor=vendor).count()
        completed_orders = Order.objects.filter(
            items__vendor=vendor,
            status='delivered'
        ).count()
        completion_rate = (completed_orders / total_orders * 100) if total_orders > 0 else 0
        
        # Average rating
        avg_rating = Review.objects.filter(
            product__vendor=vendor
        ).aggregate(Avg('rating'))['rating__avg'] or 0
        
        # Cancellation rate
        cancelled_orders = Order.objects.filter(
            items__vendor=vendor,
            status='cancelled'
        ).count()
        cancellation_rate = (cancelled_orders / total_orders * 100) if total_orders > 0 else 0
        
        # Average delivery time
        delivered = Delivery.objects.filter(
            order__items__vendor=vendor,
            status='delivered'
        )
        if delivered.exists():
            avg_delivery_time = (delivered.aggregate(
                avg=Avg(F('delivered_at') - F('created_at'))
            )['avg'] or timedelta(0)).days
        else:
            avg_delivery_time = 0
        
        metrics = {
            'vendor_id': str(vendor.id),
            'shop_name': vendor.shop_name,
            'status': vendor.status,
            'commission_rate': str(vendor.commission_rate),
            'total_products': total_products,
            'total_sales_amount': str(total_sales),
            'total_orders': total_orders,
            'completed_orders': completed_orders,
            'completion_rate_percent': round(completion_rate, 2),
            'average_rating': round(avg_rating, 2),
            'cancellation_rate_percent': round(cancellation_rate, 2),
            'average_delivery_days': avg_delivery_time,
            'created_at': vendor.created_at
        }
        
        return Response(metrics, status=status.HTTP_200_OK)

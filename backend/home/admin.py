# home/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import Group

# File: backend/home/admin.py


from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.urls import reverse
from django.utils import timezone
from django.contrib import messages
from django.shortcuts import redirect
import secrets
import string
from .models import (
    User, Vendor, SellerApplication, Category, Product, 
    ProductImage, Order, OrderItem, Delivery, Payout,
    CategoryAttribute, AttributeValue, ProductAttribute
)


# File: backend/home/admin.py
# REPLACE the SellerApplicationAdmin class with this fixed version

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse, path
from django.utils import timezone
from django.contrib import messages
from django.shortcuts import redirect
from django.template.response import TemplateResponse
import secrets
import string
from .models import SellerApplication, User, Vendor, Notification
from .emails import send_vendor_approval_email, send_vendor_rejection_email

@admin.register(SellerApplication)
class SellerApplicationAdmin(admin.ModelAdmin):
    list_display = [
        'application_id',
        'full_name',
        'shop_name',
        'city',
        'phone',
        'status_badge',
        'created_at',
        'reviewed_at'
    ]
    
    list_filter = ['status', 'city', ('created_at', admin.DateFieldListFilter)]
    search_fields = ['application_id', 'full_name', 'shop_name', 'phone', 'email']
    date_hierarchy = 'created_at'
    
    # Make status READONLY so users can't directly change it
    readonly_fields = [
        'application_id',
        'created_at',
        'reviewed_at',
        'vendor',
        'status',
        'view_documents',
        'user'
    ]
    
    fieldsets = (
        ('Application Info', {
            'fields': ('application_id', 'user', 'status', 'created_at', 'reviewed_at'),
            'description': 'Use admin actions to approve or reject applications'
        }),
        ('Applicant Details', {
            'fields': ('full_name', 'phone', 'email')
        }),
        ('Shop Details', {
            'fields': ('shop_name', 'city', 'address')
        }),
        ('Documents', {
            'fields': ('view_documents', 'identity_document', 'business_document')
        }),
        ('Review', {
            'fields': ('rejection_reason', 'vendor'),
            'classes': ('collapse',)
        }),
    )
    
    save_as = False
    actions = ['approve_seller_application', 'reject_seller_application']
    
    list_select_related = ['vendor', 'user']
    
    def status_badge(self, obj):
        """Display status as a colored badge"""
        colors = {
            'pending': '#FFA500',
            'approved': '#28a745',
            'rejected': '#dc3545'
        }
        icon_map = {
            'pending': '⏳',
            'approved': '✅',
            'rejected': '❌'
        }
        color = colors.get(obj.status, '#6c757d')
        icon = icon_map.get(obj.status, '•')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 12px; '
            'border-radius: 3px; font-weight: bold; font-size: 12px;">{} {}</span>',
            color,
            icon,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    def view_documents(self, obj):
        html = []
        
        if obj.identity_document:
            html.append(format_html(
                '<a href="{}" target="_blank" style="display: inline-block; '
                'background: #4CAF50; color: white; padding: 8px 15px; '
                'text-decoration: none; border-radius: 4px; margin-right: 10px;">'
                '📄 View Identity Document</a>',
                obj.identity_document.url
            ))
        
        if obj.business_document:
            html.append(format_html(
                '<a href="{}" target="_blank" style="display: inline-block; '
                'background: #2196F3; color: white; padding: 8px 15px; '
                'text-decoration: none; border-radius: 4px;">'
                '📋 View Business Document</a>',
                obj.business_document.url
            ))
        
        return format_html(''.join(html), '') if html else format_html('<span style="color: #999;">No documents</span>', '')
    view_documents.short_description = 'Documents'
    
    def get_urls(self):
        """Override get_urls to add backward compatibility URLs"""
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path(
                '<path:object_id>/approve/',
                self.admin_site.admin_view(self._approve_single_application),
                name='approve_seller',
            ),
            path(
                '<path:object_id>/reject/',
                self.admin_site.admin_view(self._reject_single_application),
                name='reject_seller',
            ),
        ]
        return custom_urls + urls
    
    def _approve_single_application(self, request, object_id):
        """Fallback method for custom URL-based approval"""
        application = self.get_object(request, object_id)
        if application.status == 'pending':
            self.approve_seller_application(request, SellerApplication.objects.filter(pk=application.pk))
        else:
            messages.error(request, '⚠️  This application has already been processed.')
        return redirect('admin:home_sellerapplication_changelist')
    
    def _reject_single_application(self, request, object_id):
        """Fallback method for custom URL-based rejection"""
        application = self.get_object(request, object_id)
        if application.status == 'pending':
            self.reject_seller_application(request, SellerApplication.objects.filter(pk=application.pk))
        else:
            messages.error(request, '⚠️  This application has already been processed.')
        return redirect('admin:home_sellerapplication_changelist')
    
    
    def _normalize_phone(self, phone):
        """Helper to normalize phone numbers"""
        if not phone:
            return phone
        phone = phone.strip().replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        if not phone.startswith('+'):
            if phone.startswith('0'):
                phone = '+93' + phone[1:]
            elif phone.isdigit():
                phone = '+93' + phone
        return phone
    
    def approve_seller_application(self, request, queryset):
        """
        Production-ready admin action to approve seller applications.
        Creates user account, vendor profile, and sends notifications atomically.
        """
        from django.db import transaction
        import logging
        
        logger = logging.getLogger(__name__)
        approved_count = 0
        failed_count = 0
        failures = []
        
        for application in queryset.filter(status='pending'):
            try:
                with transaction.atomic():
                    logger.info(f"🔄 Approving application {application.application_id}")
                    
                    # Normalize phone number for consistency
                    normalized_phone = self._normalize_phone(application.phone)
                    logger.info(f"📱 Normalized phone: {application.phone} -> {normalized_phone}")
                    
                    # Step 1: Get or create user
                    user = User.objects.filter(phone=normalized_phone).first()
                    
                    if user:
                        logger.info(f"👤 Updating existing user {user.id}")
                        user.role = 'vendor'
                        user.is_active = True
                        user.full_name = application.full_name
                        if application.email and not user.email:
                            user.email = application.email
                        user.save(update_fields=['role', 'is_active', 'full_name', 'email'])
                    else:
                        logger.info(f"✨ Creating new user for {normalized_phone}")
                        password = ''.join(
                            secrets.choice(string.ascii_letters + string.digits) 
                            for _ in range(12)
                        )
                        
                        user = User.objects.create(
                            phone=normalized_phone,
                            full_name=application.full_name,
                            email=application.email,
                            role='vendor',
                            is_active=True
                        )
                        user.set_password(password)
                        user.save(update_fields=['password'])
                        logger.info(f"✅ Created user {user.id}")
                    
                    # Verify user
                    user.refresh_from_db()
                    if user.role != 'vendor':
                        raise ValueError(f"User role verification failed: {user.role} != vendor")
                    
                    # Step 2: Get or create vendor (but check if user already has vendor)
                    logger.info(f"🏪 Processing vendor account")
                    
                    vendor = None
                    
                    # Check if vendor already exists for this user
                    try:
                        vendor = Vendor.objects.get(user=user)
                        logger.info(f"✅ Found existing vendor {vendor.id}, updating...")
                        # Update existing vendor
                        vendor.shop_name = application.shop_name
                        vendor.address = application.address
                        vendor.city = application.city
                        vendor.status = 'approved'
                        if application.identity_document:
                            vendor.identity_document = application.identity_document
                        if application.business_document:
                            vendor.business_document = application.business_document
                        vendor.save()
                        vendor.refresh_from_db()  # Refresh to ensure all fields are correct
                    except Vendor.DoesNotExist:
                        logger.info(f"✨ Creating new vendor for user {user.id}")
                        # Create new vendor
                        try:
                            vendor = Vendor.objects.create(
                                user=user,
                                shop_name=application.shop_name,
                                address=application.address,
                                city=application.city,
                                identity_document=application.identity_document,
                                business_document=application.business_document,
                                status='approved'
                            )
                            logger.info(f"✅ Created vendor {vendor.id}")
                        except Exception as vendor_error:
                            logger.error(f"❌ Failed to create vendor: {vendor_error}")
                            raise ValueError(f"Failed to create vendor for user {user.id}: {str(vendor_error)}")
                    
                    # Verify vendor was created/updated successfully
                    if not vendor or not vendor.id:
                        raise ValueError(f"Vendor is invalid or missing ID after creation/update")
                    
                    # Step 3: Update application
                    logger.info(f"📝 Updating application")
                    application.status = 'approved'
                    application.user = user
                    application.vendor = vendor
                    application.reviewed_at = timezone.now()
                    application.save()
                    logger.info(f"✅ Application approved")
                    
                    # Step 4: Create notification
                    logger.info(f"🔔 Creating notification")
                    Notification.objects.create(
                        user=user,
                        notification_type='vendor_approved',
                        title='🎉 Seller Application Approved!',
                        message=f'Congratulations! Your shop "{vendor.shop_name}" has been approved. You can now start listing products and receiving orders.',
                        link='/vendor'
                    )
                    logger.info(f"✅ Notification created")
                    
                    # Step 5: Try to send email (non-critical)
                    try:
                        from .emails import send_vendor_approval_email
                        send_vendor_approval_email(vendor)
                        logger.info(f"✅ Approval email sent to {user.email}")
                    except Exception as e:
                        logger.warning(f"⚠️  Email sending failed (non-critical): {str(e)}")
                    
                    approved_count += 1
                    
            except Exception as e:
                logger.exception(f"❌ Failed to approve {application.application_id}")
                failed_count += 1
                failures.append(f"{application.application_id}: {str(e)}")
        
        # Show results to admin
        if approved_count > 0:
            messages.success(
                request,
                format_html(
                    '✅ <strong>{} application(s) approved</strong><br>'
                    'Seller accounts created and notifications sent.',
                    approved_count
                )
            )
        
        if failed_count > 0:
            failure_msg = '<br>'.join(failures[:5])  # Show first 5 failures
            if len(failures) > 5:
                failure_msg += f'<br>... and {len(failures)-5} more'
            messages.error(
                request,
                format_html(
                    '❌ Failed to approve {} applications:<br>{}',
                    failed_count,
                    failure_msg
                )
            )
    
    approve_seller_application.short_description = "✅ Approve selected seller applications"
    
    def reject_seller_application(self, request, queryset):
        """
        Admin action to reject seller applications.
        """
        from django.db import transaction
        import logging
        
        logger = logging.getLogger(__name__)
        rejected_count = 0
        
        for application in queryset.filter(status='pending'):
            try:
                with transaction.atomic():
                    logger.info(f"❌ Rejecting application {application.application_id}")
                    
                    application.status = 'rejected'
                    application.rejection_reason = 'Rejected by admin'
                    application.reviewed_at = timezone.now()
                    application.save()
                    
                    logger.info(f"✅ Application rejected")
                    rejected_count += 1
                    
            except Exception as e:
                logger.exception(f"Error rejecting {application.application_id}")
        
        messages.success(request, f'✅ {rejected_count} application(s) rejected.')
    
    reject_seller_application.short_description = "❌ Reject selected seller applications"
    
    def get_urls(self):
        """Register custom admin URLs for backward compatibility"""
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path(
                '<path:object_id>/approve/',
                self.admin_site.admin_view(self._approve_single_application),
                name='approve_seller',
            ),
            path(
                '<path:object_id>/reject/',
                self.admin_site.admin_view(self._reject_single_application),
                name='reject_seller',
            ),
        ]
        return custom_urls + urls
    
    def _approve_single_application(self, request, object_id):
        """Fallback method for custom URL-based approval"""
        application = self.get_object(request, object_id)
        if application.status == 'pending':
            self.approve_seller_application(request, SellerApplication.objects.filter(pk=application.pk))
        else:
            messages.error(request, 'This application has already been processed.')
        return redirect('admin:home_sellerapplication_changelist')
    
    def _reject_single_application(self, request, object_id):
        """Fallback method for custom URL-based rejection"""
        application = self.get_object(request, object_id)
        if application.status == 'pending':
            self.reject_seller_application(request, SellerApplication.objects.filter(pk=application.pk))
        else:
            messages.error(request, 'This application has already been processed.')
        return redirect('admin:home_sellerapplication_changelist')

# REMOVE THIS - Database queries should not be at module level
# admin_group, created = Group.objects.get_or_create(name='admin')
# vendor_group, created = Group.objects.get_or_create(name='vendor')
# rider_group, created = Group.objects.get_or_create(name='rider')
# customer_group, created = Group.objects.get_or_create(name='customer')

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('phone', 'full_name', 'email', 'role', 'is_active', 'is_staff', 'created_at')
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser', 'created_at')
    search_fields = ('phone', 'full_name', 'email')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'last_login')
    
    fieldsets = (
        (None, {'fields': ('phone', 'password')}),
        (_('Personal Info'), {'fields': ('full_name', 'email', 'role')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Important Dates'), {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone', 'full_name', 'email', 'role', 'password1', 'password2'),
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Create groups automatically when users are saved with specific roles"""
        super().save_model(request, obj, form, change)
        
        # Only create groups when needed, not at module import
        if obj.role == 'admin':
            group, created = Group.objects.get_or_create(name='admin')
            obj.groups.add(group)
            obj.is_staff = True
            obj.save()
        elif obj.role == 'vendor':
            group, created = Group.objects.get_or_create(name='vendor')
            obj.groups.add(group)
        elif obj.role == 'rider':
            group, created = Group.objects.get_or_create(name='rider')
            obj.groups.add(group)


# Add admin action for bulk approval

from django.contrib import admin
from .models import Vendor, Notification
from .emails import send_vendor_approval_email

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ['shop_name', 'user', 'city', 'status_badge', 'commission_rate', 'phone_verified', 'created_at']
    list_filter = ['status', 'city', 'commission_rate', 'phone_verified', 'created_at', 'updated_at']
    search_fields = ['shop_name', 'user__full_name', 'user__phone', 'user__email', 'city']
    actions = ['approve_vendors', 'reject_vendors', 'suspend_vendors']
    readonly_fields = ['user', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Shop Information', {
            'fields': ('user', 'shop_name', 'city', 'address', 'province', 'postal_code', 'country')
        }),
        ('Business Settings', {
            'fields': ('status', 'commission_rate'),
            'description': 'Configure vendor business rules and status'
        }),
        ('Documentation', {
            'fields': ('identity_document', 'business_document'),
            'classes': ('collapse',)
        }),
        ('Appearance', {
            'fields': ('avatar', 'logo', 'banner', 'primary_color', 'favicon'),
            'classes': ('collapse',)
        }),
        ('Policies', {
            'fields': ('shipping_policy', 'return_policy', 'terms_conditions', 'privacy_policy'),
            'classes': ('collapse',)
        }),
        ('Notifications', {
            'fields': (
                'notify_email_new_order',
                'notify_email_order_shipped',
                'notify_email_new_review',
                'notify_email_new_message',
                'notify_email_product_approved',
                'notify_email_marketing',
                'notify_sms_urgent_order',
                'notify_in_app',
                'notify_sound',
                'digest_type'
            ),
            'classes': ('collapse',),
            'description': 'Configure vendor notification preferences'
        }),
        ('Security', {
            'fields': ('two_factor_enabled', 'phone_verified', 'totp_secret'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    list_select_related = ['user']
    
    def status_badge(self, obj):
        """Display status as a colored badge"""
        colors = {
            'pending': '#FFA500',
            'approved': '#28a745',
            'suspended': '#dc3545'
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 12px; '
            'border-radius: 3px; font-weight: bold; font-size: 12px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    def approve_vendors(self, request, queryset):
        """Bulk approve vendors with safe confirmation"""
        from django.db import transaction
        
        approved = 0
        for vendor in queryset.filter(status__in=['pending', 'suspended']):
            try:
                with transaction.atomic():
                    vendor.status = 'approved'
                    vendor.save()
                    
                    if vendor.user.role != 'vendor':
                        vendor.user.role = 'vendor'
                        vendor.user.save()
                    
                    try:
                        send_vendor_approval_email(vendor)
                    except Exception:
                        pass  # Non-critical
                    
                    Notification.objects.create(
                        user=vendor.user,
                        notification_type='vendor_approved',
                        title='✅ Your Shop Is Now Approved!',
                        message=f'Your shop "{vendor.shop_name}" has been approved by the admin.',
                        link='/vendor/dashboard'
                    )
                    approved += 1
            except Exception as e:
                messages.error(request, f'❌ Failed to approve {vendor.shop_name}: {str(e)}')
        
        if approved > 0:
            messages.success(request, f'✅ {approved} vendor(s) approved successfully!')
    approve_vendors.short_description = "✅ Approve selected vendors"
    
    def reject_vendors(self, request, queryset):
        """Bulk reject vendors with safe confirmation"""
        updated = queryset.filter(status='pending').update(status='suspended')
        if updated > 0:
            messages.success(request, f'⚠️  {updated} vendor(s) suspended.')
    reject_vendors.short_description = "⚠️  Suspend selected vendors"
    
    def suspend_vendors(self, request, queryset):
        """Suspend vendors"""
        updated = queryset.exclude(status='suspended').update(status='suspended')
        if updated > 0:
            messages.success(request, f'🔒 {updated} vendor(s) suspended.')
    suspend_vendors.short_description = "🔒 Suspend selected vendors"


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user_info', 'notification_type_badge', 'is_read_display', 'created_at']
    list_filter = ['notification_type', 'is_read', ('created_at', admin.DateFieldListFilter)]
    search_fields = ['title', 'message', 'user__full_name', 'user__phone']
    readonly_fields = ['created_at', 'user', 'title', 'message', 'notification_type']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Notification Info', {
            'fields': ('user', 'notification_type', 'title', 'message'),
        }),
        ('Interaction', {
            'fields': ('is_read', 'link'),
        }),
        ('Dates', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    list_select_related = ['user']
    
    def user_info(self, obj):
        if obj.user:
            return format_html(
                '<strong>{}</strong><br><small style="color: #666;">{}</small>',
                obj.user.full_name, obj.user.phone
            )
        return format_html('<em style="color: #999;">Unknown</em>', '')
    user_info.short_description = 'User'
    
    def notification_type_badge(self, obj):
        """Display notification type as colored badge"""
        colors = {
            'vendor_approved': '#28a745',
            'vendor_rejected': '#dc3545',
            'product_approved': '#0d6efd',
            'product_rejected': '#ffc107',
            'order_placed': '#0dcaf0',
            'order_shipped': '#20c997',
            'order_delivered': '#198754',
            'review': '#6f42c1',
        }
        color = colors.get(obj.notification_type, '#6c757d')
        label = obj.get_notification_type_display() if hasattr(obj, 'get_notification_type_display') else obj.notification_type
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 8px; '
            'border-radius: 3px; font-weight: bold; font-size: 11px;">{}</span>',
            color, label
        )
    notification_type_badge.short_description = 'Type'
    
    def is_read_display(self, obj):
        if obj.is_read:
            return format_html('<span style="color: #28a745; font-weight: bold;">✅ Read</span>', '')
        else:
            return format_html('<span style="color: #ffc107; font-weight: bold;">🔔 Unread</span>', '')
    is_read_display.short_description = 'Status'
    is_read_display.admin_order_field = 'is_read'

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "level", "parent", "product_count_display", "commission_display", "is_active_display", "order", "created_at")
    list_editable = ("order", )
    list_filter = ("level", "is_active", ("created_at", admin.DateFieldListFilter), "parent")
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at", "get_product_count")
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'level', 'parent', 'description'),
            'description': 'Category hierarchy and naming'
        }),
        ('Display Settings', {
            'fields': ('icon', 'color', 'order'),
        }),
        ('Business Rules', {
            'fields': ('commission_rate', 'requires_approval', 'min_price', 'max_price'),
            'description': 'Configure category-specific business rules'
        }),
        ('SEO', {
            'fields': ('meta_title', 'meta_description'),
            'classes': ('collapse',),
            'description': 'Search engine optimization'
        }),
        ('Status', {
            'fields': ('is_active',),
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'get_product_count'),
            'classes': ('collapse',)
        }),
    )
    
    list_select_related = ['parent']
    
    def product_count_display(self, obj):
        """Display product count with link"""
        count = obj.get_product_count()
        return format_html(
            '<span style="background: #e7f3ff; color: #0056b3; padding: 3px 8px; '
            'border-radius: 3px; font-weight: bold;">{} products</span>',
            count
        )
    product_count_display.short_description = "Products"
    
    def commission_display(self, obj):
        """Display commission rate with percentage"""
        return format_html(
            '<span style="background: #f0f0f0; padding: 3px 8px; border-radius: 3px;">{}</span>',
            f'{obj.commission_rate or 0:.1f}%'
        )
    commission_display.short_description = "Commission"
    commission_display.admin_order_field = 'commission_rate'
    
    def is_active_display(self, obj):
        """Display active status with icon"""
        if obj.is_active:
            return format_html('<span style="color: #28a745; font-weight: bold;">✅ Active</span>', '')
        else:
            return format_html('<span style="color: #dc3545; font-weight: bold;">🔒 Inactive</span>', '')
    is_active_display.short_description = "Status"
    is_active_display.admin_order_field = 'is_active'
    
    def get_product_count(self, obj):
        """Display product count for each category"""
        return obj.get_product_count()
    get_product_count.short_description = "Products"


class AttributeValueInline(admin.TabularInline):
    """Inline admin for attribute values"""
    model = AttributeValue
    extra = 1
    fields = ['value', 'display_order']
    ordering = ['display_order', 'value']


@admin.register(CategoryAttribute)
class CategoryAttributeAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'attribute_type', 'is_required', 'is_filterable', 'display_order')
    list_filter = ('attribute_type', 'is_required', 'is_filterable', 'category')
    search_fields = ('name', 'category__name')
    ordering = ('category', 'display_order', 'name')
    inlines = [AttributeValueInline]
    fieldsets = (
        ('Attribute Information', {'fields': ('category', 'name', 'attribute_type')}),
        ('Configuration', {'fields': ('is_required', 'is_filterable', 'display_order')}),
    )


@admin.register(AttributeValue)
class AttributeValueAdmin(admin.ModelAdmin):
    list_display = ('value', 'attribute', 'display_order', 'get_attribute_category')
    list_filter = ('attribute__category', 'attribute')
    search_fields = ('value', 'attribute__name')
    ordering = ('attribute', 'display_order', 'value')
    
    def get_attribute_category(self, obj):
        return obj.attribute.category.name
    get_attribute_category.short_description = 'Category'


class ProductAttributeInline(admin.TabularInline):
    """Inline admin for product attributes"""
    model = ProductAttribute
    extra = 1
    fields = ['attribute', 'value']
    raw_id_fields = ['attribute']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'vendor', 'category', 'price_display', 'stock_display', 'status_badge', 'is_featured', 'views_count', 'sales_count', 'created_at')
    list_filter = ('category', 'status', 'is_featured', 'cod_available', ('created_at', admin.DateFieldListFilter), 'vendor')
    search_fields = ('name', 'description', 'category__name', 'vendor__shop_name', 'vendor__user__phone')
    readonly_fields = ('created_at', 'updated_at', 'views_count', 'sales_count')
    raw_id_fields = ('vendor', 'category')
    autocomplete_fields = ['vendor', 'category']
    inlines = [ProductAttributeInline]
    list_editable = ('is_featured',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('vendor', 'name', 'category', 'description')
        }),
        ('Pricing & Stock', {
            'fields': ('price', 'original_price', 'stock_quantity', 'low_stock_threshold'),
            'description': 'Set pricing and inventory levels'
        }),
        ('Features & Approval', {
            'fields': ('status', 'cod_available', 'is_featured', 'is_active'),
            'description': 'Use admin actions below to approve/reject products'
        }),
        ('SEO', {
            'fields': ('meta_title', 'meta_description'),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('views_count', 'sales_count'),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['approve_products', 'reject_products', 'mark_featured', 'unmark_featured', 'activate_products', 'deactivate_products']
    list_select_related = ['vendor', 'category']
    
    def price_display(self, obj):
        """Display price with discount indicator"""
        if obj.original_price and obj.original_price > obj.price:
            discount_pct = int(((obj.original_price - obj.price) / obj.original_price) * 100)
            return format_html(
                '<span style="color: #28a745; font-weight: bold;">${}</span> '
                '<span style="text-decoration: line-through; color: #999;">${}</span> '
                '<span style="background: #ff6b6b; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">-{}%</span>',
                f'{obj.price:.2f}', f'{obj.original_price:.2f}', discount_pct
            )
        return format_html(
            '<span style="color: #28a745; font-weight: bold;">${}</span>',
            f'{obj.price:.2f}'
        )
    price_display.short_description = 'Price'
    price_display.admin_order_field = 'price'
    
    def stock_display(self, obj):
        """Display stock status with color coding"""
        if obj.stock_quantity == 0:
            return format_html('<span style="color: #dc3545; font-weight: bold;">Out of Stock</span>', '')
        elif obj.stock_quantity < obj.low_stock_threshold:
            return format_html(
                '<span style="color: #ffc107; font-weight: bold;">⚠️  Low: {}</span>',
                obj.stock_quantity
            )
        else:
            return format_html(
                '<span style="color: #28a745;">✅ {}</span>',
                obj.stock_quantity
            )
    stock_display.short_description = 'Stock'
    stock_display.admin_order_field = 'stock_quantity'
    
    def status_badge(self, obj):
        """Display product status with badge"""
        colors = {
            'draft': '#6c757d',
            'pending': '#ffc107',
            'approved': '#28a745',
            'rejected': '#dc3545',
            'inactive': '#e83e8c'
        }
        icons = {
            'draft': '📝',
            'pending': '⏳',
            'approved': '✅',
            'rejected': '❌',
            'inactive': '🔒'
        }
        color = colors.get(obj.status, '#6c757d')
        icon = icons.get(obj.status, '•')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 10px; '
            'border-radius: 3px; font-weight: bold; font-size: 11px;">{} {}</span>',
            color, icon, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    def approve_products(self, request, queryset):
        """Bulk approve pending products"""
        updated = queryset.filter(status='pending').update(status='approved')
        if updated > 0:
            messages.success(request, f'✅ {updated} product(s) approved!')
    approve_products.short_description = '✅ Approve selected products'
    
    def reject_products(self, request, queryset):
        """Bulk reject pending products"""
        updated = queryset.filter(status='pending').update(status='rejected')
        if updated > 0:
            messages.success(request, f'❌ {updated} product(s) rejected.')
    reject_products.short_description = '❌ Reject selected products'
    
    def mark_featured(self, request, queryset):
        """Mark products as featured"""
        updated = queryset.update(is_featured=True)
        if updated > 0:
            messages.success(request, f'⭐ {updated} product(s) marked as featured.')
    mark_featured.short_description = '⭐ Mark as featured'
    
    def unmark_featured(self, request, queryset):
        """Unmark products as featured"""
        updated = queryset.update(is_featured=False)
        if updated > 0:
            messages.success(request, f'☆ {updated} product(s) unmarked from featured.')
    unmark_featured.short_description = '☆ Unmark as featured'
    
    def activate_products(self, request, queryset):
        """Activate products"""
        updated = queryset.update(is_active=True)
        if updated > 0:
            messages.success(request, f'✅ {updated} product(s) activated.')
    activate_products.short_description = '✅ Activate selected products'
    
    def deactivate_products(self, request, queryset):
        """Deactivate products"""
        updated = queryset.update(is_active=False)
        if updated > 0:
            messages.success(request, f'🔒 {updated} product(s) deactivated.')
    deactivate_products.short_description = '🔒 Deactivate selected products'


@admin.register(ProductAttribute)
class ProductAttributeAdmin(admin.ModelAdmin):
    list_display = ('product', 'attribute', 'value', 'created_at')
    list_filter = ('attribute__category', 'attribute', 'created_at')
    search_fields = ('product__name', 'attribute__name', 'value')
    raw_id_fields = ('product', 'attribute')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('get_product_name', 'created_at')
    list_filter = ('created_at',)
    readonly_fields = ('created_at',)
    raw_id_fields = ('product',)
    autocomplete_fields = ['product']
    def get_product_name(self, obj):
        return obj.product.name
    get_product_name.short_description = 'Product'
    get_product_name.admin_order_field = 'product__name'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('get_order_id', 'get_customer_info', 'total_display', 'status_badge', 'payment_method', 'city', 'item_count', 'created_at')
    list_filter = ('status', 'payment_method', 'city', ('created_at', admin.DateFieldListFilter))
    search_fields = ('customer__phone', 'customer__full_name', 'delivery_address', 'city')
    readonly_fields = ('created_at', 'updated_at', 'total_amount', 'get_items_summary')
    raw_id_fields = ('customer',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Order Info', {
            'fields': ('customer', 'status', 'payment_method', 'total_amount'),
            'description': 'Primary order information'
        }),
        ('Delivery Details', {
            'fields': ('delivery_address', 'city'),
        }),
        ('Items', {
            'fields': ('get_items_summary',),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_processing', 'mark_shipped', 'mark_delivered', 'mark_cancelled']
    list_select_related = ['customer']
    
    def get_order_id(self, obj):
        return format_html(
            '<strong style="color: #0056b3; font-family: monospace;">{}</strong>',
            str(obj.id)[:8].upper()
        )
    get_order_id.short_description = 'Order ID'
    
    def get_customer_info(self, obj):
        if obj.customer:
            return format_html(
                '<strong>{}</strong><br><small style="color: #666;">{}</small>',
                obj.customer.full_name, obj.customer.phone
            )
        return format_html('<em style="color: #999;">No customer</em>', '')
    get_customer_info.short_description = 'Customer'
    
    def total_display(self, obj):
        return format_html(
            '<span style="color: #28a745; font-weight: bold; font-size: 14px;">AFN {}</span>',
            f'{obj.total_amount or 0:.2f}'
        )
    total_display.short_description = 'Total'
    total_display.admin_order_field = 'total_amount'
    
    def status_badge(self, obj):
        """Display order status with color and icon"""
        colors = {
            'pending': '#ffc107',
            'processing': '#0dcaf0',
            'shipped': '#0d6efd',
            'delivered': '#198754',
            'cancelled': '#dc3545'
        }
        icons = {
            'pending': '⏳',
            'processing': '⚙️',
            'shipped': '📦',
            'delivered': '✅',
            'cancelled': '❌'
        }
        color = colors.get(obj.status, '#6c757d')
        icon = icons.get(obj.status, '•')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 10px; '
            'border-radius: 3px; font-weight: bold; font-size: 11px;">{} {}</span>',
            color, icon, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    def item_count(self, obj):
        count = obj.items.count()
        return format_html(
            '<span style="background: #e7f3ff; color: #0056b3; padding: 3px 8px; '
            'border-radius: 3px; font-weight: bold;">{} item(s)</span>',
            count
        )
    item_count.short_description = 'Items'
    
    def get_items_summary(self, obj):
        items = obj.items.select_related('product', 'vendor').all()
        if not items:
            return format_html('<em style="color: #999;">No items</em>', '')
        
        html = []
        for item in items:
            html.append(format_html(
                '<div style="padding: 8px; border-bottom: 1px solid #eee;">'
                '<strong>{}</strong> x {} @ AFN {}<br>'
                '<small style="color: #666;">Vendor: {}</small>'
                '</div>',
                item.product.name, item.quantity, item.price_at_order,
                item.vendor.shop_name if item.vendor else 'N/A'
            ))
        return mark_safe(''.join([str(h) for h in html]))
    get_items_summary.short_description = 'Order Items'
    
    def mark_processing(self, request, queryset):
        updated = queryset.filter(status='pending').update(status='processing')
        if updated > 0:
            messages.success(request, f'⚙️  {updated} order(s) marked as processing.')
    mark_processing.short_description = '⚙️  Mark as processing'
    
    def mark_shipped(self, request, queryset):
        updated = queryset.filter(status='processing').update(status='shipped')
        if updated > 0:
            messages.success(request, f'📦 {updated} order(s) marked as shipped.')
    mark_shipped.short_description = '📦 Mark as shipped'
    
    def mark_delivered(self, request, queryset):
        updated = queryset.filter(status__in=['processing', 'shipped']).update(status='delivered')
        if updated > 0:
            messages.success(request, f'✅ {updated} order(s) marked as delivered.')
    mark_delivered.short_description = '✅ Mark as delivered'
    
    def mark_cancelled(self, request, queryset):
        updated = queryset.exclude(status='delivered').update(status='cancelled')
        if updated > 0:
            messages.success(request, f'❌ {updated} order(s) cancelled.')
    mark_cancelled.short_description = '❌ Cancel orders'


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('get_order_id', 'get_product_name', 'quantity', 'price_at_order', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('order__customer__phone', 'product__name', 'vendor__shop_name')
    readonly_fields = ('created_at', 'price_at_order')
    raw_id_fields = ('order', 'product', 'vendor')
    
    def get_order_id(self, obj):
        return str(obj.order.id)[:8]
    get_order_id.short_description = 'Order ID'
    
    def get_product_name(self, obj):
        return obj.product.name
    get_product_name.short_description = 'Product'


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ('get_order_id', 'get_rider_phone', 'status', 'collected_amount', 'delivered_at', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('order__customer__phone', 'rider__phone')
    readonly_fields = ('created_at', 'updated_at', 'delivered_at')
    raw_id_fields = ('order', 'rider')
    
    fieldsets = (
        (None, {'fields': ('order', 'rider', 'status')}),
        (_('Delivery Info'), {'fields': ('collected_amount', 'delivered_at')}),
        (_('Dates'), {'fields': ('created_at', 'updated_at')}),
    )
    
    def get_order_id(self, obj):
        return str(obj.order.id)[:8]
    get_order_id.short_description = 'Order ID'
    
    def get_rider_phone(self, obj):
        return obj.rider.phone if obj.rider else 'Not assigned'
    get_rider_phone.short_description = 'Rider Phone'
    get_rider_phone.admin_order_field = 'rider__phone'


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ('get_vendor_name', 'amount', 'period_start', 'period_end', 'status', 'paid_at', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('vendor__shop_name', 'vendor__user__phone')
    readonly_fields = ('created_at', 'updated_at', 'paid_at')
    raw_id_fields = ('vendor',)
    
    fieldsets = (
        (None, {'fields': ('vendor', 'status')}),
        (_('Payout Info'), {'fields': ('amount', 'period_start', 'period_end')}),
        (_('Payment'), {'fields': ('paid_at',)}),
        (_('Dates'), {'fields': ('created_at', 'updated_at')}),
    )
    
    def get_vendor_name(self, obj):
        return obj.vendor.shop_name
    get_vendor_name.short_description = 'Vendor'



# Optional: If you need to create default groups, do it in a management command instead
# Or handle it in the UserAdmin.save_model() method as shown above

from .models import Address, Review, Cart

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ['user', 'label', 'city', 'province', 'is_default']
    list_filter = ['is_default', 'city']
    search_fields = ['user__full_name', 'label', 'city']

# @admin.register(Wishlist)
# class WishlistAdmin(admin.ModelAdmin):
#     list_display = ['user', 'product', 'created_at']
#     list_filter = ['created_at']
#     search_fields = ['user__full_name', 'product__name']

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['user__full_name', 'product__name', 'comment']

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'quantity', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__full_name', 'product__name']


# ============================================================================
# CUSTOM ADMIN SITE WITH ENHANCED DASHBOARD (Optional)
# ============================================================================
# NOTE: Currently using default Django admin with admin-interface theming
# This EnhancedAdminSite can be enabled in urls.py if needed

class EnhancedAdminSite(admin.AdminSite):
    """
    Custom admin site with enhanced home page showing operational summaries.
    To use this, update urls.py to use admin_site instead of admin.site
    """
    site_header = "🛍️  BazarAF Marketplace Admin"
    site_title = "BazarAF Admin"
    index_title = "Dashboard"
    
    def index(self, request, extra_context=None):
        """
        Enhanced admin home page with operational summaries
        """
        # Operational Metrics
        pending_applications = SellerApplication.objects.filter(status='pending').count()
        pending_products = Product.objects.filter(status='pending').count()
        pending_orders = Order.objects.filter(status='pending').count()
        recent_orders = Order.objects.count()
        
        # Vendor Metrics
        approved_vendors = Vendor.objects.filter(status='approved').count()
        pending_vendors = Vendor.objects.filter(status='pending').count()
        
        # Product Metrics
        approved_products = Product.objects.filter(status='approved').count()
        featured_products = Product.objects.filter(is_featured=True).count()
        
        # User Metrics
        total_customers = User.objects.filter(role='customer').count()
        total_vendors = User.objects.filter(role='vendor').count()
        
        # Recent data
        recent_applications = SellerApplication.objects.filter(status='pending').order_by('-created_at')[:5]
        recent_pending_products = Product.objects.filter(status='pending').order_by('-created_at')[:5]
        recent_orders_data = Order.objects.order_by('-created_at')[:5]
        
        extra_context = extra_context or {}
        extra_context.update({
            'pending_applications': pending_applications,
            'pending_products': pending_products,
            'pending_orders': pending_orders,
            'recent_orders_total': recent_orders,
            'approved_vendors': approved_vendors,
            'pending_vendors': pending_vendors,
            'approved_products': approved_products,
            'featured_products': featured_products,
            'total_customers': total_customers,
            'total_vendors': total_vendors,
            'recent_applications': recent_applications,
            'recent_pending_products': recent_pending_products,
            'recent_orders_list': recent_orders_data,
        })
        
        return super().index(request, extra_context)
from .models import DeliveryZone
admin.site.register(DeliveryZone)

from .models import SupportRequest, EmailJob, NewsletterSubscription

@admin.register(SupportRequest)
class SupportRequestAdmin(admin.ModelAdmin):
    list_display = ['subject', 'kind', 'status', 'created_at']
    list_filter = ['kind', 'status']
    readonly_fields = ['user', 'order', 'kind', 'subject', 'message', 'created_at', 'updated_at']

@admin.register(EmailJob)
class EmailJobAdmin(admin.ModelAdmin):
    list_display = ['subject', 'attempts', 'available_at', 'sent_at', 'last_error']
    readonly_fields = ['body', 'recipients', 'sender', 'subject', 'created_at']

admin.site.register(NewsletterSubscription)

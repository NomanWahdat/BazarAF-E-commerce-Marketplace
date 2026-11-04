"""
Django signals for automatic operations
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.exceptions import ObjectDoesNotExist
from .models import User, Vendor, SellerApplication, Notification, Product


@receiver(post_save, sender=User)
def create_vendor_when_role_changed_to_vendor(sender, instance, created, **kwargs):
    """
    Auto-create vendor when user role is changed to 'vendor'
    This handles the case when admin changes a user's role to vendor
    """
    if instance.role == 'vendor':
        try:
            # Check if vendor already exists
            vendor = Vendor.objects.get(user=instance)
        except ObjectDoesNotExist:
            # Vendor doesn't exist, create it with pending status
            vendor = Vendor.objects.create(
                user=instance,
                shop_name=f"{instance.full_name}'s Shop",
                address='',
                city='',
                status='pending'
            )
            
            # Create notification
            Notification.objects.create(
                user=instance,
                notification_type='vendor_approved',
                title='You are now a Vendor! 🎉',
                message='Your account has been upgraded to vendor. Please complete your shop details to get started.',
                link='/vendor'
            )


@receiver(post_save, sender=SellerApplication)
def link_seller_application_to_user_if_authenticated(sender, instance, created, **kwargs):
    """
    If a seller application is created by an authenticated user,
    link it to their user account
    """
    if created and not instance.user:
        # Try to find user by phone
        try:
            user = User.objects.get(phone=instance.phone)
            instance.user = user
            instance.save(update_fields=['user'])
        except ObjectDoesNotExist:
            pass


@receiver(post_save, sender=SellerApplication)
def notify_admins_new_seller_application(sender, instance, created, **kwargs):
    """
    Notify all admin users when a new seller application is submitted
    """
    if created:
        from .models import User
        # Get all admin users
        admin_users = User.objects.filter(role='admin') | User.objects.filter(is_superuser=True)
        
        for admin_user in admin_users:
            Notification.objects.create(
                user=admin_user,
                notification_type='seller_application_submitted',
                title='New Seller Application Submitted 📋',
                message=f'New seller application from {instance.full_name} ({instance.phone}). Shop: {instance.shop_name}',
                link='/admin/seller-applications'
            )


@receiver(post_save, sender=Product)
def notify_admins_new_product_submitted(sender, instance, created, **kwargs):
    """
    Notify all admin users when a new product is submitted for approval
    """
    if created and instance.status == 'pending':
        from .models import User
        # Get all admin users
        admin_users = User.objects.filter(role='admin') | User.objects.filter(is_superuser=True)
        
        for admin_user in admin_users:
            Notification.objects.create(
                user=admin_user,
                notification_type='product_submitted',
                title='New Product Submitted for Review 📦',
                message=f'Product "{instance.name}" submitted by {instance.vendor.shop_name} for approval.',
                link='/admin/products'
            )

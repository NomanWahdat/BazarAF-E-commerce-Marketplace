from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import SellerApplication, User, Vendor, Notification
from .admin_models import VendorAuditLog


@transaction.atomic
def approve_application(application, admin):
    application = SellerApplication.objects.select_for_update().get(pk=application.pk)
    if application.status != 'pending':
        raise ValidationError('Only pending applications can be approved.')
    user = application.user or User.objects.filter(phone=application.phone).first()
    created = user is None
    if created:
        user = User.objects.create_user(phone=application.phone, full_name=application.full_name,
                                        email=application.email, password=None, role='customer')
    if user.is_staff or user.is_superuser or user.role in ['admin', 'rider']:
        raise ValidationError('Use a dedicated seller account for this application.')
    user.role = 'vendor'
    user.save(update_fields=['role'])
    vendor, _ = Vendor.objects.update_or_create(user=user, defaults={
        'shop_name': application.shop_name, 'address': application.address, 'city': application.city,
        'identity_document': application.identity_document.name,
        'business_document': application.business_document.name, 'status': 'approved',
    })
    application.user = user
    application.vendor = vendor
    application.status = 'approved'
    application.reviewed_at = timezone.now()
    application.save()
    VendorAuditLog.objects.create(vendor=vendor, action_type='status_change',
        old_value={'status': 'pending'}, new_value={'status': 'approved'},
        reason='Seller application approved', admin_user=admin)
    Notification.objects.create(user=user, notification_type='vendor_approved',
        title='Seller application approved', message='Your shop is ready. You can submit products for review.', link='/vendor')
    if created and user.email:
        from .emails import send_password_reset_email
        token = user.generate_password_reset_token()
        send_password_reset_email(user, token, settings.FRONTEND_URL)
    return application, created

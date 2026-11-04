"""
Management command to approve a seller application and test the process
Usage: python manage.py approve_seller_app <app_id>
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from home.models import SellerApplication, User, Vendor, Notification
from django.utils import timezone
import logging
import secrets
import string

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Approve a seller application and create user + vendor'

    def add_arguments(self, parser):
        parser.add_argument('app_id', type=str, help='Application ID to approve')

    def handle(self, *args, **options):
        app_id = options['app_id']
        self.stdout.write(self.style.SUCCESS(f'🔍 Looking for application: {app_id}'))
        
        try:
            application = SellerApplication.objects.get(application_id=app_id)
        except SellerApplication.DoesNotExist:
            raise CommandError(f'Application {app_id} not found')
        
        self.stdout.write(f'📋 Application found: {application.full_name} ({application.phone})')
        self.stdout.write(f'📊 Current status: {application.status}')
        
        if application.status != 'pending':
            self.stdout.write(self.style.WARNING(f'⚠️  Application status is {application.status}, not pending'))
            return
        
        try:
            with transaction.atomic():
                # Step 1: Get or create user
                self.stdout.write(f'🔄 Getting or creating user...')
                user = User.objects.filter(phone=application.phone).first()
                password = None
                
                if not user:
                    self.stdout.write(f'✨ User does not exist, creating new user')
                    password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
                    user = User.objects.create(
                        phone=application.phone,
                        full_name=application.full_name,
                        email=application.email,
                        role='vendor',
                        is_active=True
                    )
                    user.set_password(password)
                    user.save(update_fields=['password'])
                    self.stdout.write(self.style.SUCCESS(f'✅ Created user: {user.id}'))
                else:
                    self.stdout.write(f'👤 User exists: {user.id} with role={user.role}')
                    if user.role != 'vendor':
                        self.stdout.write(f'🔄 Changing role to vendor')
                        user.role = 'vendor'
                    user.full_name = application.full_name
                    if application.email and not user.email:
                        user.email = application.email
                    user.save(update_fields=['role', 'full_name', 'email'])
                    self.stdout.write(self.style.SUCCESS(f'✅ Updated user role to: {user.role}'))
                
                # Verify
                user.refresh_from_db()
                self.stdout.write(f'✔️ Verified user role: {user.role}')
                
                # Step 2: Get or create vendor
                self.stdout.write(f'🏪 Getting or creating vendor...')
                vendor = Vendor.objects.filter(user=user).first()
                
                if not vendor:
                    self.stdout.write(f'✨ Vendor does not exist, creating...')
                    vendor = Vendor.objects.create(
                        user=user,
                        shop_name=application.shop_name,
                        address=application.address,
                        city=application.city,
                        identity_document=application.identity_document,
                        business_document=application.business_document,
                        status='approved'
                    )
                    self.stdout.write(self.style.SUCCESS(f'✅ Created vendor: {vendor.id}'))
                else:
                    self.stdout.write(f'🏪 Vendor exists, updating...')
                    vendor.shop_name = application.shop_name
                    vendor.address = application.address
                    vendor.city = application.city
                    vendor.status = 'approved'
                    if application.identity_document:
                        vendor.identity_document = application.identity_document
                    if application.business_document:
                        vendor.business_document = application.business_document
                    vendor.save()
                    self.stdout.write(self.style.SUCCESS(f'✅ Updated vendor'))
                
                # Step 3: Update application
                self.stdout.write(f'📝 Updating application...')
                application.status = 'approved'
                application.user = user
                application.vendor = vendor
                application.reviewed_at = timezone.now()
                application.save()
                self.stdout.write(self.style.SUCCESS(f'✅ Application approved'))
                
                # Step 4: Create notification
                self.stdout.write(f'🔔 Creating notification...')
                Notification.objects.create(
                    user=user,
                    notification_type='vendor_approved',
                    title='Seller Application Approved! 🎉',
                    message=f'Congratulations! Your shop "{application.shop_name}" has been approved. You can now start adding products and receiving orders.',
                    link='/vendor'
                )
                self.stdout.write(self.style.SUCCESS(f'✅ Notification created'))
                
                # Summary
                self.stdout.write(self.style.SUCCESS('\n' + '='*50))
                self.stdout.write(self.style.SUCCESS('✨ APPROVAL COMPLETE ✨'))
                self.stdout.write(self.style.SUCCESS('='*50))
                self.stdout.write(f'User ID: {user.id}')
                self.stdout.write(f'User Role: {user.role}')
                self.stdout.write(f'User Phone: {user.phone}')
                self.stdout.write(f'Vendor ID: {vendor.id}')
                self.stdout.write(f'Vendor Status: {vendor.status}')
                if password:
                    self.stdout.write(f'Password: {password}')
                
        except Exception as e:
            logger.exception(f'Error approving application')
            raise CommandError(f'Error: {str(e)}')

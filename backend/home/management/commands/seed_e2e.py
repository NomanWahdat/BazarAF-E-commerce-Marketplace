from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from home.models import User, Vendor, Category, Product, DeliveryZone


class Command(BaseCommand):
    help = 'Create synthetic browser-test fixtures; requires Bazar.e2e_settings.'
    def handle(self, *args, **options):
        if not getattr(settings, 'IS_E2E', False):
            raise CommandError('Use only --settings=Bazar.e2e_settings.')
        for phone, role in [('+93709990001', 'customer'), ('+93709990002', 'vendor'), ('+93709990003', 'admin')]:
            user, _ = User.objects.get_or_create(phone=phone, defaults={'full_name': f'E2E {role}', 'role': role})
            user.set_password('E2eOnly!Password123')
            user.save()
        vendor = Vendor.objects.get(user__phone='+93709990002')
        vendor.status = 'approved'
        vendor.shop_name = 'Kabul Test Shop'
        vendor.save()
        category, _ = Category.objects.get_or_create(slug='e2e-groceries', defaults={'name': 'Test Groceries'})
        Product.objects.update_or_create(slug='e2e-tea', defaults={'name': 'Afghan green tea',
            'description': 'Synthetic test fixture', 'vendor': vendor, 'category': category,
            'price': 100, 'stock_quantity': 100, 'status': 'approved', 'is_active': True})
        DeliveryZone.objects.update_or_create(province='Kabul', city='Kabul', defaults={'fee': 50})
        self.stdout.write('Synthetic E2E accounts and catalog ready.')

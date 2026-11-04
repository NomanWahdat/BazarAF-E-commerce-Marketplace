from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import skipUnless
from django.db import connection, close_old_connections
from django.test import TransactionTestCase
from rest_framework.test import APIClient
from .models import User, Product, Vendor, Category, DeliveryZone, Order


@skipUnless(connection.vendor == 'postgresql', 'Row-lock concurrency requires PostgreSQL.')
class CheckoutConcurrencyTests(TransactionTestCase):
    def test_two_buyers_cannot_purchase_the_last_unit(self):
        seller = User.objects.create_user(phone='+93702000001', full_name='Seller', password='test', role='vendor')
        Vendor.objects.filter(user=seller).update(status='approved')
        category = Category.objects.create(name='Concurrency category')
        product = Product.objects.create(name='Last unit', vendor=seller.vendor_profile, category=category,
                                         price=100, stock_quantity=1, status='approved', is_active=True)
        buyers = [User.objects.create_user(phone=f'+9370200000{n}', full_name='Buyer', password='test') for n in [2, 3]]
        DeliveryZone.objects.create(province='Kabul', city='Kabul', fee=50)
        barrier = Barrier(2)
        def buy(user_id):
            close_old_connections()
            try:
                client = APIClient()
                client.force_authenticate(User.objects.get(pk=user_id))
                barrier.wait(timeout=10)
                return client.post('/api/orders/checkout/', {'customer_name': 'Buyer',
                    'delivery_address': {'province': 'Kabul', 'city': 'Kabul', 'address': 'District 3'},
                    'items': [{'product_id': str(product.pk), 'quantity': 1}]}, format='json').status_code
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(buy, [user.pk for user in buyers]))
        self.assertEqual(sorted(results), [201, 400])
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 0)
        self.assertEqual(Order.objects.count(), 1)

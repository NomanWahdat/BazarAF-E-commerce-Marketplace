#!/usr/bin/env python
"""Diagnostic script to analyze order and vendor issues"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Bazar.settings')
django.setup()

from home.models import Order, OrderItem, User, Vendor

print("=== ORDERS ANALYSIS ===")
orders = Order.objects.all()
print(f"Total orders: {orders.count()}")

for order in orders[:10]:
    print(f"\nOrder ID: {order.id}")
    print(f"Order #: {order.order_id}")
    print(f"Customer: {order.customer}")
    print(f"Customer Name: {order.customer_name}")
    print(f"Status: {order.status}")
    
    # Check associated items
    items = OrderItem.objects.filter(order=order)
    print(f"Items count: {items.count()}")
    for item in items:
        print(f"  - Product: {item.product_name}, Vendor: {item.vendor}")

print("\n=== VENDOR ANALYSIS ===")
vendors = Vendor.objects.all()
print(f"Total vendors: {vendors.count()}")

for vendor in vendors[:10]:
    print(f"\nVendor: {vendor.shop_name}")
    print(f"Vendor User: {vendor.user.full_name}")
    print(f"User Role: {vendor.user.role}")
    print(f"Vendor Status: {vendor.status}")
    
    # Check orders this vendor is associated with
    order_items = OrderItem.objects.filter(vendor=vendor)
    print(f"Orders with this vendor: {order_items.values_list('order_id', flat=True).distinct().count()}")

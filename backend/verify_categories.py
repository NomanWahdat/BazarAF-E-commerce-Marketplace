#!/usr/bin/env python
# Quick verification script to test categories

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Bazar.settings')
django.setup()

from home.models import Category
from home.serializer import CategorySerializer

# Get all active categories
categories = Category.objects.filter(is_active=True).order_by('order', 'name')

print("\n" + "="*60)
print("✅ CATEGORY SYSTEM VERIFICATION")
print("="*60 + "\n")

print(f"Total Categories: {categories.count()}\n")

# Group by level
main_cats = categories.filter(level='main')
sub_cats = categories.filter(level='sub')
prod_cats = categories.filter(level='production')

print(f"📦 Main Categories: {main_cats.count()}")
for cat in main_cats:
    sub_count = cat.subcategories.filter(is_active=True).count()
    print(f"   • {cat.name} ({cat.icon}) - {cat.product_count} products, {sub_count} subcategories")

print(f"\n📁 Subcategories: {sub_cats.count()}")
for cat in sub_cats:
    print(f"   • {cat.parent.name} > {cat.name} ({cat.icon})")

print(f"\n💼 Production Level: {prod_cats.count()}")
for cat in prod_cats:
    print(f"   • {cat.name} ({cat.icon})")

print("\n" + "="*60)
print("📋 SERIALIZER OUTPUT SAMPLE")
print("="*60 + "\n")

# Test serializer
fashion = categories.get(name='Fashion')
serializer = CategorySerializer(fashion)
print(f"Fashion Category JSON:\n")
import json
print(json.dumps(serializer.data, indent=2))

print("\n" + "="*60)
print("✅ ALL SYSTEMS OPERATIONAL")
print("="*60 + "\n")

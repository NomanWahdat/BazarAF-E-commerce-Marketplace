#!/usr/bin/env python
# Cleanup script to remove duplicate categories

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Bazar.settings')
django.setup()

from home.models import Category

# Find and remove the old electronics entry without icon (if exists)
electronics_no_icon = Category.objects.filter(name='electronics', level='main', icon='')

if electronics_no_icon.exists():
    count = electronics_no_icon.count()
    electronics_no_icon.delete()
    print(f"✅ Deleted {count} duplicate electronics category(ies) without icon")
else:
    print("✅ No duplicates found")

# Verify final count
final_count = Category.objects.filter(level='main', is_active=True).count()
print(f"✅ Final main categories count: {final_count}")

# Data migration to create default categories

from django.db import migrations
import uuid


def create_categories(apps, schema_editor):
    """Create default categories with production levels"""
    Category = apps.get_model('home', 'Category')
    
    # Define main categories with their properties
    main_categories = [
        {
            'name': 'Fashion',
            'description': 'Clothing, shoes, and accessories for men, women, and children',
            'icon': 'Shirt',
            'color': '#ec4899',
            'order': 1,
        },
        {
            'name': 'Electronics',
            'description': 'Phones, laptops, tablets, and electronic gadgets',
            'icon': 'Smartphone',
            'color': '#3b82f6',
            'order': 2,
        },
        {
            'name': 'Home & Garden',
            'description': 'Furniture, decor, kitchenware, and garden supplies',
            'icon': 'Home',
            'color': '#f59e0b',
            'order': 3,
        },
        {
            'name': 'Beauty & Care',
            'description': 'Cosmetics, skincare, haircare, and personal grooming',
            'icon': 'Sparkles',
            'color': '#f97316',
            'order': 4,
        },
        {
            'name': 'Sports & Outdoors',
            'description': 'Sports equipment, fitness gear, and outdoor accessories',
            'icon': 'Dumbbell',
            'color': '#10b981',
            'order': 5,
        },
        {
            'name': 'Books & Media',
            'description': 'Books, educational materials, and digital media',
            'icon': 'BookOpen',
            'color': '#6366f1',
            'order': 6,
        },
        {
            'name': 'Toys & Games',
            'description': 'Toys, games, puzzles, and entertainment for all ages',
            'icon': 'Gamepad2',
            'color': '#06b6d4',
            'order': 7,
        },
        {
            'name': 'Groceries',
            'description': 'Food, beverages, and household essentials',
            'icon': 'ShoppingBasket',
            'color': '#84cc16',
            'order': 8,
        },
    ]
    
    # Create main categories
    created_categories = {}
    for cat_data in main_categories:
        category, created = Category.objects.get_or_create(
            name=cat_data['name'],
            defaults={
                'id': uuid.uuid4(),
                'description': cat_data['description'],
                'icon': cat_data['icon'],
                'level': 'main',
                'color': cat_data['color'],
                'order': cat_data['order'],
                'is_active': True,
            }
        )
        if created:
            print(f"✅ Created category: {category.name}")
        created_categories[cat_data['name']] = category
    
    # Define subcategories (Fashion example - can be expanded)
    subcategories = {
        'Fashion': [
            {
                'name': 'Men Clothing',
                'description': 'T-shirts, shirts, pants, and traditional wear for men',
                'icon': 'Users',
                'color': '#0891b2',
            },
            {
                'name': 'Women Clothing',
                'description': 'Dresses, sarees, and traditional wear for women',
                'icon': 'Users2',
                'color': '#db2777',
            },
            {
                'name': 'Accessories',
                'description': 'Belts, scarves, hats, and fashion accessories',
                'icon': 'Zap',
                'color': '#fbbf24',
            },
        ],
        'Electronics': [
            {
                'name': 'Phones & Tablets',
                'description': 'Smartphones, tablets, and accessories',
                'icon': 'Smartphone',
                'color': '#3b82f6',
            },
            {
                'name': 'Laptops & Computers',
                'description': 'Laptops, desktops, and computer peripherals',
                'icon': 'Laptop',
                'color': '#60a5fa',
            },
            {
                'name': 'Audio & Video',
                'description': 'Headphones, speakers, cameras, and video equipment',
                'icon': 'Volume2',
                'color': '#93c5fd',
            },
        ],
    }
    
    # Create subcategories
    for parent_name, subs in subcategories.items():
        parent = created_categories.get(parent_name)
        if parent:
            for order, sub_data in enumerate(subs, 1):
                subcategory, created = Category.objects.get_or_create(
                    name=sub_data['name'],
                    defaults={
                        'id': uuid.uuid4(),
                        'description': sub_data['description'],
                        'icon': sub_data['icon'],
                        'level': 'sub',
                        'parent': parent,
                        'color': sub_data['color'],
                        'order': order,
                        'is_active': True,
                    }
                )
                if created:
                    print(f"✅ Created subcategory: {parent.name} > {subcategory.name}")
    
    # Create production level category
    production_cat, created = Category.objects.get_or_create(
        name='Wholesale',
        defaults={
            'id': uuid.uuid4(),
            'description': 'Bulk orders and wholesale products for businesses and resellers',
            'icon': 'TrendingUp',
            'level': 'production',
            'color': '#7c3aed',
            'order': 0,
            'is_active': True,
        }
    )
    if created:
        print(f"✅ Created production level category: {production_cat.name}")


def delete_categories(apps, schema_editor):
    """Reverse function - delete created categories"""
    Category = apps.get_model('home', 'Category')
    # Only delete categories we created, marked by their names
    category_names = [
        'Fashion', 'Electronics', 'Home & Garden', 'Beauty & Care',
        'Sports & Outdoors', 'Books & Media', 'Toys & Games', 'Groceries',
        'Men Clothing', 'Women Clothing', 'Accessories',
        'Phones & Tablets', 'Laptops & Computers', 'Audio & Video',
        'Wholesale'
    ]
    Category.objects.filter(name__in=category_names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0008_category_enhancements'),
    ]

    operations = [
        migrations.RunPython(create_categories, delete_categories),
    ]

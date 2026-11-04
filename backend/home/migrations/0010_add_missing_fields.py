# Generated migration to add missing fields

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0009_create_default_categories'),
    ]

    operations = [
        # Add slug field to Category (without unique constraint initially)
        migrations.AddField(
            model_name='category',
            name='slug',
            field=models.SlugField(
                default='',
                help_text='URL-friendly unique identifier for the category',
                max_length=255
            ),
            preserve_default=False,
        ),
        # Add commission_rate field to Category
        migrations.AddField(
            model_name='category',
            name='commission_rate',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Commission percentage for products in this category',
                max_digits=5
            ),
            preserve_default=False,
        ),
        # Add requires_approval field to Category
        migrations.AddField(
            model_name='category',
            name='requires_approval',
            field=models.BooleanField(default=False, help_text='Whether products in this category require approval before listing'),
        ),
        # Add min_price field to Category
        migrations.AddField(
            model_name='category',
            name='min_price',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Minimum price allowed for products in this category',
                max_digits=10,
                null=True
            ),
        ),
        # Add max_price field to Category
        migrations.AddField(
            model_name='category',
            name='max_price',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Maximum price allowed for products in this category',
                max_digits=10,
                null=True
            ),
        ),
        # Add meta_title field to Category
        migrations.AddField(
            model_name='category',
            name='meta_title',
            field=models.CharField(
                blank=True,
                help_text='SEO meta title for the category page',
                max_length=255,
                null=True
            ),
        ),
        # Add meta_description field to Category
        migrations.AddField(
            model_name='category',
            name='meta_description',
            field=models.TextField(
                blank=True,
                help_text='SEO meta description for the category page',
                null=True
            ),
        ),
        # Add is_active field back to Product
        migrations.AddField(
            model_name='product',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        # Add slug field to Product
        migrations.AddField(
            model_name='product',
            name='slug',
            field=models.SlugField(
                default='',
                help_text='URL-friendly unique identifier for the product',
                max_length=255
            ),
            preserve_default=False,
        ),
        # Add cod_available field to Product
        migrations.AddField(
            model_name='product',
            name='cod_available',
            field=models.BooleanField(default=False, help_text='Whether Cash on Delivery is available for this product'),
        ),
        # Add is_featured field to Product
        migrations.AddField(
            model_name='product',
            name='is_featured',
            field=models.BooleanField(default=False),
        ),
        # Add views_count field to Product
        migrations.AddField(
            model_name='product',
            name='views_count',
            field=models.PositiveIntegerField(default=0),
        ),
        # Add sales_count field to Product
        migrations.AddField(
            model_name='product',
            name='sales_count',
            field=models.PositiveIntegerField(default=0),
        ),
        # Add low_stock_threshold field to Product
        migrations.AddField(
            model_name='product',
            name='low_stock_threshold',
            field=models.IntegerField(default=10),
        ),
    ]

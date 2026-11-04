from django.db import migrations, models
import django.db.models.deletion


def backfill_product_category(apps, schema_editor):
    Product = apps.get_model('home', 'Product')
    Category = apps.get_model('home', 'Category')

    null_products = Product.objects.filter(category__isnull=True)
    if not null_products.exists():
        return

    fallback_category = Category.objects.filter(is_active=True).order_by('name').first()
    if fallback_category is None:
        fallback_category = Category.objects.create(
            name='Uncategorized',
            description='Auto-created fallback category for legacy products.',
            icon='Package',
            is_active=True,
        )

    null_products.update(category=fallback_category)


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0013_attribute_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='first_name',
            field=models.CharField(default='', max_length=100, blank=True),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='user',
            name='last_name',
            field=models.CharField(default='', max_length=100, blank=True),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='user',
            name='avatar',
            field=models.ImageField(upload_to='user_avatars/', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='province',
            field=models.CharField(max_length=100, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='postal_code',
            field=models.CharField(max_length=20, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='country',
            field=models.CharField(max_length=100, default='Afghanistan'),
        ),
        migrations.AddField(
            model_name='vendor',
            name='avatar',
            field=models.ImageField(upload_to='vendor_avatars/', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='logo',
            field=models.ImageField(upload_to='vendor_logos/', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='banner',
            field=models.ImageField(upload_to='vendor_banners/', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='shipping_policy',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='vendor',
            name='return_policy',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='vendor',
            name='terms_conditions',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='vendor',
            name='privacy_policy',
            field=models.TextField(blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='vendor',
            name='faqs_json',
            field=models.TextField(default='[]', blank=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='notify_email_new_order',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='notify_email_order_shipped',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='notify_email_new_review',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='notify_email_new_message',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='notify_email_product_approved',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='notify_email_marketing',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='vendor',
            name='notify_sms_urgent_order',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='notify_in_app',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='notify_sound',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='digest_type',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('instant', 'Instant'),
                    ('hourly', 'Hourly'),
                    ('daily', 'Daily'),
                    ('weekly', 'Weekly'),
                ],
                default='instant',
            ),
        ),
        migrations.AddField(
            model_name='vendor',
            name='two_factor_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='vendor',
            name='phone_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='vendor',
            name='primary_color',
            field=models.CharField(max_length=7, default='#059669'),
        ),
        migrations.RunPython(backfill_product_category, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='product',
            name='category',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='products',
                to='home.category',
            ),
        ),
    ]

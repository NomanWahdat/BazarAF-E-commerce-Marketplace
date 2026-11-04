# Generated migration to add missing ProductImage fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0011_product_meta_fields'),
    ]

    operations = [
        # Add is_primary field to ProductImage
        migrations.AddField(
            model_name='productimage',
            name='is_primary',
            field=models.BooleanField(default=False),
        ),
        # Add display_order field to ProductImage
        migrations.AddField(
            model_name='productimage',
            name='display_order',
            field=models.IntegerField(default=0),
        ),
    ]

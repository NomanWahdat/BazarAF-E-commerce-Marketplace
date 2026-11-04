# Generated migration to add remaining missing fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0010_add_missing_fields'),
    ]

    operations = [
        # Add meta_title field to Product
        migrations.AddField(
            model_name='product',
            name='meta_title',
            field=models.CharField(
                blank=True,
                help_text='SEO meta title for the product page',
                max_length=255,
                null=True
            ),
        ),
        # Add meta_description field to Product
        migrations.AddField(
            model_name='product',
            name='meta_description',
            field=models.TextField(
                blank=True,
                help_text='SEO meta description for the product page',
                null=True
            ),
        ),
    ]

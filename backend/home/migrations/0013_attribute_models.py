# Generated migration to create attribute models

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0012_productimage_fields'),
    ]

    operations = [
        # Create CategoryAttribute table
        migrations.CreateModel(
            name='CategoryAttribute',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('attribute_type', models.CharField(
                    choices=[('text', 'Text'), ('number', 'Number'), ('select', 'Single Select'), ('multi_select', 'Multi Select'), ('boolean', 'Yes/No')],
                    max_length=20
                )),
                ('is_required', models.BooleanField(default=False)),
                ('is_filterable', models.BooleanField(default=True)),
                ('display_order', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attributes', to='home.category')),
            ],
            options={
                'verbose_name': 'Category Attribute',
                'verbose_name_plural': 'Category Attributes',
                'ordering': ['display_order', 'name'],
            },
        ),
        # Create AttributeValue table
        migrations.CreateModel(
            name='AttributeValue',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('value', models.CharField(max_length=255)),
                ('display_order', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('attribute', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='values', to='home.categoryattribute')),
            ],
            options={
                'verbose_name': 'Attribute Value',
                'verbose_name_plural': 'Attribute Values',
                'ordering': ['display_order', 'value'],
            },
        ),
        # Create ProductAttribute table
        migrations.CreateModel(
            name='ProductAttribute',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('value', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('attribute', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='home.categoryattribute')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='product_attributes', to='home.product')),
            ],
            options={
                'verbose_name': 'Product Attribute',
                'verbose_name_plural': 'Product Attributes',
            },
        ),
        # Add unique constraints and indexes
        migrations.AddConstraint(
            model_name='categoryattribute',
            constraint=models.UniqueConstraint(fields=['category', 'name'], name='unique_category_attribute'),
        ),
        migrations.AddIndex(
            model_name='categoryattribute',
            index=models.Index(fields=['category'], name='home_catego_categor_idx'),
        ),
        migrations.AddConstraint(
            model_name='attributevalue',
            constraint=models.UniqueConstraint(fields=['attribute', 'value'], name='unique_attribute_value'),
        ),
        migrations.AddIndex(
            model_name='attributevalue',
            index=models.Index(fields=['attribute'], name='home_attrib_attribut_idx'),
        ),
        migrations.AddConstraint(
            model_name='productattribute',
            constraint=models.UniqueConstraint(fields=['product', 'attribute'], name='unique_product_attribute'),
        ),
        migrations.AddIndex(
            model_name='productattribute',
            index=models.Index(fields=['product'], name='home_product_product_idx'),
        ),
        migrations.AddIndex(
            model_name='productattribute',
            index=models.Index(fields=['attribute'], name='home_product_attribute_idx'),
        ),
    ]

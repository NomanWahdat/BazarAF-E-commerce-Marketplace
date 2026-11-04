# Generated migration for category enhancements

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0007_email_verification_and_password_reset'),
    ]

    operations = [
        # Add new fields to Category
        migrations.AddField(
            model_name='category',
            name='level',
            field=models.CharField(
                choices=[('main', 'Main Category'), ('sub', 'Subcategory'), ('production', 'Production Level')],
                default='main',
                help_text='Production level: main category, subcategory, or production level',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='category',
            name='parent',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='subcategories',
                to='home.category'
            ),
        ),
        migrations.AddField(
            model_name='category',
            name='color',
            field=models.CharField(default='#0d9488', help_text='Color hex code for UI display', max_length=7),
        ),
        migrations.AddField(
            model_name='category',
            name='order',
            field=models.PositiveIntegerField(default=0, help_text='Display order in UI'),
        ),
        # Update unique constraint
        migrations.AlterUniqueTogether(
            name='category',
            unique_together={('name', 'level')},
        ),
        # Update Meta ordering
        migrations.AlterModelOptions(
            name='category',
            options={'ordering': ['order', 'name'], 'verbose_name': 'Category', 'verbose_name_plural': 'Categories'},
        ),
    ]

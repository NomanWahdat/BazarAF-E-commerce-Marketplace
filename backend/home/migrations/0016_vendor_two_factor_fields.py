from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0015_alter_productimage_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='vendor',
            name='backup_codes_generated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='backup_codes_hashed',
            field=models.TextField(blank=True, default='[]'),
        ),
        migrations.AddField(
            model_name='vendor',
            name='totp_secret',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name='vendor',
            name='two_factor_confirmed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

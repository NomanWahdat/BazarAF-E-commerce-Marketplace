# Generated migration for admin models

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0016_vendor_two_factor_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='CommissionHistory',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('old_rate', models.DecimalField(decimal_places=2, max_digits=5)),
                ('new_rate', models.DecimalField(decimal_places=2, max_digits=5)),
                ('effective_date', models.DateField(auto_now_add=True)),
                ('reason', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('changed_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='commission_changes', to='home.user')),
                ('vendor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='commission_history', to='home.vendor')),
            ],
            options={
                'verbose_name': 'Commission History',
                'verbose_name_plural': 'Commission Histories',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ReviewModeration',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('is_flagged', models.BooleanField(default=True)),
                ('flag_category', models.CharField(blank=True, choices=[('spam', 'Spam'), ('fake', 'Fake/Duplicate'), ('offensive', 'Offensive Language'), ('irrelevant', 'Irrelevant to Product'), ('other', 'Other')], max_length=20)),
                ('reason', models.TextField(blank=True, help_text='Admin notes on why review was flagged')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('unflagged_at', models.DateTimeField(blank=True, null=True)),
                ('deletion_reason', models.TextField(blank=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('flagged_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='flagged_reviews', to='home.user')),
                ('review', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='moderation', to='home.review')),
            ],
            options={
                'verbose_name': 'Review Moderation',
                'verbose_name_plural': 'Review Moderations',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='VendorAuditLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('action_type', models.CharField(choices=[('commission_update', 'Commission Rate Updated'), ('status_change', 'Status Changed'), ('suspension', 'Vendor Suspended'), ('unsuspension', 'Vendor Unsuspended'), ('flag_set', 'Vendor Flagged'), ('flag_removed', 'Vendor Flag Removed'), ('policy_update', 'Policy Updated'), ('manual_note', 'Manual Admin Note')], max_length=50)),
                ('old_value', models.JSONField(blank=True, default=dict, help_text='Previous value(s)', null=True)),
                ('new_value', models.JSONField(blank=True, default=dict, help_text='New value(s)', null=True)),
                ('reason', models.TextField(blank=True, help_text='Why this action was taken')),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('admin_user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='vendor_audit_logs', to='home.user')),
                ('vendor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audit_logs', to='home.vendor')),
            ],
            options={
                'verbose_name': 'Vendor Audit Log',
                'verbose_name_plural': 'Vendor Audit Logs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AdminDashboardStats',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('pending_vendors', models.IntegerField(default=0)),
                ('approved_vendors', models.IntegerField(default=0)),
                ('suspended_vendors', models.IntegerField(default=0)),
                ('pending_products', models.IntegerField(default=0)),
                ('approved_products', models.IntegerField(default=0)),
                ('rejected_products', models.IntegerField(default=0)),
                ('pending_orders', models.IntegerField(default=0)),
                ('active_orders', models.IntegerField(default=0)),
                ('delivered_orders', models.IntegerField(default=0)),
                ('flagged_reviews', models.IntegerField(default=0)),
                ('total_commission_collected', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('pending_payouts', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('last_updated', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Admin Dashboard Stats',
                'verbose_name_plural': 'Admin Dashboard Stats',
            },
        ),
        migrations.AddIndex(
            model_name='vendorauditlog',
            index=models.Index(fields=['vendor', '-created_at'], name='home_vendor_vendor__070d4b_idx'),
        ),
        migrations.AddIndex(
            model_name='vendorauditlog',
            index=models.Index(fields=['action_type', '-created_at'], name='home_vendor_action__20f4af_idx'),
        ),
        migrations.AddIndex(
            model_name='reviewmoderation',
            index=models.Index(fields=['is_flagged', '-created_at'], name='home_review_is_flag_81e0b4_idx'),
        ),
        migrations.AddIndex(
            model_name='reviewmoderation',
            index=models.Index(fields=['flag_category'], name='home_review_flag_ca_52c46e_idx'),
        ),
        migrations.AddIndex(
            model_name='commissionhistory',
            index=models.Index(fields=['vendor', '-created_at'], name='home_commis_vendor__3113bc_idx'),
        ),
    ]

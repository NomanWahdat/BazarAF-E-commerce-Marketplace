# Generated manually for notification types update

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0017_add_admin_models'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(choices=[('vendor_approved', 'Vendor Approved'), ('vendor_rejected', 'Vendor Rejected'), ('order_placed', 'Order Placed'), ('order_delivered', 'Order Delivered'), ('product_approved', 'Product Approved'), ('product_rejected', 'Product Rejected'), ('payout_processed', 'Payout Processed'), ('new_review', 'New Review'), ('customer_message', 'Customer Message'), ('seller_application_submitted', 'Seller Application Submitted'), ('product_submitted', 'Product Submitted')], max_length=50),
        ),
    ]
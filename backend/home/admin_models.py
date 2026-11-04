"""
Admin-only models for custom admin dashboard.
These models support admin operations that require tracking and auditing.
"""
from django.db import models
import uuid


class CommissionHistory(models.Model):
    """
    Track commission rate changes for auditing and vendor notifications.
    Allows admins to view and preview impact of rate changes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey('home.Vendor', on_delete=models.CASCADE, related_name='commission_history')
    old_rate = models.DecimalField(max_digits=5, decimal_places=2)
    new_rate = models.DecimalField(max_digits=5, decimal_places=2)
    effective_date = models.DateField(auto_now_add=True)
    reason = models.CharField(max_length=255, blank=True)
    changed_by = models.ForeignKey('home.User', on_delete=models.SET_NULL, null=True, related_name='commission_changes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Commission History'
        verbose_name_plural = 'Commission Histories'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vendor', '-created_at']),
        ]

    def __str__(self):
        return f"{self.vendor.shop_name}: {self.old_rate}% → {self.new_rate}%"


class ReviewModeration(models.Model):
    """
    Flag inappropriate reviews with categorization.
    Supports review quality control without deleting reviews.
    """
    FLAG_CATEGORIES = [
        ('spam', 'Spam'),
        ('fake', 'Fake/Duplicate'),
        ('offensive', 'Offensive Language'),
        ('irrelevant', 'Irrelevant to Product'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review = models.OneToOneField('home.Review', on_delete=models.CASCADE, related_name='moderation')
    is_flagged = models.BooleanField(default=True)
    flag_category = models.CharField(max_length=20, choices=FLAG_CATEGORIES, blank=True)
    reason = models.TextField(blank=True, help_text="Admin notes on why review was flagged")
    flagged_by = models.ForeignKey('home.User', on_delete=models.SET_NULL, null=True, related_name='flagged_reviews')
    created_at = models.DateTimeField(auto_now_add=True)
    unflagged_at = models.DateTimeField(null=True, blank=True)
    deletion_reason = models.TextField(blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Review Moderation'
        verbose_name_plural = 'Review Moderations'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_flagged', '-created_at']),
            models.Index(fields=['flag_category']),
        ]

    def __str__(self):
        status = f"({self.flag_category})" if self.flag_category else ""
        return f"Review {self.review.id} - {'Flagged' if self.is_flagged else 'Unflagged'} {status}"


class VendorAuditLog(models.Model):
    """
    Track all admin actions on vendors for compliance and troubleshooting.
    Immutable audit trail for vendor status changes, commission updates, etc.
    """
    ACTION_TYPES = [
        ('commission_update', 'Commission Rate Updated'),
        ('status_change', 'Status Changed'),
        ('suspension', 'Vendor Suspended'),
        ('unsuspension', 'Vendor Unsuspended'),
        ('flag_set', 'Vendor Flagged'),
        ('flag_removed', 'Vendor Flag Removed'),
        ('policy_update', 'Policy Updated'),
        ('manual_note', 'Manual Admin Note'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey('home.Vendor', on_delete=models.CASCADE, related_name='audit_logs')
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
    old_value = models.JSONField(default=dict, blank=True, null=True, help_text="Previous value(s)")
    new_value = models.JSONField(default=dict, blank=True, null=True, help_text="New value(s)")
    reason = models.TextField(blank=True, help_text="Why this action was taken")
    admin_user = models.ForeignKey('home.User', on_delete=models.SET_NULL, null=True, related_name='vendor_audit_logs')
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Vendor Audit Log'
        verbose_name_plural = 'Vendor Audit Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vendor', '-created_at']),
            models.Index(fields=['action_type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.vendor.shop_name} - {self.get_action_type_display()}"


class AdminDashboardStats(models.Model):
    """
    Cached stats for admin dashboard performance.
    Recalculated periodically or on-demand.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Seller stats
    pending_vendors = models.IntegerField(default=0)
    approved_vendors = models.IntegerField(default=0)
    suspended_vendors = models.IntegerField(default=0)
    
    # Product stats
    pending_products = models.IntegerField(default=0)
    approved_products = models.IntegerField(default=0)
    rejected_products = models.IntegerField(default=0)
    
    # Order stats
    pending_orders = models.IntegerField(default=0)
    active_orders = models.IntegerField(default=0)
    delivered_orders = models.IntegerField(default=0)
    
    # Review stats
    flagged_reviews = models.IntegerField(default=0)
    
    # Financial stats
    total_commission_collected = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pending_payouts = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Admin Dashboard Stats'
        verbose_name_plural = 'Admin Dashboard Stats'

    def __str__(self):
        return f"Dashboard Stats (Updated: {self.last_updated})"

    @staticmethod
    def get_or_create_stats():
        """Get or create singleton stats instance"""
        obj, created = AdminDashboardStats.objects.get_or_create(id='00000000-0000-0000-0000-000000000000')
        return obj

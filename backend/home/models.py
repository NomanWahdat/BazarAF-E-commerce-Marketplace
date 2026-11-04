from .fields import EncryptedTextField
from .storage import private_document_storage
# home/models.py
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
import uuid

class UserManager(BaseUserManager):
    def create_user(self, phone, full_name, password=None, **extra_fields):
        """Create and return a regular user with phone number"""
        if not phone:
            raise ValueError('Users must have a phone number')
        if not full_name:
            raise ValueError('Users must have a full name')
        
        user = self.model(
            phone=phone,
            full_name=full_name,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, full_name, password=None, **extra_fields):
        """Create and return a superuser"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(phone, full_name, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('customer', 'Customer'),
        ('vendor', 'Vendor'),
        ('admin', 'Admin'),
        ('rider', 'Rider'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=255)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True, null=True)
    avatar = models.ImageField(upload_to='user_avatars/', null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    # Email verification fields
    email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=255, blank=True, null=True)
    email_verification_token_created = models.DateTimeField(blank=True, null=True)
    
    # Password reset fields
    password_reset_token = models.CharField(max_length=255, blank=True, null=True)
    password_reset_token_created = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Custom related_name for groups and permissions to avoid clash
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name='custom_user_set',  # Custom related_name
        related_query_name='custom_user'
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='custom_user_set',  # Custom related_name
        related_query_name='custom_user'
    )

    objects = UserManager()

    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} ({self.phone})"

    def get_full_name(self):
        return self.full_name

    def get_short_name(self):
        return self.full_name.split()[0] if self.full_name else ''

    @property
    def is_admin(self):
        return self.role == 'admin' or self.is_superuser
    
    def save(self, *args, **kwargs):
        """Normalize phone number to +93 format before saving"""
        if self.phone:
            # Remove any spaces and special characters except the leading +
            phone = self.phone.strip().replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
            
            # Handle different phone formats for Afghanistan
            if not phone.startswith('+'):
                # If starts with 0, replace with country code
                if phone.startswith('0'):
                    phone = '+93' + phone[1:]
                # If just digits, add country code
                elif phone.isdigit():
                    phone = '+93' + phone
            
            self.phone = phone
        
        super().save(*args, **kwargs)
    
    def generate_email_verification_token(self):
        import secrets
        from django.utils import timezone
        
        self.email_verification_token = f"{secrets.randbelow(1000000):06d}"
        self.email_verification_token_created = timezone.now()
        self.save()
        return self.email_verification_token
    
    def verify_email_token(self, token):
        from django.utils import timezone
        from datetime import timedelta
        
        if self.email_verification_token == str(token).strip():
            if self.email_verification_token_created and timezone.now() - self.email_verification_token_created < timedelta(minutes=15):
                self.email_verified = True
                self.email_verification_token = None
                self.email_verification_token_created = None
                self.save()
                return True
        return False
    
    def generate_password_reset_token(self):
        """Generate a secure password reset token"""
        import secrets
        from django.utils import timezone
        
        self.password_reset_token = secrets.token_urlsafe(32)
        self.password_reset_token_created = timezone.now()
        self.save()
        return self.password_reset_token
    
    def verify_password_reset_token(self, token):
        """Verify password reset token"""
        from django.utils import timezone
        from datetime import timedelta
        
        if self.password_reset_token == token:
            # Token expires after 1 hour
            if self.password_reset_token_created and timezone.now() - self.password_reset_token_created < timedelta(hours=1):
                return True
        return False
    
    def reset_password(self, token, new_password):
        """Reset password using token"""
        if self.verify_password_reset_token(token):
            self.set_password(new_password)
            self.password_reset_token = None
            self.password_reset_token_created = None
            self.save()
            return True
        return False


class Vendor(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('suspended', 'Suspended'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='vendor_profile')

    shop_name = models.CharField(max_length=255)
    address = models.TextField()
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, default='Afghanistan')

    # 👇 DOCUMENTS
    identity_document = models.FileField(
        upload_to='vendor_docs/identity/', storage=private_document_storage,
        null=True,
        blank=True
    )
    business_document = models.FileField(
        upload_to='vendor_docs/business/', storage=private_document_storage,
        null=True,
        blank=True
    )
    
    # 👇 STOREFRONT
    avatar = models.ImageField(upload_to='vendor_avatars/', null=True, blank=True)
    logo = models.ImageField(upload_to='vendor_logos/', null=True, blank=True)
    banner = models.ImageField(upload_to='vendor_banners/', null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=8.00)
    
    # 👇 POLICIES
    shipping_policy = models.TextField(blank=True)
    return_policy = models.TextField(blank=True)
    terms_conditions = models.TextField(blank=True)
    privacy_policy = models.TextField(blank=True)
    faqs_json = models.TextField(default='[]', blank=True)
    
    # 👇 NOTIFICATIONS
    notify_email_new_order = models.BooleanField(default=True)
    notify_email_order_shipped = models.BooleanField(default=True)
    notify_email_new_review = models.BooleanField(default=True)
    notify_email_new_message = models.BooleanField(default=True)
    notify_email_product_approved = models.BooleanField(default=True)
    notify_email_marketing = models.BooleanField(default=False)
    notify_sms_urgent_order = models.BooleanField(default=True)
    notify_in_app = models.BooleanField(default=True)
    notify_sound = models.BooleanField(default=True)
    digest_type = models.CharField(
        max_length=20,
        choices=[
            ('instant', 'Instant'),
            ('hourly', 'Hourly'),
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
        ],
        default='instant'
    )
    
    # 👇 SECURITY
    two_factor_enabled = models.BooleanField(default=False)
    totp_secret = EncryptedTextField(blank=True, null=True)
    two_factor_confirmed_at = models.DateTimeField(blank=True, null=True)
    backup_codes_hashed = models.TextField(default='[]', blank=True)
    backup_codes_generated_at = models.DateTimeField(blank=True, null=True)
    phone_verified = models.BooleanField(default=False)
    
    # 👇 APPEARANCE
    primary_color = models.CharField(max_length=7, default='#059669')
    favicon = models.ImageField(upload_to='vendor_favicons/', null=True, blank=True)
    featured_products_json = models.TextField(default='[]', blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.shop_name

    def set_backup_codes_hashed(self, hashes_json: str):
        self.backup_codes_hashed = hashes_json
        self.backup_codes_generated_at = timezone.now()
# backend/home/models.py - ADD THIS NEW MODEL

class SellerApplication(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application_id = models.CharField(max_length=50, unique=True, blank=True)
    
    # Link to user (optional - if authenticated when applying)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='seller_applications')
    
    # Applicant Details
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    
    # Shop Details
    shop_name = models.CharField(max_length=255)
    address = models.TextField()
    city = models.CharField(max_length=100)
    
    # Documents
    identity_document = models.FileField(upload_to='seller_applications/identity/', storage=private_document_storage)
    business_document = models.FileField(upload_to='seller_applications/business/', storage=private_document_storage, null=True, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True)
    
    # Created vendor (after approval)
    # CHANGED FROM OneToOneField to ForeignKey to allow multiple applications per vendor
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='applications')
    
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.application_id} - {self.full_name}"
    
    def save(self, *args, **kwargs):
        if not self.application_id:
            from datetime import datetime
            self.application_id = f"APP-{datetime.now().year}-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

# ====================
# CATEGORY MODEL
# ====================
class Category(models.Model):
    LEVEL_CHOICES = [
        ('main', 'Main Category'),
        ('sub', 'Subcategory'),
        ('production', 'Production Level'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True, allow_unicode=True)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=100, blank=True, null=True, help_text="Lucide icon name")
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='main')
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='subcategories')
    color = models.CharField(max_length=7, default='#0d9488', help_text="Color hex code for UI")
    order = models.PositiveIntegerField(default=0, help_text="Display order in UI")
    is_active = models.BooleanField(default=True)
    
    # SEO fields
    meta_title = models.CharField(max_length=255, blank=True, null=True)
    meta_description = models.TextField(blank=True, null=True)
    
    # Business rules
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    requires_approval = models.BooleanField(default=False)
    min_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        ordering = ['order', 'name']
        unique_together = [('name', 'level')]
        indexes = [
            models.Index(fields=['parent']),
            models.Index(fields=['slug']),
            models.Index(fields=['level']),
            models.Index(fields=['is_active']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = f'{slugify(self.name, allow_unicode=True)[:200] or "item"}-{str(self.pk)[:8]}'
        
        # Auto-determine level based on parent
        if self.parent:
            if self.parent.level == 'main':
                self.level = 'sub'
            elif self.parent.level == 'sub':
                self.level = 'production'
            else:
                raise ValueError("Maximum category depth is 3 levels")
        else:
            self.level = 'main'
        
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
    
    def get_full_path(self):
        """Returns full category path: Main > Sub > Production"""
        if self.parent:
            return f"{self.parent.get_full_path()} > {self.name}"
        return self.name
    
    def get_product_count(self):
        """Returns total products in this category and all subcategories"""
        count = self.products.filter(status='approved').count()
        for child in self.subcategories.all():
            count += child.get_product_count()
        return count
    
    @property
    def product_count(self):
        return self.get_product_count()

class Product(models.Model):

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('inactive', 'Inactive'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True, allow_unicode=True)
    description = models.TextField()

    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.CASCADE,
        related_name='products'
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='products'
    )

    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    stock_quantity = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.IntegerField(default=10)

    # Features
    cod_available = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Status field (Replaces is_active for more granular control)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    # SEO
    meta_title = models.CharField(max_length=255, blank=True, null=True)
    meta_description = models.TextField(blank=True, null=True)
    
    # Stats
    views_count = models.IntegerField(default=0)
    sales_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['vendor']),
            models.Index(fields=['slug']),
            models.Index(fields=['status']),
            models.Index(fields=['is_active']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = f'{slugify(self.name, allow_unicode=True)[:200] or "item"}-{str(self.pk)[:8]}'
        
        # Calculate original price to price ratio for discount
        if self.original_price and self.original_price > self.price:
            pass  # Discount will be calculated in property
        
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def average_rating(self):
        reviews = self.reviews.all()
        if reviews.exists():
            from django.db.models import Avg
            return reviews.aggregate(Avg('rating'))['rating__avg']
        return 0.0

    @property
    def review_count(self):
        return self.reviews.count()

    @property
    def discount_percentage(self):
        if self.original_price and self.original_price > self.price:
            return int(
                ((self.original_price - self.price) / self.original_price) * 100
            )
        return 0
    
    @property
    def in_stock(self):
        return self.stock_quantity > 0
    
    @property
    def is_low_stock(self):
        return 0 < self.stock_quantity <= self.low_stock_threshold


class ProductImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/')
    is_primary = models.BooleanField(default=False)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Product Image'
        verbose_name_plural = 'Product Images'
        ordering = ['display_order', '-created_at']

    def __str__(self):
        return f"Image for {self.product.name}"


# ====================
# CATEGORY ATTRIBUTE MODELS
# ====================

class CategoryAttribute(models.Model):
    """
    Define attributes for specific categories
    E.g., Mobile Phones: RAM, Storage, Screen Size
         Clothing: Size, Color, Material
    """
    ATTRIBUTE_TYPES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('select', 'Single Select'),
        ('multi_select', 'Multi Select'),
        ('boolean', 'Yes/No'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='attributes')
    name = models.CharField(max_length=100)  # e.g., "RAM", "Size", "Color"
    attribute_type = models.CharField(max_length=20, choices=ATTRIBUTE_TYPES)
    is_required = models.BooleanField(default=False)
    is_filterable = models.BooleanField(default=True)  # Show in product filters
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Category Attribute'
        verbose_name_plural = 'Category Attributes'
        ordering = ['display_order', 'name']
        unique_together = ['category', 'name']
        indexes = [
            models.Index(fields=['category']),
        ]
    
    def __str__(self):
        return f"{self.category.name} - {self.name}"


class AttributeValue(models.Model):
    """
    Predefined values for select/multi_select attributes
    E.g., RAM: 4GB, 6GB, 8GB, 12GB
         Size: S, M, L, XL, XXL
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attribute = models.ForeignKey(CategoryAttribute, on_delete=models.CASCADE, related_name='values')
    value = models.CharField(max_length=255)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Attribute Value'
        verbose_name_plural = 'Attribute Values'
        ordering = ['display_order', 'value']
        unique_together = ['attribute', 'value']
        indexes = [
            models.Index(fields=['attribute']),
        ]
    
    def __str__(self):
        return f"{self.attribute.name}: {self.value}"


class ProductAttribute(models.Model):
    """
    Actual attribute values for each product
    E.g., iPhone 13 Pro: RAM = 6GB, Storage = 256GB
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='product_attributes')
    attribute = models.ForeignKey(CategoryAttribute, on_delete=models.CASCADE)
    value = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Product Attribute'
        verbose_name_plural = 'Product Attributes'
        unique_together = ['product', 'attribute']
        indexes = [
            models.Index(fields=['product']),
            models.Index(fields=['attribute']),
        ]
    
    def __str__(self):
        return f"{self.product.name} - {self.attribute.name}: {self.value}"


# ============================================
# FILE 1: backend/home/models.py
# ============================================
# UPDATE YOUR Order MODEL - Add these fields:

class SupportRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='support_requests')
    order = models.ForeignKey('Order', on_delete=models.PROTECT, null=True, blank=True)
    kind = models.CharField(max_length=20, choices=[('general', 'General question'), ('return', 'Return / refund')], default='general')
    subject = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=[('open', 'Open'), ('resolved', 'Resolved')], default='open')
    response = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class NewsletterSubscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE)
    email = models.EmailField()
    confirmed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['vendor', 'email'], name='unique_shop_subscription')]


class AuthSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='auth_sessions')
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)


class EmailJob(models.Model):
    subject = models.CharField(max_length=255)
    body = models.TextField()
    sender = models.EmailField()
    recipients = models.JSONField(default=list)
    attempts = models.PositiveIntegerField(default=0)
    available_at = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class DeliveryZone(models.Model):
    province = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=200)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['province', 'city'], name='unique_delivery_city'),
                       models.CheckConstraint(condition=models.Q(fee__gte=0), name='nonnegative_delivery_fee')]

    def __str__(self):
        return f'{self.province} / {self.city}'


class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),  # ADD THIS
        ('picked', 'Picked'),
        ('shipped', 'Shipped'),  # ADD THIS
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # NEW FIELD - Add this
    order_id = models.CharField(max_length=50, unique=True, db_index=True, blank=True)
    
    # Update this field to be optional
    customer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    
    # NEW FIELDS - Add these
    customer_name = models.CharField(max_length=255, blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='AFN', editable=False)
    checkout_key = models.CharField(max_length=64, null=True, blank=True, unique=True)
    checkout_hash = models.CharField(max_length=64, blank=True)
    payment_method = models.CharField(max_length=20, default='COD')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    delivery_address = models.TextField()
    city = models.CharField(max_length=100)
    
    # NEW FIELDS - Add these
    province = models.CharField(max_length=100, blank=True)
    delivery_notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.order_id or self.id} - {self.customer_name or 'Guest'}"
    
    # ADD THIS METHOD
    def save(self, *args, **kwargs):
        if not self.order_id:
            # Generate unique order ID
            import uuid
            from datetime import datetime
            self.order_id = f"ORD-{datetime.now().year}-{uuid.uuid4().hex[:20].upper()}"
        super().save(*args, **kwargs)


# UPDATE YOUR OrderItem MODEL - Add this field:
class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, null=True, blank=True)
    confirmed = models.BooleanField(default=False)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # NEW FIELD - Add this
    product_name = models.CharField(max_length=255, blank=True)
    
    quantity = models.PositiveIntegerField()
    price_at_order = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.quantity} x {self.product_name or (self.product.name if self.product else 'Unknown')}"
    
    # ADD THIS METHOD
    def save(self, *args, **kwargs):
        # Store product name when creating order item
        if not self.product_name and self.product:
            self.product_name = self.product.name
        super().save(*args, **kwargs)


class Delivery(models.Model):
    STATUS_CHOICES = (
        ('assigned', 'Assigned'),
        ('picked', 'Picked'),
        ('on_the_way', 'On The Way'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='delivery')
    rider = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                              limit_choices_to={'role': 'rider'})
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='assigned')
    collected_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Delivery'
        verbose_name_plural = 'Deliveries'
        ordering = ['-created_at']

    def __str__(self):
        return f"Delivery for Order #{self.order.id}"


class Payout(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='payouts')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_reference = models.CharField(max_length=200, blank=True)
    paid_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name='recorded_payouts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Payout'
        verbose_name_plural = 'Payouts'
        ordering = ['-created_at']

    def __str__(self):
        return f"Payout #{self.id} - {self.vendor.shop_name}"
    
    # Changes by Noman



from django.db import models
import uuid


class SettlementLine(models.Model):
    item = models.OneToOneField(OrderItem, on_delete=models.PROTECT, related_name='settlement')
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT)
    gross = models.DecimalField(max_digits=10, decimal_places=2)
    commission = models.DecimalField(max_digits=10, decimal_places=2)
    net = models.DecimalField(max_digits=10, decimal_places=2)
    payout = models.ForeignKey(Payout, on_delete=models.PROTECT, null=True, blank=True, related_name='lines')
    created_at = models.DateTimeField(auto_now_add=True)


# Address Model
class Address(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    label = models.CharField(max_length=50)  # Home, Office, etc.
    full_address = models.TextField()
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Address'
        verbose_name_plural = 'Addresses'
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.label} - {self.user.full_name}"

    def save(self, *args, **kwargs):
        # If this address is set as default, remove default from others
        if self.is_default:
            Address.objects.filter(user=self.user, is_default=True).update(is_default=False)
        super().save(*args, **kwargs)


# Wishlist Model
# class Wishlist(models.Model):
#     id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
#     user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist')
#     product = models.ForeignKey(Product, on_delete=models.CASCADE)
#     created_at = models.DateTimeField(auto_now_add=True)

#     class Meta:
#         verbose_name = 'Wishlist'
#         verbose_name_plural = 'Wishlists'
#         unique_together = ('user', 'product')
#         ordering = ['-created_at']

#     def __str__(self):
#         return f"{self.user.full_name} - {self.product.name}"


# Review Model
class Review(models.Model):
    RATING_CHOICES = [(i, i) for i in range(1, 6)]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(choices=RATING_CHOICES)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'
        unique_together = ('user', 'product', 'order')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.full_name} - {self.product.name} ({self.rating}★)"


# Cart Model
class Cart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cart')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cart'
        verbose_name_plural = 'Carts'
        unique_together = ('user', 'product')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.full_name} - {self.product.name} (x{self.quantity})"

    @property
    def total_price(self):
        return self.product.price * self.quantity
    


from django.db import models
import uuid

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('vendor_approved', 'Vendor Approved'),
        ('vendor_rejected', 'Vendor Rejected'),
        ('order_placed', 'Order Placed'),
        ('order_delivered', 'Order Delivered'),
        ('product_approved', 'Product Approved'),
        ('product_rejected', 'Product Rejected'),
        ('payout_processed', 'Payout Processed'),
        ('new_review', 'New Review'),
        ('customer_message', 'Customer Message'),
        ('seller_application_submitted', 'Seller Application Submitted'),
        ('product_submitted', 'Product Submitted'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.full_name}"

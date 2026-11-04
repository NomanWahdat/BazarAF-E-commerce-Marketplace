"""
serializers.py - Professional E-commerce API Serializers
"""
import json
import os
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.validators import RegexValidator, EmailValidator
from django.db import transaction
from .phone import normalize_phone
from .uploads import validate_document
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from .models import (
    User, Vendor, Category, Product, ProductImage,
    Order, OrderItem, Delivery, Payout, SellerApplication, Notification,
    CategoryAttribute, AttributeValue, ProductAttribute
)


def _safe_json_list(raw_value, limit=5):
    if raw_value is None:
        return []
    try:
        parsed = raw_value if isinstance(raw_value, list) else json.loads(raw_value)
    except Exception:
        return []
    if not isinstance(parsed, list):
        return []

    values = []
    seen = set()
    for item in parsed:
        item_str = str(item).strip()
        if not item_str or item_str in seen:
            continue
        seen.add(item_str)
        values.append(item_str)
        if len(values) >= limit:
            break
    return values


def _file_url(file_field, request=None):
    if not file_field:
        return None
    try:
        url = file_field.url
    except Exception:
        return None
    if request:
        try:
            return request.build_absolute_uri(url)
        except Exception:
            return url
    return url


# ====================
# UTILITY SERIALIZERS
# ====================
class PhoneValidator(RegexValidator):
    regex = r'^\+?1?\d{9,15}$'
    message = "Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."


# ====================
# USER SERIALIZERS
# ====================
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'phone', 'full_name', 'email', 
            'role', 'is_active', 'created_at'
        ]
        read_only_fields = ['created_at', 'is_active']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'phone', 'full_name', 'email', 
            'role', 'password', 'password_confirm'
        ]
        extra_kwargs = {
            'phone': {'validators': [PhoneValidator()]},
            'email': {'validators': [EmailValidator()]},
        }
    
    def validate(self, data):
        # Check password match
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        
        # Check phone uniqueness
        if User.objects.filter(phone=data['phone']).exists():
            raise serializers.ValidationError({"phone": "Phone number already registered."})
        
        # Check email uniqueness if provided
        if data.get('email') and User.objects.filter(email__iexact=data['email']).exists():
            raise serializers.ValidationError({"email": "Email already registered."})
        
        # Validate password strength
        validate_password(data['password'])
        
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['full_name', 'email']
        extra_kwargs = {
            'email': {'validators': [EmailValidator()]},
        }
    
    def validate_email(self, value):
        user = self.context['request'].user
        if User.objects.filter(email__iexact=value).exclude(id=user.id).exists():
            raise serializers.ValidationError("Email already registered.")
        return value.lower()

    def update(self, instance, validated_data):
        if 'email' in validated_data and validated_data['email'].lower() != (instance.email or '').lower():
            instance.email_verified = False
            instance.email_verification_token = None
        return super().update(instance, validated_data)


# ====================
# VENDOR SERIALIZERS
# ====================
class VendorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    logo = serializers.SerializerMethodField()
    banner = serializers.SerializerMethodField()
    favicon = serializers.SerializerMethodField()
    featured_products = serializers.SerializerMethodField()
    
    class Meta:
        model = Vendor
        fields = [
            'id',
            'user',
            'shop_name',
            'address',
            'city',
            'identity_document',
            'business_document',
            'status',
            'status_display',  # ← ADD THIS LINE
            'commission_rate',
            'primary_color',
            'logo',
            'banner',
            'favicon',
            'featured_products',
            'created_at',
            # ... any other fields you have
        ]

    def get_logo(self, obj):
        request = self.context.get('request')
        return _file_url(obj.logo, request)

    def get_banner(self, obj):
        request = self.context.get('request')
        return _file_url(obj.banner, request)

    def get_favicon(self, obj):
        request = self.context.get('request')
        return _file_url(obj.favicon, request)

    def get_featured_products(self, obj):
        return _safe_json_list(getattr(obj, 'featured_products_json', '[]'))

    def create(self, validated_data):
        # Remove user from validated_data since we'll get it from context
        user = self.context['request'].user
        
        # Make sure user is not in validated_data
        validated_data.pop('user', None)
        
        # Create vendor
        vendor = Vendor.objects.create(user=user, **validated_data)
        return vendor
       

       


# backend/home/serializers.py

class VendorCreateSerializer(serializers.ModelSerializer):
    def validate_identity_document(self, value):
        return validate_document(value)

    def validate_business_document(self, value):
        return validate_document(value)

    # User fields
    full_name = serializers.CharField(write_only=True)
    phone = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, min_length=8, validators=[validate_password])
    
    class Meta:
        model = Vendor
        fields = [
            'full_name', 'phone', 'email', 'password',
            'shop_name', 'address', 'city',
            'identity_document', 'business_document'
        ]
        extra_kwargs = {
            'identity_document': {'required': False},
            'business_document': {'required': False},
        }
    
    def validate_phone(self, value):
        value = normalize_phone(value)
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Phone number already registered")
        return value
    
    def validate_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value
    
    @transaction.atomic
    def create(self, validated_data):
        # Extract user data
        full_name = validated_data.pop('full_name')
        phone = validated_data.pop('phone')
        email = validated_data.pop('email', '')
        password = validated_data.pop('password')
        
        # Create user
        user = User.objects.create(
            phone=phone,
            full_name=full_name,
            email=email,
            role='vendor',
            is_active=True  # Make sure user is active
        )
        user.set_password(password)
        user.save()
        
        # Create vendor
        vendor, _ = Vendor.objects.update_or_create(user=user, defaults={**validated_data, 'status': 'pending'})
        
        return vendor

class VendorUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ['shop_name', 'address', 'city']

# backend/home/serializers.py - ADD THIS

class SellerApplicationSerializer(serializers.ModelSerializer):
    def validate_identity_document(self, value):
        return validate_document(value)

    def validate_business_document(self, value):
        return validate_document(value)

    user_id = serializers.UUIDField(source='user.id', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    
    class Meta:
        model = SellerApplication
        fields = [
            'id', 'application_id', 'user_id', 'user_phone', 'full_name', 'phone', 'email',
            'shop_name', 'address', 'city',
            'identity_document', 'business_document',
            'status', 'created_at'
        ]
        read_only_fields = ['id', 'application_id', 'status', 'created_at', 'user_id', 'user_phone']
    
    def validate_phone(self, value):
        value = normalize_phone(value)
        # Check if application already exists
        if SellerApplication.objects.filter(phone=value, status='pending').exists():
            raise serializers.ValidationError("An application with this phone number is already pending")
        return value
    
    def validate_email(self, value):
        # Check if application already exists
        if SellerApplication.objects.filter(email=value, status='pending').exists():
            raise serializers.ValidationError("An application with this email is already pending")
        return value
# ====================
# PRODUCT SERIALIZERS
# ====================
class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url']
        read_only_fields = ['id']
    
    def get_image_url(self, obj):
        """
        Return the absolute image URL.
        If request is available in context, use build_absolute_uri().
        Otherwise, return the image.url directly (relative path that frontned can handle).
        """
        request = self.context.get('request')
        return _file_url(obj.image, request)


# ====================
# ATTRIBUTE SERIALIZERS
# ====================
class AttributeValueSerializer(serializers.ModelSerializer):
    """Serializer for attribute values (predefined options)"""
    
    class Meta:
        model = AttributeValue
        fields = ['id', 'value', 'display_order']
        read_only_fields = ['id']


class CategoryAttributeSerializer(serializers.ModelSerializer):
    """Serializer for category attributes with their values"""
    values = AttributeValueSerializer(many=True, read_only=True)
    
    class Meta:
        model = CategoryAttribute
        fields = [
            'id', 'name', 'attribute_type', 'is_required',
            'is_filterable', 'display_order', 'values'
        ]
        read_only_fields = ['id']


class ProductAttributeSerializer(serializers.ModelSerializer):
    """Serializer for product attribute values"""
    attribute_name = serializers.CharField(source='attribute.name', read_only=True)
    attribute_type = serializers.CharField(source='attribute.attribute_type', read_only=True)
    
    class Meta:
        model = ProductAttribute
        fields = ['id', 'attribute', 'attribute_name', 'attribute_type', 'value']
        read_only_fields = ['id']


class PublicVendorSerializer(serializers.ModelSerializer):
    is_verified = serializers.SerializerMethodField()
    class Meta:
        model = Vendor
        fields = ['id', 'shop_name', 'city', 'primary_color', 'logo', 'banner', 'favicon', 'is_verified']
    def get_is_verified(self, obj):
        return obj.status == 'approved'


class ProductSerializer(serializers.ModelSerializer):
    vendor = PublicVendorSerializer(read_only=True)
    vendor_id = serializers.UUIDField(source='vendor.id', read_only=True)
    vendor_name = serializers.CharField(source='vendor.shop_name', read_only=True)
    vendor_verified = serializers.BooleanField(source='vendor.status', read_only=True, default=False)
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    product_attributes = ProductAttributeSerializer(many=True, read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)
    discount_percentage = serializers.SerializerMethodField()
    in_stock = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'vendor', 'vendor_id', 'vendor_name', 'vendor_verified',
            'name', 'slug', 'description', 'price', 'original_price',
            'stock_quantity', 'category', 'category_name', 'status',
            'images', 'product_attributes', 'created_at', 'average_rating', 
            'review_count', 'discount_percentage', 'in_stock', 'cod_available',
            'is_featured', 'views_count', 'sales_count', 'meta_title',
            'meta_description', 'low_stock_threshold', 'is_low_stock'
        ]
        read_only_fields = ['id', 'slug', 'vendor', 'created_at', 'average_rating', 
                           'review_count', 'views_count', 'sales_count', 'in_stock']

    def get_discount_percentage(self, obj):
        """Calculate discount percentage"""
        if obj.original_price and obj.original_price > 0:
            discount = ((obj.original_price - obj.price) / obj.original_price) * 100
            return int(discount)
        return 0


class ProductUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating products"""
    category_name = serializers.CharField(write_only=True, required=False)
    attributes = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Product
        fields = [
            'name', 'description', 'price', 'original_price',
            'stock_quantity', 'cod_available', 'is_featured',
            'low_stock_threshold', 'meta_title', 'meta_description',
            'attributes', 'status', 'category_name'
        ]
        read_only_fields = ['status', 'is_featured']
    
    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0.")
        return value
    
    def validate_stock_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock quantity cannot be negative.")
        return value
    
    @transaction.atomic
    def update(self, instance, validated_data):
        # Extract nested data
        attributes_data = validated_data.pop('attributes', None)
        category_name = validated_data.pop('category_name', None)

        if category_name:
            try:
                instance.category = Category.objects.get(name__iexact=category_name.strip())
            except Category.DoesNotExist:
                raise serializers.ValidationError({
                    'category_name': 'Category not found. Please enter a valid category name.'
                })
        
        # Material edits return the listing to moderation.
        if any(key in validated_data for key in ['name', 'description', 'price']) or category_name:
            instance.status = 'pending'
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update product attributes
        if attributes_data is not None:
            instance.product_attributes.all().delete()
            for attr_data in attributes_data:
                try:
                    attribute = CategoryAttribute.objects.get(
                        id=attr_data.get('attribute'),
                        category=instance.category
                    )
                    ProductAttribute.objects.create(
                        product=instance,
                        attribute=attribute,
                        value=attr_data.get('value', '')
                    )
                except CategoryAttribute.DoesNotExist:
                    pass
        
        return instance



class ProductDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single product view"""
    category_id = serializers.UUIDField(source='category.id', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    vendor = PublicVendorSerializer(read_only=True)
    vendor_id = serializers.UUIDField(source='vendor.id', read_only=True)
    vendor_name = serializers.CharField(source='vendor.shop_name', read_only=True)
    vendor_verified = serializers.BooleanField(source='vendor.status', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    product_attributes = ProductAttributeSerializer(many=True, read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'category_id', 'category_name', 'category_slug',
            'price', 'original_price', 'discount_percentage',
            'vendor', 'vendor_id', 'vendor_name', 'vendor_verified',
            'stock_quantity', 'cod_available', 'is_featured', 
            'images', 'product_attributes', 'average_rating', 'review_count',
            'in_stock', 'is_low_stock', 'views_count', 'sales_count',
            'meta_title', 'meta_description', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'vendor', 'average_rating', 'review_count',
                           'views_count', 'sales_count', 'discount_percentage',
                           'in_stock', 'is_low_stock', 'created_at', 'updated_at']


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for product listings"""
    vendor = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    average_rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)
    discount_percentage = serializers.SerializerMethodField()
    in_stock = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'price', 'original_price',
            'discount_percentage', 'category_name', 'vendor',
            'images', 'primary_image', 'average_rating',
            'review_count', 'cod_available', 'in_stock', 'is_featured',
            'stock_quantity', 'status'
        ]
        read_only_fields = ['id', 'slug']
    
    def get_vendor(self, obj):
        """Return vendor with is_verified flag and phone number"""
        if obj.vendor:
            request = self.context.get('request')
            return {
                'id': str(obj.vendor.id),
                'shop_name': obj.vendor.shop_name,
                'is_verified': obj.vendor.status == 'approved',
                'primary_color': obj.vendor.primary_color,
                'logo': _file_url(obj.vendor.logo, request),
                'banner': _file_url(obj.vendor.banner, request),
                'favicon': _file_url(obj.vendor.favicon, request),
                'featured_products': _safe_json_list(getattr(obj.vendor, 'featured_products_json', '[]')),
                'city': obj.vendor.city
            }
        return None
    
    def get_images(self, obj):
        """Return all product images as a list"""
        images = []
        request = self.context.get('request')
        
        # Get all images ordered by display_order
        for img in obj.images.all().order_by('display_order', '-is_primary'):
            image_url = None
            if request:
                try:
                    image_url = request.build_absolute_uri(img.image.url)
                except:
                    image_url = img.image.url if img.image else None
            else:
                image_url = img.image.url if img.image else None
            
            if image_url:
                images.append({
                    'id': str(img.id),
                    'image': image_url,
                    'image_url': image_url,
                    'is_primary': img.is_primary
                })
        
        return images if images else []
    
    def get_primary_image(self, obj):
        primary = obj.images.filter(is_primary=True).first()
        if primary:
            request = self.context.get('request')
            if request:
                try:
                    return request.build_absolute_uri(primary.image.url)
                except:
                    return primary.image.url if primary.image else None
            return primary.image.url if primary.image else None
        first_image = obj.images.first()
        if first_image:
            request = self.context.get('request')
            if request:
                try:
                    return request.build_absolute_uri(first_image.image.url)
                except:
                    return first_image.image.url if first_image.image else None
            return first_image.image.url if first_image.image else None
        return None

    def get_discount_percentage(self, obj):
        """Calculate discount percentage"""
        if obj.original_price and obj.original_price > 0:
            discount = ((obj.original_price - obj.price) / obj.original_price) * 100
            return int(discount)
        return 0


class ProductCreateSerializer(serializers.ModelSerializer):
    attributes = serializers.ListField(child=serializers.DictField(), required=False, write_only=True)

    @transaction.atomic
    def create(self, validated_data):
        attributes = validated_data.pop('attributes', [])
        product = super().create(validated_data)
        for entry in attributes:
            attribute = CategoryAttribute.objects.filter(pk=entry.get('attribute'), category=product.category).first()
            if not attribute:
                raise serializers.ValidationError({'attributes': 'Attribute does not belong to this category.'})
            ProductAttribute.objects.create(product=product, attribute=attribute, value=str(entry.get('value', '')))
        return product

    class Meta:
        model = Product
        fields = [
            'name', 'description', 'price',
            'stock_quantity', 'category', 'status', 'original_price', 'cod_available',
            'meta_title', 'meta_description', 'low_stock_threshold', 'attributes'
        ]
        read_only_fields = ['status']
    
    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0.")
        return value
    
    def validate_stock_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock quantity cannot be negative.")
        return value


# ====================
# ORDER SERIALIZERS
# ====================
class OrderItemSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    vendor = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'vendor', 'quantity',
            'price_at_order', 'subtotal'
        ]
        read_only_fields = ['price_at_order']
    
    def get_subtotal(self, obj):
        return obj.quantity * obj.price_at_order

    def get_product(self, obj):
        # Keep order payload resilient even if related product/media data is incomplete.
        if not obj.product:
            return None

        image_url = None
        try:
            primary_image = obj.product.images.filter(is_primary=True).first()
            if primary_image and primary_image.image:
                request = self.context.get('request')
                image_url = _file_url(primary_image.image, request)
        except Exception:
            image_url = None

        return {
            'id': str(obj.product.id),
            'name': obj.product.name,
            'slug': obj.product.slug,
            'price': str(obj.product.price),
            'primary_image': image_url,
        }

    def get_vendor(self, obj):
        if not obj.vendor:
            return None

        return {
            'id': str(obj.vendor.id),
            'shop_name': obj.vendor.shop_name,
            'status': obj.vendor.status,
        }


class OrderSerializer(serializers.ModelSerializer):
    customer = UserSerializer(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_id', 'customer', 'customer_name', 'customer_phone',
            'total_amount', 'subtotal', 'delivery_fee', 'currency', 'payment_method', 'status', 'status_display',
            'delivery_address', 'city', 'province', 'delivery_notes',
            'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['order_id', 'created_at', 'updated_at']


class OrderItemCreateSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=100)


class CheckoutAddressSerializer(serializers.Serializer):
    province = serializers.CharField(max_length=100)
    city = serializers.CharField(max_length=100)
    address = serializers.CharField(max_length=2000)


class CheckoutOrderSerializer(serializers.Serializer):
    expected_total = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    customer_name = serializers.CharField(max_length=255)
    customer_phone = serializers.CharField(required=False)
    delivery_address = CheckoutAddressSerializer()
    delivery_notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    payment_method = serializers.ChoiceField(choices=['cod', 'COD'], default='cod')
    items = OrderItemCreateSerializer(many=True, allow_empty=False, max_length=100)

    def create(self, validated_data):
        from .commerce import place_order
        request = self.context['request']
        return place_order(request.user, validated_data, request.headers.get('Idempotency-Key'))


class OrderCreateSerializer(serializers.Serializer):
    delivery_address = serializers.CharField(max_length=2000)
    city = serializers.CharField(max_length=100)
    province = serializers.CharField(max_length=100)
    items = OrderItemCreateSerializer(many=True, allow_empty=False, max_length=100)

    def create(self, validated_data):
        from .commerce import place_order
        request = self.context['request']
        validated_data.pop('customer', None)
        address = {key: validated_data.pop(key) for key in ['city', 'province']}
        address['address'] = validated_data.pop('delivery_address')
        validated_data['delivery_address'] = address
        return place_order(request.user, validated_data, request.headers.get('Idempotency-Key'))


class OrderUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['status']

    def update(self, instance, validated_data):
        from .commerce import transition_order
        return transition_order(instance, validated_data['status'])


# ====================
# DELIVERY SERIALIZERS
# ====================
class DeliverySerializer(serializers.ModelSerializer):
    order = OrderSerializer(read_only=True)
    rider = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Delivery
        fields = [
            'id', 'order', 'rider', 'status', 'status_display',
            'collected_amount', 'delivered_at'
        ]
        read_only_fields = ['delivered_at', 'collected_amount']


class DeliveryCreateSerializer(serializers.ModelSerializer):
    order_id = serializers.UUIDField()
    rider_id = serializers.UUIDField(required=False)
    
    class Meta:
        model = Delivery
        fields = ['order_id', 'rider_id']
    
    def validate(self, data):
        # Check if order exists
        try:
            order = Order.objects.get(id=data['order_id'])
            
            # Check if delivery already exists for this order
            if Delivery.objects.filter(order=order).exists():
                raise serializers.ValidationError({"order": "Delivery already exists for this order."})
            
            # Check order status
            if order.status not in ['confirmed', 'picked']:
                raise serializers.ValidationError(
                    {"order": f"Cannot create delivery for order with status: {order.status}"}
                )
            
            data['order'] = order
        except Order.DoesNotExist:
            raise serializers.ValidationError({"order": "Order not found."})
        
        # Check if rider exists and is a rider
        rider_id = data.get('rider_id')
        if rider_id:
            try:
                rider = User.objects.get(id=rider_id, role='rider')
                data['rider'] = rider
            except User.DoesNotExist:
                raise serializers.ValidationError({"rider": "Rider not found or user is not a rider."})
        
        return data
    
    def create(self, validated_data):
        order = validated_data['order']
        rider = validated_data.get('rider')
        
        delivery = Delivery.objects.create(
            order=order,
            rider=rider,
            status='assigned'
        )
        
        return delivery


class DeliveryUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Delivery
        fields = ['status', 'collected_amount']
    
    def update(self, instance, validated_data):
        from .commerce import update_delivery
        return update_delivery(instance, validated_data.get('status', instance.status), validated_data.get('collected_amount'))


# ====================
# PAYOUT SERIALIZERS
# ====================
class PayoutSerializer(serializers.ModelSerializer):
    vendor = PublicVendorSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Payout
        fields = [
            'id', 'vendor', 'amount', 'period_start', 'period_end',
            'status', 'status_display', 'paid_at', 'payment_reference'
        ]
        read_only_fields = ['paid_at']


class PayoutCreateSerializer(serializers.ModelSerializer):
    vendor_id = serializers.UUIDField()
    class Meta:
        model = Payout
        fields = ['vendor_id', 'amount', 'period_start', 'period_end']
        read_only_fields = ['amount']

    def validate(self, data):
        if data['period_start'] > data['period_end']:
            raise serializers.ValidationError({'period_end': 'End must not precede start.'})
        if not Vendor.objects.filter(pk=data['vendor_id'], status='approved').exists():
            raise serializers.ValidationError({'vendor_id': 'Approved seller not found.'})
        return data

    def create(self, validated_data):
        from .commerce import create_payout
        vendor = Vendor.objects.get(pk=validated_data.pop('vendor_id'))
        return create_payout(vendor, **validated_data)


class PayoutUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payout
        fields = ['status', 'payment_reference']

    def update(self, instance, validated_data):
        from .commerce import mark_payout_paid
        if validated_data.get('status') != 'paid':
            raise serializers.ValidationError('Only recording payment is supported; paid payouts are immutable.')
        return mark_payout_paid(instance, self.context['request'].user, validated_data.get('payment_reference', ''))


# ====================
# AUTHENTICATION SERIALIZERS
# ====================
class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()  # email OR phone
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        identifier = data.get('identifier').strip()
        password = data.get('password')

        # Determine if identifier is email or phone
        user = None
        try:
            validate_email(identifier)
            user = User.objects.filter(email__iexact=identifier).first()
        except ValidationError:
            user = User.objects.filter(phone=identifier).first()

        if not user:
            raise serializers.ValidationError("Invalid email/phone or password.")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid email/phone or password.")

        if not user.is_active:
            raise serializers.ValidationError("User account is disabled.")

        data['user'] = user
        return data

class RegisterSerializer(serializers.Serializer):
    phone = serializers.CharField()

    def validate_phone(self, value):
        return normalize_phone(value)
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField(required=False, validators=[EmailValidator()])
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, default='customer')
    frontend_url = serializers.CharField(required=False, default=None)

    def validate(self, data):
        # Check password match
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})

        # Check phone uniqueness
        if User.objects.filter(phone=data['phone']).exists():
            raise serializers.ValidationError({"phone": "Phone number already registered."})
        
        # Check email uniqueness if provided
        if data.get('email') and User.objects.filter(email__iexact=data['email']).exists():
            raise serializers.ValidationError({"email": "Email already registered."})
        
        # Validate password strength
        validate_password(data['password'])
        
        # Validate role
        if data['role'] not in ['customer', 'vendor']:
            raise serializers.ValidationError({"role": "Invalid role selected."})
        
        return data
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data.pop('password_confirm')
        
        # Extract frontend_url before creating user (not a User field)
        validated_data.pop('frontend_url', None)
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        
        # Normalize phone before creating user
        phone = validated_data.get('phone', '')
        if phone:
            # Remove spaces and special characters
            phone = phone.strip().replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
            # Add country code if needed
            if not phone.startswith('+'):
                if phone.startswith('0'):
                    phone = '+93' + phone[1:]
                elif phone.isdigit():
                    phone = '+93' + phone
            validated_data['phone'] = phone
        
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        
        # Generate email verification token and send verification email (async - non-blocking)
        if user.email:
            verification_token = user.generate_email_verification_token()
            from .emails import send_email_verification_email
            send_email_verification_email(user, verification_token, frontend_url)
        
        return user


# ====================
# STATISTICS SERIALIZERS
# ====================
class DashboardStatsSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    total_vendors = serializers.IntegerField()
    total_products = serializers.IntegerField()
    total_orders = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_orders = serializers.IntegerField()
    pending_vendors = serializers.IntegerField()


class VendorStatsSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    active_products = serializers.IntegerField()
    total_sales = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_pending = serializers.DecimalField(max_digits=10, decimal_places=2)


class OrderStatusSerializer(serializers.Serializer):
    order__status = serializers.CharField()
    count = serializers.IntegerField()


# changes by Noman for user profile page only

# Add to the END of your home/serializers.py file

from django.db.models import Avg

# ====================
# USER PROFILE SERIALIZERS (ADD THESE)
# ====================

# You already have UserSerializer, so just add this update one:
class UserProfileSerializer(UserUpdateSerializer):
    class Meta:
        model = User
        fields = ['id', 'phone', 'full_name', 'email', 'role', 'created_at']
        read_only_fields = ['id', 'phone', 'role', 'created_at']


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8, validators=[validate_password])

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect")
        return value


# ====================
# ADDRESS SERIALIZERS (ADD THESE)
# ====================
from .models import Address, Review, Cart

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'label', 'full_address', 'city', 'province', 'postal_code', 'is_default', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


# ====================
# WISHLIST SERIALIZERS (ADD THESE)
# ====================
# class WishlistSerializer(serializers.ModelSerializer):
#     product_id = serializers.UUIDField(source='product.id', read_only=True)
#     product_name = serializers.CharField(source='product.name', read_only=True)
#     product_image = serializers.SerializerMethodField()
#     price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
#     in_stock = serializers.SerializerMethodField()
#     vendor_name = serializers.CharField(source='product.vendor.shop_name', read_only=True)
#     rating = serializers.SerializerMethodField()

#     class Meta:
#         model = Wishlist
#         fields = ['id', 'product_id', 'product_name', 'product_image', 'price', 
#                   'in_stock', 'vendor_name', 'rating', 'created_at']
#         read_only_fields = ['id', 'created_at']

#     def get_product_image(self, obj):
#         first_image = obj.product.images.first()
#         if first_image:
#             request = self.context.get('request')
#             return request.build_absolute_uri(first_image.image.url) if request else first_image.image.url
#         return None

#     def get_in_stock(self, obj):
#         return obj.product.stock_quantity > 0

#     def get_rating(self, obj):
#         from django.db.models import Avg
#         reviews = obj.product.reviews.all()
#         if reviews.exists():
#             return reviews.aggregate(Avg('rating'))['rating__avg']
#         return 0.0


# class WishlistCreateSerializer(serializers.Serializer):
#     product_id = serializers.UUIDField()

#     def validate_product_id(self, value):
#         if not Product.objects.filter(id=value).exists():
#             raise serializers.ValidationError("Product not found")
#         return value

#     def create(self, validated_data):
#         user = self.context['request'].user
#         product = Product.objects.get(id=validated_data['product_id'])
#         wishlist, created = Wishlist.objects.get_or_create(user=user, product=product)
#         return wishlist


# ====================
# REVIEW SERIALIZERS (ADD THESE)
# ====================
class ProductReviewSerializer(serializers.ModelSerializer):
    """Serializer for reviews on product detail page"""
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = Review
        fields = ['id', 'user_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'user_name', 'created_at']


class ReviewSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField()
    order_number = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'product', 'product_name', 'product_image', 'rating', 
                  'comment', 'created_at', 'order_number']
        read_only_fields = ['id', 'created_at']

    def get_product_image(self, obj):
        first_image = obj.product.images.first()
        if first_image:
            request = self.context.get('request')
            return request.build_absolute_uri(first_image.image.url) if request else first_image.image.url
        return None

    def get_order_number(self, obj):
        return str(obj.order.id).split('-')[0].upper()


class ReviewCreateSerializer(serializers.ModelSerializer):
    product_id = serializers.UUIDField()
    order_id = serializers.UUIDField()
    
    class Meta:
        model = Review
        fields = ['product_id', 'order_id', 'rating', 'comment']

    def validate(self, data):
        user = self.context['request'].user
        
        if not Order.objects.filter(id=data['order_id'], customer=user).exists():
            raise serializers.ValidationError("Order not found or doesn't belong to you")
        
        if not Product.objects.filter(id=data['product_id']).exists():
            raise serializers.ValidationError("Product not found")
        
        order = Order.objects.get(id=data['order_id'])
        if not order.items.filter(product_id=data['product_id']).exists():
            raise serializers.ValidationError('This product was not purchased in this order.')
        if order.status != 'delivered':
            raise serializers.ValidationError("Can only review delivered orders")
        
        # Check if review already exists
        if Review.objects.filter(
            user=user, 
            product_id=data['product_id'], 
            order_id=data['order_id']
        ).exists():
            raise serializers.ValidationError("You have already reviewed this product from this order")
        
        return data

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['product'] = Product.objects.get(id=validated_data.pop('product_id'))
        validated_data['order'] = Order.objects.get(id=validated_data.pop('order_id'))
        return super().create(validated_data)


# ====================
# CART SERIALIZERS (ADD THESE)
# ====================
class CartSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField()
    price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'product_id', 'product_name', 'product_image', 'quantity', 
                  'price', 'total_price', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_product_image(self, obj):
        first_image = obj.product.images.first()
        if first_image:
            request = self.context.get('request')
            return request.build_absolute_uri(first_image.image.url) if request else first_image.image.url
        return None


class CartCreateSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(default=1, min_value=1)

    def validate_product_id(self, value):
        if not Product.objects.filter(id=value).exists():
            raise serializers.ValidationError("Product not found")
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        product = Product.objects.get(id=validated_data['product_id'])
        cart, created = Cart.objects.get_or_create(
            user=user, 
            product=product,
            defaults={'quantity': validated_data['quantity']}
        )
        if not created:
            cart.quantity += validated_data['quantity']
            cart.save()
        return cart

class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()
    parent_id = serializers.UUIDField(source='parent.id', read_only=True, allow_null=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)
    subcategories = serializers.SerializerMethodField()
    full_path = serializers.CharField(source='get_full_path', read_only=True)
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'description', 'icon', 'level', 'color', 'order',
            'product_count', 'is_active', 'parent_id', 'parent_name', 'subcategories',
            'full_path', 'commission_rate', 'requires_approval', 'min_price', 'max_price',
            'meta_title', 'meta_description', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'level', 'created_at', 'updated_at', 'product_count']
    
    def get_product_count(self, obj):
        return obj.get_product_count()
    
    def get_subcategories(self, obj):
        """Return subcategories if this is a main category"""
        if obj.level == 'main':
            subcats = obj.subcategories.filter(is_active=True).order_by('order', 'name')
            return CategorySerializer(subcats, many=True).data
        return []


class CategoryTreeSerializer(serializers.ModelSerializer):
    """Simplified serializer for category dropdown/navigation"""
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'level', 'children']
    
    def get_children(self, obj):
        if obj.level != 'production':
            children = obj.subcategories.filter(is_active=True).order_by('order', 'name')
            return CategoryTreeSerializer(children, many=True).data
        return []


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'title', 'message', 'is_read', 'link', 'created_at']
        read_only_fields = ['id', 'created_at']

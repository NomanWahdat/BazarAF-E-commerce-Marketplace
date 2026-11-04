from home.production_views import SupportRequestsView, StorefrontView, NewsletterView, confirm_newsletter
from home.production_views import CheckoutQuoteView, DeliveryZonesView, document_download
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView

from home.views import (
    LoginView, RegisterView, LogoutView, TwoFactorVerifyView, GoogleAuthView,
    VerifyEmailView, ResendVerificationEmailView, RequestPasswordResetView, ResetPasswordView,
    UserViewSet, VendorViewSet, ProductViewSet, CategoryViewSet,
    OrderViewSet, DeliveryViewSet, PayoutViewSet,
    DashboardView, VendorDashboardView,
    CheckoutOrderView, OrderDetailByIdView,
      # Profile views
    UserProfileView, ChangePasswordView,
    
    # Address views
    AddressListCreateView, AddressDetailView,
    
    # Order views
    OrderListView, OrderDetailView,
    
    # # Wishlist views
    # WishlistListView, WishlistDetailView,
    
    # Review views
    ReviewListView, ReviewDetailView,
    
    # Cart views
    CartView, CartItemView,
    
    DashboardView, VendorDashboardView,LogisticsStatsView, OrderStatusCountsView, PayoutSummaryView, SellerApplicationViewSet, NotificationViewSet
)

# Import vendor profile and settings views
from home.vendor_views import (
    VendorProfileView, VendorSettingsView, ChangePasswordView as VendorChangePasswordView,
    Toggle2FAView, SendEmailVerificationView, SendPhoneVerificationView, VerifyPhoneCodeView,
    TwoFactorSetupBeginView, TwoFactorSetupVerifyView, TwoFactorBackupCodesRegenerateView, TwoFactorDisableView,
    LogoutAllSessionsView, LogoutSessionView
)

# Import admin views
from home.admin_views import (
    AdminDashboardViewSet, SellerApplicationAdminViewSet, ProductModerationViewSet,
    OrderOperationsViewSet, CommissionManagementViewSet, ReviewModerationViewSet,
    VendorPerformanceViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'vendors', VendorViewSet, basename='vendors')
router.register(r'products', ProductViewSet, basename='products')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'orders', OrderViewSet, basename='orders')
router.register(r'deliveries', DeliveryViewSet, basename='deliveries')
router.register(r'payouts', PayoutViewSet, basename='payouts')
router.register(r'seller-applications', SellerApplicationViewSet, basename='seller-application')
router.register(r'notifications', NotificationViewSet, basename='notification')

# ==================
# ADMIN ROUTES
# ==================
router.register(r'admin/dashboard', AdminDashboardViewSet, basename='admin-dashboard')
router.register(r'admin/seller-applications', SellerApplicationAdminViewSet, basename='admin-seller-applications')
router.register(r'admin/product-moderation', ProductModerationViewSet, basename='admin-product-moderation')
router.register(r'admin/order-operations', OrderOperationsViewSet, basename='admin-order-operations')
router.register(r'admin/commission-management', CommissionManagementViewSet, basename='admin-commission-management')
router.register(r'admin/review-moderation', ReviewModerationViewSet, basename='admin-review-moderation')
router.register(r'admin/vendor-performance', VendorPerformanceViewSet, basename='admin-vendor-performance') 

urlpatterns = [
    path('support/', SupportRequestsView.as_view()),
    path('stores/<str:identifier>/', StorefrontView.as_view()),
    path('newsletter/', NewsletterView.as_view()),
    path('newsletter/confirm/', confirm_newsletter),
    path('orders/quote/', CheckoutQuoteView.as_view()),
    path('delivery-zones/', DeliveryZonesView.as_view()),
    path('documents/download/', document_download),
    # Authentication
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/2fa/verify/', TwoFactorVerifyView.as_view(), name='auth-2fa-verify'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/google/', GoogleAuthView.as_view(), name='google-auth'),
    path('auth/verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('auth/resend-verification/', ResendVerificationEmailView.as_view(), name='resend-verification'),
    path('auth/request-password-reset/', RequestPasswordResetView.as_view(), name='request-password-reset'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
     # Checkout (NEW)
    path('orders/checkout/', CheckoutOrderView.as_view(), name='checkout-order'),
    path('orders/track/<str:order_id>/', OrderDetailByIdView.as_view(), name='track-order'),
    
    # JWT Tokens
    path('auth/token/', LoginView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # Dashboard
    path('dashboard/vendor/', VendorDashboardView.as_view(), name='vendor_dashboard'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('logistics/stats/', LogisticsStatsView.as_view(), name='logistics-stats'),
    path('orders/status-counts/', OrderStatusCountsView.as_view(), name='order-status-counts'),
    path('payouts/summary/', PayoutSummaryView.as_view(), name='payout-summary'),

       # ==================
    # USER PROFILE
    # ==================
    path('user/profile/', UserProfileView.as_view(), name='user-profile'),
    path('user/change-password/', ChangePasswordView.as_view(), name='change-password'),
    
    # ==================
    # ADDRESSES
    # ==================
    path('user/addresses/', AddressListCreateView.as_view(), name='address-list'),
    path('user/addresses/<uuid:pk>/', AddressDetailView.as_view(), name='address-detail'),

    
    
    # ==================
    # ORDERS
    # ==================
    path('user/orders/', OrderListView.as_view(), name='order-list'),
    path('user/orders/<uuid:pk>/', OrderDetailView.as_view(), name='order-detail'),
    
    # # ==================
    # # WISHLIST
    # # ==================
    # path('user/wishlist/', WishlistListView.as_view(), name='wishlist-list'),
    # path('user/wishlist/<uuid:pk>/', WishlistDetailView.as_view(), name='wishlist-detail'),
    
    # ==================
    # REVIEWS
    # ==================
    path('user/reviews/', ReviewListView.as_view(), name='review-list'),
    path('user/reviews/<uuid:pk>/', ReviewDetailView.as_view(), name='review-detail'),
    
    # ==================
    # CART
    # ==================
    path('user/cart/', CartView.as_view(), name='cart'),
    path('user/cart/<uuid:pk>/', CartItemView.as_view(), name='cart-item'),
    
    # ==================
    # VENDOR PROFILE & SETTINGS
    # ==================
    path('vendors/profile/', VendorProfileView.as_view(), name='vendor-profile'),
    path('vendors/settings/', VendorSettingsView.as_view(), name='vendor-settings'),
    path('vendors/change-password/', VendorChangePasswordView.as_view(), name='vendor-change-password'),
    path('vendors/toggle-2fa/', Toggle2FAView.as_view(), name='vendor-toggle-2fa'),
    path('vendors/2fa/setup/begin/', TwoFactorSetupBeginView.as_view(), name='vendor-2fa-setup-begin'),
    path('vendors/2fa/setup/verify/', TwoFactorSetupVerifyView.as_view(), name='vendor-2fa-setup-verify'),
    path('vendors/2fa/backup-codes/regenerate/', TwoFactorBackupCodesRegenerateView.as_view(), name='vendor-2fa-backup-regenerate'),
    path('vendors/2fa/disable/', TwoFactorDisableView.as_view(), name='vendor-2fa-disable'),
    path('vendors/send-email-verification/', SendEmailVerificationView.as_view(), name='vendor-send-email-verification'),
    path('vendors/send-phone-verification/', SendPhoneVerificationView.as_view(), name='vendor-send-phone-verification'),
    path('vendors/verify-phone-code/', VerifyPhoneCodeView.as_view(), name='vendor-verify-phone-code'),
    path('vendors/logout-all-sessions/', LogoutAllSessionsView.as_view(), name='vendor-logout-all-sessions'),
    path('vendors/logout-session/<str:session_id>/', LogoutSessionView.as_view(), name='vendor-logout-session'),
    
    # API endpoints
    path('', include(router.urls)),
    
    # DRF browsable API auth
    path('api-auth/', include('rest_framework.urls')),
]
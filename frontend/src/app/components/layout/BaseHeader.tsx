// File: frontend/src/components/layout/BaseHeader.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, ShoppingCart, User, Package, Globe, Smartphone,
  Bell, LogOut, Store, Settings, ArrowLeftRight, LoaderCircle,
  BarChart3, DollarSign, HelpCircle, MoreVertical, MessageSquare, Plus, Star, CheckCircle,
  Menu, X, ShoppingBag, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getCurrentUser, getUserRole } from '../../../utils/auth';
import api from '../../../services/api';
import useDebounce from '../../hooks/useDebounce';
import { searchVendorData, VendorSearchResult } from '../../../services/vendorAPI';

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string;
  created_at: string;
  notification_type: string;
}

const normalizeNotificationItem = (item: any): Notification => ({
  id: String(item?.id || ''),
  title: String(item?.title || 'Notification'),
  message: String(item?.message || ''),
  is_read: Boolean(item?.is_read),
  link: String(item?.link || ''),
  created_at: String(item?.created_at || new Date().toISOString()),
  notification_type: String(item?.notification_type || ''),
});

interface BaseHeaderProps {
  variant: 'customer' | 'vendor' | 'admin';
  storeName?: string;
  userName?: string;
  isAuthenticated?: boolean;
  onSearch?: (query: string) => void;
  onCartClick?: () => void;
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
  onSellClick?: () => void;
  onHelpClick?: () => void;
  onProfileClick?: () => void;
  onLogout?: () => void;
  onLanguageChange?: (lang: string) => void;
  cartItemCount?: number;
  notificationCount?: number;
  pendingOrdersCount?: number;
}

const BaseHeader: React.FC<BaseHeaderProps> = ({
  variant,
  storeName,
  userName,
  isAuthenticated = false,
  onSearch,
  onCartClick,
  onLoginClick,
  onSignUpClick,
  onSellClick,
  onHelpClick,
  onProfileClick,
  onLogout,
  onLanguageChange,
  cartItemCount = 0,
  pendingOrdersCount = 0,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [viewStoreLoading, setViewStoreLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const debouncedVendorSearch = useDebounce(vendorSearchQuery, 300);
  const [vendorSearchResults, setVendorSearchResults] = useState<VendorSearchResult>({
    products: [],
    orders: [],
    customers: [],
  });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showQuickLinks, setShowQuickLinks] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [resolvedVendorStoreName, setResolvedVendorStoreName] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedSearch, setExpandedSearch] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);

  const langDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const quickLinksRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const user = getCurrentUser();
  const userRole = getUserRole();
  const displayLanguage = i18n.language === 'fa' ? 'دری' : i18n.language === 'ps' ? 'پښتو' : 'EN';

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      const clickedInsideDesktopSearch =
        desktopSearchRef.current && desktopSearchRef.current.contains(event.target as Node);
      const clickedInsideMobileSearch =
        mobileSearchRef.current && mobileSearchRef.current.contains(event.target as Node);
      if (!clickedInsideDesktopSearch && !clickedInsideMobileSearch) {
        setShowSearchDropdown(false);
      }
      if (quickLinksRef.current && !quickLinksRef.current.contains(event.target as Node)) {
        setShowQuickLinks(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowFloatingMenu(false);
    setExpandedSearch(false);
  }, [location.pathname, location.search]);

  // Fetch notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchNotifications();
    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (variant !== 'vendor' || !isAuthenticated) return;

    let mounted = true;
    const fetchVendorStoreName = async () => {
      try {
        const response = await api.get('/dashboard/vendor/');
        const shopName = response?.data?.vendor?.shop_name || '';
        if (mounted && shopName) {
          setResolvedVendorStoreName(shopName);
        }
      } catch {
        // Keep graceful fallback behavior if dashboard request fails.
      }
    };

    fetchVendorStoreName();

    return () => {
      mounted = false;
    };
  }, [variant, isAuthenticated]);

  useEffect(() => {
    if (variant !== 'vendor') return;

    if (!debouncedVendorSearch.trim()) {
      setVendorSearchResults({ products: [], orders: [], customers: [] });
      return;
    }

    let isCancelled = false;
    const runSearch = async () => {
      try {
        const results = await searchVendorData(debouncedVendorSearch);
        if (!isCancelled) {
          setVendorSearchResults(results);
        }
      } catch {
        if (!isCancelled) {
          setVendorSearchResults({ products: [], orders: [], customers: [] });
        }
      }
    };

    runSearch();

    return () => {
      isCancelled = true;
    };
  }, [debouncedVendorSearch, variant]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications/');
      const payload = response?.data;
      const list = Array.isArray(payload) ? payload : payload?.results || [];
      const nextNotifications = list.slice(0, 5).map(normalizeNotificationItem);
      setNotifications(nextNotifications);

      const nextUnreadMessages = list.filter(
        (item: any) => !item.is_read && String(item.notification_type || '').toLowerCase().includes('message'),
      ).length;
      setUnreadMessages(nextUnreadMessages);

      const countFromPayload = Number(payload?.unread_count ?? payload?.count ?? nextUnreadMessages);
      setUnreadCount(Number.isFinite(countFromPayload) ? countFromPayload : nextUnreadMessages);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread_count/');
      const count = Number(response?.data?.count ?? response?.data?.unread_count ?? 0);
      setUnreadCount(Number.isFinite(count) ? count : 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.post(`/notifications/${notificationId}/mark_as_read/`);
      fetchNotifications();
      fetchUnreadCount();
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark_all_read/');
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    const wasUnread = !notification.is_read;
    if (wasUnread) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    const marked = await markAsRead(notification.id);
    if (!marked && wasUnread) {
      fetchNotifications();
      fetchUnreadCount();
    }

    setShowNotifications(false);
    if (notification.link) {
      const target = String(notification.link);
      const normalizedTarget = target.startsWith('/') ? target : `/${target}`;

      if (userRole === 'admin' && normalizedTarget.startsWith('/vendor')) {
        toast.error('This notification is not available for admin users.');
        return;
      }

      navigate(normalizedTarget);
      return;
    }

    const type = String(notification.notification_type || '').toLowerCase();
    if (type.includes('order')) {
      navigate('/vendor?tab=orders');
      return;
    }
    if (type.includes('review')) {
      navigate('/vendor/reviews');
      return;
    }
    if (type.includes('message')) {
      navigate('/vendor/messages');
      return;
    }
    navigate('/notifications');
  };

  const handleOpenNotifications = async () => {
    const willOpen = !showNotifications;
    setShowNotifications(willOpen);
    if (willOpen) {
      await Promise.all([fetchNotifications(), fetchUnreadCount()]);
    }
  };

  const navigateToProductDetail = (product: { id: string; slug?: string; name: string }) => {
    const searchValue = (product.name || '').trim();
    setShowSearchDropdown(false);
    navigate(`/vendor?tab=products${searchValue ? `&q=${encodeURIComponent(searchValue)}` : ''}`);
  };

  const navigateToOrderDetail = (order: { id: string; order_id: string }) => {
    const target = (order.id || '').trim();
    if (!target || target === 'undefined' || target === 'null') {
      toast.error('Unable to open order details');
      navigate('/vendor?tab=orders');
      return;
    }

    setShowSearchDropdown(false);
    navigate(`/vendor/orders/${encodeURIComponent(target)}`);
  };

  const getNotificationMeta = (type: string) => {
    const normalizedType = String(type || '').toLowerCase();
    if (normalizedType.includes('order')) {
      return {
        Icon: Package,
        iconClass: 'text-red-600',
        badgeClass: 'bg-red-500',
        unreadBgClass: 'bg-red-50',
      };
    }
    if (normalizedType.includes('review')) {
      return {
        Icon: Star,
        iconClass: 'text-amber-600',
        badgeClass: 'bg-amber-500',
        unreadBgClass: 'bg-amber-50',
      };
    }
    if (normalizedType.includes('message')) {
      return {
        Icon: MessageSquare,
        iconClass: 'text-blue-600',
        badgeClass: 'bg-blue-500',
        unreadBgClass: 'bg-blue-50',
      };
    }
    if (normalizedType.includes('approval') || normalizedType.includes('approved')) {
      return {
        Icon: CheckCircle,
        iconClass: 'text-emerald-600',
        badgeClass: 'bg-emerald-500',
        unreadBgClass: 'bg-emerald-50',
      };
    }
    return {
      Icon: Bell,
      iconClass: 'text-slate-600',
      badgeClass: 'bg-slate-400',
      unreadBgClass: 'bg-slate-50',
    };
  };

  const hasVendorSearchResults =
    vendorSearchResults.products.length > 0 ||
    vendorSearchResults.orders.length > 0 ||
    vendorSearchResults.customers.length > 0;

  const visibleProductResults = vendorSearchResults.products.slice(0, 2);
  const visibleOrderResults = vendorSearchResults.orders.slice(0, 2);
  const visibleCustomerResults = vendorSearchResults.customers.slice(0, 1);

  const switchPortal = () => {
    if (userRole === 'vendor') {
      if (variant === 'customer') {
        navigate('/vendor');
      } else {
        navigate('/home');
      }
    }
  };

  const handleSearchSubmit = () => {
    if (onSearch && searchQuery) {
      onSearch(searchQuery);
    }
  };

  const handleLanguageSelect = (lang: string) => {
    const normalizedLang = lang.toLowerCase();
    i18n.changeLanguage(normalizedLang);
    if (onLanguageChange) {
      onLanguageChange(normalizedLang);
    }
    setShowLangDropdown(false);
  };

  // Get health status based on pending orders count
  const getHealthStatus = (count: number) => {
    if (count >= 5) {
      return {
        status: 'RED',
        color: 'bg-red-500',
        displayText: count.toString(),
        message: `${count} pending orders - Click to review`,
        pulse: true,
      };
    }
    if (count >= 1) {
      return {
        status: 'YELLOW',
        color: 'bg-yellow-500',
        displayText: count.toString(),
        message: `${count} pending order${count !== 1 ? 's' : ''} - Click to review`,
        pulse: false,
      };
    }
    return {
      status: 'GREEN',
      color: 'bg-emerald-500',
      displayText: '✓',
      message: 'All clear - No pending orders',
      pulse: false,
    };
  };

  const healthStatus = getHealthStatus(pendingOrdersCount);
  const currentVendorTab = new URLSearchParams(location.search).get('tab') || '';

  const isProductsActive = location.pathname.includes('/vendor') && currentVendorTab === 'products';
  const isOrdersActive = location.pathname.includes('/vendor/orders') || currentVendorTab === 'orders';
  const isEarningsActive = location.pathname.includes('/vendor/earnings') || currentVendorTab === 'earnings';
  const isProfileActive =
    location.pathname.includes('/vendor/profile') ||
    location.pathname.includes('/vendor/settings');

  const closeMobilePanels = () => {
    setIsMobileMenuOpen(false);
    setShowFloatingMenu(false);
    setShowQuickLinks(false);
    setShowNotifications(false);
  };

  // Helper function to make store name URL-safe
  const getUrlSafeName = (name: string | undefined): string => {
    const safeSource = name || resolvedVendorStoreName || user?.shop_name || '';
    if (!safeSource) {
      return 'store';
    }

    return safeSource
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
  };

  // Handle navigating to store view
  const handleViewStore = async () => {
    try {
      setViewStoreLoading(true);
      const urlSafeName = getUrlSafeName(storeName || resolvedVendorStoreName || user?.shop_name);
      navigate(`/store/${urlSafeName}`);
      toast.success('Redirecting to your store...');
    } catch (error) {
      console.error('Error navigating to store:', error);
      toast.error('Failed to navigate to store. Please try again.');
      setViewStoreLoading(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      {/* Top Bar - Customer */}
      {variant === 'customer' && (
        <div className="bg-teal-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">{t('header_save_more_on_app')}</span>
              </div>

              <div className="flex items-center gap-4 md:gap-6">
                {/* Show "Seller Dashboard" if user is vendor, else "Sell On BazaarAF" */}
                {userRole === 'vendor' ? (
                  <button
                    onClick={switchPortal}
                    className="hover:text-teal-100 hover:underline transition-all duration-200 flex items-center gap-2"
                  >
                    <Store className="w-4 h-4" />
                    {t('header_seller_dashboard')}
                  </button>
                ) : (
                  <button
                    onClick={onSellClick}
                    className="hover:text-teal-100 hover:underline transition-all duration-200 hidden md:block"
                  >
                    {t('header_sell_on_bazaaraf')}
                  </button>
                )}

                <button
                  onClick={onHelpClick}
                  className="hover:text-teal-100 hover:underline transition-all duration-200"
                >
                  {t('header_help_support')}
                </button>

                {/* Language Selector */}
                <div className="relative" ref={langDropdownRef}>
                  <button
                    onClick={() => setShowLangDropdown(!showLangDropdown)}
                    className="flex items-center gap-1 hover:text-teal-100 hover:bg-teal-700 px-2 py-1 rounded transition-all duration-200"
                  >
                    <Globe className="w-4 h-4" />
                    <span>{displayLanguage}</span>
                  </button>

                  {showLangDropdown && (
                    <div className="absolute left-0 mt-2 bg-white text-gray-800 rounded-lg shadow-lg py-2 min-w-[140px] z-50">
                      <button
                        onClick={() => handleLanguageSelect('EN')}
                        className="block w-full text-left px-4 py-2 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                      >
                        {t('language_english')}
                      </button>
                      <button
                        onClick={() => handleLanguageSelect('FA')}
                        className="block w-full text-left px-4 py-2 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                      >
                        {t('language_dari')}
                      </button>
                      <button
                        onClick={() => handleLanguageSelect('PS')}
                        className="block w-full text-left px-4 py-2 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                      >
                        {t('language_pashto')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar - Vendor */}
      {variant === 'vendor' && (
        <div className="bg-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4" />
                <span>{t('header_vendor_dashboard')}</span>
              </div>

              <button
                onClick={switchPortal}
                className="hover:text-blue-100 transition-colors flex items-center gap-2"
              >
                <ArrowLeftRight className="w-4 h-4" />
                {t('header_switch_to_customer_view')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo Section */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate(variant === 'customer' ? '/home' : variant === 'vendor' ? '/vendor' : '/admin')}
          >
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-teal-600">BazaarAF</h1>
              {variant === 'vendor' && (storeName || resolvedVendorStoreName) && (
                <p className="text-xs text-gray-500 hidden sm:block">{storeName || resolvedVendorStoreName}</p>
              )}
              {variant === 'admin' && (
                <p className="text-xs text-gray-500">Platform Management</p>
              )}
            </div>
          </div>

          {/* Search Bar - Only for Customer */}
          {variant === 'customer' && (
            <div className="hidden md:flex flex-1 max-w-2xl mr-6">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('header_search_products_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
                />
              </div>
            </div>
          )}

          {/* Right Section - Actions */}
          <div className="flex items-center gap-3">
            {/* Notifications Bell - For authenticated customer/admin */}
            {isAuthenticated && variant !== 'vendor' && (
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={handleOpenNotifications}
                  className="relative p-2 text-gray-600 hover:text-teal-600 transition-colors"
                >
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-4 border-b flex items-center justify-between">
                      <h3 className="font-semibold">{t('header_notifications')}</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-teal-600 hover:text-teal-700"
                        >
                          {t('header_mark_all_read')}
                        </button>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">{t('header_no_notifications_yet')}</p>
                        </div>
                      ) : (
                        notifications.map((notification) => {
                          const meta = getNotificationMeta(notification.notification_type);
                          const NotificationIcon = meta.Icon;

                          return (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${!notification.is_read ? meta.unreadBgClass : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex-shrink-0">
                                <NotificationIcon className={`w-4 h-4 ${meta.iconClass}`} />
                                <div className={`w-2 h-2 rounded-full mt-1 ml-1 ${!notification.is_read ? meta.badgeClass : 'bg-gray-300'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm mb-1">
                                  {notification.title}
                                </h4>
                                <p className="text-xs text-gray-600 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notification.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          );
                        })
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="p-3 text-center border-t">
                        <button
                          onClick={() => {
                            setShowNotifications(false);
                            navigate('/notifications');
                          }}
                          className="text-sm text-teal-600 hover:text-teal-700"
                        >
                          {t('header_view_all_notifications')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Customer Actions */}
            {variant === 'customer' && (
              <>
                {/* Cart Icon */}
                <button
                  onClick={onCartClick}
                  className="relative p-2 text-gray-600 hover:text-teal-600 transition-colors"
                >
                  <ShoppingCart className="w-6 h-6" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                      {cartItemCount}
                    </span>
                  )}
                </button>

                {/* Auth Section */}
                {isAuthenticated ? (
                  <div className="relative" ref={profileDropdownRef}>
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="flex items-center gap-2 p-2 text-gray-600 hover:text-teal-600 transition-colors"
                    >
                      <User className="w-6 h-6" />
                      {userName && <span className="hidden md:inline text-sm font-medium">{userName}</span>}
                    </button>

                    {showProfileDropdown && (
                      <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg py-2 min-w-[180px] z-50 border border-gray-200">
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            navigate('/profile');
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm"
                        >
                          {t('header_my_profile')}
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            navigate('/orders');
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm"
                        >
                          {t('header_my_orders')}
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            navigate('/wishlist');
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm"
                        >
                          {t('header_wishlist')}
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            navigate('/reviews');
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm"
                        >
                          {t('header_my_reviews')}
                        </button>
                        <hr className="my-1" />
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            onLogout?.();
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition-colors text-sm font-medium"
                        >
                          {t('header_logout')}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onLoginClick}
                      className="px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      {t('header_login')}
                    </button>
                    <button
                      onClick={onSignUpClick}
                      className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors hidden sm:block"
                    >
                      {t('header_sign_up')}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Vendor Actions */}
            {variant === 'vendor' && (
              <>
                <button
                  onClick={handleViewStore}
                  disabled={viewStoreLoading}
                  title={t('header_view_store_title')}
                  aria-label={t('header_open_store_aria')}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300 hidden md:flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {viewStoreLoading ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      <span>{t('header_loading')}</span>
                    </>
                  ) : (
                    <>
                      <Store className="w-4 h-4" />
                      <span>{t('header_view_store')}</span>
                    </>
                  )}
                </button>

                {/* Store Health Indicator Badge */}
                <button
                  onClick={() => navigate('/vendor?tab=orders')}
                    title={healthStatus.message}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-all duration-300 hover:scale-110 hover:shadow-lg ring-2 ring-white shadow-md hidden md:flex ${
                    healthStatus.color
                  } ${healthStatus.pulse ? 'animate-pulse' : ''}`}
                  aria-label={t('header_store_health_aria', { message: healthStatus.message })}
                >
                  {healthStatus.displayText}
                </button>

                {/* Quick Search Bar - Tablet/Desktop */}
                <div className="hidden md:block relative" ref={desktopSearchRef}>
                  <div className="relative w-48 focus-within:w-72 transition-all duration-300">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search products, orders, customers..."
                      value={vendorSearchQuery}
                      onChange={(e) => {
                        setVendorSearchQuery(e.target.value);
                        setShowSearchDropdown(true);
                      }}
                      onFocus={() => setShowSearchDropdown(true)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  {showSearchDropdown && (vendorSearchQuery || hasVendorSearchResults) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto z-50">
                      {!hasVendorSearchResults ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          {vendorSearchQuery ? 'No results found' : 'Start typing to search'}
                        </div>
                      ) : (
                        <div className="divide-y">
                          {visibleProductResults.length > 0 && (
                            <div>
                              <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">Products</div>
                              {visibleProductResults.map((product) => (
                                <button
                                  key={product.id}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => navigateToProductDetail(product)}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <Package className="w-4 h-4 text-emerald-600" />
                                  <div>
                                    <div className="text-sm font-medium">{product.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {product.sku || product.category || 'Product'}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {visibleOrderResults.length > 0 && (
                            <div>
                              <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">Orders</div>
                              {visibleOrderResults.map((order) => (
                                <button
                                  key={order.id}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => navigateToOrderDetail(order)}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <Package className="w-4 h-4 text-blue-600" />
                                  <div>
                                    <div className="text-sm font-medium">#{order.order_id}</div>
                                    <div className="text-xs text-gray-500">{order.customer_name}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {visibleCustomerResults.length > 0 && (
                            <div>
                              <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">Customers</div>
                              {visibleCustomerResults.map((customer) => (
                                <button
                                  key={customer.id}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setShowSearchDropdown(false);
                                    navigate(`/vendor/messages?customer=${encodeURIComponent(customer.id)}`);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <User className="w-4 h-4 text-purple-600" />
                                  <div>
                                    <div className="text-sm font-medium">{customer.name}</div>
                                    <div className="text-xs text-gray-500">{customer.email || customer.phone || 'Customer'}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          <button
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              navigate(`/vendor/search?q=${encodeURIComponent(vendorSearchQuery)}`);
                              setShowSearchDropdown(false);
                            }}
                            className="w-full text-center px-4 py-2 text-sm text-emerald-600 hover:bg-gray-50 border-t font-medium transition-colors"
                          >
                            View all results →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile Search Icon */}
                <div className="md:hidden relative" ref={mobileSearchRef}>
                  <button
                    onClick={() => {
                      setExpandedSearch((prev) => !prev);
                      setShowSearchDropdown((prev) => !prev);
                    }}
                    className="p-2 text-gray-600 hover:text-emerald-600 transition-colors"
                    title="Search"
                    aria-label="Quick search"
                  >
                    <Search className="w-5 h-5" />
                  </button>

                  {expandedSearch && showSearchDropdown && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search products, orders, customers..."
                          value={vendorSearchQuery}
                          onChange={(e) => setVendorSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Links Dropdown */}
                <div className="relative" ref={quickLinksRef}>
                  <button
                    onClick={() => setShowQuickLinks((prev) => !prev)}
                    className="hidden md:inline-flex p-2 text-gray-600 hover:text-emerald-600 transition-colors"
                    title="Quick links"
                    aria-label="Quick links"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {showQuickLinks && (
                    <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 w-48 py-2 z-50">
                      <button
                        onClick={() => {
                          navigate('/vendor/add-product');
                          setShowQuickLinks(false);
                        }}
                        className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4 text-emerald-600" />
                        Add New Product
                      </button>
                      <button
                        onClick={() => {
                          navigate('/vendor/analytics');
                          setShowQuickLinks(false);
                        }}
                        className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-sm"
                      >
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        View Analytics
                      </button>
                      <button
                        onClick={() => {
                          navigate('/vendor/reviews');
                          setShowQuickLinks(false);
                        }}
                        className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-sm"
                      >
                        <Star className="w-4 h-4 text-amber-600" />
                        Product Reviews
                      </button>
                      <button
                        onClick={() => {
                          navigate('/vendor/messages');
                          setShowQuickLinks(false);
                        }}
                        className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-sm"
                      >
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                        <span>Messages</span>
                        {unreadMessages > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                          </span>
                        )}
                      </button>
                      <hr className="my-2" />
                      <button
                        onClick={() => {
                          navigate('/help-support');
                          setShowQuickLinks(false);
                        }}
                        className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-sm"
                      >
                        <HelpCircle className="w-4 h-4 text-green-600" />
                        Help & Support
                      </button>
                    </div>
                  )}
                </div>

                {/* Notifications Bell - Vendor */}
                {isAuthenticated && (
                  <div className="relative" ref={notificationsRef}>
                    <button
                      onClick={handleOpenNotifications}
                      className="relative p-2 text-gray-600 hover:text-teal-600 transition-colors"
                    >
                      <Bell className="w-6 h-6" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {showNotifications && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                        <div className="p-4 border-b flex items-center justify-between">
                          <h3 className="font-semibold">Notifications</h3>
                          {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-teal-600 hover:text-teal-700">
                              Mark all read
                            </button>
                          )}
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm">No notifications yet</p>
                            </div>
                          ) : (
                            notifications.map((notification) => {
                              const meta = getNotificationMeta(notification.notification_type);
                              const NotificationIcon = meta.Icon;
                              return (
                                <div
                                  key={notification.id}
                                  onClick={() => handleNotificationClick(notification)}
                                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                                    !notification.is_read ? meta.unreadBgClass : ''
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex-shrink-0">
                                      <NotificationIcon className={`w-4 h-4 ${meta.iconClass}`} />
                                      <div className={`w-2 h-2 rounded-full mt-1 ml-1 ${!notification.is_read ? meta.badgeClass : 'bg-gray-300'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-sm mb-1">{notification.title}</h4>
                                      <p className="text-xs text-gray-600 line-clamp-2">{notification.message}</p>
                                      <p className="text-xs text-gray-400 mt-1">
                                        {new Date(notification.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {notifications.length > 0 && (
                          <div className="p-3 text-center border-t">
                            <button
                              onClick={() => {
                                setShowNotifications(false);
                                navigate('/notifications');
                              }}
                              className="text-sm text-teal-600 hover:text-teal-700"
                            >
                              View all notifications
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {isAuthenticated && userRole === 'admin' && (
                  <div className="relative" ref={profileDropdownRef}>
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="hidden md:flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <User className="w-5 h-5" />
                      {userName && <span className="hidden md:inline text-sm font-medium">Admin</span>}
                    </button>

                    {showProfileDropdown && (
                      <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg py-2 min-w-[260px] z-50 border border-gray-200">
                        <div className="px-2 py-1">
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              navigate('/admin');
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-slate-50 hover:text-slate-700 rounded transition-colors text-sm font-medium text-gray-700"
                          >
                            <BarChart3 className="w-4 h-4" />
                            Admin Dashboard
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              navigate('/notifications');
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-slate-50 hover:text-slate-700 rounded transition-colors text-sm font-medium text-gray-700"
                          >
                            <Bell className="w-4 h-4" />
                            Notifications
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              navigate('/admin/order-operations');
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-slate-50 hover:text-slate-700 rounded transition-colors text-sm font-medium text-gray-700"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Order Operations
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              navigate('/admin/seller-applications');
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-slate-50 hover:text-slate-700 rounded transition-colors text-sm font-medium text-gray-700"
                          >
                            <UserCheck className="w-4 h-4" />
                            Seller Applications
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              navigate('/admin/product-moderation');
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-slate-50 hover:text-slate-700 rounded transition-colors text-sm font-medium text-gray-700"
                          >
                            <Package className="w-4 h-4" />
                            Product Moderation
                          </button>
                        </div>

                        <hr className="my-2 mx-0" />

                        <div className="px-2 py-1">
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              navigate('/profile');
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors text-sm font-medium text-gray-700"
                          >
                            <Settings className="w-4 h-4" />
                            Account Settings
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isAuthenticated && userRole === 'vendor' && (
                  <div className="relative" ref={profileDropdownRef}>
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="hidden md:flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <User className="w-5 h-5" />
                      {userName && <span className="hidden md:inline text-sm font-medium">{userName}</span>}
                    </button>

                    {showProfileDropdown && (
                      <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg py-2 min-w-[260px] z-50 border border-gray-200">
                        {/* DASHBOARD SECTION */}
                        <div className="px-2 py-1">
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              navigate('/vendor?tab=overview');
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-emerald-50 hover:text-emerald-700 rounded transition-colors text-sm font-medium text-gray-700"
                          >
                            <BarChart3 className="w-4 h-4" />
                            Store Performance
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              navigate('/vendor?tab=products');
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-emerald-50 hover:text-emerald-700 rounded transition-colors text-sm font-medium text-gray-700"
                          >
                            <Package className="w-4 h-4" />
                            Inventory Management
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              navigate('/vendor?tab=orders');
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-emerald-50 hover:text-emerald-700 rounded transition-colors text-sm font-medium text-gray-700"
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                            Order Management
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              navigate('/vendor?tab=earnings');
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-emerald-50 hover:text-emerald-700 rounded transition-colors text-sm font-medium text-gray-700"
                          >
                            <DollarSign className="w-4 h-4" />
                            Earnings & Payouts
                          </button>
                        </div>

                        <hr className="my-2 mx-0" />

                        {/* ACCOUNT SECTION */}
                        <div className="px-2 py-1">
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              navigate('/vendor/profile');
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors text-sm font-medium text-gray-700"
                          >
                            <User className="w-4 h-4" />
                            My Profile & Details
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              navigate('/vendor/settings');
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors text-sm font-medium text-gray-700"
                          >
                            <Settings className="w-4 h-4" />
                            Store Settings
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              navigate('/vendor/reviews');
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors text-sm font-medium text-gray-700"
                          >
                            <Star className="w-4 h-4" />
                            Product Reviews
                          </button>
                        </div>

                        <hr className="my-2 mx-0" />

                        {/* SUPPORT SECTION */}
                        <div className="px-2 py-1">
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              navigate('/help-support');
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-orange-50 hover:text-orange-700 rounded transition-colors text-sm font-medium text-gray-700"
                          >
                            <HelpCircle className="w-4 h-4" />
                            Help & Support
                          </button>
                        </div>

                        <hr className="my-2 mx-0" />

                        {/* LOGOUT SECTION */}
                        <div className="px-2 py-1">
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              onLogout?.();
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-red-50 hover:text-red-700 text-red-600 rounded transition-colors text-sm font-semibold"
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  className="md:hidden p-2 text-gray-600 hover:text-emerald-600 transition-colors"
                  title="Open menu"
                  aria-label="Open vendor menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Admin Actions */}
            {variant === 'admin' && (
              <>
                <button className="p-2 text-gray-600 hover:text-purple-600 transition-colors">
                  <Settings className="w-6 h-6" />
                </button>
                <button className="px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors hidden md:block">
                  View Platform
                </button>

                {isAuthenticated && (
                  <div className="relative" ref={profileDropdownRef}>
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <User className="w-5 h-5" />
                      {userName && <span className="hidden md:inline text-sm font-medium">{userName}</span>}
                    </button>

                    {showProfileDropdown && (
                      <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg py-2 min-w-[180px] z-50 border border-gray-200">
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            onProfileClick?.();
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm"
                        >
                          My Profile
                        </button>
                        <button
                          onClick={() => setShowProfileDropdown(false)}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm"
                        >
                          Settings
                        </button>
                        <hr className="my-1" />
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            onLogout?.();
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Search - Only for Customer */}
        {variant === 'customer' && (
          <div className="md:hidden mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
              />
            </div>
          </div>
        )}
      </div>

      {/* Vendor Mobile Sidebar */}
      {variant === 'vendor' && isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />

          <div
            ref={mobileMenuRef}
            className="absolute top-0 right-0 h-full w-[280px] max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 transform translate-x-0 overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">Menu</h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-gray-600 hover:text-emerald-600"
                aria-label="Close mobile menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  handleViewStore();
                  closeMobilePanels();
                }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
              >
                <Store className="w-4 h-4" />
                View Store
              </button>

              <div className="px-4 py-2.5 flex items-center gap-2 bg-gray-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${healthStatus.color}`} />
                <span className="text-sm text-gray-700">{pendingOrdersCount} Pending Orders</span>
              </div>

              <hr className="my-3" />

              <button
                onClick={() => {
                  navigate('/vendor/profile');
                  closeMobilePanels();
                }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                <User className="w-4 h-4" />
                My Profile
              </button>

              <button
                onClick={() => {
                  navigate('/vendor/settings');
                  closeMobilePanels();
                }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                <Settings className="w-4 h-4" />
                Store Settings
              </button>

              <button
                onClick={() => {
                  navigate('/vendor/add-product');
                  closeMobilePanels();
                }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>

              <button
                onClick={() => {
                  navigate('/vendor/messages');
                  closeMobilePanels();
                }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Messages
                {unreadMessages > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  navigate('/help-support');
                  closeMobilePanels();
                }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                <HelpCircle className="w-4 h-4" />
                Help & Support
              </button>

              <hr className="my-3" />

              <button
                onClick={() => {
                  closeMobilePanels();
                  onLogout?.();
                }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Mobile Floating Quick Action */}
      {variant === 'vendor' && (
        <div className="fixed right-4 z-40 md:hidden" style={{ bottom: 'calc(88px + env(safe-area-inset-bottom))' }}>
          {showFloatingMenu && (
            <div className="mb-3 bg-white rounded-xl shadow-xl border border-gray-200 p-2 space-y-1 min-w-[180px]">
              <button
                onClick={() => {
                  navigate('/vendor/add-product');
                  setShowFloatingMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                Add Product
              </button>
              <button
                onClick={() => {
                  navigate('/vendor?tab=orders');
                  setShowFloatingMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                View Orders
              </button>
              <button
                onClick={() => {
                  navigate('/vendor/analytics');
                  setShowFloatingMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded-lg flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4 text-purple-600" />
                Analytics
              </button>
            </div>
          )}

          <button
            onClick={() => setShowFloatingMenu((prev) => !prev)}
            className="h-12 w-12 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 flex items-center justify-center"
            aria-label="Open quick actions"
          >
            {showFloatingMenu ? <X className="w-5 h-5" /> : <Plus className="w-6 h-6" />}
          </button>
        </div>
      )}

      {/* Vendor Mobile Bottom Navigation */}
      {variant === 'vendor' && (
        <nav
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-40"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-around h-[70px]">
            <button
              onClick={() => navigate('/vendor?tab=products')}
              className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                isProductsActive ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'
              }`}
            >
              <Package className="w-5 h-5" />
              Products
            </button>

            <button
              onClick={() => navigate('/vendor?tab=orders')}
              className={`relative flex flex-col items-center gap-1 text-xs transition-colors ${
                isOrdersActive ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              Orders
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-1 right-0 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                  {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('/vendor/add-product')}
              className="flex flex-col items-center gap-1 bg-emerald-600 text-white rounded-full p-3 -mt-6 hover:bg-emerald-700 transition-colors shadow-lg"
              aria-label="Add product"
            >
              <Plus className="w-6 h-6" />
            </button>

            <button
              onClick={() => navigate('/vendor?tab=earnings')}
              className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                isEarningsActive ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              Earnings
            </button>

            <button
              onClick={() => navigate('/vendor/profile')}
              className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                isProfileActive ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'
              }`}
            >
              <User className="w-5 h-5" />
              Profile
            </button>
          </div>
        </nav>
      )}
    </header>
  );
};

export default BaseHeader;
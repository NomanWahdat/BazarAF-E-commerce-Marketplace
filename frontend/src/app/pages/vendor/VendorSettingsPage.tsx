import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  Eye as EyeIcon,
  EyeOff,
  FileText,
  GripVertical,
  Lock,
  Monitor,
  Palette,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import Layout from '../../components/layout/Layout';
import { toast } from 'sonner';
import api from '../../../services/api';
import {
  beginVendor2FASetup,
  disableVendor2FA,
  getVendorProducts,
  getVendorSettings,
  regenerateVendorBackupCodes,
  updateVendorAppearance,
  updateVendorNotifications,
  updateVendorPolicies,
  updateVendorSecurity,
  verifyVendor2FASetup,
} from '../../../services/vendorAPI';

interface PasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface FAQItem {
  id: string | number;
  question: string;
  answer: string;
}

interface PoliciesData {
  shipping_policy: string;
  return_policy: string;
  terms_conditions: string;
  privacy_policy: string;
  faqs: FAQItem[];
}

interface NotificationData {
  email_new_order: boolean;
  email_order_shipped: boolean;
  email_new_review: boolean;
  email_new_message: boolean;
  email_product_approved: boolean;
  email_store_policy_updated: boolean;
  email_marketing: boolean;
  sms_urgent_order: boolean;
  sms_stock_low: boolean;
  digest_type: 'instant' | 'hourly' | 'daily' | 'weekly';
  in_app_notifications: boolean;
  notification_sound: boolean;
  browser_notifications: boolean;
}

interface AppearanceData {
  primary_color: string;
  logo: string | null;
  banner: string | null;
  favicon: string | null;
  featured_products: string[];
}

interface Session {
  id: string;
  device: string;
  location: string;
  last_activity: string;
  user_agent: string;
  is_current?: boolean;
}

interface ProductOption {
  id: string;
  name: string;
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const DEFAULT_PRIMARY_COLOR = '#059669';

const RETURN_POLICY_TEMPLATES = [
  {
    label: '7-Day Easy Return',
    value:
      'Customers may request a return within 7 days of delivery. Items must be unused and in original packaging. Refunds are processed within 3 business days after inspection.',
  },
  {
    label: '14-Day Standard Return',
    value:
      'Returns are accepted within 14 days of delivery for defective or wrong items. Customer must provide order number and photos for faster support.',
  },
  {
    label: 'No Return (Clearance)',
    value:
      'All clearance and discounted items are final sale and cannot be returned unless damaged on arrival.',
  },
];

const defaultPolicies: PoliciesData = {
  shipping_policy: '',
  return_policy: '',
  terms_conditions: '',
  privacy_policy: '',
  faqs: [],
};

const defaultNotifications: NotificationData = {
  email_new_order: true,
  email_order_shipped: true,
  email_new_review: true,
  email_new_message: true,
  email_product_approved: true,
  email_store_policy_updated: true,
  email_marketing: false,
  sms_urgent_order: true,
  sms_stock_low: true,
  digest_type: 'instant',
  in_app_notifications: true,
  notification_sound: true,
  browser_notifications: false,
};

const defaultAppearance: AppearanceData = {
  primary_color: DEFAULT_PRIMARY_COLOR,
  logo: null,
  banner: null,
  favicon: null,
  featured_products: [],
};

const VendorSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('security');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSavingSection, setAutoSavingSection] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [currentEmail, setCurrentEmail] = useState('');
  const [currentPhone, setCurrentPhone] = useState('');
  const [storeDisplayName, setStoreDisplayName] = useState('');
  const [storePublicSlug, setStorePublicSlug] = useState('store');

  // Security
  const [passwordData, setPasswordData] = useState<PasswordData>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorConfirmedAt, setTwoFactorConfirmedAt] = useState<string | null>(null);
  const [hasBackupCodes, setHasBackupCodes] = useState(false);
  const [setupQrDataUrl, setSetupQrDataUrl] = useState<string | null>(null);
  const [setupManualKey, setSetupManualKey] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState<string[]>([]);
  const [regeneratePassword, setRegeneratePassword] = useState('');
  const [regenerateCode, setRegenerateCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [phoneCooldown, setPhoneCooldown] = useState(0);
  const [phoneCode, setPhoneCode] = useState('');
  const [developmentPhoneCode, setDevelopmentPhoneCode] = useState<string | null>(null);

  // Policies
  const [policies, setPolicies] = useState<PoliciesData>(defaultPolicies);
  const [previewPolicy, setPreviewPolicy] = useState<null | 'shipping' | 'return' | 'terms' | 'privacy'>(null);
  const [selectedReturnTemplate, setSelectedReturnTemplate] = useState('');

  // Notifications
  const [notifications, setNotifications] = useState<NotificationData>(defaultNotifications);

  // Appearance
  const [appearance, setAppearance] = useState<AppearanceData>(defaultAppearance);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [removeFavicon, setRemoveFavicon] = useState(false);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);

  const [dirtySections, setDirtySections] = useState({
    policies: false,
    notifications: false,
    appearance: false,
  });

  const initialPoliciesRef = useRef<PoliciesData>(defaultPolicies);
  const initialNotificationsRef = useRef<NotificationData>(defaultNotifications);
  const initialAppearanceRef = useRef<AppearanceData>(defaultAppearance);

  const syncUnsavedBadge = useCallback(
    (nextDirty?: typeof dirtySections) => {
      const current = nextDirty || dirtySections;
      const passwordDirty =
        Boolean(passwordData.current_password) ||
        Boolean(passwordData.new_password) ||
        Boolean(passwordData.confirm_password);
      setUnsavedChanges(current.policies || current.notifications || current.appearance || passwordDirty);
    },
    [dirtySections, passwordData],
  );

  const markDirty = useCallback(
    (section: keyof typeof dirtySections) => {
      setDirtySections((prev) => {
        const next = { ...prev, [section]: true };
        syncUnsavedBadge(next);
        return next;
      });
    },
    [syncUnsavedBadge],
  );

  const markSectionSaved = useCallback(
    (section: keyof typeof dirtySections) => {
      setDirtySections((prev) => {
        const next = { ...prev, [section]: false };
        syncUnsavedBadge(next);
        return next;
      });
    },
    [syncUnsavedBadge],
  );

  useEffect(() => {
    fetchAllSettings();
  }, []);

  useEffect(() => {
    if (emailCooldown <= 0 && phoneCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setPhoneCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [emailCooldown, phoneCooldown]);

  useEffect(() => {
    if (activeTab !== 'appearance' || productOptions.length > 0) return;

    const loadProducts = async () => {
      try {
        const response = await getVendorProducts({ page: 1, page_size: 200 });
        const items = Array.isArray(response) ? response : response?.results || [];
        setProductOptions(
          items.map((item: any) => ({
            id: String(item.id),
            name: item.name || `Product ${item.id}`,
          })),
        );
      } catch {
        setProductOptions([]);
      }
    };

    loadProducts();
  }, [activeTab, productOptions.length]);

  useEffect(() => {
    if (!dirtySections.policies) return;
    const timer = window.setTimeout(() => {
      void handleSavePolicies(true);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [policies, dirtySections.policies]);

  useEffect(() => {
    if (!dirtySections.notifications) return;
    const timer = window.setTimeout(() => {
      void handleSaveNotifications(true);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [notifications, dirtySections.notifications]);

  useEffect(() => {
    if (!dirtySections.appearance) return;
    const timer = window.setTimeout(() => {
      void handleSaveAppearance(true);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [appearance, dirtySections.appearance, logoFile, bannerFile, faviconFile, removeLogo, removeBanner, removeFavicon]);

  const getUrlSafeName = (name: string): string => {
    if (!name) {
      return 'store';
    }
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
  };

  const buildStoreSlugFromLocalStorage = (): string => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return 'store';
      const user = JSON.parse(raw);
      const candidate = user?.shop_name || user?.store_name || user?.full_name || user?.id || 'store';
      return getUrlSafeName(String(candidate));
    } catch {
      return 'store';
    }
  };

  const fetchAllSettings = async () => {
    try {
      setLoading(true);
      const data = await getVendorSettings();

      if (data.security) {
        setTwoFactorEnabled(data.security.two_factor_enabled || false);
        setTwoFactorConfirmedAt(data.security.two_factor_confirmed_at || null);
        setHasBackupCodes(Boolean(data.security.has_backup_codes));
        setEmailVerified(data.security.email_verified || false);
        setPhoneVerified(data.security.phone_verified || false);
        setSessions(data.security.sessions || []);
        setEmailCooldown(data.security.email_verification_cooldown_seconds || 0);
        setPhoneCooldown(data.security.phone_verification_cooldown_seconds || 0);
      }

      const nextPolicies: PoliciesData = {
        shipping_policy: data?.policies?.shipping_policy || '',
        return_policy: data?.policies?.return_policy || '',
        terms_conditions: data?.policies?.terms_conditions || '',
        privacy_policy: data?.policies?.privacy_policy || '',
        faqs: data?.policies?.faqs || [],
      };
      setPolicies(nextPolicies);
      initialPoliciesRef.current = nextPolicies;

      const nextNotifications: NotificationData = {
        email_new_order: data?.notifications?.email_new_order !== false,
        email_order_shipped: data?.notifications?.email_order_shipped !== false,
        email_new_review: data?.notifications?.email_new_review !== false,
        email_new_message: data?.notifications?.email_new_message !== false,
        email_product_approved: data?.notifications?.email_product_approved !== false,
        email_store_policy_updated: data?.notifications?.email_store_policy_updated !== false,
        email_marketing: data?.notifications?.email_marketing || false,
        sms_urgent_order: data?.notifications?.sms_urgent_order !== false,
        sms_stock_low: data?.notifications?.sms_stock_low !== false,
        digest_type: (data?.notifications?.digest_type || 'instant') as NotificationData['digest_type'],
        in_app_notifications: data?.notifications?.in_app_notifications !== false,
        notification_sound: data?.notifications?.notification_sound !== false,
        browser_notifications: data?.notifications?.browser_notifications || false,
      };
      setNotifications(nextNotifications);
      initialNotificationsRef.current = nextNotifications;

      const nextAppearance: AppearanceData = {
        primary_color: data?.appearance?.primary_color || DEFAULT_PRIMARY_COLOR,
        logo: data?.appearance?.logo || null,
        banner: data?.appearance?.banner || null,
        favicon: data?.appearance?.favicon || null,
        featured_products: (data?.appearance?.featured_products || []).map((id: any) => String(id)),
      };
      setAppearance(nextAppearance);
      initialAppearanceRef.current = nextAppearance;

      setLogoFile(null);
      setBannerFile(null);
      setFaviconFile(null);
      setRemoveLogo(false);
      setRemoveBanner(false);
      setRemoveFavicon(false);

      // Profile data for current email/phone + store slug fallback
      try {
        const profileResponse = await api.get('/vendors/profile/');
        const userData = profileResponse?.data?.user || {};
        setCurrentEmail(userData.email || 'Not set');
        setCurrentPhone(userData.phone || 'Not set');
      } catch {
        setCurrentEmail('Not set');
        setCurrentPhone('Not set');
      }

      try {
        const dashboardResponse = await api.get('/dashboard/vendor/');
        const shopName = dashboardResponse?.data?.vendor?.shop_name || '';
        if (shopName) {
          setStoreDisplayName(shopName);
          setStorePublicSlug(getUrlSafeName(shopName));
        } else {
          setStorePublicSlug(buildStoreSlugFromLocalStorage());
        }
      } catch {
        setStorePublicSlug(buildStoreSlugFromLocalStorage());
      }

      setDirtySections({ policies: false, notifications: false, appearance: false });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setSetupQrDataUrl(null);
      setSetupManualKey(null);
      setSetupCode('');
      setShowBackupCodes([]);
      setRegeneratePassword('');
      setRegenerateCode('');
      setDisablePassword('');
      setDisableCode('');
      setUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password: string): string | null => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!PASSWORD_REGEX.test(password)) {
      return 'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)';
    }
    return null;
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password) {
      toast.error('Current password is required');
      return;
    }

    const pwError = validatePassword(passwordData.new_password);
    if (pwError) {
      toast.error(pwError);
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setSaving(true);
      await updateVendorSecurity({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });

      toast.success('Security settings updated');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      syncUnsavedBadge();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleBeginTwoFactorSetup = async () => {
    try {
      setSaving(true);
      const response = await beginVendor2FASetup();
      setSetupQrDataUrl(response?.qr_data_url || null);
      setSetupManualKey(response?.manual_entry_key || null);
      setSetupCode('');
      setShowBackupCodes([]);
      toast.success('Authenticator setup started. Scan the QR and verify a code.');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to begin 2FA setup');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyTwoFactorSetup = async () => {
    if (!/^\d{6}$/.test(setupCode.trim())) {
      toast.error('Enter a valid 6-digit authenticator code');
      return;
    }

    try {
      setSaving(true);
      const response = await verifyVendor2FASetup(setupCode.trim());
      setTwoFactorEnabled(true);
      setTwoFactorConfirmedAt(new Date().toISOString());
      setHasBackupCodes(true);
      setShowBackupCodes(Array.isArray(response?.backup_codes) ? response.backup_codes : []);
      setSetupCode('');
      toast.success('2FA enabled successfully');
      await fetchAllSettings();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to verify setup code');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!regeneratePassword && !regenerateCode) {
      toast.error('Enter current password or current authenticator code');
      return;
    }

    try {
      setSaving(true);
      const response = await regenerateVendorBackupCodes({
        current_password: regeneratePassword || undefined,
        current_totp_code: regenerateCode || undefined,
      });
      const codes = Array.isArray(response?.backup_codes) ? response.backup_codes : [];
      setShowBackupCodes(codes);
      setHasBackupCodes(codes.length > 0);
      setRegeneratePassword('');
      setRegenerateCode('');
      toast.success('Backup codes regenerated');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to regenerate backup codes');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!disablePassword || !disableCode) {
      toast.error('Current password and authenticator/backup code are required');
      return;
    }

    if (!window.confirm('Disable two-factor authentication for your account?')) {
      return;
    }

    try {
      setSaving(true);
      await disableVendor2FA({ current_password: disablePassword, code: disableCode });
      setTwoFactorEnabled(false);
      setTwoFactorConfirmedAt(null);
      setHasBackupCodes(false);
      setShowBackupCodes([]);
      setSetupQrDataUrl(null);
      setSetupManualKey(null);
      setDisablePassword('');
      setDisableCode('');
      toast.success('2FA disabled');
      await fetchAllSettings();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to disable 2FA');
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmailVerification = async () => {
    if (emailCooldown > 0) return;
    try {
      setSaving(true);
      const response = await api.post('/vendors/send-email-verification/', {
        frontend_url: window.location.origin,
      });
      setEmailCooldown(response.data?.retry_after || 60);
      toast.success('Verification email sent');
    } catch (error: any) {
      const retryAfter = Number(error.response?.data?.retry_after || 0);
      if (retryAfter > 0) setEmailCooldown(retryAfter);
      toast.error(error.response?.data?.detail || 'Failed to send verification email');
    } finally {
      setSaving(false);
    }
  };

  const handleSendPhoneVerification = async () => {
    if (phoneCooldown > 0) return;
    try {
      setSaving(true);
      const response = await api.post('/vendors/send-phone-verification/');
      setPhoneCooldown(response.data?.retry_after || 60);
      if (response.data?.development_code) {
        setDevelopmentPhoneCode(response.data.development_code);
      }
      toast.success('Verification code sent to your phone');
    } catch (error: any) {
      const retryAfter = Number(error.response?.data?.retry_after || 0);
      if (retryAfter > 0) setPhoneCooldown(retryAfter);
      toast.error(error.response?.data?.detail || 'Failed to send verification code');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!/^\d{6}$/.test(phoneCode.trim())) {
      toast.error('Enter a valid 6-digit code');
      return;
    }

    try {
      setSaving(true);
      await api.post('/vendors/verify-phone-code/', { code: phoneCode.trim() });
      setPhoneVerified(true);
      setPhoneCode('');
      setDevelopmentPhoneCode(null);
      toast.success('Phone verified successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to verify phone code');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAllSessions = async () => {
    if (!window.confirm('This will log you out of all other sessions. Continue?')) return;

    try {
      setSaving(true);
      const response = await api.post('/vendors/logout-all-sessions/', { keep_current: true });
      setSessions(response.data?.sessions || []);
      toast.success('All other sessions logged out');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to logout all sessions');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutSession = async (sessionId: string) => {
    try {
      setSaving(true);
      const response = await api.post(`/vendors/logout-session/${sessionId}/`);
      setSessions(response.data?.sessions || sessions.filter((s) => s.id !== sessionId));
      toast.success('Session logged out');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to logout session');
    } finally {
      setSaving(false);
    }
  };

  const handlePolicyChange = (field: keyof PoliciesData, value: any) => {
    setPolicies((prev) => ({ ...prev, [field]: value }));
    markDirty('policies');
  };

  const handleAddFAQ = () => {
    const newFAQ: FAQItem = {
      id: Date.now(),
      question: '',
      answer: '',
    };
    setPolicies((prev) => ({
      ...prev,
      faqs: [...prev.faqs, newFAQ],
    }));
    markDirty('policies');
  };

  const handleUpdateFAQ = (id: string | number, field: 'question' | 'answer', value: string) => {
    setPolicies((prev) => ({
      ...prev,
      faqs: prev.faqs.map((faq) => (faq.id === id ? { ...faq, [field]: value } : faq)),
    }));
    markDirty('policies');
  };

  const handleMoveFAQ = (index: number, direction: 'up' | 'down') => {
    setPolicies((prev) => {
      const nextFaqs = [...prev.faqs];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= nextFaqs.length) return prev;
      [nextFaqs[index], nextFaqs[swapIndex]] = [nextFaqs[swapIndex], nextFaqs[index]];
      return { ...prev, faqs: nextFaqs };
    });
    markDirty('policies');
  };

  const handleRemoveFAQ = (id: string | number) => {
    if (!window.confirm('Delete this FAQ item?')) return;
    setPolicies((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((faq) => faq.id !== id),
    }));
    markDirty('policies');
  };

  const handleApplyReturnTemplate = () => {
    if (!selectedReturnTemplate) return;
    handlePolicyChange('return_policy', selectedReturnTemplate);
  };

  const handleSavePolicies = async (isAutoSave = false) => {
    if (!dirtySections.policies) return;

    try {
      if (isAutoSave) setAutoSavingSection('policies');
      else setSaving(true);

      await updateVendorPolicies(policies);
      initialPoliciesRef.current = policies;
      markSectionSaved('policies');
      toast.success('Settings saved');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to save');
    } finally {
      if (isAutoSave) setAutoSavingSection(null);
      else setSaving(false);
    }
  };

  const handleNotificationChange = (field: keyof NotificationData, value: any) => {
    setNotifications((prev) => ({ ...prev, [field]: value }));
    markDirty('notifications');
  };

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported on this device');
      return;
    }

    const result = await Notification.requestPermission();
    const allowed = result === 'granted';
    handleNotificationChange('browser_notifications', allowed);
    if (!allowed) {
      toast.error('Browser notifications permission was not granted');
    }
  };

  const handleSaveNotifications = async (isAutoSave = false) => {
    if (!dirtySections.notifications) return;

    try {
      if (isAutoSave) setAutoSavingSection('notifications');
      else setSaving(true);

      await updateVendorNotifications(notifications);
      initialNotificationsRef.current = notifications;
      markSectionSaved('notifications');
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      if (isAutoSave) setAutoSavingSection(null);
      else setSaving(false);
    }
  };

  const handleColorChange = (color: string) => {
    setAppearance((prev) => ({ ...prev, primary_color: color }));
    markDirty('appearance');
  };

  const processImageUpload = (file: File, maxBytes: number, onSuccess: () => void) => {
    if (file.size > maxBytes) {
      toast.error(`File must be less than ${(maxBytes / (1024 * 1024)).toFixed(0)}MB`);
      return false;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return false;
    }
    onSuccess();
    return true;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processImageUpload(file, 2 * 1024 * 1024, () => {
      setLogoFile(file);
      setRemoveLogo(false);
      setAppearance((prev) => ({ ...prev, logo: URL.createObjectURL(file) }));
      markDirty('appearance');
    });
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processImageUpload(file, 5 * 1024 * 1024, () => {
      setBannerFile(file);
      setRemoveBanner(false);
      setAppearance((prev) => ({ ...prev, banner: URL.createObjectURL(file) }));
      markDirty('appearance');
    });
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processImageUpload(file, 1 * 1024 * 1024, () => {
      setFaviconFile(file);
      setRemoveFavicon(false);
      setAppearance((prev) => ({ ...prev, favicon: URL.createObjectURL(file) }));
      markDirty('appearance');
    });
  };

  const toggleFeaturedProduct = (productId: string) => {
    setAppearance((prev) => {
      const exists = prev.featured_products.includes(productId);
      if (exists) {
        return {
          ...prev,
          featured_products: prev.featured_products.filter((id) => id !== productId),
        };
      }

      if (prev.featured_products.length >= 5) {
        toast.error('You can select up to 5 featured products');
        return prev;
      }

      return {
        ...prev,
        featured_products: [...prev.featured_products, productId],
      };
    });
    markDirty('appearance');
  };

  const moveFeaturedProduct = (index: number, direction: 'up' | 'down') => {
    setAppearance((prev) => {
      const next = [...prev.featured_products];
      const swap = direction === 'up' ? index - 1 : index + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]];
      return { ...prev, featured_products: next };
    });
    markDirty('appearance');
  };

  const handleSaveAppearance = async (isAutoSave = false) => {
    if (!dirtySections.appearance) return;

    try {
      if (isAutoSave) setAutoSavingSection('appearance');
      else setSaving(true);

      const formData = new FormData();
      formData.append(
        'appearance',
        JSON.stringify({
          primary_color: appearance.primary_color,
          featured_products: appearance.featured_products,
        }),
      );

      if (logoFile) formData.append('logo', logoFile);
      if (bannerFile) formData.append('banner', bannerFile);
      if (faviconFile) formData.append('favicon', faviconFile);
      if (removeLogo) formData.append('remove_logo', 'true');
      if (removeBanner) formData.append('remove_banner', 'true');
      if (removeFavicon) formData.append('remove_favicon', 'true');

      await updateVendorAppearance(formData);
      initialAppearanceRef.current = appearance;
      markSectionSaved('appearance');
      toast.success('Settings saved');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save');
    } finally {
      if (isAutoSave) setAutoSavingSection(null);
      else setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (!window.confirm('Discard all unsaved changes?')) return;

    setPolicies(initialPoliciesRef.current);
    setNotifications(initialNotificationsRef.current);
    setAppearance(initialAppearanceRef.current);
    setLogoFile(null);
    setBannerFile(null);
    setFaviconFile(null);
    setRemoveLogo(false);
    setRemoveBanner(false);
    setRemoveFavicon(false);
    setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    setDirtySections({ policies: false, notifications: false, appearance: false });
    setUnsavedChanges(false);
    toast.success('Unsaved changes discarded');
  };

  const policyPreviewText = useMemo(() => {
    switch (previewPolicy) {
      case 'shipping':
        return policies.shipping_policy;
      case 'return':
        return policies.return_policy;
      case 'terms':
        return policies.terms_conditions;
      case 'privacy':
        return policies.privacy_policy;
      default:
        return '';
    }
  }, [policies, previewPolicy]);

  const sectionSavingLabel = autoSavingSection ? `Auto-saving ${autoSavingSection}...` : null;

  if (loading) {
    return (
      <Layout variant="vendor" storeName={storeDisplayName}>
        <div className="p-6 max-w-4xl mx-auto text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full" />
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout variant="vendor" storeName={storeDisplayName}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="p-6 max-w-5xl mx-auto">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-2">Manage your account security, policies, notifications, and branding</p>
            </div>
            <div className="flex items-center gap-2">
              {sectionSavingLabel && <span className="text-xs text-gray-500">{sectionSavingLabel}</span>}
              {unsavedChanges && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-700">Unsaved Changes</span>
                </div>
              )}
              {unsavedChanges && (
                <Button variant="outline" onClick={handleDiscardChanges}>
                  Discard Changes
                </Button>
              )}
            </div>
          </div>

          <div className="mb-6 border-b border-gray-200 flex flex-wrap gap-2 sm:gap-8">
            {[
              { id: 'security', label: 'Security', icon: Lock },
              { id: 'policies', label: 'Policies', icon: FileText },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'appearance', label: 'Appearance', icon: Palette },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-1">Change Password</h3>
                <p className="text-sm text-gray-600 mb-4">Use your current password to apply password updates</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Current Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.current_password}
                        onChange={(e) => {
                          setPasswordData({ ...passwordData, current_password: e.target.value });
                          syncUnsavedBadge();
                        }}
                        className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-500"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">New Password *</label>
                    <input
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, new_password: e.target.value });
                        syncUnsavedBadge();
                      }}
                      className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="••••••••"
                    />
                    <div className="mt-2 grid sm:grid-cols-2 gap-1 text-xs">
                      <span className={passwordData.new_password.length >= 8 ? 'text-emerald-600' : 'text-gray-400'}>
                        ✓ At least 8 characters
                      </span>
                      <span className={/[A-Z]/.test(passwordData.new_password) ? 'text-emerald-600' : 'text-gray-400'}>
                        ✓ Uppercase letter
                      </span>
                      <span className={/[0-9]/.test(passwordData.new_password) ? 'text-emerald-600' : 'text-gray-400'}>
                        ✓ Number
                      </span>
                      <span className={/[@$!%*?&]/.test(passwordData.new_password) ? 'text-emerald-600' : 'text-gray-400'}>
                        ✓ Special character (@$!%*?&)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm Password *</label>
                    <input
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, confirm_password: e.target.value });
                        syncUnsavedBadge();
                      }}
                      className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="••••••••"
                    />
                  </div>

                  <Button onClick={handleChangePassword} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
                    {saving ? 'Saving...' : 'Update Password'}
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-600 mt-1">Add an extra layer of protection for account sign-in</p>
                  </div>
                  <span className={`font-semibold ${twoFactorEnabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {twoFactorEnabled ? 'Enabled' : setupQrDataUrl ? 'Setup In Progress' : 'Not Enabled'}
                  </span>
                </div>

                {!twoFactorEnabled && !setupQrDataUrl && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button onClick={handleBeginTwoFactorSetup} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      Set Up Authenticator
                    </Button>
                    <p className="text-xs text-gray-500">Use Google Authenticator, Authy, or Microsoft Authenticator.</p>
                  </div>
                )}

                {setupQrDataUrl && !twoFactorEnabled && (
                  <div className="mt-5 grid md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Scan QR Code</h4>
                      <div className="w-40 h-40 rounded-lg bg-gray-50 border border-gray-200 p-2 flex items-center justify-center">
                        <img src={setupQrDataUrl} alt="2FA setup QR" className="w-full h-full object-contain" />
                      </div>
                      {setupManualKey && (
                        <p className="text-xs text-gray-500 mt-2 break-all">
                          Manual key: <span className="font-mono">{setupManualKey}</span>
                        </p>
                      )}
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Verify Setup</h4>
                      <input
                        type="text"
                        value={setupCode}
                        onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 tracking-widest"
                        placeholder="Enter 6-digit code"
                      />
                      <div className="mt-3 flex gap-2">
                        <Button onClick={handleVerifyTwoFactorSetup} disabled={saving || setupCode.length !== 6} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          Verify & Enable
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSetupQrDataUrl(null);
                            setSetupManualKey(null);
                            setSetupCode('');
                          }}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {twoFactorEnabled && (
                  <div className="mt-5 grid md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <h4 className="font-semibold text-gray-900">2FA Status</h4>
                      <p className="text-sm text-gray-600">Authenticator app is enabled for login protection.</p>
                      {twoFactorConfirmedAt && (
                        <p className="text-xs text-gray-500">Enabled on: {new Date(twoFactorConfirmedAt).toLocaleString()}</p>
                      )}
                      <p className="text-xs text-gray-500">Backup codes available: {hasBackupCodes ? 'Yes' : 'No'}</p>

                      <h5 className="font-semibold text-sm text-gray-900 pt-2">Regenerate Backup Codes</h5>
                      <input
                        type="password"
                        value={regeneratePassword}
                        onChange={(e) => setRegeneratePassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Current password (optional if code provided)"
                      />
                      <input
                        type="text"
                        value={regenerateCode}
                        onChange={(e) => setRegenerateCode(e.target.value.trim())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Current authenticator code (optional)"
                      />
                      <Button onClick={handleRegenerateBackupCodes} variant="outline" disabled={saving}>
                        Regenerate Codes
                      </Button>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <h4 className="font-semibold text-gray-900">Backup Codes</h4>
                      {showBackupCodes.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {showBackupCodes.map((code) => (
                            <div key={code} className="text-xs font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1">
                              {code}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Backup codes are only shown once after setup/regeneration.</p>
                      )}
                      <p className="text-xs text-gray-500">Store these in a safe place. Each code can be used once.</p>

                      <h5 className="font-semibold text-sm text-gray-900 pt-2">Disable 2FA</h5>
                      <input
                        type="password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Current password"
                      />
                      <input
                        type="text"
                        value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value.trim())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Authenticator or backup code"
                      />
                      <Button onClick={handleDisableTwoFactor} variant="outline" disabled={saving} className="text-red-600 hover:text-red-700">
                        Disable 2FA
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">Email Verification</h3>
                    <p className="text-sm text-gray-600 mt-1">Current email: {currentEmail}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {emailVerified ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm text-emerald-600 font-semibold">Verified</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span className="text-sm text-amber-600 font-semibold">Not Verified</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!emailVerified && (
                      <Button onClick={handleSendEmailVerification} disabled={saving || emailCooldown > 0} variant="outline">
                        {emailCooldown > 0 ? `Resend in ${emailCooldown}s` : 'Verify Email'}
                      </Button>
                    )}
                    <Button onClick={() => navigate('/vendor/profile')} variant="outline">Change Email</Button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">Phone Verification</h3>
                    <p className="text-sm text-gray-600 mt-1">Current phone: {currentPhone}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {phoneVerified ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm text-emerald-600 font-semibold">Verified</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span className="text-sm text-amber-600 font-semibold">Not Verified</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!phoneVerified && (
                      <Button onClick={handleSendPhoneVerification} disabled={saving || phoneCooldown > 0} variant="outline">
                        {phoneCooldown > 0 ? `Resend in ${phoneCooldown}s` : 'Verify Phone'}
                      </Button>
                    )}
                    <Button onClick={() => navigate('/vendor/profile')} variant="outline">Change Phone</Button>
                  </div>
                </div>

                {!phoneVerified && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3 items-center max-w-md">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={phoneCode}
                        onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 tracking-widest"
                        placeholder="Enter 6-digit code"
                      />
                      <Button onClick={handleVerifyPhoneCode} disabled={saving || phoneCode.length !== 6} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        Verify
                      </Button>
                    </div>
                    {developmentPhoneCode && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                        Development code: {developmentPhoneCode}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Active Sessions</h3>
                  {sessions.length > 1 && (
                    <Button onClick={handleLogoutAllSessions} disabled={saving} variant="outline" className="text-red-600 hover:text-red-700">
                      Logout All Other Sessions
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {sessions.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No active sessions</p>
                  ) : (
                    sessions.map((session) => (
                      <div key={session.id} className="border border-gray-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            {session.device}
                            {session.is_current && (
                              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                Current
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">{session.location}</p>
                          <p className="text-xs text-gray-500 mt-1">Last active: {new Date(session.last_activity).toLocaleString()}</p>
                        </div>
                        <Button onClick={() => handleLogoutSession(session.id)} disabled={saving || session.is_current} variant="outline" className="text-red-600 hover:text-red-700">
                          Logout
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'policies' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-lg font-semibold text-gray-900">Shipping Policy</label>
                  <Button variant="outline" size="sm" onClick={() => setPreviewPolicy('shipping')}>Preview</Button>
                </div>
                <textarea
                  value={policies.shipping_policy}
                  onChange={(e) => handlePolicyChange('shipping_policy', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
                  rows={5}
                  maxLength={2000}
                  placeholder="Enter your shipping policy..."
                />
                <p className="text-xs text-gray-500 mt-2">{policies.shipping_policy.length}/2000 characters</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <label className="block text-lg font-semibold text-gray-900">Return & Refund Policy</label>
                  <Button variant="outline" size="sm" onClick={() => setPreviewPolicy('return')}>Preview</Button>
                </div>
                <div className="grid md:grid-cols-[1fr_auto] gap-2 mb-3">
                  <select
                    value={selectedReturnTemplate}
                    onChange={(e) => setSelectedReturnTemplate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Template suggestions</option>
                    {RETURN_POLICY_TEMPLATES.map((tpl) => (
                      <option key={tpl.label} value={tpl.value}>{tpl.label}</option>
                    ))}
                  </select>
                  <Button variant="outline" onClick={handleApplyReturnTemplate}>Apply Template</Button>
                </div>
                <textarea
                  value={policies.return_policy}
                  onChange={(e) => handlePolicyChange('return_policy', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
                  rows={5}
                  maxLength={2000}
                  placeholder="Enter your return and refund policy..."
                />
                <p className="text-xs text-gray-500 mt-2">{policies.return_policy.length}/2000 characters</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-lg font-semibold text-gray-900">Terms & Conditions</label>
                  <Button variant="outline" size="sm" onClick={() => setPreviewPolicy('terms')}>Preview</Button>
                </div>
                <textarea
                  value={policies.terms_conditions}
                  onChange={(e) => handlePolicyChange('terms_conditions', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
                  rows={5}
                  maxLength={2000}
                  placeholder="Enter your terms and conditions..."
                />
                <p className="text-xs text-gray-500 mt-2">{policies.terms_conditions.length}/2000 characters</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-lg font-semibold text-gray-900">Privacy Policy</label>
                  <Button variant="outline" size="sm" onClick={() => setPreviewPolicy('privacy')}>Preview</Button>
                </div>
                <textarea
                  value={policies.privacy_policy}
                  onChange={(e) => handlePolicyChange('privacy_policy', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm"
                  rows={5}
                  maxLength={2000}
                  placeholder="Enter your privacy policy..."
                />
                <p className="text-xs text-gray-500 mt-2">{policies.privacy_policy.length}/2000 characters</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">FAQ Section</h3>
                  <Button onClick={handleAddFAQ} variant="outline" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Question
                  </Button>
                </div>

                <div className="space-y-4">
                  {policies.faqs.map((faq, index) => (
                    <div key={faq.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="pt-2 text-gray-400"><GripVertical className="w-4 h-4" /></div>
                        <div className="flex-1 space-y-3">
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => handleUpdateFAQ(faq.id, 'question', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 font-semibold"
                            placeholder="Question"
                          />
                          <textarea
                            value={faq.answer}
                            onChange={(e) => handleUpdateFAQ(faq.id, 'answer', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            placeholder="Answer"
                            rows={3}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button variant="outline" size="sm" disabled={index === 0} onClick={() => handleMoveFAQ(index, 'up')}>
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={index === policies.faqs.length - 1}
                            onClick={() => handleMoveFAQ(index, 'down')}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <Button onClick={() => handleRemoveFAQ(faq.id)} variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {policies.faqs.length === 0 && <p className="text-gray-500 text-center py-4">No FAQs added yet</p>}
                </div>

                <div className="mt-4">
                  <Button onClick={() => void handleSavePolicies(false)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {saving ? 'Saving...' : 'Save All'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Email Notifications</h3>
                <div className="space-y-3">
                  {[
                    { key: 'email_new_order' as const, label: 'New Order Received' },
                    { key: 'email_order_shipped' as const, label: 'Order Shipped' },
                    { key: 'email_new_review' as const, label: 'New Review' },
                    { key: 'email_new_message' as const, label: 'New Message' },
                    { key: 'email_product_approved' as const, label: 'Product Approved' },
                    { key: 'email_store_policy_updated' as const, label: 'Store Policy Updated' },
                    { key: 'email_marketing' as const, label: 'Marketing Emails' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900">{item.label}</label>
                      <input
                        type="checkbox"
                        checked={notifications[item.key] as boolean}
                        onChange={(e) => handleNotificationChange(item.key, e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">SMS Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900">New Urgent Order</label>
                    <input
                      type="checkbox"
                      checked={notifications.sms_urgent_order}
                      onChange={(e) => handleNotificationChange('sms_urgent_order', e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900">Stock Low Alert</label>
                    <input
                      type="checkbox"
                      checked={notifications.sms_stock_low}
                      onChange={(e) => handleNotificationChange('sms_stock_low', e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between opacity-80">
                    <label className="text-sm font-medium text-gray-900">Verification Codes</label>
                    <span className="text-xs px-2 py-1 bg-slate-100 border border-slate-200 rounded">Always on</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">In-App Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900">All Notifications</label>
                    <input
                      type="checkbox"
                      checked={notifications.in_app_notifications}
                      onChange={(e) => handleNotificationChange('in_app_notifications', e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900">Sound Effects</label>
                    <input
                      type="checkbox"
                      checked={notifications.notification_sound}
                      onChange={(e) => handleNotificationChange('notification_sound', e.target.checked)}
                      className="w-4 h-4 rounded"
                      disabled={!notifications.in_app_notifications}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900">Browser Notifications</label>
                    <Button variant="outline" size="sm" onClick={() => void requestBrowserPermission()}>
                      {notifications.browser_notifications ? 'Enabled' : 'Enable'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <label className="block text-lg font-semibold text-gray-900 mb-4">Notification Frequency</label>
                <select
                  value={notifications.digest_type}
                  onChange={(e) => handleNotificationChange('digest_type', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
                >
                  <option value="instant">Instant</option>
                  <option value="hourly">Hourly digest</option>
                  <option value="daily">Daily digest</option>
                  <option value="weekly">Weekly digest</option>
                </select>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => void handleSaveNotifications(false)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold">
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Color Theme</h3>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <input type="color" value={appearance.primary_color} onChange={(e) => handleColorChange(e.target.value)} className="w-20 h-20 rounded-lg cursor-pointer border-2 border-gray-200" />
                    <input
                      type="text"
                      value={appearance.primary_color}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 font-mono"
                      placeholder={DEFAULT_PRIMARY_COLOR}
                    />
                  </div>
                  <Button onClick={() => handleColorChange(DEFAULT_PRIMARY_COLOR)} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset to Default
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Logo & Branding</h3>

                <div className="grid lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Store Logo</p>
                    <div className="w-32 h-32 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                      {appearance.logo ? <img src={appearance.logo} alt="Logo" className="w-full h-full object-cover" /> : <Upload className="w-8 h-8 text-gray-400" />}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      <Button onClick={() => document.getElementById('logo-upload')?.click()} variant="outline" size="sm">Upload</Button>
                      {appearance.logo && (
                        <Button
                          onClick={() => {
                            if (!window.confirm('Remove store logo?')) return;
                            setAppearance((prev) => ({ ...prev, logo: null }));
                            setLogoFile(null);
                            setRemoveLogo(true);
                            markDirty('appearance');
                          }}
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Store Banner</p>
                    <div className="w-full h-32 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                      {appearance.banner ? <img src={appearance.banner} alt="Banner" className="w-full h-full object-cover" /> : <Upload className="w-8 h-8 text-gray-400" />}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input type="file" id="banner-upload" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                      <Button onClick={() => document.getElementById('banner-upload')?.click()} variant="outline" size="sm">Upload</Button>
                      {appearance.banner && (
                        <Button
                          onClick={() => {
                            if (!window.confirm('Remove store banner?')) return;
                            setAppearance((prev) => ({ ...prev, banner: null }));
                            setBannerFile(null);
                            setRemoveBanner(true);
                            markDirty('appearance');
                          }}
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Favicon (optional)</p>
                    <div className="w-16 h-16 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                      {appearance.favicon ? <img src={appearance.favicon} alt="Favicon" className="w-full h-full object-cover" /> : <Upload className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input type="file" id="favicon-upload" className="hidden" accept="image/*" onChange={handleFaviconUpload} />
                      <Button onClick={() => document.getElementById('favicon-upload')?.click()} variant="outline" size="sm">Upload</Button>
                      {appearance.favicon && (
                        <Button
                          onClick={() => {
                            if (!window.confirm('Remove favicon?')) return;
                            setAppearance((prev) => ({ ...prev, favicon: null }));
                            setFaviconFile(null);
                            setRemoveFavicon(true);
                            markDirty('appearance');
                          }}
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-2">Featured Products</h3>
                <p className="text-sm text-gray-600 mb-4">Select up to 5 and reorder to control display priority</p>

                <div className="space-y-2 max-h-56 overflow-auto border border-gray-200 rounded-lg p-3">
                  {productOptions.length === 0 && <p className="text-sm text-gray-500">No products found.</p>}
                  {productOptions.map((product) => {
                    const checked = appearance.featured_products.includes(product.id);
                    return (
                      <label key={product.id} className="flex items-center justify-between gap-3 py-1">
                        <span className="text-sm text-gray-800">{product.name}</span>
                        <input type="checkbox" checked={checked} onChange={() => toggleFeaturedProduct(product.id)} />
                      </label>
                    );
                  })}
                </div>

                {appearance.featured_products.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Selected order:</p>
                    {appearance.featured_products.map((id, index) => {
                      const product = productOptions.find((p) => p.id === id);
                      return (
                        <div key={id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{product?.name || `Product ${id}`}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" disabled={index === 0} onClick={() => moveFeaturedProduct(index, 'up')}>
                              <ChevronUp className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={index === appearance.featured_products.length - 1}
                              onClick={() => moveFeaturedProduct(index, 'down')}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Store Preview</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Monitor className="w-4 h-4" /> Desktop preview</p>
                    <div className="rounded-lg border overflow-hidden">
                      <div className="h-16" style={{ backgroundColor: appearance.primary_color }} />
                      <div className="p-3 space-y-2">
                        <div className="h-3 w-2/3 bg-slate-200 rounded" />
                        <div className="h-3 w-1/2 bg-slate-100 rounded" />
                        <div className="h-20 bg-slate-50 rounded" style={{ backgroundImage: appearance.banner ? `url(${appearance.banner})` : undefined, backgroundSize: 'cover' }} />
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Smartphone className="w-4 h-4" /> Mobile preview</p>
                    <div className="mx-auto w-40 rounded-2xl border overflow-hidden">
                      <div className="h-10" style={{ backgroundColor: appearance.primary_color }} />
                      <div className="p-2 space-y-2">
                        <div className="h-2 w-3/4 bg-slate-200 rounded" />
                        <div className="h-2 w-1/2 bg-slate-100 rounded" />
                        <div className="h-16 bg-slate-50 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => navigate(`/store/${storePublicSlug}`)} variant="outline">Go to Store</Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => void handleSaveAppearance(false)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold">
                  {saving ? 'Saving...' : 'Save Appearance'}
                </Button>
              </div>
            </div>
          )}

          {previewPolicy && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4" onClick={() => setPreviewPolicy(null)}>
              <div className="bg-white rounded-xl w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Policy Preview</h3>
                  <Button variant="outline" onClick={() => setPreviewPolicy(null)}>Close</Button>
                </div>
                <div className="whitespace-pre-wrap text-sm text-gray-700 border rounded-lg p-4 max-h-[60vh] overflow-auto">
                  {policyPreviewText || 'Nothing to preview yet.'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default VendorSettingsPage;

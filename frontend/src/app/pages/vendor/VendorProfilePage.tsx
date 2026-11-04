import React, { useState, useEffect } from 'react';
import {
  Upload, X, User, Store, DollarSign, FileText, AlertCircle, Check, Clock
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import Layout from '../../components/layout/Layout';
import { toast } from 'sonner';
import api from '../../../services/api';

interface AccountData {
  full_name: string;
  email: string;
  phone: string;
  street_address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  avatar: string | null;
  avatar_file: File | null;
  status: 'active' | 'pending' | 'suspended' | 'approved';
}

interface FormErrors {
  [key: string]: string;
}

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia',
  'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus',
  'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia & Herzegovina', 'Botswana',
  'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon',
  'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia',
  'Comoros', 'Congo', 'Costa Rica', 'Côte d\'Ivoire', 'Croatia', 'Cuba', 'Cyprus',
  'Czechia', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji',
  'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
  'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan',
  'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos',
  'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania',
  'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco',
  'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua',
  'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau',
  'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts & Nevis', 'Saint Lucia', 'Saint Vincent & The Grenadines',
  'Samoa', 'San Marino', 'Sao Tome & Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles',
  'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa',
  'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
  'Trinidad & Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

const VendorProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const [accountData, setAccountData] = useState<AccountData>({
    full_name: '',
    email: '',
    phone: '',
    street_address: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'Afghanistan',
    avatar: null,
    avatar_file: null,
    status: 'pending',
  });

  // Fetch vendor profile on mount
  useEffect(() => {
    fetchVendorProfile();
  }, []);

  const fetchVendorProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/vendors/profile/');
      const data = response.data;
      const userData = data.user || {};
      const vendorData = data.vendor || {};
      const fullName = [userData.first_name, userData.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      
      setAccountData({
        full_name: fullName,
        email: userData.email || '',
        phone: userData.phone || '',
        street_address: vendorData.street_address || '',
        city: vendorData.city || '',
        province: vendorData.province || '',
        postal_code: vendorData.postal_code || '',
        country: vendorData.country || 'Afghanistan',
        avatar: vendorData.avatar || null,
        avatar_file: null,
        status: vendorData.status || 'pending',
      });

      if (vendorData.avatar) {
        setAvatarPreview(vendorData.avatar);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const validateAccountForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!accountData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!accountData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\+\d\s\-\(\)]+$/.test(accountData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!accountData.street_address.trim()) {
      newErrors.street_address = 'Street address is required';
    }

    if (!accountData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!accountData.postal_code.trim()) {
      newErrors.postal_code = 'Postal code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAccount = async () => {
    if (!validateAccountForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      
      formData.append('phone', accountData.phone);
      formData.append('street_address', accountData.street_address);
      formData.append('city', accountData.city);
      formData.append('province', accountData.province);
      formData.append('postal_code', accountData.postal_code);
      formData.append('country', accountData.country);
      
      if (accountData.avatar_file) {
        formData.append('avatar', accountData.avatar_file);
      }

      const names = accountData.full_name.trim().split(' ');
      formData.append('first_name', names[0]);
      formData.append('last_name', names.slice(1).join(' ') || '');

      const response = await api.patch('/vendors/profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setAccountData(prev => ({
        ...prev,
        avatar: response.data.avatar || prev.avatar,
        avatar_file: null,
      }));

      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAccountDataChange = (field: keyof AccountData, value: any) => {
    setAccountData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));

    // Autosave after 2 seconds
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    const timeout = setTimeout(() => {
      handleSaveAccount();
    }, 2000);
    setSaveTimeout(timeout);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP formats are allowed');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setAccountData(prev => ({
      ...prev,
      avatar_file: file,
    }));
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAccountData(prev => ({
      ...prev,
      avatar: null,
      avatar_file: null,
    }));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Active' },
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      suspended: { bg: 'bg-red-100', text: 'text-red-700', label: 'Suspended' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {(status === 'active' || status === 'approved') && <Check className="w-3 h-3" />}
        {status === 'pending' && <Clock className="w-3 h-3" />}
        {status === 'suspended' && <AlertCircle className="w-3 h-3" />}
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout variant="vendor">
        <div className="p-6 max-w-4xl mx-auto text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full" />
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout variant="vendor">
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="p-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900">Your Profile</h1>
            <p className="text-gray-600 mt-2">Manage your account, store, and business information</p>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('account')}
                className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 ${
                  activeTab === 'account'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="w-5 h-5" />
                Account
              </button>
              <button
                onClick={() => setActiveTab('store')}
                className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 ${
                  activeTab === 'store'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Store className="w-5 h-5" />
                Store
              </button>
              <button
                onClick={() => setActiveTab('bank')}
                className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 ${
                  activeTab === 'bank'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <DollarSign className="w-5 h-5" />
                Bank Details
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 ${
                  activeTab === 'documents'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-5 h-5" />
                Documents
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Account Status */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Account Status</h3>
                    <p className="text-sm text-gray-600 mt-1">Your current account verification status</p>
                  </div>
                  {getStatusBadge(accountData.status)}
                </div>
              </div>

              {/* Profile Picture */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <label className="block text-lg font-semibold text-gray-900 mb-4">Profile Picture</label>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center overflow-hidden border-2 border-emerald-200">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <input
                      type="file"
                      id="avatar-upload"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarUpload}
                    />
                    <Button
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Photo
                    </Button>
                    {avatarPreview && (
                      <Button
                        onClick={handleRemoveAvatar}
                        variant="outline"
                        className="flex items-center gap-2 text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                        Remove
                      </Button>
                    )}
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG, or WebP. Max 2MB.</p>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountData.full_name}
                    onChange={(e) => handleAccountDataChange('full_name', e.target.value)}
                    placeholder="John Doe"
                    className={`w-full px-4 py-2 rounded-lg border-2 transition-colors focus:outline-none ${
                      errors.full_name
                        ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-blue-300 focus:ring-2 focus:ring-emerald-200'
                    }`}
                  />
                  {errors.full_name && (
                    <p className="text-sm text-red-600 mt-1">{errors.full_name}</p>
                  )}
                </div>

                {/* Email and Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Email (Read-only)</label>
                    <input
                      type="email"
                      value={accountData.email}
                      disabled
                      className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Phone Number <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      value={accountData.phone}
                      onChange={(e) => handleAccountDataChange('phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className={`w-full px-4 py-2 rounded-lg border-2 transition-colors focus:outline-none ${
                        errors.phone
                          ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                          : 'border-blue-300 focus:ring-2 focus:ring-emerald-200'
                      }`}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Street Address <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountData.street_address}
                    onChange={(e) => handleAccountDataChange('street_address', e.target.value)}
                    placeholder="123 Business St"
                    className={`w-full px-4 py-2 rounded-lg border-2 transition-colors focus:outline-none ${
                      errors.street_address
                        ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-blue-300 focus:ring-2 focus:ring-emerald-200'
                    }`}
                  />
                  {errors.street_address && (
                    <p className="text-sm text-red-600 mt-1">{errors.street_address}</p>
                  )}
                </div>

                {/* City, Province, Postal Code */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      City <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={accountData.city}
                      onChange={(e) => handleAccountDataChange('city', e.target.value)}
                      placeholder="Kabul"
                      className={`w-full px-4 py-2 rounded-lg border-2 transition-colors focus:outline-none ${
                        errors.city
                          ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                          : 'border-blue-300 focus:ring-2 focus:ring-emerald-200'
                      }`}
                    />
                    {errors.city && (
                      <p className="text-sm text-red-600 mt-1">{errors.city}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Province/State</label>
                    <input
                      type="text"
                      value={accountData.province}
                      onChange={(e) => handleAccountDataChange('province', e.target.value)}
                      placeholder="Optional"
                      className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Postal Code <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={accountData.postal_code}
                      onChange={(e) => handleAccountDataChange('postal_code', e.target.value)}
                      placeholder="12345"
                      className={`w-full px-4 py-2 rounded-lg border-2 transition-colors focus:outline-none ${
                        errors.postal_code
                          ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                          : 'border-blue-300 focus:ring-2 focus:ring-emerald-200'
                      }`}
                    />
                    {errors.postal_code && (
                      <p className="text-sm text-red-600 mt-1">{errors.postal_code}</p>
                    )}
                  </div>
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Country</label>
                  <select
                    value={accountData.country}
                    onChange={(e) => handleAccountDataChange('country', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white"
                  >
                    {COUNTRIES.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveAccount}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={() => fetchVendorProfile()}
                  variant="outline"
                  className="px-6 py-3 rounded-lg font-semibold"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Other tabs coming in Phase 4B */}
          {['store', 'bank', 'documents'].includes(activeTab) && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-600 text-lg">This tab will be available in Phase 4B</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default VendorProfilePage;

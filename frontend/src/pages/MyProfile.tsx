// File 1: frontend/src/pages/MyProfile.tsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, MapPin, Camera, Save, X, Star } from 'lucide-react';
import Layout from '../app/components/layout/Layout';
import { getCurrentUser } from '../utils/auth';
import api from '../services/api';

interface Address {
  id: number;
  label: string;
  full_address: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
}

const MyProfile: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = getCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'address' | 'reviews'>('info');

  // Profile Info State
  const [profileData, setProfileData] = useState({
    full_name: currentUser?.full_name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    profile_picture: currentUser?.profile_picture || '',
  });

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Address State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: '',
    full_address: '',
    city: '',
    province: '',
    postal_code: '',
    is_default: false,
  });

  // Load addresses
  useEffect(() => {
    if (activeTab === 'address') {
      loadAddresses();
    }
  }, [activeTab]);

const loadAddresses = async () => {
  try {
    const response = await api.get('/user/addresses/');
    // Make sure we're setting an array
    setAddresses(Array.isArray(response.data) ? response.data : []);
  } catch (error) {
    console.error('Error loading addresses:', error);
    setAddresses([]); // Set empty array on error
  }
};

  // Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.put('/user/profile/', profileData);
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(response.data));
      
      setMessage({ type: 'success', text: t('profile_updated_success') });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('profile_update_failed') });
    } finally {
      setLoading(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: t('profile_password_mismatch') });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await api.post('/user/change-password/', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      
      setMessage({ type: 'success', text: t('profile_password_changed_success') });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('profile_password_change_failed') });
    } finally {
      setLoading(false);
    }
  };

  // Save Address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingAddress) {
        await api.put(`/user/addresses/${editingAddress.id}/`, addressForm);
      } else {
        await api.post('/user/addresses/', addressForm);
      }
      
      loadAddresses();
      setShowAddressForm(false);
      setEditingAddress(null);
      setAddressForm({ label: '', full_address: '', city: '', province: '', postal_code: '', is_default: false });
      setMessage({ type: 'success', text: t('profile_address_saved_success') });
    } catch (error: any) {
      setMessage({ type: 'error', text: t('profile_address_save_failed') });
    } finally {
      setLoading(false);
    }
  };

  // Delete Address
  const handleDeleteAddress = async (id: number) => {
if (!confirm(t('profile_delete_address_confirm'))) return;

    try {
      await api.delete(`/user/addresses/${id}/`);
      loadAddresses();
      setMessage({ type: 'success', text: t('profile_address_deleted_success') });
    } catch (error) {
      setMessage({ type: 'error', text: t('profile_address_delete_failed') });
    }
  };

  return (
    <Layout variant="customer" cartItemCount={0}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('profile_heading')}</h1>
          <p className="text-gray-600">{t('profile_description')}</p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-4 font-medium transition-colors ${
                activeTab === 'info' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('profile_tab_info')}
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`pb-4 font-medium transition-colors ${
                activeTab === 'password' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('profile_tab_password')}
            </button>
            <button
              onClick={() => setActiveTab('address')}
              className={`pb-4 font-medium transition-colors ${
                activeTab === 'address' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('profile_tab_addresses')}
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 font-medium transition-colors ${
                activeTab === 'reviews' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('profile_tab_reviews')}
            </button>
          </div>
        </div>

        {/* Profile Information Tab */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {profileData.profile_picture ? (
                      <img src={profileData.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 bg-teal-600 text-white p-2 rounded-full hover:bg-teal-700"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{profileData.full_name}</h3>
                  <p className="text-sm text-gray-600">{t('profile_update_picture_description')}</p>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile_full_name_label')}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile_email_label')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile_phone_label')}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {loading ? t('profile_saving') : t('profile_save_button')}
              </button>
            </form>
          </div>
        )}

        {/* Change Password Tab */}
        {activeTab === 'password' && (
          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile_current_password_label')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile_new_password_label')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile_confirm_password_label')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {loading ? t('profile_changing_password') : t('profile_change_password_button')}
              </button>
            </form>
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === 'address' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{t('profile_saved_addresses')}</h2>
              <button
                onClick={() => setShowAddressForm(true)}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
              >
                {t('profile_add_address')}
              </button>
            </div>

            {/* Address Form */}
            {showAddressForm && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">{editingAddress ? t('profile_edit_address') : t('profile_add_address')}</h3>
                  <button onClick={() => { setShowAddressForm(false); setEditingAddress(null); }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSaveAddress} className="space-y-4">
                  <input
                    type="text"
                    placeholder={t('profile_address_label_placeholder')}
                    value={addressForm.label}
                    onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                  <textarea
                    placeholder={t('profile_address_full_placeholder')}
                    value={addressForm.full_address}
                    onChange={(e) => setAddressForm({ ...addressForm, full_address: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    rows={3}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder={t('profile_address_city_placeholder')}
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder={t('profile_address_province_placeholder')}
                      value={addressForm.province}
                      onChange={(e) => setAddressForm({ ...addressForm, province: e.target.value })}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    placeholder={t('profile_address_postal_placeholder')}
                    value={addressForm.postal_code}
                    onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={addressForm.is_default}
                      onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                      className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm">{t('profile_set_default_address')}</span>
                  </label>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? t('profile_saving') : t('profile_save_address')}
                  </button>
                </form>
              </div>
            )}

            {/* Address List */}
            <div className="grid gap-4">
              {addresses.map((address) => (
                <div key={address.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-teal-600 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          {address.label}
                          {address.is_default && (
                            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded">Default</span>
                          )}
                        </h3>
                        <p className="text-gray-600 mt-1">{address.full_address}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {address.city}, {address.province} {address.postal_code}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingAddress(address);
                          setAddressForm(address);
                          setShowAddressForm(true);
                        }}
                        className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                      >
                        {t('profile_edit_button')}
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(address.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {addresses.length === 0 && !showAddressForm && (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">{t('profile_no_addresses')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-teal-600" />
                Your Reviews
              </h2>
            </div>

            <div className="text-center py-12">
              <Star className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">{t('profile_no_reviews')}</p>
              <button
                onClick={() => navigate('/orders')}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium"
              >
                {t('profile_leave_review')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyProfile;
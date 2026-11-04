// File 2: frontend/src/pages/SignUp.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { User, Phone, Mail, Lock, Eye, EyeOff, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    general: '',
  });

  const handleGoogleResponse = useCallback(async (response: any) => {
    setLoading(true);
    setErrors({ full_name: '', phone: '', email: '', password: '', confirmPassword: '', general: '' });
    try {
      const result = await authAPI.googleAuth(response.credential);
      if (result.status === 'success') {
        localStorage.setItem('access_token', result.tokens.access);
        localStorage.setItem('refresh_token', result.tokens.refresh);
        localStorage.setItem('user', JSON.stringify(result.user));
        navigate('/home');
      } else {
        setErrors((prev) => ({ ...prev, general: result.message || 'Google sign-up failed' }));
      }
    } catch (error: any) {
      setErrors((prev) => ({ ...prev, general: error?.response?.data?.message || 'Google sign-up failed' }));
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      (window as any).google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      const btnDiv = document.getElementById('google-signup-btn');
      if (btnDiv) {
        (window as any).google?.accounts.id.renderButton(btnDiv, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signup_with',
        });
      }
    };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [handleGoogleResponse]);

  const validateForm = () => {
    const newErrors = {
      full_name: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      general: '',
    };

    if (!formData.full_name.trim()) {
      newErrors.full_name = t('error_full_name_required');
    } else if (formData.full_name.trim().length < 3) {
      newErrors.full_name = t('error_full_name_min_length');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('error_phone_required');
    } else if (!/^[0-9+\s-]{10,15}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      newErrors.phone = t('error_phone_invalid');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('error_email_required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('error_email_invalid');
    }

    if (!formData.password) {
      newErrors.password = t('error_password_required');
    } else if (formData.password.length < 8) {
      newErrors.password = t('error_password_min_length');
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('error_confirm_password_required');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('error_password_mismatch');
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({
      full_name: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      general: '',
    });

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Call backend API
      const normalizedPhone = formData.phone.startsWith('+')
        ? formData.phone
        : `+93${formData.phone.replace(/^0/, '')}`;

      const response = await authAPI.register({
        full_name: formData.full_name.trim(),
        phone: normalizedPhone,
        email: formData.email.trim(),
        password: formData.password,
        password_confirm: formData.confirmPassword,
        role: 'customer',
        frontend_url: window.location.origin, // Pass actual frontend URL (port 5174)
      });
      if (response.requires_email_verification) {
        navigate('/verify-email-pending', { state: { email: response.email } });
        return;
      }
      if (response?.tokens?.access) {
        localStorage.setItem('access_token', response.tokens.access);
        localStorage.setItem('refresh_token', response.tokens.refresh);
      }
      if (response?.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      // For e-commerce flow, both cases show success
      // (with or without email verification requirement)
      setSuccess(true);

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        navigate('/home');
      }, 3000);
    } catch (error: any) {
      console.error('Registration error:', error);
      setLoading(false);

      // Handle different error types
      if (error.response?.data) {
        const errorData = error.response.data;

        if (errorData.errors) {
          // Field-specific errors from backend
          const fieldErrors = errorData.errors;
          setErrors({
            full_name: Array.isArray(fieldErrors.full_name) ? fieldErrors.full_name[0] : '',
            phone: Array.isArray(fieldErrors.phone) ? fieldErrors.phone[0] : '',
            email: Array.isArray(fieldErrors.email) ? fieldErrors.email[0] : '',
            password: Array.isArray(fieldErrors.password) ? fieldErrors.password[0] : '',
            confirmPassword: Array.isArray(fieldErrors.password_confirm) ? fieldErrors.password_confirm[0] : '',
            general: Array.isArray(fieldErrors.non_field_errors) ? fieldErrors.non_field_errors[0] : '',
          });
        } else if (errorData.message) {
          setErrors({ ...errors, general: errorData.message });
        } else {
          setErrors({ ...errors, general: t('error_registration_failed') });
        }
      } else if (error.request) {
        setErrors({ ...errors, general: 'Cannot connect to server. Please check your connection.' });
      } else {
        setErrors({ ...errors, general: error.message || 'An unexpected error occurred.' });
      }
    }
  };

  // Success Screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('signup_success_title')}</h2>
            
            {/* Email verification messaging disabled for demo.
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-4 my-6">
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-semibold">{t('signup_verify_email_title')}</span>
              </p>
              <p className="text-sm text-gray-600">
                {t('signup_verify_email_description')}
              </p>
              <p className="text-xs text-gray-500 mt-3">
                {t('signup_link_expires')} <span className="font-semibold">{t('signup_link_expires_time')}</span>
              </p>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-500 rounded p-4 my-4">
              <p className="text-xs text-amber-800">
                <span className="font-semibold">{t('signup_tip_title')}</span> {t('signup_tip_description')}
              </p>
            </div>
            */}

            <p className="text-sm text-gray-500 my-6">
              <span className="inline-block animate-pulse">{t('signup_redirecting')}</span>
            </p>

            {/*
            <button
              onClick={() => navigate('/verify-email-pending', { state: { email: formData.email.trim() } })}
              className="text-teal-600 hover:text-teal-700 font-semibold text-sm"
            >
              {t('signup_go_to_verification')}
            </button>
            */}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← {t('signup_back_to_home')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-teal-600">BazaarAF</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('signup_page_heading')}</h2>
          <p className="mt-2 text-gray-600">{t('signup_page_description')}</p>
        </div>

        {/* Sign Up Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* General Error Alert */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{t('signup_general_error')}</p>
                  <p className="text-sm text-red-700 mt-1">{errors.general}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('signup_full_name_label')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('signup_full_name_placeholder')}
                  value={formData.full_name}
                  onChange={(e) => {
                    setFormData({ ...formData, full_name: e.target.value });
                    setErrors({ ...errors, full_name: '', general: '' });
                  }}
                  className={`w-full pl-10 pr-4 py-3 border ${errors.full_name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'
                    } rounded-lg focus:outline-none focus:ring-2 focus:border-transparent`}
                  disabled={loading}
                />
              </div>
              {errors.full_name && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.full_name}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('signup_phone_label')}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  placeholder={t('signup_phone_placeholder')}
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    setErrors({ ...errors, phone: '', general: '' });
                  }}
                  className={`w-full pl-10 pr-4 py-3 border ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'
                    } rounded-lg focus:outline-none focus:ring-2 focus:border-transparent`}
                  disabled={loading}
                />
              </div>
              {errors.phone && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('signup_email_label')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder={t('signup_email_placeholder')}
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setErrors({ ...errors, email: '', general: '' });
                  }}
                  className={`w-full pl-10 pr-4 py-3 border ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'
                    } rounded-lg focus:outline-none focus:ring-2 focus:border-transparent`}
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('signup_password_label')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('signup_password_placeholder')}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setErrors({ ...errors, password: '', confirmPassword: '', general: '' });
                  }}
                  className={`w-full pl-10 pr-12 py-3 border ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'
                    } rounded-lg focus:outline-none focus:ring-2 focus:border-transparent`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('signup_confirm_password_label')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t('signup_confirm_password_placeholder')}
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    setErrors({ ...errors, confirmPassword: '', general: '' });
                  }}
                  className={`w-full pl-10 pr-12 py-3 border ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'
                    } rounded-lg focus:outline-none focus:ring-2 focus:border-transparent`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-teal-600 text-white py-3 rounded-lg font-semibold transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-teal-700'
                }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('signup_registering')}
                </span>
              ) : (
                t('signup_register_button')
              )}
            </button>

            {GOOGLE_CLIENT_ID && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">or</span>
                  </div>
                </div>
                <div id="google-signup-btn" className="flex justify-center"></div>
              </>
            )}
          </form>

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">{t('signup_already_have_account')}</span>
            </div>
          </div>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-teal-600 hover:text-teal-700 font-semibold"
              disabled={loading}
            >
              {t('login_button')}
            </button>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-gray-800"
            disabled={loading}
          >
            ← {t('signup_back_to_home')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
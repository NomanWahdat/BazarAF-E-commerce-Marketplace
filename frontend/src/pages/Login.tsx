import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Lock, Eye, EyeOff, Package, AlertCircle, Phone, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

type LoginStep = 'credentials' | 'twofa';

interface Pending2FAUser {
  id: string;
  full_name: string;
  role: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [challengeToken, setChallengeToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pendingUser, setPendingUser] = useState<Pending2FAUser | null>(null);

  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });

  const [errors, setErrors] = useState({
    identifier: '',
    password: '',
    twofa: '',
    general: '',
  });

  const navigateByRole = (role: string) => {
    if (role === 'vendor') {
      navigate('/vendor');
      return;
    }
    if (role === 'admin') {
      navigate('/admin');
      return;
    }
    navigate('/home');
  };

  const getInputType = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.includes('@')) {
      return 'email';
    }
    if (/^[\d+\s()-]+$/.test(trimmed)) {
      return 'phone';
    }
    return 'unknown';
  };

  const validateCredentialsForm = () => {
    const nextErrors = {
      identifier: '',
      password: '',
      twofa: '',
      general: '',
    };

    if (!formData.identifier.trim()) {
      nextErrors.identifier = t('error_email_or_phone_required');
    }
    if (!formData.password) {
      nextErrors.password = t('error_password_required');
    }

    setErrors(nextErrors);
    return !nextErrors.identifier && !nextErrors.password;
  };

  const normalizeIdentifier = () => {
    const inputType = getInputType(formData.identifier);
    let identifier = formData.identifier.trim();

    if (inputType === 'phone') {
      identifier = identifier.replace(/[\s()-]/g, '');
      if (!identifier.startsWith('+')) {
        identifier = identifier.startsWith('0') ? `+93${identifier.substring(1)}` : `+93${identifier}`;
      }
    }

    return identifier;
  };

  const finishAuth = (response: any) => {
    localStorage.setItem('access_token', response.tokens.access);
    localStorage.setItem('refresh_token', response.tokens.refresh);
    localStorage.setItem('user', JSON.stringify(response.user));
    navigateByRole(response.user.role);
  };

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCredentialsForm()) return;

    setLoading(true);
    setErrors({ identifier: '', password: '', twofa: '', general: '' });

    try {
      const response = await authAPI.login(normalizeIdentifier(), formData.password);

      if (response.status === 'success') {
        finishAuth(response);
        return;
      }

      if (response.status === '2fa_required') {
        setChallengeToken(response.challenge_token || '');
        setPendingUser(response.user || null);
        setTwoFactorCode('');
        setStep('twofa');
        return;
      }

      if (response.requires_email_verification) {
        navigate('/verify-email-pending', { state: { email: response.email } });
        return;
      }

      setErrors((prev) => ({ ...prev, general: response.message || t('error_auth_failed') }));
    } catch (error: any) {
      const data = error?.response?.data;
      if (data?.requires_email_verification) {
        navigate('/verify-email-pending', { state: { email: data.email } });
        return;
      }
      const message =
        data?.message ||
        data?.detail ||
        t('error_invalid_email_phone');
      setErrors((prev) => ({ ...prev, general: message }));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleResponse = useCallback(async (response: any) => {
    setLoading(true);
    setErrors({ identifier: '', password: '', twofa: '', general: '' });
    try {
      const result = await authAPI.googleAuth(response.credential);
      if (result.status === '2fa_required') {
        setChallengeToken(result.challenge_token);
        setStep('twofa');
        return;
      }
      if (result.status === 'success') {
        finishAuth(result);
      } else {
        setErrors((prev) => ({ ...prev, general: result.message || 'Google sign-in failed' }));
      }
    } catch (error: any) {
      setErrors((prev) => ({ ...prev, general: error?.response?.data?.message || 'Google sign-in failed' }));
    } finally {
      setLoading(false);
    }
  }, []);

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
      const btnDiv = document.getElementById('google-signin-btn');
      if (btnDiv) {
        (window as any).google?.accounts.id.renderButton(btnDiv, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'continue_with',
        });
      }
    };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [handleGoogleResponse]);

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors((prev) => ({ ...prev, twofa: '', general: '' }));

    if (!challengeToken) {
      setErrors((prev) => ({ ...prev, general: t('error_2fa_expired') }));
      setStep('credentials');
      return;
    }

    if (!twoFactorCode.trim()) {
      setErrors((prev) => ({ ...prev, twofa: t('error_2fa_code_required') }));
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.verifyTwoFactor(challengeToken, twoFactorCode.trim());
      if (response.status === 'success') {
        finishAuth(response);
        return;
      }
      setErrors((prev) => ({ ...prev, twofa: response.message || t('error_2fa_failed') }));
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        t('error_2fa_invalid');
      setErrors((prev) => ({ ...prev, twofa: message }));
      if (error?.response?.status === 401) {
        setStep('credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputType = getInputType(formData.identifier);
  const InputIcon = inputType === 'phone' ? Phone : Mail;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-teal-600">BazaarAF</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('welcome_back')}</h2>
          <p className="mt-2 text-gray-600">
            {step === 'credentials' ? t('login_description_credentials') : t('login_description_2fa')}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{t('error_auth_failed')}</p>
                  <p className="text-sm text-red-700 mt-1">{errors.general}</p>
                </div>
              </div>
            </div>
          )}

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('login_email_or_phone_label')}</label>
                <div className="relative">
                  <InputIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.identifier}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, identifier: e.target.value }));
                      setErrors((prev) => ({ ...prev, identifier: '', general: '' }));
                    }}
                    className={`w-full pl-10 pr-4 py-3 border ${
                      errors.identifier ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'
                    } rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                    disabled={loading}
                    autoComplete="username"
                    placeholder={t('login_email_or_phone_placeholder')}
                  />
                </div>
                {errors.identifier && <p className="mt-2 text-sm text-red-600">{errors.identifier}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('login_password_label')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, password: e.target.value }));
                      setErrors((prev) => ({ ...prev, password: '', general: '' }));
                    }}
                    className={`w-full pl-10 pr-12 py-3 border ${
                      errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'
                    } rounded-lg focus:outline-none focus:ring-2 focus:border-transparent`}
                    disabled={loading}
                    autoComplete="current-password"
                    placeholder={t('login_password_placeholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                  disabled={loading}
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-teal-600 text-white py-3 rounded-lg font-semibold transition-all ${
                  loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-teal-700 hover:shadow-lg'
                }`}
              >
                {loading ? t('login_logging_in') : t('login_button')}
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
                  <div id="google-signin-btn" className="flex justify-center"></div>
                </>
              )}
            </form>
          ) : (
            <form onSubmit={handleTwoFactorSubmit} className="space-y-5">
              <div className="p-3 rounded-lg border border-blue-100 bg-blue-50 text-blue-800 text-sm flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5" />
                <span>
                  {t('login_2fa_enabled_message', { name: pendingUser?.full_name || 'this account' })}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('login_2fa_code_label')}</label>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => {
                    setTwoFactorCode(e.target.value);
                    setErrors((prev) => ({ ...prev, twofa: '', general: '' }));
                  }}
                  className={`w-full px-4 py-3 border ${
                    errors.twofa ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'
                  } rounded-lg focus:outline-none focus:ring-2 focus:border-transparent tracking-widest uppercase`}
                  disabled={loading}
                  placeholder={t('login_2fa_code_placeholder')}
                  autoFocus
                />
                {errors.twofa && <p className="mt-2 text-sm text-red-600">{errors.twofa}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50"
                  disabled={loading}
                  onClick={() => {
                    setStep('credentials');
                    setChallengeToken('');
                    setTwoFactorCode('');
                    setPendingUser(null);
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-teal-600 text-white py-3 rounded-lg font-semibold transition-all ${
                    loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-teal-700 hover:shadow-lg'
                  }`}
                >
                  {loading ? t('verify_verifying') : t('verify_continue_button')}
                </button>
              </div>
            </form>
          )}

          {step === 'credentials' && (
            <>
              <div className="mt-6 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">{t('login_signup_prompt')}</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate('/signup')}
                  className="text-teal-600 hover:text-teal-700 font-semibold"
                  disabled={loading}
                >
                  {t('login_signup_link')}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-gray-800"
            disabled={loading}
          >
            {t('login_back_home')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

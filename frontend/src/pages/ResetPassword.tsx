import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { Button } from '../app/components/ui/button';
import { Card } from '../app/components/ui/card';
import api from '../services/api';
import { toast } from 'sonner';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'invalid'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setStatus('invalid');
      setMessage('No reset token provided.');
      return;
    }

    if (!password || !passwordConfirm) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== passwordConfirm) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/reset-password/', {
        token,
        password
      });

      if (response.status === 200) {
        setStatus('success');
        setMessage('Your password has been reset successfully! ✓');
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(
        error.response?.data?.message ||
        'Password reset failed. Token may have expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
        <Card className="w-full max-w-md shadow-lg">
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-4">Invalid Request</h1>
            <p className="text-gray-600 mb-8">
              No reset token provided. Please use the link sent to your email.
            </p>
            <Button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              Request New Link
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
        <Card className="w-full max-w-md shadow-lg">
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-4">Password Reset! ✓</h1>
            <p className="text-green-600 mb-8">{message}</p>
            <p className="text-sm text-gray-600 mb-4">
              Redirecting you to login in a moment...
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
        <Card className="w-full max-w-md shadow-lg">
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-4">Reset Failed</h1>
            <p className="text-red-600 mb-8">{message}</p>
            <Button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              Request New Link
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <div className="p-8">
          <div className="flex items-center justify-center mb-8">
            <Lock className="w-8 h-8 text-teal-600 mr-3" />
            <h1 className="text-2xl font-bold">Reset Password</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (min. 8 characters)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Confirm your new password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            {/* Password Requirements */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="text-blue-900 font-medium mb-2">Password Requirements:</p>
              <ul className="text-blue-800 space-y-1 text-xs">
                <li>✓ At least 8 characters long</li>
                <li>✓ Mix of uppercase and lowercase letters</li>
                <li>✓ Include numbers and special characters</li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>

            {/* Back to Login */}
            <p className="text-center text-sm text-gray-600">
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-teal-600 hover:text-teal-700 font-medium"
              >
                Back to Login
              </button>
            </p>
          </form>
        </div>
      </Card>
    </div>
  );
}

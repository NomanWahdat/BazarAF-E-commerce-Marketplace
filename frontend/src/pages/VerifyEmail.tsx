import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { Button } from '../app/components/ui/button';
import { Card } from '../app/components/ui/card';
import api from '../services/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token') || searchParams.get('otp');
      const email = searchParams.get('email') || '';

      if (!token) {
        setStatus('invalid');
        setMessage('No verification code provided.');
        return;
      }

      try {
        const response = await api.post('/auth/verify-email/', { token, email });
        
        if (response.status === 200) {
          setStatus('success');
          setMessage('Your email has been verified successfully! ✓');
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(
          error.response?.data?.message ||
          'Email verification failed. Code may have expired.'
        );
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="p-8 text-center">
          <div className="flex justify-center mb-6">
            {status === 'loading' && (
              <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            )}
            {status === 'error' && (
              <AlertCircle className="w-12 h-12 text-red-600" />
            )}
            {status === 'invalid' && (
              <Mail className="w-12 h-12 text-gray-400" />
            )}
          </div>

          <h1 className="text-2xl font-bold mb-4">
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified! ✓'}
            {status === 'error' && 'Verification Failed'}
            {status === 'invalid' && 'Invalid Request'}
          </h1>

          <p className={`text-lg mb-8 ${
            status === 'success' ? 'text-green-600' :
            status === 'error' ? 'text-red-600' :
            status === 'invalid' ? 'text-gray-600' :
            'text-gray-500'
          }`}>
            {message}
          </p>

          {status === 'success' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Redirecting you to login in a moment...
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                Go to Login
              </Button>
            </div>
          )}

          {(status === 'error' || status === 'invalid') && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {status === 'error' 
                  ? 'Your verification code may have expired. Please request a new code.'
                  : 'Please use the verification code sent to your email.'}
              </p>
              <Button
                onClick={() => navigate('/signup')}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                Return to Sign Up
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

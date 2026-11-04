// File: frontend/src/pages/SellerRegistration.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  User,
  Phone,
  Mail,
  Building,
  MapPin,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Package,
  Shield,
} from 'lucide-react';
import { Button } from '../app/components/ui/button';
import { Card } from '../app/components/ui/card';
import { toast } from 'sonner';

interface FormData {
  full_name: string;
  phone: string;
  email: string;
  shop_name: string;
  address: string;
  city: string;
  identity_document: File | null;
  business_document: File | null;
}

interface FormErrors {
  [key: string]: string;
}

const SellerRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [applicationId, setApplicationId] = useState('');

  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    phone: '',
    email: '',
    shop_name: '',
    address: '',
    city: '',
    identity_document: null,
    business_document: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const afghanCities = [
    'Kabul', 'Herat', 'Kandahar', 'Mazar-i-Sharif', 'Jalalabad',
    'Kunduz', 'Ghazni', 'Balkh', 'Nangarhar', 'Badakhshan',
    'Baghlan', 'Bamyan', 'Farah', 'Faryab', 'Helmand',
    'Jawzjan', 'Kunar', 'Laghman', 'Logar', 'Nimroz',
    'Nuristan', 'Paktia', 'Paktika', 'Panjshir', 'Parwan',
    'Samangan', 'Sar-e Pol', 'Takhar', 'Uruzgan', 'Wardak', 'Zabul'
  ];

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9]{10,15}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      newErrors.phone = 'Invalid phone number (10-15 digits)';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.shop_name.trim()) {
      newErrors.shop_name = 'Shop name is required';
    }
    if (!formData.city) {
      newErrors.city = 'City is required';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.identity_document) {
      newErrors.identity_document = 'Identity document is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, [fieldName]: 'File size must be less than 5MB' });
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setErrors({ ...errors, [fieldName]: 'Only PDF, JPG, and PNG files are allowed' });
        return;
      }

      setFormData({ ...formData, [fieldName]: file });
      setErrors({ ...errors, [fieldName]: '' });
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) {
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('full_name', formData.full_name.trim());
      formDataToSend.append('phone', formData.phone.trim());
      formDataToSend.append('email', formData.email.trim());
      formDataToSend.append('shop_name', formData.shop_name.trim());
      formDataToSend.append('address', formData.address.trim());
      formDataToSend.append('city', formData.city);
      
      if (formData.identity_document) {
        formDataToSend.append('identity_document', formData.identity_document);
      }
      if (formData.business_document) {
        formDataToSend.append('business_document', formData.business_document);
      }

      const response = await api.post(
        '/seller-applications/',
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data) {
        setApplicationId(response.data.application_id || response.data.id);
        setIsSuccess(true);
        toast.success('Application submitted successfully!');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.response?.data) {
        const apiErrors = error.response.data;
        const errorMessages: FormErrors = {};
        
        // Handle field-specific errors
        Object.keys(apiErrors).forEach(key => {
          if (Array.isArray(apiErrors[key])) {
            errorMessages[key] = apiErrors[key][0];
          } else if (typeof apiErrors[key] === 'string') {
            errorMessages[key] = apiErrors[key];
          }
        });

        setErrors(errorMessages);
        
        const errorMsg = apiErrors.detail || apiErrors.message || 'Registration failed. Please check your information.';
        toast.error(errorMsg);
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Success Screen
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <Card className="max-w-2xl w-full p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Application Submitted Successfully! 🎉</h2>
            <p className="text-gray-600 mb-6">
              Thank you for applying to become a seller on BazaarAF!
            </p>

            {applicationId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Application ID:</strong> {applicationId}
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  Please save this ID for your records
                </p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                What Happens Next?
              </h3>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">1.</span>
                  <span>Our verification team will review your documents within <strong>24-48 hours</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">2.</span>
                  <span>You'll receive an email at <strong>{formData.email}</strong> once approved</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">3.</span>
                  <span>After approval, you'll receive login credentials to access your vendor dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">4.</span>
                  <span>You can then start adding products and managing your store</span>
                </li>
              </ul>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <Card className="p-4 bg-white">
                <Shield className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                <h4 className="font-semibold text-sm mb-1">Secure Process</h4>
                <p className="text-xs text-gray-600">All information is encrypted and stored securely</p>
              </Card>
              <Card className="p-4 bg-white">
                <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold text-sm mb-1">Quick Approval</h4>
                <p className="text-xs text-gray-600">Most applications reviewed within 24 hours</p>
              </Card>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                Back to Home
              </Button>
              <p className="text-sm text-gray-600">
                Need help? Contact us at{' '}
                <a href="mailto:seller-support@bazaaraf.com" className="text-teal-600 hover:underline">
                  seller-support@bazaaraf.com
                </a>
                {' '}or call{' '}
                <a href="tel:+93700123456" className="text-teal-600 hover:underline">
                  +93 700 123 456
                </a>
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-teal-600">BazaarAF</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Seller Application</h2>
          <p className="mt-2 text-gray-600">Join Afghanistan's largest e-commerce platform</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {[1, 2].map((step) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      currentStep >= step
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step}
                  </div>
                  <span className="text-xs mt-2 text-gray-600">
                    {step === 1 && 'Basic Information'}
                    {step === 2 && 'Upload Documents'}
                  </span>
                </div>
                {step < 2 && (
                  <div
                    className={`h-1 w-24 transition-colors ${
                      currentStep > step ? 'bg-teal-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form */}
        <Card className="p-8">
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <h3 className="text-xl font-semibold mb-4">Basic Information</h3>

                <div className="grid md:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Your full name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 border ${
                          errors.full_name ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500`}
                      />
                    </div>
                    {errors.full_name && <p className="mt-1 text-sm text-red-500">{errors.full_name}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        placeholder="+93 700 123 456"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 border ${
                          errors.phone ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500`}
                      />
                    </div>
                    {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 border ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500`}
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    We'll send your login credentials to this email after approval
                  </p>
                </div>

                <div className="border-t pt-5 mt-5">
                  <h4 className="font-semibold mb-4">Shop Details</h4>

                  {/* Shop Name */}
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shop Name *
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Your shop name"
                        value={formData.shop_name}
                        onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 border ${
                          errors.shop_name ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500`}
                      />
                    </div>
                    {errors.shop_name && <p className="mt-1 text-sm text-red-500">{errors.shop_name}</p>}
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    {/* City */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className={`w-full pl-10 pr-4 py-3 border ${
                            errors.city ? 'border-red-500' : 'border-gray-300'
                          } rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500`}
                        >
                          <option value="">Select city</option>
                          {afghanCities.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors.city && <p className="mt-1 text-sm text-red-500">{errors.city}</p>}
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shop Address *
                      </label>
                      <textarea
                        placeholder="Street address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={3}
                        className={`w-full px-4 py-3 border ${
                          errors.address ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500`}
                      />
                      {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Documents */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold mb-4">Upload Documents</h3>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>Required:</strong> Clear photo/scan of your ID card (Tazkira) or passport<br />
                    <strong>Optional:</strong> Business license (if applicable)<br />
                    <strong>Formats:</strong> PDF, JPG, PNG • <strong>Max size:</strong> 5MB each
                  </p>
                </div>

                {/* Identity Document */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Identity Document (Tazkira/Passport) *
                  </label>
                  <div className={`border-2 border-dashed ${
                    errors.identity_document ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg p-6 hover:border-teal-500 transition-colors`}>
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <label className="cursor-pointer">
                        <span className="text-teal-600 hover:text-teal-700 font-medium">
                          Click to upload identity document
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange(e, 'identity_document')}
                        />
                      </label>
                      {formData.identity_document && (
                        <p className="mt-2 text-sm text-green-600 flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {formData.identity_document.name}
                        </p>
                      )}
                    </div>
                  </div>
                  {errors.identity_document && (
                    <p className="mt-1 text-sm text-red-500">{errors.identity_document}</p>
                  )}
                </div>

                {/* Business Document */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business License <span className="text-gray-500">(Optional but recommended)</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-teal-500 transition-colors">
                    <div className="text-center">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <label className="cursor-pointer">
                        <span className="text-teal-600 hover:text-teal-700 font-medium">
                          Click to upload business license
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange(e, 'business_document')}
                        />
                      </label>
                      {formData.business_document && (
                        <p className="mt-2 text-sm text-green-600 flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {formData.business_document.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <p className="text-sm text-gray-600">
                    By submitting this application, you agree to BazaarAF's{' '}
                    <a href="/seller-terms" className="text-teal-600 hover:underline">
                      Seller Terms & Conditions
                    </a>
                    {' '}and{' '}
                    <a href="/privacy" className="text-teal-600 hover:underline">
                      Privacy Policy
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between gap-4">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={loading}
                  className="px-6"
                >
                  Back
                </Button>
              )}
              
              {currentStep < 2 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-teal-600 hover:bg-teal-700 ml-auto px-8"
                >
                  Next Step
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 ml-auto px-8"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <CheckCircle className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerRegistration;

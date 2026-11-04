import { useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Card } from '@/app/components/ui/card';
import { toast } from 'sonner';

interface ProfileProps {
  onNavigate: (page: string) => void;
}

type Screen = 'profile' | 'security-verification';

export function Profile({ onNavigate }: ProfileProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [changeField, setChangeField] = useState<'email' | 'phone' | null>(null);

  // User data
  const [userData, setUserData] = useState({
    fullName: 'Ahmad Rahimi',
    email: 'ahmad.rahimi@example.com',
    phone: '+93 700 123 456',
    birthday: '1995-05-15',
    gender: 'male',
  });

  // Temporary editing data
  const [editData, setEditData] = useState({ ...userData });

  const handleEditProfile = () => {
    setIsEditing(true);
    setEditData({ ...userData });
  };

  const handleSaveChanges = () => {
    setUserData({ ...editData });
    setIsEditing(false);
    toast.success('Profile updated successfully');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({ ...userData });
  };

  const handleChangeClick = (field: 'email' | 'phone') => {
    setChangeField(field);
    setCurrentScreen('security-verification');
  };

  const handleVerificationMethod = (method: 'google' | 'email') => {
    toast.success(`Verification link sent via ${method === 'google' ? 'Google' : 'Email'}`);
    setCurrentScreen('profile');
    setChangeField(null);
  };

  const handleBack = () => {
    if (currentScreen === 'security-verification') {
      setCurrentScreen('profile');
      setChangeField(null);
    } else {
      onNavigate('home');
    }
  };

  // Profile Screen
  if (currentScreen === 'profile') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">Profile</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-2xl mx-auto p-4 pb-24">
          <Card className="bg-white">
            <div className="divide-y divide-gray-200">
              {/* Full Name */}
              <div className="p-4">
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Full Name
                </Label>
                {isEditing ? (
                  <Input
                    value={editData.fullName}
                    onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <div className="text-base">{userData.fullName}</div>
                )}
              </div>

              {/* Email Address */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      Email Address
                    </Label>
                    <div className="text-base text-gray-400">{userData.email}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary h-auto p-0 hover:bg-transparent"
                    onClick={() => handleChangeClick('email')}
                  >
                    Change
                  </Button>
                </div>
              </div>

              {/* Phone Number */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      Phone Number
                    </Label>
                    <div className="text-base text-gray-400">{userData.phone}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary h-auto p-0 hover:bg-transparent"
                    onClick={() => handleChangeClick('phone')}
                  >
                    Change
                  </Button>
                </div>
              </div>

              {/* Birthday */}
              <div className="p-4">
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Birthday
                </Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editData.birthday}
                    onChange={(e) => setEditData({ ...editData, birthday: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <div className="text-base">
                    {new Date(userData.birthday).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                )}
              </div>

              {/* Gender */}
              <div className="p-4">
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Gender
                </Label>
                {isEditing ? (
                  <Select
                    value={editData.gender}
                    onValueChange={(value) => setEditData({ ...editData, gender: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-base capitalize">
                    {userData.gender === 'prefer-not-to-say' ? 'Prefer not to say' : userData.gender}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            {isEditing ? (
              <>
                <Button
                  className="w-full"
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleEditProfile}
              >
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Security Verification Screen
  if (currentScreen === 'security-verification') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">Verify Your Identity</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-2xl mx-auto p-4">
          <div className="bg-white rounded-lg p-6 mb-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              For your security, we need to verify your identity before you can change your{' '}
              {changeField === 'email' ? 'email address' : 'phone number'}. Please choose a verification method below.
            </p>
          </div>

          <div className="space-y-3">
            {/* Verify with Google */}
            <Card
              className="p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleVerificationMethod('google')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Verify with Google</div>
                    <div className="text-sm text-muted-foreground">
                      Use your Google account
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>

            {/* Verify via Email */}
            <Card
              className="p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleVerificationMethod('email')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Verify via Email</div>
                    <div className="text-sm text-muted-foreground">
                      We'll send you a verification link
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
          </div>

          {/* Trust Badge */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <svg
                className="w-4 h-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Your information is secure and encrypted
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// File: frontend/src/components/layout/Layout.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import BaseHeader from './BaseHeader';
import Footer from './Footer';
import AdminSidebar from './AdminSidebar.tsx';
import { logout } from '../../../utils/auth';
import { isAuthenticated as checkAuth, getCurrentUser } from '../../../utils/auth';

interface LayoutProps {
  children: React.ReactNode;
  variant: 'customer' | 'vendor' | 'admin';
  storeName?: string;
  onSearch?: (query: string) => void;
  onCartClick?: () => void;
  onProfileClick?: () => void;
  onLogout?: () => void;
  onLanguageChange?: (lang: string) => void;
  cartItemCount?: number;
  notificationCount?: number;
  showFooter?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  variant,
  storeName,
  onSearch,
  onCartClick,
  onProfileClick,
  onLogout,
  onLanguageChange,
  cartItemCount = 0,
  notificationCount = 0,
  showFooter = true,
}) => {
  const navigate = useNavigate();

  // Get authentication status and user info
  const isAuthenticated = checkAuth();
  const currentUser = getCurrentUser();

  const handleLogin = () => navigate('/login');
  const handleSignUp = () => navigate('/signup');
  const handleSell = () => navigate('/become-seller');
  const handleHelp = () => navigate('/help-support');
  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await logout(navigate, true); // true = show confirmation
    }
  };

  const handleCartClick = () => {
    // console.log('🛒 Cart clicked');
    if (onCartClick) {
      onCartClick();
    } else {
      // console.log('📍 Navigating to /cart');
      navigate('/cart');
    }
  };


  const isAdminVariant = variant === 'admin';

  return (
    <div className={`min-h-screen ${isAdminVariant ? 'flex bg-slate-100' : 'flex flex-col bg-gray-50'}`}>
      {isAdminVariant && <AdminSidebar />}

      <div className="flex-1 flex flex-col">
        <BaseHeader
          variant={variant}
          storeName={storeName}
          userName={currentUser?.full_name}
          isAuthenticated={isAuthenticated}
          onSearch={onSearch}
          onCartClick={handleCartClick}
          onLoginClick={handleLogin}
          onSignUpClick={handleSignUp}
          onSellClick={handleSell}
          onHelpClick={handleHelp}
          onProfileClick={onProfileClick}
          onLogout={handleLogout}
          onLanguageChange={onLanguageChange}
          cartItemCount={cartItemCount}
          notificationCount={notificationCount}
        />

        <main className={`flex-1 ${variant === 'vendor' ? 'pb-24 md:pb-0' : ''}`}>
          {children}
        </main>

        {showFooter && <Footer />}
      </div>
    </div>
  );
};

export default Layout;
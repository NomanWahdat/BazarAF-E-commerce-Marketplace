import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, UserCheck, Package, ShoppingCart, DollarSign, Star, Users } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: BarChart3 },
  { label: 'Seller Applications', path: '/admin/seller-applications', icon: UserCheck },
  { label: 'Product Moderation', path: '/admin/product-moderation', icon: Package },
  { label: 'Order Operations', path: '/admin/order-operations', icon: ShoppingCart },
  { label: 'Commission Management', path: '/admin/commission-management', icon: DollarSign },
  { label: 'Review Moderation', path: '/admin/review-moderation', icon: Star },
  { label: 'Vendor Performance', path: '/admin/vendor-performance', icon: Users },
];

const AdminSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-72 border-r border-slate-200 bg-white shadow-sm">
      <div className="px-6 py-7 border-b border-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Admin Panel</p>
        <h2 className="mt-3 text-xl font-semibold text-slate-900">BazarAF Admin</h2>
      </div>
      <nav className="px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default AdminSidebar;

// frontend/src/app/components/Categories/iconMap.ts

import {
  Shirt, Smartphone, Home, Sparkles, Dumbbell, BookOpen, Gamepad2, ShoppingBasket,
  Users, Users2, Zap, Laptop, Volume2, TrendingUp, Package, Heart,
  Sofa, Utensils, Palette, Briefcase, Music, Trophy, Gem, Leaf,
  Coffee, Camera, Watch, Headphones, Monitor, Keyboard, Mouse,
  Printer, Router, Battery, Usb, Wifi, Power, Bolt, Sun,
  Moon, Star, Award, Target, Inbox, Bell,
  MapPin, Navigation, Settings, Wrench, Hammer,
  Paintbrush, ImageIcon, Film, Disc, Radio, Video,
  Type, LucideIcon
} from 'lucide-react';

interface IconMap {
  [key: string]: LucideIcon;
}

export const categoryIconMap: IconMap = {
  // Fashion
  'Shirt': Shirt,
  'Users': Users,
  'Users2': Users2,
  
  // Electronics
  'Smartphone': Smartphone,
  'Laptop': Laptop,
  'Monitor': Monitor,
  'Keyboard': Keyboard,
  'Mouse': Mouse,
  'Headphones': Headphones,
  'Volume2': Volume2,
  'Power': Power,
  'Battery': Battery,
  'Wifi': Wifi,
  'Router': Router,
  
  // Home & Garden
  'Home': Home,
  'Sofa': Sofa,
  'Utensils': Utensils,
  'Coffee': Coffee,
  'Palette': Palette,
  'Leaf': Leaf,
  
  // Beauty
  'Sparkles': Sparkles,
  'Gem': Gem,
  
  // Sports
  'Dumbbell': Dumbbell,
  'Trophy': Trophy,
  'Target': Target,
  
  // Books & Media
  'BookOpen': BookOpen,
  'Type': Type,
  'Film': Film,
  'Music': Music,
  'Camera': Camera,
  'ImageIcon': ImageIcon,
  'Radio': Radio,
  'Video': Video,
  'Disc': Disc,
  
  // Toys & Games
  'Gamepad2': Gamepad2,
  
  // Groceries
  'ShoppingBasket': ShoppingBasket,
  'Package': Package,
  
  // Production/Wholesale
  'TrendingUp': TrendingUp,
  'Briefcase': Briefcase,
  
  // Accessories/Misc
  'Zap': Zap,
  'Watch': Watch,
  'MapPin': MapPin,
  'Navigation': Navigation,
  'Settings': Settings,
  'Wrench': Wrench,
  'Hammer': Hammer,
  'Paintbrush': Paintbrush,
  'Sun': Sun,
  'Moon': Moon,
  'Star': Star,
  'Heart': Heart,
  'Bell': Bell,
  'Inbox': Inbox,
  'Award': Award,
  'Bolt': Bolt,
  'Printer': Printer,
  'USB': Usb,
};

/**
 * Get the lucide icon component for the given icon name
 * Falls back to Package icon if not found
 */
export const getIconComponent = (iconName: string): LucideIcon => {
  return categoryIconMap[iconName] || Package;
};

/**
 * Get a color for a category based on its level or provided color
 */
export const getCategoryColor = (color?: string, level?: string): string => {
  if (color && color.startsWith('#')) {
    return color;
  }
  
  // Fallback colors based on level
  const levelColors: { [key: string]: string } = {
    'main': '#0d9488', // teal
    'sub': '#06b6d4', // cyan
    'production': '#7c3aed', // purple
  };
  
  return levelColors[level || 'main'] || '#0d9488';
};

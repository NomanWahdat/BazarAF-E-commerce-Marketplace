// Mock data for the Afghanistan e-commerce platform

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  seller: string;
  sellerVerified: boolean;
  rating: number;
  reviews: number;
  inStock: boolean;
  codAvailable: boolean;
  deliveryDays: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  productCount: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  date: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: CartItem[];
  deliveryAddress: string;
  paymentMethod: string;
  trackingSteps: {
    status: string;
    date: string;
    completed: boolean;
  }[];
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  verified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  joinDate: string;
  totalProducts: number;
  totalOrders: number;
  earnings: number;
}

export interface VendorOrder {
  id: string;
  orderDate: string;
  customerName: string;
  product: string;
  quantity: number;
  total: number;
  status: 'new' | 'processing' | 'shipped' | 'completed';
  paymentMethod: string;
}

export const categories: Category[] = [
  { id: '1', name: 'Fashion', icon: 'Shirt', productCount: 1240 },
  { id: '2', name: 'Electronics', icon: 'Smartphone', productCount: 856 },
  { id: '3', name: 'Home & Kitchen', icon: 'Home', productCount: 634 },
  { id: '4', name: 'Beauty', icon: 'Sparkles', productCount: 421 },
  { id: '5', name: 'Sports', icon: 'Dumbbell', productCount: 312 },
  { id: '6', name: 'Books', icon: 'BookOpen', productCount: 789 },
  { id: '7', name: 'Toys', icon: 'Baby', productCount: 267 },
  { id: '8', name: 'Groceries', icon: 'ShoppingBasket', productCount: 543 },
];

export const products: Product[] = [
  {
    id: '1',
    name: 'Traditional Afghan Dress - Elegant Design',
    price: 2500,
    originalPrice: 3200,
    image: 'afghan dress',
    category: 'Fashion',
    seller: 'Kabul Fashion House',
    sellerVerified: true,
    rating: 4.8,
    reviews: 124,
    inStock: true,
    codAvailable: true,
    deliveryDays: '2-3',
    description: 'High-quality traditional Afghan dress with elegant embroidery. Perfect for special occasions.',
  },
  {
    id: '2',
    name: 'Smartphone - Latest Model 128GB',
    price: 18500,
    originalPrice: 21000,
    image: 'smartphone modern',
    category: 'Electronics',
    seller: 'Tech Zone Afghanistan',
    sellerVerified: true,
    rating: 4.6,
    reviews: 89,
    inStock: true,
    codAvailable: true,
    deliveryDays: '1-2',
    description: 'Latest smartphone with powerful processor, great camera, and long battery life.',
  },
  {
    id: '3',
    name: 'Afghan Carpet - Handmade 6x9 ft',
    price: 15000,
    image: 'persian carpet',
    category: 'Home & Kitchen',
    seller: 'Heritage Carpets',
    sellerVerified: true,
    rating: 5.0,
    reviews: 56,
    inStock: true,
    codAvailable: true,
    deliveryDays: '3-5',
    description: 'Authentic handmade Afghan carpet with traditional patterns. Premium quality wool.',
  },
  {
    id: '4',
    name: 'Wireless Headphones - Noise Cancelling',
    price: 3200,
    originalPrice: 4500,
    image: 'wireless headphones',
    category: 'Electronics',
    seller: 'Audio Express',
    sellerVerified: true,
    rating: 4.7,
    reviews: 203,
    inStock: true,
    codAvailable: true,
    deliveryDays: '1-2',
    description: 'Premium wireless headphones with active noise cancellation and 30-hour battery.',
  },
  {
    id: '5',
    name: "Women's Embroidered Shawl",
    price: 1200,
    originalPrice: 1800,
    image: 'embroidered shawl',
    category: 'Fashion',
    seller: 'Herat Handicrafts',
    sellerVerified: true,
    rating: 4.9,
    reviews: 167,
    inStock: true,
    codAvailable: true,
    deliveryDays: '2-3',
    description: 'Beautiful handmade embroidered shawl, perfect for all seasons.',
  },
  {
    id: '6',
    name: 'LED Smart TV 43 Inch',
    price: 32000,
    originalPrice: 38000,
    image: 'smart tv',
    category: 'Electronics',
    seller: 'Tech Zone Afghanistan',
    sellerVerified: true,
    rating: 4.5,
    reviews: 78,
    inStock: true,
    codAvailable: true,
    deliveryDays: '2-4',
    description: 'Full HD Smart TV with built-in apps and excellent picture quality.',
  },
  {
    id: '7',
    name: 'Cookware Set - 12 Pieces',
    price: 4500,
    image: 'cookware set',
    category: 'Home & Kitchen',
    seller: 'Kitchen Essentials',
    sellerVerified: false,
    rating: 4.3,
    reviews: 45,
    inStock: true,
    codAvailable: true,
    deliveryDays: '2-3',
    description: 'Complete non-stick cookware set for your kitchen needs.',
  },
  {
    id: '8',
    name: 'Natural Skincare Gift Set',
    price: 1800,
    image: 'skincare products',
    category: 'Beauty',
    seller: 'Beauty Bliss',
    sellerVerified: true,
    rating: 4.8,
    reviews: 134,
    inStock: true,
    codAvailable: true,
    deliveryDays: '1-2',
    description: 'Natural and organic skincare products, gentle on all skin types.',
  },
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-2026-001',
    date: '2026-01-20',
    status: 'shipped',
    total: 5700,
    items: [
      { ...products[0], quantity: 2 },
      { ...products[4], quantity: 1 },
    ],
    deliveryAddress: 'Kabul, Karte Parwan, Street 3, House 45',
    paymentMethod: 'Cash on Delivery',
    trackingSteps: [
      { status: 'Order Placed', date: '2026-01-20 10:30 AM', completed: true },
      { status: 'Confirmed by Seller', date: '2026-01-20 2:15 PM', completed: true },
      { status: 'Shipped', date: '2026-01-21 9:00 AM', completed: true },
      { status: 'Out for Delivery', date: '', completed: false },
      { status: 'Delivered', date: '', completed: false },
    ],
  },
  {
    id: 'ORD-2026-002',
    date: '2026-01-18',
    status: 'delivered',
    total: 3200,
    items: [{ ...products[3], quantity: 1 }],
    deliveryAddress: 'Herat, Darwaze Khosh, Near Park',
    paymentMethod: 'Cash on Delivery',
    trackingSteps: [
      { status: 'Order Placed', date: '2026-01-18 11:00 AM', completed: true },
      { status: 'Confirmed by Seller', date: '2026-01-18 3:30 PM', completed: true },
      { status: 'Shipped', date: '2026-01-19 8:00 AM', completed: true },
      { status: 'Out for Delivery', date: '2026-01-20 10:00 AM', completed: true },
      { status: 'Delivered', date: '2026-01-20 4:45 PM', completed: true },
    ],
  },
];

export const mockVendors: Vendor[] = [
  {
    id: 'V001',
    name: 'Fatima Ahmadi',
    email: 'fatima@example.com',
    phone: '+93 700 123 456',
    businessName: 'Kabul Fashion House',
    verified: true,
    status: 'approved',
    joinDate: '2025-11-15',
    totalProducts: 45,
    totalOrders: 234,
    earnings: 125000,
  },
  {
    id: 'V002',
    name: 'Ahmad Khan',
    email: 'ahmad@example.com',
    phone: '+93 700 234 567',
    businessName: 'Tech Zone Afghanistan',
    verified: true,
    status: 'approved',
    joinDate: '2025-10-20',
    totalProducts: 67,
    totalOrders: 189,
    earnings: 450000,
  },
  {
    id: 'V003',
    name: 'Mariam Hashimi',
    email: 'mariam@example.com',
    phone: '+93 700 345 678',
    businessName: 'Herat Handicrafts',
    verified: false,
    status: 'pending',
    joinDate: '2026-01-15',
    totalProducts: 12,
    totalOrders: 5,
    earnings: 8500,
  },
];

export const mockVendorOrders: VendorOrder[] = [
  {
    id: 'ORD-2026-045',
    orderDate: '2026-01-21 09:30 AM',
    customerName: 'Ali Rezai',
    product: 'Traditional Afghan Dress',
    quantity: 1,
    total: 2500,
    status: 'new',
    paymentMethod: 'Cash on Delivery',
  },
  {
    id: 'ORD-2026-044',
    orderDate: '2026-01-20 03:15 PM',
    customerName: 'Sara Amiri',
    product: "Women's Embroidered Shawl",
    quantity: 2,
    total: 2400,
    status: 'processing',
    paymentMethod: 'Cash on Delivery',
  },
  {
    id: 'ORD-2026-043',
    orderDate: '2026-01-20 11:00 AM',
    customerName: 'Hassan Karimi',
    product: 'Traditional Afghan Dress',
    quantity: 1,
    total: 2500,
    status: 'shipped',
    paymentMethod: 'Cash on Delivery',
  },
];

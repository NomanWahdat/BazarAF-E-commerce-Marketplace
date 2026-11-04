// File: frontend/src/pages/BecomeSeller.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../app/components/layout/Layout';

import {
    Package,
    Users,
    DollarSign,
    ShieldCheck,
    FileText,
    CheckCircle,
    Clock,
    Truck,
    CreditCard,
    AlertCircle,
    HeadphonesIcon,
    ArrowRight
} from 'lucide-react';

const BecomeSeller: React.FC = () => {
    const navigate = useNavigate();

    return (

        <Layout variant="customer" showFooter={true}>
            <div className="min-h-screen bg-gray-50">
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <Package className="w-12 h-12" />
                                <h1 className="text-4xl md:text-5xl font-bold">Sell on BazaarAF</h1>
                            </div>
                            <p className="text-xl text-teal-100 max-w-3xl mx-auto mb-8">
                                Join Afghanistan's largest e-commerce platform and grow your business
                            </p>
                            <button
                                onClick={() => navigate('/seller-registration')}
                                className="bg-white text-teal-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-teal-50 transition-colors inline-flex items-center gap-2 shadow-lg"
                            >
                                Become a Seller
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Why Sell on BazaarAF */}
                <div className="py-16 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-3xl font-bold text-center mb-12">Why Sell on BazaarAF</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-8 h-8 text-teal-600" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">Reach Customers</h3>
                                <p className="text-gray-600">Access thousands of customers across Afghanistan</p>
                            </div>

                            <div className="text-center">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">Easy Listing</h3>
                                <p className="text-gray-600">Simple product listing process in minutes</p>
                            </div>

                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ShieldCheck className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">Secure Payments</h3>
                                <p className="text-gray-600">Safe and timely payment processing</p>
                            </div>

                            <div className="text-center">
                                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <DollarSign className="w-8 h-8 text-purple-600" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">Low Commission</h3>
                                <p className="text-gray-600">Competitive rates with no hidden charges</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* How to Become a Seller */}
                <div className="py-16 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-3xl font-bold text-center mb-12">How to Become a Seller</h2>
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="bg-white rounded-lg p-6 shadow-sm flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">
                                        1
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg mb-2">Create a Seller Account</h3>
                                    <p className="text-gray-600">Sign up with your basic information and create your seller profile</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-6 shadow-sm flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">
                                        2
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg mb-2">Submit Required Information</h3>
                                    <p className="text-gray-600">Provide your name, phone number, shop details, and business information</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-6 shadow-sm flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">
                                        3
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg mb-2">Verification Process</h3>
                                    <p className="text-gray-600">Our team will verify your information within 24-48 hours</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* List Your Products */}
                <div className="py-16 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3 mb-8">
                            <Package className="w-8 h-8 text-teal-600" />
                            <h2 className="text-3xl font-bold">List Your Products</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 rounded-lg p-6">
                                <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
                                <h3 className="font-semibold text-lg mb-2">Add Product Details</h3>
                                <p className="text-gray-600">Include product name, price, high-quality photos, and detailed descriptions</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-6">
                                <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
                                <h3 className="font-semibold text-lg mb-2">Set Stock Quantity</h3>
                                <p className="text-gray-600">Manage inventory levels and get notifications when stock is low</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-6">
                                <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
                                <h3 className="font-semibold text-lg mb-2">Update Anytime</h3>
                                <p className="text-gray-600">Edit products, prices, and descriptions whenever you need</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-6">
                                <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
                                <h3 className="font-semibold text-lg mb-2">Multiple Categories</h3>
                                <p className="text-gray-600">List products across various categories to reach more customers</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order Management */}
                <div className="py-16 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3 mb-8">
                            <Truck className="w-8 h-8 text-blue-600" />
                            <h2 className="text-3xl font-bold">Order Management</h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="bg-white rounded-lg p-6 shadow-sm">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                    <Clock className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">Receive Orders</h3>
                                <p className="text-gray-600">Get instant notifications when customers place orders</p>
                            </div>
                            <div className="bg-white rounded-lg p-6 shadow-sm">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">Confirm & Prepare</h3>
                                <p className="text-gray-600">Accept orders and prepare products for delivery</p>
                            </div>
                            <div className="bg-white rounded-lg p-6 shadow-sm">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                    <Truck className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">Hand Over to Delivery</h3>
                                <p className="text-gray-600">Transfer orders to our courier partners for fast delivery</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payments to Sellers */}
                <div className="py-16 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3 mb-8">
                            <CreditCard className="w-8 h-8 text-green-600" />
                            <h2 className="text-3xl font-bold">Payments to Sellers</h2>
                        </div>
                        <div className="max-w-3xl mx-auto space-y-4">
                            <div className="bg-gray-50 rounded-lg p-6">
                                <h3 className="font-semibold text-lg mb-2">How You Get Paid</h3>
                                <p className="text-gray-600">Payments are processed after successful delivery confirmation</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-6">
                                <h3 className="font-semibold text-lg mb-2">Payment Methods</h3>
                                <p className="text-gray-600">Bank transfer, mobile money, or cash pickup from our offices</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-6">
                                <h3 className="font-semibold text-lg mb-2">Payment Schedule</h3>
                                <p className="text-gray-600">Weekly or bi-weekly payment cycles based on your preference</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seller Rules & Policies */}
                <div className="py-16 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3 mb-8">
                            <AlertCircle className="w-8 h-8 text-orange-600" />
                            <h2 className="text-3xl font-bold">Seller Rules & Policies</h2>
                        </div>
                        <div className="max-w-3xl mx-auto space-y-4">
                            <div className="bg-white rounded-lg p-6 shadow-sm">
                                <h3 className="font-semibold text-lg mb-2">Product Quality Rules</h3>
                                <p className="text-gray-600">All products must match descriptions and be in good condition. Authentic products only.</p>
                            </div>
                            <div className="bg-white rounded-lg p-6 shadow-sm">
                                <h3 className="font-semibold text-lg mb-2">Prohibited Items</h3>
                                <p className="text-gray-600">Weapons, illegal substances, counterfeit goods, and items banned by Afghan law are strictly prohibited.</p>
                            </div>
                            <div className="bg-white rounded-lg p-6 shadow-sm">
                                <h3 className="font-semibold text-lg mb-2">Order Cancellation Policy</h3>
                                <p className="text-gray-600">Orders can be cancelled before shipping. Repeated cancellations may affect seller rating.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seller Support */}
                <div className="py-16 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3 mb-8">
                            <HeadphonesIcon className="w-8 h-8 text-purple-600" />
                            <h2 className="text-3xl font-bold">Seller Support</h2>
                        </div>
                        <div className="max-w-3xl mx-auto">
                            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-8">
                                <h3 className="font-semibold text-xl mb-4">Need Help?</h3>
                                <p className="text-gray-700 mb-6">Our dedicated seller support team is here to help you succeed</p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-purple-600" />
                                        <span>Email: seller-support@bazaaraf.com</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-purple-600" />
                                        <span>Phone: +93 700 123 456</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-5 h-5 text-purple-600" />
                                        <span>WhatsApp: +93 700 123 456</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="py-16 bg-gradient-to-r from-teal-600 to-teal-700 text-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-3xl font-bold mb-4">Ready to Start Selling?</h2>
                        <p className="text-xl text-teal-100 mb-8">Join thousands of successful sellers on BazaarAF</p>
                        <button
                            onClick={() => navigate('/seller-registration')}
                            className="bg-white text-teal-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-teal-50 transition-colors inline-flex items-center gap-2 shadow-lg"
                        >
                            Become a Seller Now
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Back to Home */}
                <div className="py-8 text-center bg-gray-50">
                    <button
                        onClick={() => navigate('/')}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        ← Back to Home
                    </button>
                </div>
            </div>
        </Layout>

    );
};

export default BecomeSeller;
import { SupportRequests } from '../components/SupportRequests';
// File: frontend/src/pages/HelpSupport.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../app/components/layout/Layout';
import {
    User,
    ShoppingCart,
    CreditCard,
    Truck,
    HeadphonesIcon,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    Mail,
    Phone,
    MessageCircle
} from 'lucide-react';

interface FAQItem {
    question: string;
    answer: string;
}

const HelpSupport: React.FC = () => {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState<string>('account');
    const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

    const categories = [
        { id: 'account', name: 'Account & Login', icon: User },
        { id: 'orders', name: 'Orders', icon: ShoppingCart },
        { id: 'payments', name: 'Payments', icon: CreditCard },
        { id: 'delivery', name: 'Delivery', icon: Truck },
        { id: 'support', name: 'Customer Support', icon: HeadphonesIcon },
        { id: 'returns', name: 'Returns & Refunds', icon: RotateCcw },
    ];

    const faqs: Record<string, FAQItem[]> = {
        account: [
            {
                question: 'How do I create an account?',
                answer: 'Click on "Sign Up" in the top navigation bar, fill in your details (name, email, phone, password), and submit. You\'ll receive a confirmation email to activate your account.'
            },
            {
                question: 'I forgot my password. What should I do?',
                answer: 'Click on "Forgot Password" on the login page, enter your email address, and we\'ll send you a password reset link.'
            },
            {
                question: 'How do I update my account information?',
                answer: 'Log in to your account, go to "My Profile", and you can update your name, phone number, email, and delivery addresses.'
            },
            {
                question: 'Can I have multiple delivery addresses?',
                answer: 'Yes! You can add multiple delivery addresses in your account settings and choose which one to use during checkout.'
            }
        ],
        orders: [
            {
                question: 'How do I place an order?',
                answer: 'Browse products, click "Add to Cart", review your cart, proceed to checkout, fill in delivery details, and confirm your order.'
            },
            {
                question: 'Can I cancel my order?',
                answer: 'Yes, you can cancel orders before they are shipped. Go to "My Orders", find your order, and click "Cancel Order".'
            },
            {
                question: 'How do I track my order?',
                answer: 'Go to "My Orders" in your account, click on the order you want to track, and you\'ll see the current status and delivery updates.'
            },
            {
                question: 'What if I receive a wrong or damaged product?',
                answer: 'Contact our customer support immediately with your order number and photos of the issue. We\'ll arrange a replacement or refund.'
            }
        ],
        payments: [
            {
                question: 'What payment methods do you accept?',
                answer: 'We currently accept Cash on Delivery (COD). You pay when you receive your order at your doorstep.'
            },
            {
                question: 'Is Cash on Delivery safe?',
                answer: 'Yes! COD is the safest payment method. You only pay after inspecting your order. Our delivery partners are verified and trusted.'
            },
            {
                question: 'Do I need to pay delivery charges?',
                answer: 'Delivery charges vary by location and order value. Free delivery is available for orders above a certain amount. Check at checkout for details.'
            },
            {
                question: 'What if I don\'t have exact change for COD?',
                answer: 'Our delivery partners carry change. However, having exact or close to exact amount helps speed up the process.'
            }
        ],
        delivery: [
            {
                question: 'How long does delivery take?',
                answer: 'Standard delivery takes 2-5 business days in major cities and 5-7 days in other areas. Express delivery options may be available for certain locations.'
            },
            {
                question: 'Which areas do you deliver to?',
                answer: 'We deliver across Afghanistan including Kabul, Herat, Mazar-i-Sharif, Kandahar, and many other cities and provinces.'
            },
            {
                question: 'What if I\'m not home during delivery?',
                answer: 'Our delivery partner will call you before arrival. If you\'re not available, you can reschedule delivery or provide an alternate address or recipient.'
            },
            {
                question: 'Can I change my delivery address after placing an order?',
                answer: 'Yes, if the order hasn\'t shipped yet. Contact customer support immediately with your order number and new address.'
            }
        ],
        support: [
            {
                question: 'How can I contact customer support?',
                answer: 'You can reach us via email at support@bazaaraf.com, call +93 700 123 456, or use our WhatsApp at the same number.'
            },
            {
                question: 'What are your customer support hours?',
                answer: 'Our support team is available Saturday to Thursday, 9 AM to 6 PM. We respond to emails within 24 hours.'
            },
            {
                question: 'How do I report a problem with a seller?',
                answer: 'Go to your order details and click "Report Issue". Our team will investigate and take appropriate action.'
            },
            {
                question: 'Can I speak to someone in Dari or Pashto?',
                answer: 'Yes! Our customer support team is fluent in Dari, Pashto, and English. We\'re here to help in your preferred language.'
            }
        ],
        returns: [
            {
                question: 'What is your return policy?',
                answer: 'You can return products within 7 days of delivery if they are unused, in original packaging, and with all tags attached.'
            },
            {
                question: 'How do I return a product?',
                answer: 'Go to "My Orders", select the order, click "Return Item", choose a reason, and we\'ll arrange a pickup from your address.'
            },
            {
                question: 'When will I receive my refund?',
                answer: 'Refunds are processed within 5-7 business days after we receive and verify the returned item. For COD orders, refunds are issued via bank transfer.'
            },
            {
                question: 'Are there any items that cannot be returned?',
                answer: 'Yes, items like undergarments, cosmetics, perishable goods, and custom-made products cannot be returned for hygiene and safety reasons.'
            }
        ]
    };

    const toggleFAQ = (index: number) => {
        setExpandedFAQ(expandedFAQ === index ? null : index);
    };

    return (
        <Layout variant="customer" showFooter={true}>
            <div className="max-w-5xl mx-auto w-full px-4 pt-8"><SupportRequests /></div>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white py-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <HeadphonesIcon className="w-10 h-10" />
                                <h1 className="text-4xl font-bold">Help & Support</h1>
                            </div>
                            <p className="text-xl text-teal-100">We're here to help you with any questions</p>
                        </div>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex overflow-x-auto gap-2 py-4 scrollbar-hide">
                            {categories.map((category) => {
                                const Icon = category.icon;
                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => setActiveCategory(category.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeCategory === category.id
                                                ? 'bg-teal-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {category.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold mb-6">
                        {categories.find(c => c.id === activeCategory)?.name} - Frequently Asked Questions
                    </h2>

                    <div className="space-y-4">
                        {faqs[activeCategory]?.map((faq, index) => (
                            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <button
                                    onClick={() => toggleFAQ(index)}
                                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                                >
                                    <span className="font-semibold text-gray-900">{faq.question}</span>
                                    {expandedFAQ === index ? (
                                        <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                    )}
                                </button>

                                {expandedFAQ === index && (
                                    <div className="px-6 pb-4">
                                        <p className="text-gray-600">{faq.answer}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contact Section */}
                <div className="bg-white py-12 mt-8">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-2xl font-bold text-center mb-8">Still Need Help?</h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="text-center p-6 bg-gray-50 rounded-lg">
                                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Mail className="w-6 h-6 text-teal-600" />
                                </div>
                                <h3 className="font-semibold mb-2">Email Us</h3>
                                <p className="text-sm text-gray-600 mb-2">support@bazaaraf.com</p>
                                <p className="text-xs text-gray-500">Response within 24 hours</p>
                            </div>

                            <div className="text-center p-6 bg-gray-50 rounded-lg">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Phone className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="font-semibold mb-2">Call Us</h3>
                                <p className="text-sm text-gray-600 mb-2">+93 700 123 456</p>
                                <p className="text-xs text-gray-500">Sat-Thu, 9 AM - 6 PM</p>
                            </div>

                            <div className="text-center p-6 bg-gray-50 rounded-lg">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MessageCircle className="w-6 h-6 text-green-600" />
                                </div>
                                <h3 className="font-semibold mb-2">WhatsApp</h3>
                                <p className="text-sm text-gray-600 mb-2">+93 700 123 456</p>
                                <p className="text-xs text-gray-500">Quick responses</p>
                            </div>
                        </div>
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

export default HelpSupport;
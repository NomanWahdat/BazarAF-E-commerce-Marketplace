# BazaarAF - Multi-Vendor E-Commerce Platform

> **Group Project** | Full-Stack Web Application

## Project Overview

BazaarAF is a full-featured multi-vendor e-commerce marketplace built for the Afghan market. The platform connects customers with vendors, providing a seamless online shopping experience with vendor storefronts, order management, product moderation, and an admin dashboard. It supports multilingual (i18n) capabilities and Afghan phone number formatting (+93).

## Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI, shadcn/ui, MUI
- **Routing:** React Router DOM v7
- **State & Forms:** React Hook Form
- **HTTP Client:** Axios
- **Animations:** Motion (Framer Motion)
- **Charts:** Recharts
- **Internationalization:** i18next, react-i18next
- **Other:** Lucide Icons, Sonner (toasts), Embla Carousel, React DnD

### Backend
- **Framework:** Django 6 (Python 3.12)
- **API:** Django REST Framework
- **Authentication:** JWT (SimpleJWT) with Two-Factor Authentication (TOTP)
- **Database:** SQLite (dev) / PostgreSQL (production-ready)
- **CORS:** django-cors-headers
- **Email:** SMTP (Gmail) for verification & password reset
- **File Storage:** Django media uploads (product images, vendor documents)
- **Deployment:** Vercel (both frontend & backend)

## Key Features

### Customer-Facing
- **User Registration & Login** with phone-based authentication
- **Email Verification** with secure token-based flow
- **Password Reset** via email with expiring tokens
- **Product Browsing** with category filtering, search, and sorting
- **Product Detail Pages** with image galleries, reviews, and ratings
- **Shopping Cart** and **Wishlist** functionality
- **Order Placement** with Cash on Delivery (COD) support
- **Order Tracking** with real-time status updates
- **User Profile Management** with multiple saved addresses
- **Product Reviews & Ratings** system
- **Notifications** system for order and account updates

### Vendor Portal
- **Seller Registration** with document upload and application workflow
- **Vendor Storefront** with customizable branding (logo, banner, colors)
- **Product Management** - add, edit, and manage product listings with images
- **Category Attributes** - dynamic product attributes per category (e.g., RAM, Size, Color)
- **Order Management** - view and process incoming orders
- **Payout Tracking** - monitor earnings and commission deductions
- **Two-Factor Authentication (2FA)** with TOTP and backup codes
- **Notification Preferences** - configurable email, SMS, and in-app alerts
- **Store Policies** - shipping, returns, terms, and FAQs management

### Admin Dashboard
- **Seller Application Review** - approve/reject vendor applications
- **Product Moderation** - review and approve/reject product listings
- **Order Operations** - monitor and manage all marketplace orders
- **Category Management** - hierarchical categories (Main > Sub > Production)
- **Commission Management** - set and manage vendor commission rates
- **Vendor Performance Monitoring** - track vendor metrics
- **Review Moderation** - monitor and manage user reviews
- **Help & Support** management

## Architecture Highlights

- **Role-Based Access Control** - Customer, Vendor, Admin, and Rider roles
- **UUID Primary Keys** across all models for security
- **RESTful API** design with serialized responses
- **Environment-based Configuration** for seamless dev/production switching
- **CORS-enabled** backend for secure cross-origin API communication
- **Modular Service Layer** on frontend (separate API services per domain)
- **Responsive UI** designed from Figma mockups
- **Internationalization (i18n)** support with language detection

## Data Models

User, Vendor, SellerApplication, Category, Product, ProductImage, CategoryAttribute, AttributeValue, ProductAttribute, Order, OrderItem, Delivery, Payout, Address, Review, Cart, Notification

## Deployment

- **Frontend:** Vercel (React + Vite)
- **Backend:** Vercel (Django + Gunicorn)
- **CI/CD:** Auto-deploy on push to main branch via Vercel

## Links

- **Live Frontend:** https://bazar-frontend-pl1r.vercel.app

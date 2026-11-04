# BazarAF Frontend and Backend Future Feature Work Report

## Purpose

This document lists recommended future feature work for both frontend and backend to make BazarAF stronger, more trusted, more scalable, and more suitable for Afghanistan’s marketplace environment.

## Feature Work Priority Levels

- **Now:** Needed before or during pilot launch.
- **Next:** Needed after initial validation.
- **Later:** Needed for scaling and investor-backed growth.

# Backend Feature Work

## Now: Critical Backend Features

### 1. Production-ready email verification flow

Build a strict verification flow:

- Signup creates user as unverified.
- Backend sends OTP/link.
- User cannot log in until verified.
- Resend OTP has cooldown.
- OTP attempts are rate-limited.
- Admin can inspect email send status.

### 2. Railway environment health checks

Add internal operational checks for:

- SMTP configured
- Database configured
- Media storage configured
- `FRONTEND_URL` configured
- Google OAuth configured

This helps quickly debug deployment problems.

### 3. Canonical order status system

Define one order lifecycle:

```text
pending -> confirmed -> processing -> ready_for_pickup -> out_for_delivery -> delivered
```

Also include:

```text
cancelled, returned, failed_delivery, refunded
```

Apply the same statuses to:

- Models
- Serializers
- Admin dashboard
- Vendor dashboard
- Frontend filters
- Reports

### 4. Order item-level vendor fulfillment

For multi-vendor orders, track each seller’s part separately.

Add:

- `OrderItem.status`
- Vendor-specific confirmation
- Vendor-specific cancellation
- Admin whole-order overview

### 5. Backend cart and wishlist sync

Authenticated users should have server-side cart and wishlist.

Benefits:

- Multi-device support
- Better stock validation
- Better recommendations later
- Stronger checkout security

### 6. Stock and price revalidation at checkout

Before creating an order:

- Confirm product exists.
- Confirm product is active.
- Confirm seller is approved.
- Confirm stock availability.
- Confirm latest price.
- Reject stale cart data.

### 7. Seller trust score

Add seller performance metrics:

- Response time
- Cancellation rate
- Complaint rate
- Return rate
- Delivery preparation time
- Average rating

Use these to create seller trust levels.

### 8. Complaint and dispute module

Create backend support for:

- Customer complaint
- Return request
- Seller response
- Admin decision
- Refund/replacement status

This is essential for marketplace trust.

## Next: Backend Growth Features

### 9. Delivery partner module

Add models for:

- Delivery partner
- Delivery zones
- Assigned rider/partner
- Delivery fee
- Cash collected
- Failed delivery reason

### 10. Cash on Delivery reconciliation

Track:

- Order value
- Delivery fee
- Commission
- Cash collected
- Seller payout
- Delivery partner payout
- Pending settlement

### 11. Seller payout automation

Build payout records from delivered orders.

Features:

- Pending payouts
- Paid payouts
- Commission calculation
- Payout history
- Export report

### 12. Product moderation workflow

Improve admin product approval:

- Pending products
- Approved products
- Rejected products
- Rejection reason
- Required edits
- Suspicious product flag

### 13. Notification system expansion

Support notifications for:

- Order placed
- Order confirmed
- Out for delivery
- Delivered
- Seller approved/rejected
- Product approved/rejected
- Verification reminders

Channels:

- In-app
- Email
- WhatsApp/SMS later

### 14. Admin operational dashboards

Add dashboards for:

- Orders today
- Pending seller approvals
- Pending products
- Failed deliveries
- Complaints
- Revenue/commission
- Top sellers
- Top products

## Later: Backend Scale Features

### 15. Warehouse/fulfillment module

Only after strong order volume.

Features:

- Inventory locations
- Stock movements
- Consignment stock
- Pick/pack status
- Warehouse staff roles

### 16. Recommendation and personalization engine

Start simple:

- Popular products
- Recently viewed
- Similar category products
- Seller-based recommendations

### 17. Advanced fraud detection

Detect:

- Fake orders
- Repeated COD refusal
- Suspicious sellers
- Price manipulation
- Product abuse reports

### 18. Payment integration

Add optional digital payments later:

- Card payment
- Mobile money
- Bank transfer
- Wallet balance

Keep Cash on Delivery as the default early trust method.

# Frontend Feature Work

## Now: Critical Frontend Features

### 1. Reliable verification pages

Improve:

- OTP entry page
- Resend OTP feedback
- Email verification success state
- Expired OTP state
- Wrong email correction
- Loading/error UI

### 2. Better signup/login error handling

Show specific messages for:

- Email already registered
- Phone already registered
- Google-only account
- Email not verified
- Wrong password
- Network error
- Server unavailable

### 3. Production-ready empty/error states

Add professional UI for:

- No products
- No orders
- No cart items
- API failure
- Image failure
- Seller pending approval
- Email not verified

### 4. Mobile-first checkout improvement

Afghanistan users will mostly use mobile.

Improve:

- Address input
- Landmark field
- Phone confirmation field
- Delivery notes
- COD explanation
- Order confirmation screen

### 5. Frontend environment visibility

Add a simple debug-safe display for admins only showing:

- API base URL
- Frontend build mode
- App version

Useful for deployment debugging.

### 6. Placeholder and fallback assets

Add branded fallback images for:

- Product image missing
- Seller logo missing
- Avatar missing
- Category image missing

## Next: Frontend Growth Features

### 7. Seller onboarding experience

Improve seller application with:

- Step-by-step form
- Progress indicator
- Required document guidance
- Save draft
- Application status tracking
- Clear rejection reason

### 8. Vendor dashboard improvements

Add:

- Today’s orders
- Pending orders
- Product approval status
- Sales summary
- Payout summary
- Customer complaints
- Store performance score

### 9. Admin dashboard improvements

Add operational views for:

- Seller applications
- Product moderation
- Order operations
- Delivery failures
- Complaints
- Payouts
- Revenue summary

### 10. Backend-synced cart and wishlist UI

Improve:

- Cart across devices
- Wishlist across devices
- Stock warnings
- Price changed warning
- Seller unavailable warning

### 11. Search and filtering improvements

Add:

- Category filters
- Price range
- Seller filter
- Rating filter
- Availability filter
- Sort by newest/popular/price

### 12. Trust-focused product pages

Add:

- Verified seller badge
- Seller rating
- Return eligibility
- Delivery estimate
- COD available badge
- Product authenticity note
- Customer reviews

## Later: Frontend Scale Features

### 13. Android mobile app

For Afghanistan, Android is important.

Start only after web pilot works.

### 14. Customer loyalty features

Add later:

- Referral rewards
- Loyalty points
- Coupons
- First-order discount
- Repeat buyer campaigns

### 15. Multi-language polish

Improve:

- Dari translations
- Pashto translations
- RTL layout quality
- Local wording
- Local date/time display

### 16. Delivery tracking UI

Add:

- Order timeline
- Delivery partner info
- Failed delivery reason
- Reschedule request
- WhatsApp/call support button

### 17. Support center

Add:

- FAQ
- Contact form
- Return request page
- Complaint page
- Order issue page
- Seller help page

# Cross-Functional Feature Work

## 1. Trust and Safety System

Combine backend and frontend features:

- Verified sellers
- Real reviews
- Return policy
- Complaint workflow
- Seller penalties
- Fraud tracking

## 2. Operational Analytics

Track business metrics:

- Daily orders
- GMV
- Revenue
- Cancellation rate
- Delivery success rate
- Repeat buyers
- Seller response time

## 3. Investor Reporting Dashboard

Create monthly reports showing:

- Users
- Sellers
- Products
- Orders
- Revenue
- Growth rate
- Customer feedback
- Operational issues solved

## Recommended Development Order

### First: Stabilize Pilot

1. Fix email verification bypass.
2. Verify Railway env and SMTP.
3. Confirm PostgreSQL and media storage.
4. Normalize order statuses.
5. Improve checkout and verification UX.

### Second: Build Trust

1. Seller verification badge.
2. Product moderation workflow.
3. Reviews and ratings.
4. Complaint/return system.
5. Customer support flows.

### Third: Improve Operations

1. Delivery assignment.
2. COD reconciliation.
3. Seller payout records.
4. Vendor order item statuses.
5. Admin dashboards.

### Fourth: Grow

1. Referral program.
2. Promotions.
3. Better search/filtering.
4. Seller analytics.
5. Low-cost marketing tools.

### Fifth: Scale

1. Payment integrations.
2. Warehouse/fulfillment system.
3. Mobile app.
4. Advanced fraud detection.
5. Recommendation engine.

## Final Recommendation

For now, focus feature work on trust, verification, order reliability, seller quality, and operational control. Do not prioritize expensive scale features like warehouses, delivery fleet, or advanced AI until the pilot has real orders and repeat customers.

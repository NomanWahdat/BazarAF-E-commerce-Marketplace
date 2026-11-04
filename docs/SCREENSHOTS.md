# Genuine application screenshots

Captured on 5 November 2026 with the installed Chromium/Playwright browser. **36 actual captures**, including 31 initial page traversals and five supplemental screens. Each is a full-page PNG; desktop viewport was 1440 ? 1000, mobile login 390 ? 844. Image heights vary with page length.

## Provenance and limitations

- The React UI and Django API ran locally, with a newly created temporary SQLite database and synthetic users, products, orders, reviews and notifications. No production accounts or private user records were used.
- Initial route traversal used no mocked API responses and recorded no page exceptions or API error responses. Supplemental pages were captured separately; they do not expand the automated suite to 36 end-to-end tests.
- Product photos were not fabricated or downloaded into the project. Missing catalog photos use the application's real placeholder state. Initial React capture blocked external resources.
- The homepage includes static seller/testimonial/promotion sections already in the source. Their displayed counts, names and claims are demonstration UI, not verified platform adoption.
- The customer profile/order screens are the implemented account experience; no separate customer dashboard route exists. User management is shown in Django admin; no dedicated React user-management page was established.
- The Django administrator was elevated only inside the disposable demo database to view actual admin lists. No real database permissions were changed.
- No TOTP setup secret, backup code, password, token, document ticket, environment value, or real identity document is shown.
- Finance screens show synthetic data and retain the defects identified in the audit. Their appearance does not certify financial correctness.

## Capture index

| Page | Actual route / state | PNG size | Screenshot |
|---|---|---|---|
| Homepage | `/home` | 1440 ? 6557 | [homepage.png](screenshots/homepage.png) |
| Product listing | `/products` | 1440 ? 1646 | [product-listing.png](screenshots/product-listing.png) |
| Product details | `/product/e2e-tea` | 1440 ? 1868 | [product-details.png](screenshots/product-details.png) |
| Search results | `/products?search=tea` | 1440 ? 1261 | [product-search.png](screenshots/product-search.png) |
| Login | `/login` | 1440 ? 1050 | [login.png](screenshots/login.png) |
| Customer registration | `/signup` | 1440 ? 1050 | [registration.png](screenshots/registration.png) |
| Seller application / registration | `/seller-registration` | 1440 ? 1135 | [seller-registration.png](screenshots/seller-registration.png) |
| Public vendor storefront | `/store/kabul-test-shop` | 1440 ? 3917 | [vendor-storefront.png](screenshots/vendor-storefront.png) |
| About / landing page | `/about` | 1440 ? 1050 | [about.png](screenshots/about.png) |
| Customer profile | `/profile` | 1440 ? 1305 | [customer-profile.png](screenshots/customer-profile.png) |
| Customer order history | `/orders` | 1440 ? 2627 | [customer-order-history.png](screenshots/customer-order-history.png) |
| Notifications | `/notifications` | 1440 ? 1552 | [notifications.png](screenshots/notifications.png) |
| Help and support | `/help-support` | 1440 ? 2298 | [support.png](screenshots/support.png) |
| Shopping cart | `/cart` | 1440 ? 1615 | [shopping-cart.png](screenshots/shopping-cart.png) |
| Checkout delivery details | `/checkout` | 1440 ? 1692 | [checkout.png](screenshots/checkout.png) |
| Vendor dashboard | `/vendor` | 1440 ? 1909 | [vendor-dashboard.png](screenshots/vendor-dashboard.png) |
| Vendor products | `/vendor?tab=products` | 1440 ? 1867 | [vendor-product-management.png](screenshots/vendor-product-management.png) |
| Vendor orders | `/vendor?tab=orders` | 1440 ? 1523 | [vendor-order-management.png](screenshots/vendor-order-management.png) |
| Vendor earnings | `/vendor?tab=earnings` | 1440 ? 1800 | [vendor-earnings.png](screenshots/vendor-earnings.png) |
| Add product form | `/vendor/add-product` | 1440 ? 1796 | [vendor-add-product.png](screenshots/vendor-add-product.png) |
| Vendor settings | `/vendor/settings` | 1440 ? 2045 | [vendor-settings.png](screenshots/vendor-settings.png) |
| Vendor reviews | `/vendor/reviews` | 1440 ? 1546 | [vendor-reviews.png](screenshots/vendor-reviews.png) |
| Admin dashboard and trends | `/admin` | 1440 ? 1473 | [admin-dashboard.png](screenshots/admin-dashboard.png) |
| Seller application review | `/admin/seller-applications` | 1440 ? 1050 | [admin-seller-applications.png](screenshots/admin-seller-applications.png) |
| Product moderation | `/admin/product-moderation` | 1440 ? 1050 | [admin-product-moderation.png](screenshots/admin-product-moderation.png) |
| Order operations | `/admin/order-operations` | 1440 ? 1050 | [admin-order-management.png](screenshots/admin-order-management.png) |
| Commission management | `/admin/commission-management` | 1440 ? 1050 | [admin-commissions.png](screenshots/admin-commissions.png) |
| Review moderation | `/admin/review-moderation` | 1440 ? 1050 | [admin-review-moderation.png](screenshots/admin-review-moderation.png) |
| Vendor performance metrics | `/admin/vendor-performance` | 1440 ? 1050 | [admin-vendor-performance.png](screenshots/admin-vendor-performance.png) |
| Category administration | `/admin/categories` | 1440 ? 1223 | [admin-categories.png](screenshots/admin-categories.png) |
| Retained legacy admin panel | `/admin-legacy` | 1440 ? 1506 | [admin-legacy.png](screenshots/admin-legacy.png) |
| Django administration | `http://127.0.0.1:8001/admin/` | 1440 ? 1246 | [django-admin-dashboard.png](screenshots/django-admin-dashboard.png) |
| Django user management | `http://127.0.0.1:8001/admin/home/user/` | 1440 ? 1115 | [admin-user-management.png](screenshots/admin-user-management.png) |
| Checkout with server quote | `/checkout (server quote confirmation)` | 1440 ? 1832 | [checkout-confirmation.png](screenshots/checkout-confirmation.png) |
| Owner-restricted order tracking | `/order-tracking/{synthetic-order-reference}` | 1440 ? 1988 | [order-tracking.png](screenshots/order-tracking.png) |
| Dari login on mobile | `/login (Dari)` | 390 ? 907 | [login-dari-mobile.png](screenshots/login-dari-mobile.png) |

## Gallery

### Homepage

![Homepage, actual application with synthetic demonstration data](screenshots/homepage.png)

### Product listing

![Product listing, actual application with synthetic demonstration data](screenshots/product-listing.png)

### Product details

![Product details, actual application with synthetic demonstration data](screenshots/product-details.png)

### Search results

![Search results, actual application with synthetic demonstration data](screenshots/product-search.png)

### Login

![Login, actual application with synthetic demonstration data](screenshots/login.png)

### Customer registration

![Customer registration, actual application with synthetic demonstration data](screenshots/registration.png)

### Seller application / registration

![Seller application / registration, actual application with synthetic demonstration data](screenshots/seller-registration.png)

### Public vendor storefront

![Public vendor storefront, actual application with synthetic demonstration data](screenshots/vendor-storefront.png)

### About / landing page

![About / landing page, actual application with synthetic demonstration data](screenshots/about.png)

### Customer profile

![Customer profile, actual application with synthetic demonstration data](screenshots/customer-profile.png)

### Customer order history

![Customer order history, actual application with synthetic demonstration data](screenshots/customer-order-history.png)

### Notifications

![Notifications, actual application with synthetic demonstration data](screenshots/notifications.png)

### Help and support

![Help and support, actual application with synthetic demonstration data](screenshots/support.png)

### Shopping cart

![Shopping cart, actual application with synthetic demonstration data](screenshots/shopping-cart.png)

### Checkout delivery details

![Checkout delivery details, actual application with synthetic demonstration data](screenshots/checkout.png)

### Vendor dashboard

![Vendor dashboard, actual application with synthetic demonstration data](screenshots/vendor-dashboard.png)

### Vendor products

![Vendor products, actual application with synthetic demonstration data](screenshots/vendor-product-management.png)

### Vendor orders

![Vendor orders, actual application with synthetic demonstration data](screenshots/vendor-order-management.png)

### Vendor earnings

![Vendor earnings, actual application with synthetic demonstration data](screenshots/vendor-earnings.png)

### Add product form

![Add product form, actual application with synthetic demonstration data](screenshots/vendor-add-product.png)

### Vendor settings

![Vendor settings, actual application with synthetic demonstration data](screenshots/vendor-settings.png)

### Vendor reviews

![Vendor reviews, actual application with synthetic demonstration data](screenshots/vendor-reviews.png)

### Admin dashboard and trends

![Admin dashboard and trends, actual application with synthetic demonstration data](screenshots/admin-dashboard.png)

### Seller application review

![Seller application review, actual application with synthetic demonstration data](screenshots/admin-seller-applications.png)

### Product moderation

![Product moderation, actual application with synthetic demonstration data](screenshots/admin-product-moderation.png)

### Order operations

![Order operations, actual application with synthetic demonstration data](screenshots/admin-order-management.png)

### Commission management

![Commission management, actual application with synthetic demonstration data](screenshots/admin-commissions.png)

### Review moderation

![Review moderation, actual application with synthetic demonstration data](screenshots/admin-review-moderation.png)

### Vendor performance metrics

![Vendor performance metrics, actual application with synthetic demonstration data](screenshots/admin-vendor-performance.png)

### Category administration

![Category administration, actual application with synthetic demonstration data](screenshots/admin-categories.png)

### Retained legacy admin panel

![Retained legacy admin panel, actual application with synthetic demonstration data](screenshots/admin-legacy.png)

### Django administration

![Django administration, actual application with synthetic demonstration data](screenshots/django-admin-dashboard.png)

### Django user management

![Django user management, actual application with synthetic demonstration data](screenshots/admin-user-management.png)

### Checkout with server quote

![Checkout with server quote, actual application with synthetic demonstration data](screenshots/checkout-confirmation.png)

### Owner-restricted order tracking

![Owner-restricted order tracking, actual application with synthetic demonstration data](screenshots/order-tracking.png)

### Dari login on mobile

![Dari login on mobile, actual application with synthetic demonstration data](screenshots/login-dari-mobile.png)

## Screens that are unavailable or intentionally absent

| Requested area | Evidence / remaining requirement |
|---|---|
| Separate customer dashboard | Not implemented as a distinct route; use actual profile and order pages |
| Dedicated rider dashboard | No rider frontend route exists; delivery model/API needs a real end-to-end exercise |
| Live payment provider page | Only COD is accepted; no payment gateway screen exists |
| Analytics/report export | Admin dashboard trends and vendor metrics captured; a working export was not established |
| Production/cloud screenshots | No deployed service or private production data was used |
| Every product/edit/upload/modal/locale combination | Not exhaustively captured; add after the underlying workflow is verified |

The [machine-readable manifest](evidence/screenshots.json) records routes, viewport dimensions and initial observations. The [audit](PROJECT_AUDIT.md) distinguishes page rendering from verified mutations.

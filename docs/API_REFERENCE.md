# API reference

Inspected 5 November 2026 from `backend/api/urls.py` and the current view/serializer code. The [route manifest](evidence/api-routes.json) lists 135 resolved API patterns. This document summarizes the main contracts; existence in the manifest is not proof that an action works. No OpenAPI generator is configured.

Base URL is `http://localhost:8000/api` in the default development setup. Paths below are relative to `/api/`, retain trailing slashes, and use JSON unless multipart upload is stated. `/health/` is outside this prefix.

## Authentication

| Method | Path | Notes |
|---|---|---|
| POST | `auth/register/` | full_name, normalized phone, password/password_confirm, optional email, role customer/vendor; rejects admin/rider self-registration |
| POST | `auth/login/` or `auth/token/` | identifier or phone plus password; returns session tokens or `2fa_required` |
| POST | `auth/2fa/verify/` | challenge_token and authenticator/backup code |
| POST | `auth/verify-email/` | email plus otp/token; 15-minute validity, per-account attempts and request throttles |
| POST | `auth/resend-verification/` | email; queues a new code |
| POST | `auth/request-password-reset/` | email; queues reset link |
| POST | `auth/reset-password/` | token and password; this handler currently applies only a minimum-length check |
| POST | `auth/google/` | Google credential ID token; requires configured audience |
| POST | `auth/token/refresh/` | refresh; validates active AuthSession and rotates refresh token |
| POST | `auth/token/verify/` | token; token validation does not itself authorize a resource request |
| POST | `auth/logout/` | authenticated token owner supplies refresh; blacklists refresh and revokes session |

Protected calls normally use `Authorization: Bearer <access-token>`. Tokens returned by the application's session issuer include a `sid` claim backed by AuthSession; plain externally minted SimpleJWT tokens are insufficient. DRF SessionAuthentication is also enabled.

The user response is `{id, phone, full_name, email, role, is_active, created_at}`. Passwords are not serialized. Tokens and signed download links must be kept private and are intentionally omitted from audit evidence.

Known inconsistencies: `authAPI.getCurrentUser()` calls nonexistent `auth/user/` (404). `users/me/` exists but the current permission dispatch requires admin (customer receives 403). Use the working authenticated `user/profile/` contract while those APIs are repaired.

## Catalog and sellers

| Methods | Path | Access / identifiers |
|---|---|---|
| GET | `products/` | Public approved/active products from approved vendors; vendors see their own products, admins see all |
| GET | `products/{slug-or-uuid}/` | Product lookup accepts slug or UUID |
| GET | `products/search/`, `products/featured/` | Public read actions |
| GET | `products/{identifier}/reviews/` | Public product reviews |
| POST | `products/` | Approved vendor; forces pending status |
| PATCH / DELETE | `products/{identifier}/` | Owner/admin checks |
| POST | `products/{identifier}/upload_images/` | Owner/admin; multipart `images`; validated uploads |
| POST | `products/{identifier}/toggle_active/` | Owner/admin |
| POST | `products/{identifier}/approve/`, `reject/`, `toggle_featured/` | Administrator |
| GET | `categories/`, `categories/tree/`, `categories/main_categories/` | Public reads; create/update/delete require admin |
| GET | `categories/{identifier}/attributes/`, `products/` | Category detail actions; code permits slug/UUID resolution |
| GET | `stores/{identifier}/` | Public approved storefront by vendor UUID or unique slugified shop name |
| POST | `vendors/` | Public direct vendor registration; distinct from SellerApplication |
| GET | `vendors/`, `vendors/{uuid}/` | Authenticated; **currently exposes private fields to customers — P0 finding** |
| POST | `seller-applications/` | Public multipart application/document submission |

Public customer filtering supports `search`, `category_slug`, `vendor_id`, `min_price`, `max_price`, and `ordering`, including price/name/date/sales/views and the rating annotation. `StandardResultsSetPagination` accepts `page` and `page_size`, caps pages at 100, and defaults to 20. Custom filtering is not applied uniformly to admin/vendor querysets. Do not assume every service parameter is honored by every role.

The standard response is `{count, next, previous, results: [...]}`. Storefront adds vendor and latest review data to its paginated response. Some custom actions return arrays or wrappers instead; `GET user/orders/` returns an unpaginated array. Clients must not assume one universal shape.

## Checkout and orders

| Method | Path | Access / behavior |
|---|---|---|
| GET | `delivery-zones/` | Public; configured cities/fees and development-fallback indicator |
| POST | `orders/quote/` | Authenticated; validates items/address and computes subtotal/fee/total |
| POST | `orders/checkout/` | Authenticated; same validation plus transactional reservation |
| GET | `orders/`, `orders/{uuid}/`, `orders/my_orders/` | Role-filtered; vendor responses currently leak other vendors' shared-order items |
| POST | `orders/` | Customer legacy order-creation contract, sharing authoritative checkout service |
| POST | `orders/{uuid}/cancel/` | Owning customer; pending/confirmed only; restores stock |
| POST | `orders/{uuid}/confirm/` | Vendor confirms its own items or admin confirms all |
| PATCH | `orders/{uuid}/` | Admin; status transitions |
| DELETE | `orders/{uuid}/` | Admin; **currently bypasses cancellation stock restoration** |
| GET | `orders/track/{order-reference}/` | Owning buyer; `ORD-...` reference, not UUID |
| GET | `user/orders/`, `user/orders/{uuid}/` | Authenticated buyer order history/detail |
| POST | `orders/bulk-update-status/` | Admin; order_ids/status; restricted status subset |
| GET | `orders/status-counts/` | Admin; counts omit some supported model statuses |

Example request body for quote/checkout, with an actual catalog UUID substituted for the placeholder:

```json
{
  "customer_name": "Demo Customer",
  "delivery_address": {
    "province": "Kabul",
    "city": "Kabul",
    "address": "Demo district, sample landmark"
  },
  "payment_method": "cod",
  "items": [{"product_id": "<catalog-product-uuid>", "quantity": 2}]
}
```

Quote response contains decimal strings `subtotal`, `delivery_fee`, `total`, `currency: "AFN"`, and priced item lines. Checkout additionally accepts `expected_total` from the reviewed quote and an `Idempotency-Key` header up to 128 characters. It ignores submitted product prices and totals and reserves database stock. Duplicate product lines are consolidated, with at most 100 products and 100 units per product.

Successful checkout returns HTTP 201 with `{status, order: {id, uuid, total, subtotal, delivery_fee, currency, status, created_at}}`. Here `order.id` is the human order reference; `order.uuid` is the CRUD identifier. A successful retry also returns 201 with the same order. Reusing a key with a changed payload is rejected.

## Profile, reviews, notifications and support

| Methods | Path | Notes |
|---|---|---|
| GET / PUT | `user/profile/` | Own profile; writable full_name/email |
| POST | `user/change-password/` | current_password/new_password, Django validation |
| GET / POST | `user/addresses/` | Own addresses |
| GET / PUT / PATCH / DELETE | `user/addresses/{uuid}/` | Own address; no database-level single-default constraint |
| GET / POST | `user/reviews/` | Review creation requires owned delivered order containing product |
| GET / PUT / PATCH / DELETE | `user/reviews/{uuid}/` | Own review; update-field constraints need further review |
| GET / POST / DELETE | `user/cart/` | Separate database cart API; active storefront uses localStorage |
| PATCH / DELETE | `user/cart/{uuid}/` | Database cart row |
| GET | `notifications/`, `notifications/unread_count/` | Own notifications |
| POST | `notifications/{uuid}/mark_as_read/`, `notifications/mark_all_read/` | Own read state |
| GET / POST | `support/` | Own support/return requests; returns require owned delivered order |
| POST | `newsletter/` | Email + vendor_id; queues signed confirmation email for a new subscription |
| GET | `newsletter/confirm/?token=...` | Signed confirmation, 24-hour maximum age |

Generic router CRUD exposure should be reviewed rather than assumed supported for every resource. The notification viewset, for example, inherits create/update/delete although it is used primarily for reads and marking read.

## Vendor security and settings

`vendors/profile/` and `vendors/settings/` support GET/PATCH. Profile includes user contact and seller address fields; settings include security/session information, policies/FAQs, notification preferences, and appearance. Branding images use multipart uploads. Current profile/email and upload validation has inconsistencies documented in the audit.

POST security paths:

- `vendors/change-password/`
- `vendors/2fa/setup/begin/` and `vendors/2fa/setup/verify/`
- `vendors/2fa/backup-codes/regenerate/` and `vendors/2fa/disable/`
- `vendors/toggle-2fa/` (delegates to setup/disable behavior)
- `vendors/send-email-verification/`
- `vendors/send-phone-verification/` and `vendors/verify-phone-code/`
- `vendors/logout-all-sessions/` and `vendors/logout-session/{session_id}/`

These require vendor/admin role and an appropriate vendor profile. Phone verification has no real SMS transport: the default console stub can log codes and report success even in production. Setup responses deliberately contain sensitive TOTP configuration, and regenerated backup codes are shown once; do not use those responses in screenshots or logs.

## Administration, delivery and payouts

| Prefix | Representative operations |
|---|---|
| `admin/dashboard/` | GET `summary/`, `order_trends/` |
| `admin/seller-applications/` | List/detail; POST `{uuid}/approve/`, `reject/` |
| `admin/product-moderation/` | List/detail; POST approve/reject and `bulk_approve/`, `bulk_reject/` |
| `admin/order-operations/` | List/detail; POST `{uuid}/assign_rider/`, `update_status/`, `batch_update_status/` |
| `admin/commission-management/` | List; POST `{uuid}/update_commission/`, `preview_payout_impact/`; GET `commission_history/` |
| `admin/review-moderation/` | List; POST flag/unflag/delete review actions |
| `admin/vendor-performance/` | Read-only list/detail and `performance_metrics/` |
| `dashboard/`, `dashboard/vendor/` | Admin or vendor dashboard summaries respectively |
| `deliveries/` | Admin creates delivery from confirmed/picked order; assigned rider POST pickup/deliver/fail |
| `payouts/` | Admin groups available vendor settlement lines by period; vendor/admin list/detail |
| `payouts/{uuid}/mark_paid/` | Admin supplies payment_reference; records payment, does not transfer funds |
| `payouts/my_payouts/` | Vendor summary; current pagination nests a dict inside results |
| `documents/download/?ticket=...` | Local signed-link download, 60-second validity; link issuance authorization is flawed |

`payoutService.bulkMarkPaid()` and `generatePayouts()` reference routes not defined in the API. Commission preview was confirmed to return 500 for nonzero pending payouts because Decimal is multiplied by float. See [API probes](evidence/api-probes.json).

## Errors and pagination limitations

Validation generally returns 400; missing authentication 401; denied roles 403; owner-restricted tracking hides another user's order with 404. Error wrappers vary between `message`, `detail`, `errors`, plain field maps, and `error`. The frontend's `apiErrorMessage` partially normalizes these.

Review moderation appends all unmoderated reviews after paginating moderation records, so count/page contents can disagree. Payout `my_payouts` nests `summary/results` in outer `results`. These are actual source/API inconsistencies, not recommended response formats.

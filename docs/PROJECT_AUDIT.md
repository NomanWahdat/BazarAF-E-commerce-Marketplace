# BazarAF project audit and CSC portfolio assessment

**Audit date:** 5 November 2026 (Asia/Karachi). **Scope:** the existing local working tree, including its pre-existing uncommitted changes. **Baseline commit:** `a8204011e766d316d0141c024ac3209fbce8e898`. Application code was inspected and exercised but not fixed by this audit. The later user instruction explicitly authorized connection and publication to the new repository; [Git verification](GIT_VERIFICATION.md) separates that publication from the intake state.

## Executive assessment

BazarAF is a substantial, functioning full-stack marketplace foundation. It demonstrates customer/vendor/admin workflows, a rich relational schema, server-side checkout pricing, inventory reservation, JWT sessions, seller moderation, TOTP, and localization. Its strongest evidence is a successful real browser checkout into an isolated database, supported by backend regressions and genuine dashboard captures.

It is **not ready for real identity documents or production commerce without further fixes**. Customer access to private seller document links is confirmed. Shared orders expose other vendors' line items, generic order deletion bypasses stock restoration, and financial/API contracts have reproducible failures. Passing the current test suite does not cover these cases. Portfolio presentation should describe the implemented system, successful narrow workflows, and a concrete remediation plan rather than claim complete production readiness.

No production database, mail account, payment service, cloud storage, or deployment was modified. No dependencies were installed or upgraded. Recommendations below are not implemented application changes.

## Purpose, users and actual stack

The application supports an Afghanistan-focused catalog and COD ordering, seller onboarding/listing management, and marketplace administration. User roles are customer, vendor, admin and rider. Rider functionality exists in models/APIs; there is no dedicated rider frontend. A separate customer dashboard is not routed: customers use `/home`, `/profile`, `/orders`, `/wishlist`, `/reviews`, and notifications/support pages.

| Layer | Evidence | Verified state |
|---|---|---|
| React / TypeScript / Vite | `frontend/package.json`, `vite.config.ts`, `src/main.tsx` | React 18.3.1, TS 5.9, Vite 6.4.1; installed build passed |
| UI and localization | package manifest, `src/i18n.ts`, `src/locales/marketplace.ts`, RTL CSS | Tailwind 4, Radix/shadcn-style UI, MUI, Lucide, Sonner; en/fa/ps |
| Python / Django / DRF | backend locks, Docker/runtime files, existing environment | Python 3.13 target, Django 5.2.18, DRF 3.17.2 |
| Authentication | `authentication.py`, `two_factor.py`, settings | SimpleJWT 5.5.1 plus database session checks; vendor TOTP |
| SQL | settings, models and migrations | SQLite exercised; PostgreSQL code/configuration present; no Neon connection verified |
| Media | settings, `storage.py`, `uploads.py` | Filesystem locally; optional public and private S3-compatible buckets; R2 not provisioned/verified |
| Mail | `emails.py`, EmailJob, `send_queued_mail.py` | Durable outbox and SMTP/console backends; external delivery untested |
| Operations | Dockerfile, Railway/Vercel configs, CI workflow | Deployment and CI definitions present; hosted success not established |
| Optional | Redis/Sentry configuration, GoogleAuthView | Source present; external behavior not exercised |

Local backend `.env` presence was checked without printing values. It did not contain DATABASE_URL, an R2 endpoint, Redis URL, private-document bucket, or encryption key. The audit deliberately used settings that disable dotenv and external credentials. Earlier documents' Django 6, real-time tracking and deployment claims are not treated as current facts.

## Architecture and database overview

The backend is a Django modular monolith: `Bazar` configures runtime; `api/urls.py` dispatches into `home`; business services in `commerce.py` and `onboarding.py` are called by serializers/views. One configured database backs marketplace, outbox and AuthSession data. `home/admin_models.py` adds moderation/commission/audit entities via app initialization.

The frontend is a React SPA with shared Axios transport and separate domain services. Route composition is in `src/app/App.tsx` and `src/routes/adminRoutes.tsx`. Multiple old and current component families coexist. The active cart/wishlist are browser storage; Cart API/model exists separately. The model reference contains **27 concrete home models**, including accounting and background-mail entities; not every key is UUID. There are 22 numbered home migrations. Fresh isolated SQLite migration and model/migration consistency checks passed.

See [architecture and flows](ARCHITECTURE.md), [complete ER diagrams](DATABASE.md), [all model fields](evidence/model-schema.json), [135 API patterns](evidence/api-routes.json), and the [212-file source inventory](evidence/source-inventory.json). Environment directories, installed packages, PostgreSQL binaries/data, private uploads, and databases were excluded from source analysis. The source inventory is structural evidence, not a claim of exhaustive formal verification of every line.

## Feature inventory

Status definitions: **Verified** = fully implemented and verified for the stated tested scenario; **Partial** = only part of the end-to-end feature works or was exercised; **UI-only** / **Backend-only** = layer-specific implementation; **Broken** = a reproducible failure; **Unverified** = source exists without adequate runtime evidence; **Documented only** = a claim without matching implementation. Screenshot evidence proves rendering only unless an action is separately tested.

Frontend paths below are relative to `frontend/src/`; backend paths to `backend/home/` unless otherwise stated.

| Feature | Purpose | Role | Frontend evidence | Backend evidence | Status |
|---|---|---|---|---|---|
| Customer registration | Create buyer account | Customer | `pages/SignUp.tsx`, `services/api.ts` | RegisterView, RegisterSerializer | Partial: form captured, synthetic API registration exercised; SMTP not verified |
| Phone/email login | Authenticate | All | `pages/Login.tsx` | LoginView; AuthSession | Verified for seeded customer/vendor/admin login; invalid-login browser feedback tested |
| Vendor registration | Create pending seller | Vendor | `pages/SellerRegistration.tsx` | VendorViewSet, VendorCreateSerializer, user signals | Partial: alternate paths differ; application approval tested separately |
| Seller application | Review documents/shop | Applicant/admin | SellerRegistration, AdminSellerApplications | SellerApplicationViewSet; onboarding service | Partial: approval tested, upload and document authorization not secure end-to-end |
| Role access | Restrict administration and ownership | All | `utils/ProtectedRoute.tsx` | Permission classes/querysets | Partial: tested denials pass; vendor/privacy exceptions confirmed |
| Email verification | Prove mailbox | Buyer/vendor | VerifyEmail, VerifyEmailPending | VerifyEmailView; 15-minute token; throttles | Unverified externally; code no longer auto-verifies all signups |
| Password reset/change | Recover credentials | All | ForgotPassword, ResetPassword, settings | ResetPasswordView, password serializers | Partial: reset has weaker validation than change/register; SMTP untested |
| Google sign-in | External identity | All | Login/SignUp Google code | GoogleAuthView; google-auth | Unverified: real provider unavailable in isolated scope |
| JWT refresh/logout | Token lifecycle | All | shared Axios refresh handling | SessionJWTAuthentication; refresh serializer; LogoutView | Partial: seeded JWT requests and refresh blacklist regression pass; concurrent rotation races untested |
| Vendor TOTP | Second factor | Vendor | VendorSettingsPage, Login | two_factor.py; setup/challenge handlers | Verified backend setup, invalid/valid code, login challenge, one-time backup code tests |
| Session list/revoke | Account session control | Vendor | VendorSettingsPage | AuthSession and cached session display | Partial: displayed settings captured; all concurrent revocation cases untested |
| Product catalog | Discover approved listings | Public/customer | pages/ProductListing, ProductCard | ProductViewSet, ProductListSerializer | Verified seeded page/API rendering and approved/suspended filtering regression |
| Search/price/category sorting | Narrow products | Public/customer | ProductListing, SearchBar | DRF search/ordering, `_apply_filters` | Partial: search captured; invalid price tested; every filter/role combination not tested |
| Product detail | View item/images/vendor | Public/customer | pages/ProductDetail | ProductDetailSerializer; retrieve | Verified seeded detail page and public-serializer regression; valid photo upload not exercised |
| Product creation | Seller submits listing | Vendor | pages/addProduct | ProductCreateSerializer, ProductViewSet.create | Verified API pending-status enforcement; form rendered |
| Product edit/delete/active | Maintain catalog | Vendor/admin | VendorDashboard dialog/table | ProductUpdateSerializer and actions | Partial: source traced and UI captured; full CRUD browser cycle untested |
| Product/category attributes | Category-specific values | Vendor/admin | addProduct dynamic fields | CategoryAttribute, AttributeValue, ProductAttribute | Partial: backend validation exists; complete required/type enforcement incomplete |
| Product image upload | Product media | Vendor/admin | addProduct, product dialog | upload_images, validate_image, ProductImage | Unverified valid-image end-to-end; source validates size/content/pixels |
| Hierarchical categories | Organize catalog | Public/admin | CategoriesDisplay, CategoryManagement | Category tree serializers/save depth rules | Partial: actual admin page captured; hierarchy/cycle validation not exhaustively tested |
| Storefront and branding | Seller public shop | Public/vendor | pages/StoreFront, VendorSettingsPage | StorefrontView, PublicVendorSerializer | Partial: real store rendered; branding upload and policies differ in public serialization |
| Browser cart | Collect purchases | Customer | App state, Cart, ProductCard | Checkout accepts product IDs; separate Cart API | Verified cart display/persistence source and browser checkout; no account synchronization |
| Database cart | Server cart rows | Customer | No active storefront synchronization | CartView, CartItemView, Cart model | Backend-only for active user flow; integrity rules need review |
| Wishlist | Save products | Customer | Wishlist and utils/wishlist | Model/routes commented out | UI-only persistence; localStorage works by design, no cross-device sync |
| Delivery quote | Supported area/fee | Customer | Checkout details/confirmation | CheckoutQuoteView; DeliveryZone | Verified quote/order agreement test and live checkout |
| COD checkout | Purchase at server prices | Authenticated | Checkout.tsx | CheckoutOrderSerializer; place_order | Verified local API/browser scenario; PostgreSQL concurrency not yet proven |
| Stock and retries | Prevent duplicate reservation | Customer/vendor | checkout retry key | locks, F updates, checkout hash/key | Partial: tampering, duplicate lines, retries/cancel tests pass; deletion and concurrency gaps remain |
| Order history | Previous purchases | Customer | pages/MyOrders | OrderListView and OrderDetailView | Verified page/API rendering; every pagination/action not tested |
| Tracking | View owned order | Customer | OrderTracking | OrderDetailByIdView | Verified actual checkout-to-tracking and owner/anonymous rejection tests |
| Buyer cancellation | Release stock | Customer | Order status UI/services | OrderViewSet.cancel, transition_order | Verified backend single restoration and repeated-cancel rejection |
| Seller confirmation | Confirm own lines | Vendor/admin | VendorDashboard, VendorOrderDetail | OrderViewSet.confirm; OrderItem.confirmed | Partial: code traced/API visible, not fully browser-tested; other-vendor items exposed |
| Admin order operations | Fulfillment coordination | Admin | AdminOrderOperations, legacy panel | OrderOperationsViewSet, transitions | Partial: bulk confirmation test passes; transition maps and deletion conflict |
| Rider/delivery | Assign and collect cash | Rider/admin | Legacy logistics/admin operations; no rider route | Delivery model/viewset; update_delivery | Backend-only rider workflow; not end-to-end tested |
| Online payments | Provider transactions | Customer | Card icon and COD selection | Only COD accepted | Documented only if inferred from visuals; no gateway integration |
| Settlement/payout grouping | Vendor earnings | Admin/vendor | Vendor earnings / legacy payouts | SettlementLine, create_payout, mark_payout_paid | Partial: API grouping probed, no actual funds transfer; pagination defect |
| Commission preview | Explain rate impact | Admin | AdminCommissionManagement | preview_payout_impact | Broken: 500 with nonzero Decimal pending payout |
| Purchase-linked reviews | Buyer feedback | Customer/vendor | ProductDetail, ReviewForm, MyReviews, VendorReviews | ReviewCreateSerializer | Partial: purchased-product rejection tested and review pages captured; MyOrders button placeholder |
| Review moderation | Flag/delete reviews | Admin | AdminReviewModeration | ReviewModerationViewSet | Partial: page works, pagination and deletion-audit retention defects |
| Notifications | In-app events/read state | All | BaseHeader, Notifications | Notification model/viewset/signals | Partial: real list captured; preferences and all event dispatch are not fully wired |
| Profile/addresses | Account/contact management | Customer/vendor | MyProfile, VendorProfilePage | profile/address serializers and views | Partial: current profile renders; vendor email and phone updates inconsistent |
| Support/returns | Request help | Customer | HelpSupport, SupportRequests | SupportRequest, SupportRequestsView | Partial: page captured; no refund execution/complete service workflow |
| Newsletter per store | Subscription confirmation | Public | StoreFront submit | NewsletterView, confirmation and EmailJob | Partial: implemented, external email unverified; homepage form is separate UI-only simulation |
| Homepage newsletter | Homepage subscription | Public | CustomerHome.handleNewsletterSubscribe | No request in handler | UI-only: timeout/success toast, no persistence |
| Homepage seller/testimonial claims | Promotion | Public | static topSellers/testimonials | No matching live lookup | UI-only promotional data; not verified customers or sellers |
| Admin dashboard/reports | Operational overview | Admin | AdminDashboard, VendorPerformance | summary/trends/performance serializers | Partial: data rendered; definitions differ, no verified report export |
| User administration | Account management | Admin | Django admin; no dedicated React user route | UserViewSet; registered User admin | Partial: actual Django user list captured; CRUD actions not fully tested |
| Localization/RTL | Language access | All | i18n/locales/MarketplaceBar/RTL CSS | locale middleware and language catalogs | Partial: mobile login language persistence/no horizontal overflow and dictionary keys tested; not full translation QA |
| Health | DB connectivity signal | Operators | No user-facing page required | `/health/` SELECT 1 | Verified local response; external dependencies not included |
| Email outbox | Retry email delivery | Operators | Auth/newsletter forms | EmailJob + worker | Unverified externally; worker not declared in deployment config |
| CI | Repeat checks | Contributors | Playwright/typecheck/build scripts | `.github/workflows/ci.yml` | Source configured; hosted run status not checked |

## Workflow verification

| Requested workflow | Result | Evidence / limits |
|---|---|---|
| Customer registration and login | Partially working | Registration API/form and seeded login; real mailbox path not exercised |
| Vendor registration and login | Partially working | Synthetic vendor created via API and seeded login; separate application/doc paths differ |
| Administrator access | Verified working locally | JWT role login; admin dashboard rendering; non-admin dashboard test returns 403 |
| Product browsing/searching | Verified working for seeded scenario | Real catalog and search captures; filter-error regression |
| Product details | Verified working for seeded scenario | Real detail API and capture |
| Shopping cart | Verified working for tested scenario | Seeded browser cart renders and drives actual checkout |
| Checkout | Verified working for tested scenario | Browser quote, confirm, redirect, correct AFN total |
| Order creation | Verified working locally | Real database write; regression tests prove server prices/retry behavior |
| Vendor order management | Partially working | Dashboard/detail sources and rendered orders; confirmed cross-vendor data leak |
| Customer order history | Verified working for display | Real list/API capture; all review/cancel controls not exercised |
| Product management | Partially working | Create/status API test and rendered management/add form; full image/edit/delete not tested |
| Dashboards | Partially working | Real vendor/admin data renders; financial preview and payout contract need repair |

Four of five existing Playwright tests mock API responses or check UI state; the fifth performs a real purchase when `BAZAAR_E2E_LIVE=1`. All five were run with that flag. Backend tests mostly use `force_authenticate`, so they do not all test JWT middleware. Independent browser/API probes used real issued session tokens.

## Confirmed findings

### F01 — P0: customer-readable vendor data issues private document links

**Evidence:** `backend/home/views.py:797`–835 (VendorViewSet permission/queryset/serializer selection), `backend/home/serializer.py:156`–190 (VendorSerializer), `backend/home/storage.py:10`–17, `backend/home/production_views.py:30`–43. An ordinary customer received HTTP 200 from `GET /api/vendors/` with identity_document, business_document, commission_rate, and nested user fields. Following the returned synthetic identity-document link without authentication returned 200. No real documents were accessed. [Recorded probe](evidence/api-probes.json).

**Impact:** user contact/private business data and currently valid document links are exposed beyond the seller/admin audience. A private bucket and expiring signature do not fix unauthorized issuance. The successful download was confirmed for local signed storage; private S3 URLs are also serialized by the same private representation, but a real cloud download was not tested.

**Recommendation:** separate public/read, owner and admin vendor serializers; constrain document link issuance and authorize document ownership/admin access. Invalidate/rotate exposed links as appropriate after a real incident review. Verify with customer, anonymous, owner and admin negative/positive tests against local and private object storage.

### F02 — P1: shared orders expose other vendors' line items

**Evidence:** `views.py:1638`–1670 filters orders by whether any item belongs to the seller; `serializer.py:711`–729 includes every order item; `frontend/src/pages/VendorOrderDetail.tsx:108` onward renders all returned items. A synthetic two-vendor order returned the other seller's product to the first vendor (200).

**Impact:** seller tenancy is not enforced at the nested-item/total level. Restrict output to the requesting seller's fulfillment scope and test both detail and list/dashboard paths. Buyer and admin representations may legitimately remain complete.

### F03 — P1: generic order deletion bypasses stock release

**Evidence:** OrderViewSet inherits ModelViewSet.destroy, permits admin deletion (`views.py:1622`), and only cancellation invokes `transition_order`. A temporary pending order was deleted with 204; stock remained 90 before and after deletion rather than returning the reserved unit. Settled orders may instead fail deletion because protected settlement records exist.

**Impact:** inventory becomes understated and audit/order records can disappear. Prefer explicit cancellation/archive semantics; constrain generic deletion and all admin interfaces. Test reservations, repeated cancellation, historical order retention and settled-order behavior. No user database was modified by the probe.

### F04 — P1: payout pagination is not the client contract

**Evidence:** `views.py:1977`–2006 calls `get_paginated_response` with a dict containing `summary` and `results`. The actual `/api/payouts/my_payouts/` outer `results` is an object, not an array. `frontend/src/services/vendorAPI.ts` and dashboard payout handling expect normal list-shaped data.

**Impact:** earnings summaries/rows can disappear or be misread. Normalize pagination once, put summary at a documented level, and test zero/nonzero and multipage payouts from browser through API.

### F05 — P1: commission preview fails with real decimal amounts

**Evidence:** `admin_views.py:806`–833 multiplies Decimal aggregate results by float percentage values. A nonzero pending synthetic payout produced HTTP 500. The preview path is called by AdminCommissionManagement via adminService.

**Impact:** the financial preview breaks when meaningful data exists. Use Decimal consistently and define whether the base is gross sales or net payout; test rounded values and nonzero/empty results.

### F06 — P1: order-transition entry points disagree and permit bypasses

**Evidence:** `commerce.py:95` authoritative TRANSITIONS differs from `admin_views.py:693` local map and `views.py:1764` bulk allowed values. For example the admin handler advertises cancellation from picked/shipped but the service rejects it; processing/shipped are omitted by another bulk route. Admin direct order status can reach delivered without Delivery's cash-collection validation.

**Impact:** UI actions can fail unexpectedly and COD settlement assumptions differ by path. Consolidate transition/authorization rules and cash/fulfillment policy, then test every role and endpoint against one transition matrix. The code difference is confirmed; every conflicting path was not individually exercised.

### F07 — P1: commission mutation lacks consistent validation and atomicity

**Evidence:** `admin_views.py:754` assigns unvalidated request rate directly, saves Vendor, then creates CommissionHistory and VendorAuditLog without an encompassing transaction. `admin_models.py:21` defines effective_date with auto_now_add despite a requested effective date. Decimal range and negative/over-100 rate constraints are missing in the model/service path.

**Impact:** invalid rates can produce negative vendor net values; failures may persist a changed rate without matching audit history; future-date scheduling is misleading. Add a validated command/serializer and database bounds, use a transaction, and explicitly choose immediate or scheduled semantics. Invalid mutations were not sent to any persistent user database.

### F08 — P1: identity validation differs across endpoints

**Evidence:** `vendor_views.py:347`–369 assigns new email/phone without resetting verification or normalizing before uniqueness lookup. User.save normalizes the phone later. Customer UserUpdateSerializer does clear email_verified, but has no database unique email constraint. `views.py:699` password-reset validation checks only length while registration/change paths use Django validators.

**Impact:** vendor email may remain marked verified after changing it, normalized phone collisions can reach IntegrityError, and duplicate emails are possible under races/alternate paths. Centralize contact/password validation, require re-verification and add deliberate DB constraints/migration cleanup. These are confirmed code-path inconsistencies; concurrent uniqueness failures were not load-tested.

### F09 — P1: fresh Windows migrations need UTF-8 output

**Evidence:** migration `0009_create_default_categories.py:87` prints an emoji. The first isolated test-database setup failed with `UnicodeEncodeError` under cp1252 before tests ran. Re-running with `PYTHONIOENCODING=utf-8` applied all migrations and passed the suite.

**Impact:** onboarding and Windows CI can fail despite valid schema logic. The README documents the environment workaround. A future application fix can remove encoding-dependent migration output without rewriting migration data semantics.

### F10 — P1: deployment and asynchronous services are incomplete as an operational unit

**Evidence:** Railway config starts web/migrations/health only; email now queues EmailJob and requires the separate worker. Local backend configuration lacks required production integrations. `backend/vercel.json` retains Python 3.12 while current Docker/lock target 3.13. Production guards check several configuration presences but not SMTP password validity, cache/storage reachability or encryption-key format.

**Impact:** a web-only deployment can accept signups while verification mail is never sent. Verify staging with separate worker, correct runtime, PostgreSQL/Redis, public media and private documents; do not equate source configuration with a working deployment. No live cloud inspection or redeploy was performed.

### F11 — P2: current-user and payout service routes do not match the API

**Evidence:** `frontend/src/services/api.ts:144` calls auth/user (404); customer users/me gives 403 due permission dispatch in `views.py:744`. `frontend/src/services/payout-service.ts` calls bulk-mark-paid and generate actions with no backend route. Some of these methods are unused by active pages.

**Impact:** consumers using these methods fail even though active alternate flows may work. Remove or implement dead contracts, document permissions and add contract tests. Do not mislabel every page broken based on an unused helper.

### F12 — P2: review moderation pagination and audit retention are inconsistent

**Evidence:** `admin_views.py:943` paginates moderation records then appends all unmoderated reviews, producing counts that do not describe the combined list. `delete_review` saves deletion metadata and deletes Review; its one-to-one moderation row cascades away (`admin_models.py:48`). Public review reads do not exclude flagged reviews.

**Impact:** incomplete/misleading pages, potential large responses, and loss of stated moderation audit history. Decide whether flags are internal markers or publication controls, paginate the complete logical dataset, and retain an independent deletion audit.

### F13 — P2: some visible actions and claims are placeholders

**Evidence:** CustomerHome newsletter handler uses only setTimeout/toast; topSellers and testimonials are static. Footer navigation/social links use `href="#"`. MyOrders review action shows an alert (`pages/MyOrders.tsx:315`). A dedicated React user-management page and report exporter were not found. The store newsletter path, in contrast, calls an implemented API.

**Impact:** a reviewer can encounter success feedback without persistence or dead navigation. Connect only necessary workflows, remove/label demonstration claims, and avoid representing social proof as actual usage. No frontend behavior was changed by this audit.

### F14 — P2: database invariants are weaker than API invariants

**Evidence:** no database email uniqueness, positive-price or commission-range check; address defaults use a non-atomic clearing save; category hierarchy depth lives in save rather than comprehensive cycle validation. Review uniqueness exists, but update serializers allow changes not governed by the purchase-creation check. Generic/admin mutation surfaces need broader invariant tests.

**Impact:** alternate entry points and concurrent requests can diverge from intended rules. Add constraints after an explicit existing-data assessment and centralize validation rather than relying on one serializer. Do not migrate production until violations are assessed and backed up.

### F15 — P1: SMS console transport can report success in production

**Evidence:** `vendor_views.py:276`–294 selects a console SMS provider by default and logs the code/phone without a DEBUG guard. SendPhoneVerificationView returns success when that stub returns True; only the response's development_code field is DEBUG-gated. No real provider is implemented. The production settings do not define SMS_PROVIDER, so the default console path remains reachable.

**Impact:** users can be told a code was sent without an SMS, and production logs may contain verification codes/contact data. Disable this operation until a provider is configured, remove sensitive logging outside isolated development, and verify that production fails safely with no transport. No real SMS was sent during this audit.

## Potential security risks requiring more verification

These are not runtime-confirmed exploits:

- JWT access/refresh tokens are in localStorage. A separate XSS defect could read them; no exploitable XSS or SQL injection was demonstrated. React escapes ordinary text and the backend primarily uses parameterized ORM queries, but a full penetration test was not performed.
- Product/document uploads have size/signature/image checks, while vendor avatar/logo/banner/favicon paths primarily enforce size. Verify content validation, SVG/HTML rejection, media Content-Type, pixel bombs and object-store policy consistently.
- MFA backup consumption and challenge cache operations use read/modify/write without explicit atomic single-use enforcement across simultaneous requests. Refresh rotation concurrency also needs a race test beyond the browser's single-flight refresh.
- General/authentication throttling is configured, but distributed behavior depends on shared Redis and trusted proxy configuration. Account existence messages differ for passwordless/unverified accounts; assess enumeration policies.
- SMS provider transport is absent and its default console behavior is described in F15. Never portray this as a working production SMS integration.
- Public catalog filtering does not consistently require vendor.user.is_active, whereas storefront filtering does. Test disabled-seller catalog/checkout visibility.
- Private link expiry reduces link lifetime but is not equivalent to per-request owner authorization. Existing document files on a previously public host require deployment-level review; source changes cannot prove old URLs are inaccessible.
- No dependency vulnerability audit was executed. The presence of version pins and a successful build does not establish that every dependency is safe.

## Performance, reliability and maintainability

1. **Query growth (confirmed source pattern, unmeasured at scale):** ProductListSerializer's primary-image filter/order calls can bypass the prefetched cache; average_rating/review_count trigger queries per product. Category product counts recurse with queries, and storefront name resolution scans vendors in Python. Measure query counts for 1/20/100-item pages before selecting annotations/prefetches/indexes.
2. **Payload/pagination:** review moderation appends unbounded unmoderated rows; several custom actions bypass or reshape standard pagination. Vendor/storefront services sometimes fetch multiple pages eagerly. Fix correctness before optimizing.
3. **Frontend cost:** production main JS is 651.73 kB minified (188.04 kB gzip), with a >500 kB warning. `views.py` has 2,608 lines, VendorDashboard 2,603, and i18n 2,053. Lazy routes help, but chart/UI/translation splitting and focused components remain worthwhile.
4. **Polling/state:** cart JSON is polled every 500 ms in addition to events. Vendor dashboard refresh/cache logic is embedded with UI and business handling. Prefer one explicit state ownership mechanism and event-based updates before adding state libraries.
5. **Code organization:** duplicate/legacy product/profile components and overlapping API services obscure the active route. Large view/serializer files mix identity, catalog, orders and operations. Domain services already provide a useful extraction direction; preserve behavior with contract tests before restructuring.
6. **Errors/observability:** response formats vary, broad exceptions sometimes hide context while other endpoints serialize raw exception text, and console logs can include full order payloads. Use stable public errors and structured internal logs without sensitive data.
7. **Email worker:** network I/O is performed while holding a transaction row lock. At-least-once delivery needs idempotency/duplicate-tolerance, retry visibility and alerting for exhausted jobs; throughput and failure behavior are unmeasured.
8. **Accessibility:** MarketplaceBar has a skip target and language control; initial mobile login RTL/overflow test passes. Many icon-only footer/social controls lack labels and placeholder links are not meaningful navigation. No comprehensive keyboard, contrast, screen-reader or all-dashboard mobile audit was run.
9. **Analytics semantics:** some summaries use entire order totals while vendor sales exclude delivery; totals/rates and time windows need explicit definitions. Screenshot numbers reflect synthetic fixtures, not validated business KPIs or platform traction.

## Testing results and gaps

| Check | Actual result |
|---|---|
| Existing dependency environment | Python 3.13.0, Django 5.2.18, DRF 3.17.2; Node 23.3.0; no install/upgrade |
| Django check | No issues |
| Model/migration consistency | No changes detected |
| Initial Windows test setup | Failed cp1252 emoji output; UTF-8 rerun successful |
| SQLite backend suite | 28 discovered; 27 passed, one PostgreSQL concurrency test skipped |
| Frontend typecheck | Passed |
| Initial Vite build sandbox attempt | Sandbox denied parent-directory resolution; rerun with reviewed filesystem access passed |
| Production build | Passed; main chunk warning recorded |
| Existing Chromium suite | Five passed, including live isolated checkout |
| Initial screenshot traversal | 31 genuine captures, no page exceptions/API failures recorded |
| Additional targeted probes | Confirmed F01–F05/F11 behaviors; stored without tokens or signed tickets |

Missing evidence: PostgreSQL row-lock/concurrent checkout test; mail/Google/Redis/S3 integration; browser registration-to-email-to-login; multipart image/document CRUD; rider delivery-to-payout end-to-end; full negative permissions matrix; canceled/delivered deletion policies; refund/accounting reconciliation; load/query budgets; complete responsive/accessibility coverage. No coverage percentage is available. See [VERIFICATION.md](VERIFICATION.md) for repeat commands and boundaries.

## CSC portfolio assessment

| Competency | Already demonstrated | Evidence still needed |
|---|---|---|
| Full-stack and REST | Real SPA → API → SQL checkout; role dashboards | Contract cleanup and complete critical journeys |
| Relational design | 27 domain models, joins, snapshots, indexes, migrations | Stronger DB invariants and PostgreSQL evidence |
| Authentication/security | JWT sessions, TOTP, throttles, signed storage abstraction | Close document/tenant leaks; contact/upload consistency |
| Commerce correctness | Server pricing, idempotency, reservation/cancellation tests | Deletion policy, cash/settlement alignment, concurrency |
| Reliability/testing | Existing regressions, TypeScript, browser suite, CI definition | Hosted CI proof, staging and operational recovery |
| Architecture/maintainability | Domain service extraction, frontend transport, localization | Smaller modules and one consistent set of contracts |
| Communication | Dated audit, genuine screenshots, reproducible commands, ER/flow diagrams | Personal contribution statement and a concise demonstration video after fixes |

Use this as a technical case study for a group project. The existing resume document explicitly says group project; personal achievements must be tied to actual contributions. Avoid claims of sole authorship, nationwide delivery, live payments, real-time infrastructure, production security, user adoption or test coverage without evidence. The project is suitable to discuss as a strong engineering foundation and an ongoing hardening exercise; it should be presented as production-ready only after the critical findings are resolved and verified.

## Prioritized roadmap

Complexity: S = a focused change, M = several coordinated files/tests, L = cross-cutting workflow or integration. These are relative estimates, not delivery promises. Each item needs separate implementation approval; this audit did not apply application fixes.

| Priority / recommendation | Engineering value | Complexity | Dependencies | Verification / acceptance |
|---|---|---|---|---|
| P0 — F01 private vendor/document access | Protect seller identity and business data | M | Public/owner/admin serializer policy; storage link strategy | Customer/anonymous cannot obtain links; owner/admin can; local and private S3 negatives pass |
| P1 — F02 seller-scoped shared orders | Correct tenant separation | M | Explicit vendor line-item/total contract | Two sellers see only their own items; buyer/admin see full order; all list/detail/dashboard paths tested |
| P1 — F03/F06 order lifecycle/inventory policy | Preserve stock and fulfillment/cash integrity | M–L | Unified transitions, archive/delete policy | Every endpoint/admin path respects one state matrix; stock restored exactly once; invalid delivery cash rejected |
| P1 — F04/F05/F07 payout/commission correctness | Reliable money calculations and UI | M | Decimal calculation rules and response schema | Nonzero preview, bounds, period grouping, roundings, pagination, paid reference/audit tests |
| P1 — PostgreSQL and staging verification | Prove concurrency and deployability | M | Disposable PostgreSQL/Redis/private storage/mail setup | Concurrent last-unit test, fresh migration, worker delivery and storage access tests; no production writes |
| P1 — F08/F15 identity/password/SMS validation | Consistent account ownership and recovery | M | Shared normalization/verification policy; data uniqueness assessment; genuine SMS transport or disabled action | Email change loses verification; normalized duplicates return 400; reset matches password policy; no production console OTP success |
| P1 — F09 portable setup | Reliable reviewer onboarding | S | Migration output adjustment approved separately | Fresh Windows non-UTF8 and Linux setup; existing databases unaffected |
| P1 — F10 worker/runtime operations | Prevent stranded authentication mail | M | Chosen deployment path and environment provisioning | Worker restart/retry test; real staging email receipt; required service health/runbook |
| P2 — F11 API contract cleanup | Reduce broken clients and dead helpers | M | Endpoint inventory; active caller mapping | Every exported service method maps to a route, method, role and response test |
| P2 — F12/F14 moderation/DB invariants | Consistent pages and retained audit evidence | M | Audit retention and constraint design | Complete pagination counts, deletion audit retained, constraint race tests |
| P2 — replace placeholder actions/content | Credible demo and usable navigation | S–M | Decide which UI promises are supported | Homepage subscribe persists or is removed; footer and review buttons reach real flows |
| P2 — centralize cart/wishlist persistence | Cross-device continuity | M | Stable account/cart API and merge rules | Guest/login merge, concurrent edits, price refresh, account switching isolation |
| P2 — complete support/return workflow | Operationally useful commerce | M–L | Order/cash/refund policy from lifecycle fixes | Request→admin resolution→inventory/accounting effects with audit history |
| P2 — performance/accessibility work | Faster, more inclusive interface | M | Measure current query/bundle/UI budgets | Bound query count, lower initial JS, keyboard/screen-reader/mobile role flows |
| P3 — external payments/courier adapter | Add value only where locally justified | L | Verified provider, supported market, reconciliation and webhooks | Sandbox provider journey, webhook idempotency, failure/refund reconciliation |
| P3 — reporting/cache refinements | Scale proven workloads | M | Stable definitions and measured bottlenecks | Reconciled export totals, cache invalidation tests, measured improvements |

The first five rows form the recommended next implementation sequence. Repair correctness and prove the core lifecycle before adding optional integrations or more dashboard modules.

## Documentation and publication deliverables

New README, this audit, architecture/workflows, full database reference, API reference, verification record, screenshot gallery/manifest, Git verification, and a safe backend environment example. [DELIVERABLES.md](DELIVERABLES.md) lists every new documentation/evidence/image path. Existing project reports, roadmap and frontend attribution are preserved. The only pre-existing text file intentionally edited for publication hygiene is `.gitignore`, adding local PostgreSQL infrastructure and logs. Application source and existing database file contents are preserved.

The user subsequently authorized a commit/push to `NomanWahdat/BazarAF-E-commerce-Marketplace`. The publication process retains the original Git history locally while using a source-only first snapshot for the new repository, preventing old committed databases from entering its history. See [Git verification](GIT_VERIFICATION.md) and the final chat report for actual publication confirmation; a planned push alone is not evidence that it succeeded.

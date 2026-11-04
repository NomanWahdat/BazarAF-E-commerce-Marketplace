# Database design

Inspected on 2026-11-05 from Django model metadata, including `home/admin_models.py`. These diagrams describe the current local source, not an inspected production database. All 27 concrete home models are represented. Built-in Django admin, auth/group/permission, sessions and SimpleJWT blacklist tables are omitted. User also has many-to-many relationships with Django Group and Permission.

SQLite is the local fallback; configured production databases must use PostgreSQL. No Neon connection was found in the local backend configuration, and no remote database was contacted.

Mermaid uses actual Django class names. A child may be absent on the many side; a nullable foreign key permits no parent. Only selected scalar fields are shown; every concrete field is listed in [model-schema.json](evidence/model-schema.json).

## Identity, seller onboarding and catalog

```mermaid
erDiagram
    User {
        uuid id PK
        string phone UK
        string email
        string role
        datetime created_at
    }
    Vendor {
        uuid id PK
        uuid user_id FK
        string city
        string province
        string status
        decimal commission_rate
        datetime created_at
    }
    SellerApplication {
        uuid id PK
        uuid user_id FK
        string phone
        string email
        string city
        string status
        uuid vendor_id FK
        datetime created_at
    }
    Category {
        uuid id PK
        string name
        string slug UK
        uuid parent_id FK
        decimal commission_rate
        datetime created_at
    }
    Product {
        uuid id PK
        string name
        string slug UK
        uuid vendor_id FK
        uuid category_id FK
        decimal price
        int stock_quantity
        string status
        datetime created_at
    }
    ProductImage {
        uuid id PK
        uuid product_id FK
        datetime created_at
    }
    CategoryAttribute {
        uuid id PK
        uuid category_id FK
        string name
        datetime created_at
    }
    AttributeValue {
        uuid id PK
        uuid attribute_id FK
        datetime created_at
    }
    ProductAttribute {
        uuid id PK
        uuid product_id FK
        uuid attribute_id FK
        datetime created_at
    }
    User ||--o| Vendor : user
    User o|--o{ SellerApplication : user
    Vendor o|--o{ SellerApplication : vendor
    Category o|--o{ Category : parent
    Vendor ||--o{ Product : vendor
    Category ||--o{ Product : category
    Product ||--o{ ProductImage : product
    Category ||--o{ CategoryAttribute : category
    CategoryAttribute ||--o{ AttributeValue : attribute
    Product ||--o{ ProductAttribute : product
    CategoryAttribute ||--o{ ProductAttribute : attribute
```

## Purchasing, fulfillment and settlement

```mermaid
erDiagram
    User {
        uuid id PK
        string phone UK
        string email
        string role
        datetime created_at
    }
    Vendor {
        uuid id PK
        uuid user_id FK
        string city
        string province
        string status
        decimal commission_rate
        datetime created_at
    }
    Product {
        uuid id PK
        string name
        string slug UK
        uuid vendor_id FK
        uuid category_id FK
        decimal price
        int stock_quantity
        string status
        datetime created_at
    }
    Order {
        uuid id PK
        string order_id UK
        uuid customer_id FK
        decimal total_amount
        string currency
        string checkout_key UK
        string status
        string city
        string province
        datetime created_at
    }
    OrderItem {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        uuid vendor_id FK
        boolean confirmed
        decimal commission_rate
        int quantity
        decimal price_at_order
        datetime created_at
    }
    Delivery {
        uuid id PK
        uuid order_id FK
        uuid rider_id FK
        string status
        datetime created_at
    }
    Payout {
        uuid id PK
        uuid vendor_id FK
        decimal amount
        string status
        uuid paid_by_id FK
        datetime created_at
    }
    SettlementLine {
        bigint id PK
        uuid item_id FK
        uuid vendor_id FK
        decimal gross
        decimal commission
        decimal net
        uuid payout_id FK
        datetime created_at
    }
    Review {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        uuid order_id FK
        int rating
        datetime created_at
    }
    Address {
        uuid id PK
        uuid user_id FK
        string city
        string province
        datetime created_at
    }
    Cart {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        int quantity
        datetime created_at
    }
    User ||--o| Vendor : user
    Vendor ||--o{ Product : vendor
    User o|--o{ Order : customer
    Order ||--o{ OrderItem : order
    Product o|--o{ OrderItem : product
    Vendor o|--o{ OrderItem : vendor
    Order ||--o| Delivery : order
    User o|--o{ Delivery : rider
    Vendor ||--o{ Payout : vendor
    User o|--o{ Payout : paid_by
    OrderItem ||--o| SettlementLine : item
    Vendor ||--o{ SettlementLine : vendor
    Payout o|--o{ SettlementLine : payout
    User ||--o{ Review : user
    Product ||--o{ Review : product
    Order ||--o{ Review : order
    User ||--o{ Address : user
    User ||--o{ Cart : user
    Product ||--o{ Cart : product
```

## Support, security and administration

```mermaid
erDiagram
    User {
        uuid id PK
        string phone UK
        string email
        string role
        datetime created_at
    }
    Vendor {
        uuid id PK
        uuid user_id FK
        string city
        string province
        string status
        decimal commission_rate
        datetime created_at
    }
    Order {
        uuid id PK
        string order_id UK
        uuid customer_id FK
        decimal total_amount
        string currency
        string checkout_key UK
        string status
        string city
        string province
        datetime created_at
    }
    Review {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        uuid order_id FK
        int rating
        datetime created_at
    }
    Notification {
        uuid id PK
        uuid user_id FK
        datetime created_at
    }
    SupportRequest {
        uuid id PK
        uuid user_id FK
        uuid order_id FK
        string kind
        string subject
        string status
        datetime created_at
    }
    NewsletterSubscription {
        uuid id PK
        uuid vendor_id FK
        string email
        datetime created_at
    }
    AuthSession {
        uuid id PK
        uuid user_id FK
        datetime created_at
        datetime revoked_at
    }
    EmailJob {
        bigint id PK
        string subject
        int attempts
        datetime sent_at
        datetime created_at
    }
    DeliveryZone {
        bigint id PK
        string province
        string city
        decimal fee
    }
    CommissionHistory {
        uuid id PK
        uuid vendor_id FK
        decimal old_rate
        decimal new_rate
        date effective_date
        uuid changed_by_id FK
        datetime created_at
    }
    ReviewModeration {
        uuid id PK
        uuid review_id FK
        boolean is_flagged
        uuid flagged_by_id FK
        datetime created_at
    }
    VendorAuditLog {
        uuid id PK
        uuid vendor_id FK
        uuid admin_user_id FK
        datetime created_at
    }
    AdminDashboardStats {
        uuid id PK
    }
    User ||--o| Vendor : user
    User o|--o{ Order : customer
    User ||--o{ Review : user
    Order ||--o{ Review : order
    User ||--o{ Notification : user
    User ||--o{ SupportRequest : user
    Order o|--o{ SupportRequest : order
    Vendor ||--o{ NewsletterSubscription : vendor
    User ||--o{ AuthSession : user
    Vendor ||--o{ CommissionHistory : vendor
    User o|--o{ CommissionHistory : changed_by
    Review ||--o| ReviewModeration : review
    User o|--o{ ReviewModeration : flagged_by
    Vendor ||--o{ VendorAuditLog : vendor
    User o|--o{ VendorAuditLog : admin_user
```

## Integrity and indexing

| Model / relationship | Implemented constraint | Limitation |
|---|---|---|
| User | Unique normalized phone; UUID key | Email has no database uniqueness constraint; API paths differ in validation |
| Vendor / Delivery / SettlementLine | One-to-one user / order / order item respectively | Settlement and order deletion require explicit business rules |
| Category | Unique slug; `(name, level)` unique; parent, slug, level and active indexes | Maximum depth is enforced in `save`, not a database hierarchy constraint |
| CategoryAttribute / AttributeValue / ProductAttribute | Unique `(category, name)` / `(attribute, value)` / `(product, attribute)` | Attribute type and required-value enforcement need fuller validation |
| Product | Category deletion protected; vendor/category/slug/status/featured indexes | Positive price and commission ranges lack database check constraints |
| Order | Unique order reference and nullable unique checkout key | No database check for total = subtotal + fee |
| OrderItem | Vendor protected; product nullable with snapshot name and price | PositiveIntegerField permits zero at the database level; API enforces at least one |
| DeliveryZone | Unique `(province, city)`; fee >= 0 check | Case-sensitive uniqueness differs from case-insensitive lookup |
| Review / Cart / NewsletterSubscription | Unique `(user, product, order)` / `(user, product)` / `(vendor, email)` | No cross-device wishlist model is active |
| Address | Default address cleared in `save` | No conditional unique constraint for one default address under concurrent writes |
| CommissionHistory | Vendor/date index | `effective_date` uses `auto_now_add`; scheduled changes are not implemented |

`EmailJob`, `DeliveryZone` and `SettlementLine` use Django-generated integer primary keys; the project does not use UUIDs for every model.

## Migrations

The home migration chain contains `0001` through `0022`. A fresh isolated SQLite migration run succeeded, and `makemigrations --check --dry-run --settings=Bazar.test_settings` reported no changes. Existing migration 0019 has local edits and 0020?0022 were untracked at intake; publishing this audited snapshot includes them. Existing installed databases were not inspected or migrated. PostgreSQL migration and concurrent checkout remain to be executed against a disposable PostgreSQL instance.

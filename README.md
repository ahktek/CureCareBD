# CureCare - Premium Organic & Health E-Commerce Platform
> A production-grade copy and architectural adaptation of [GhorerBazar](https://ghorerbazar.com/) for **CureCare**, featuring high-conversion e-commerce UX and a fully functional, robust Admin CMS.

---

## 🔬 Tech Stack Analysis: GhorerBazar vs CureCare

| Component | GhorerBazar (Live Production) | CureCare (Our Architecture) |
|---|---|---|
| **Backend Core** | PHP / Laravel (Session & CSRF tokens: `XSRF-TOKEN`, `ghorerbazar_session`) | Node.js (v24) + Express.js + RESTful APIs |
| **Database** | MySQL / MariaDB relational database | SQLite with `better-sqlite3` (WAL mode enabled, zero-dependency, ultra-fast) |
| **Frontend Architecture** | Modular Blade templates, jQuery, Swiper.js, Toastr.js, UIcons / FontAwesome | Vanilla HTML5, Modern CSS Design System, Responsive Vanilla JS |
| **Checkout Flow** | **1-Click / One-Page Instant Checkout** (signature feature reducing cart abandonment) | **1-Click Instant Order Modal & Sliding Offcanvas Cart** with real-time delivery zone and coupon calculation |
| **Order Tracking** | Live status tracking via Order ID / Phone number | **Live 5-step visual tracking pipeline** (`/track.html`) |
| **Invoice System** | Cash memo / Printable order receipt | **Full-featured Printable Cash Memo & Invoice** (`/invoice.html`) |
| **Admin CMS** | Laravel custom admin panel / WooCommerce backend | **Single Page Application (SPA) Admin CMS Portal** (`/admin`) with JWT auth |

---

## 🌟 Key Features Implemented

### 1. Storefront & High-Converting UX
- **Top Announcement Bar**: Displays real-time store offers and hotline.
- **Dynamic Live Search**: Debounced instant search dropdown matching GhorerBazar's search popup with image thumbnail, price, and instant order button.
- **Interactive Hero Slider**: Autoplay carousel with custom banners, CTA buttons, and slide indicators.
- **Trust Badges**: 100% Pure & Organic, Cash on Delivery, 7-Day Replacement Guarantee, 24/7 Helpline.
- **Category Navigation**: Filter products dynamically across Honey, Ghee & Oils, Dates, Nuts & Seeds, Herbal Care, Spices & Himalayan Salt, and Healthy Teas.
- **Dynamic Product Variations**: Seamless switching between weights (e.g., 250g, 500g, 1kg, 2L, 5L) with instant price and offer calculation.
- **1-Click Instant Order Modal (Signature GhorerBazar Checkout)**:
  - No mandatory registration required.
  - Live quantity adjustment (+/-).
  - Customer name, 11-digit BD phone number, delivery address.
  - Delivery Zone selector: **ঢাকা সিটির ভিতরে (৳70)** vs **ঢাকা সিটির বাইরে (৳130)**.
  - Discount Coupon validation (`HEALTHY10`, `CURECARE50`).
  - Cash on Delivery (COD) and bKash / Nagad options.
- **Sliding Offcanvas Cart Drawer**: Access cart from any page, change quantities, view real-time subtotal, and proceed to checkout.
- **Order Confirmation & Invoice**: Generates order code (e.g. `CC-10024`) with direct link to live tracking and printable invoice.
- **Mobile Sticky Bottom Navigation**: Fixed bottom bar on mobile screens (Home, Categories, Track, Cart badge, Admin).

### 2. Robust Admin CMS Portal (`/admin`)
- **JWT Authentication**: Default credentials `admin` / `curecare123`.
- **Live Analytics Dashboard**:
  - Total Revenue Counter
  - Total Orders, Pending Orders, Delivered Orders
  - Active Products Count & Low-Stock Alerts
  - Recent Orders table with instant status view
- **Orders Management**:
  - Filter orders by status (`all`, `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`).
  - Search orders by Order Number, Customer Name, or Phone.
  - One-click Order Status Updater (instantly updates customer live tracking).
  - Courier Tracking Code manager (Steadfast, Pathao, RedX, Sundarban).
  - Direct link to printable PDF-friendly Invoice (`/invoice.html?order=...`).
  - Delete / archive orders.
- **Products Management**:
  - Add new products with bilingual names (English & Bengali), category, regular & offer price, stock count, SKU, image URL / upload, weight variations builder, and rich health benefits description.
  - Product listing with stock status indicator.
  - Delete products.
- **Categories Management**:
  - Add, list, and delete categories with icons, slugs, and display order.
- **Discount Coupons Management**:
  - Create flat (৳) or percentage (%) discount coupons with minimum spend limits and track usage counts.
- **Slider Banners Management**:
  - Add and delete promotional hero banners.
- **Store Settings CMS**:
  - Configure store name, hotline phone, WhatsApp number, email, office address, delivery charges (Inside Dhaka / Outside Dhaka), bKash/Nagad accounts, and top announcement bar text.

---

## 🚀 How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Database
```bash
npm run seed
```

### 3. Start Server
```bash
npm start
```
The server will start at **http://localhost:3000**

---

## 🔑 Default Credentials

- **Admin CMS URL**: `http://localhost:3000/admin`
- **Username**: `admin`
- **Password**: `curecare123`

---

## 📂 Project Directory Structure

```
CureCare/
├── database/
│   ├── db.js               # SQLite connection & schema migrations
│   ├── seed.js             # Seeding initial categories, products, banners, settings, admin
│   └── curecare.db         # Persistent SQLite database
├── public/
│   ├── index.html          # CureCare Storefront (GhorerBazar clone)
│   ├── track.html          # 5-step live order tracking page
│   ├── invoice.html        # Customer printable invoice & cash memo
│   ├── css/
│   │   └── style.css       # Core storefront styling
│   ├── js/
│   │   └── app.js          # Cart, live search, variations, 1-click checkout modal
│   ├── admin/
│   │   ├── index.html      # Robust Admin CMS Dashboard (SPA)
│   │   ├── admin.css       # Admin dashboard styles
│   │   └── admin.js        # Admin CMS logic & REST API bindings
│   └── images/
│       └── uploads/        # Uploaded product images
├── server.js               # Express.js REST API backend & static file server
└── package.json            # Scripts & project metadata
```

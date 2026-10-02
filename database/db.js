const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'curecare.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency & performance
db.pragma('journal_mode = WAL');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_bn TEXT,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT,
      image TEXT,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_bn TEXT,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      short_desc TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      base_price REAL NOT NULL,
      discount_price REAL,
      stock INTEGER DEFAULT 100,
      sku TEXT,
      image TEXT,
      additional_images TEXT,
      variations_json TEXT, -- JSON array of { weight: "500g", price: 650, discount_price: 580, stock: 50 }
      is_featured INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      rating REAL DEFAULT 4.9,
      reviews_count INTEGER DEFAULT 12,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_address TEXT NOT NULL,
      delivery_zone TEXT NOT NULL, -- 'inside_dhaka' | 'outside_dhaka'
      delivery_fee REAL DEFAULT 70,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      coupon_code TEXT,
      total REAL NOT NULL,
      payment_method TEXT DEFAULT 'cod', -- 'cod' | 'bkash' | 'nagad'
      payment_status TEXT DEFAULT 'pending', -- 'pending' | 'paid'
      order_status TEXT DEFAULT 'pending', -- 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
      courier_tracking TEXT,
      notes TEXT,
      items_json TEXT NOT NULL, -- JSON array of items { id, name, weight, price, quantity, image }
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT DEFAULT 'percentage', -- 'percentage' | 'fixed'
      discount_value REAL NOT NULL,
      min_spend REAL DEFAULT 0,
      max_uses INTEGER DEFAULT 1000,
      uses_count INTEGER DEFAULT 0,
      expires_at TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      title_bn TEXT,
      subtitle TEXT,
      subtitle_bn TEXT,
      image TEXT NOT NULL,
      badge_text TEXT,
      button_text TEXT DEFAULT 'অর্ডার করুন',
      link TEXT DEFAULT '#',
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      rating INTEGER DEFAULT 5,
      comment TEXT NOT NULL,
      is_approved INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

initDatabase();

module.exports = db;

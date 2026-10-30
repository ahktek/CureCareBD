const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database/db');
const seed = require('./database/seed');

// Auto-seed database if admin does not exist
try {
  const adminCheck = db.prepare('SELECT id FROM admins LIMIT 1').get();
  if (!adminCheck) {
    console.log('🌱 Empty database detected. Running initial seed...');
    seed();
  }
} catch (e) {
  console.log('Database init check:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'curecare_super_secret_jwt_key_2026';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'images', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'curecare-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper: Normalize product with parsed variations & multi-image gallery
function formatProductRecord(p) {
  if (!p) return null;
  let variations = [];
  try {
    variations = p.variations_json ? JSON.parse(p.variations_json) : [];
  } catch (e) {
    variations = [];
  }

  let addImages = [];
  if (p.additional_images) {
    try {
      addImages = typeof p.additional_images === 'string' ? JSON.parse(p.additional_images) : p.additional_images;
      if (!Array.isArray(addImages)) addImages = [];
    } catch (e) {
      addImages = [];
    }
  }

  // Construct unified gallery array with primary image first, avoiding duplicates
  const gallery = [];
  if (p.image) gallery.push(p.image);
  addImages.forEach(img => {
    if (img && !gallery.includes(img)) gallery.push(img);
  });

  return {
    ...p,
    variations,
    additional_images: addImages,
    gallery: gallery.length > 0 ? gallery : (p.image ? [p.image] : [])
  };
}

// Middleware: Authenticate Admin JWT
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired session token' });
  }
}

// -------------------------------------------------------------
// PUBLIC STOREFRONT APIs
// -------------------------------------------------------------

// 1. Store Settings
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Active Banners
app.get('/api/banners', (req, res) => {
  try {
    const banners = db.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY display_order ASC').all();
    res.json(banners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Categories with product counts
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
      GROUP BY c.id
      ORDER BY c.display_order ASC
    `).all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Products query (category, featured, search)
app.get('/api/products', (req, res) => {
  try {
    const { category, featured, search, limit = 50, sort } = req.query;
    let query = `
      SELECT p.*, c.name as category_name, c.name_bn as category_name_bn, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (category) {
      query += ` AND (c.slug = ? OR c.id = ?)`;
      params.push(category, category);
    }
    if (featured === '1' || featured === 'true') {
      query += ` AND p.is_featured = 1`;
    }
    if (search) {
      query += ` AND (p.name LIKE ? OR p.name_bn LIKE ? OR p.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (sort === 'price_asc') {
      query += ` ORDER BY COALESCE(p.discount_price, p.base_price) ASC`;
    } else if (sort === 'price_desc') {
      query += ` ORDER BY COALESCE(p.discount_price, p.base_price) DESC`;
    } else {
      query += ` ORDER BY p.is_featured DESC, p.id DESC`;
    }

    query += ` LIMIT ?`;
    params.push(parseInt(limit));

    const rows = db.prepare(query).all(...params);
    const products = rows.map(formatProductRecord);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Instant Live Search (Like GhorerBazar live search box)
app.get('/api/products/search', (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    if (!q || q.length < 1) return res.json([]);

    const rows = db.prepare(`
      SELECT p.id, p.name, p.name_bn, p.slug, p.base_price, p.discount_price, p.image, p.additional_images, p.variations_json
      FROM products p
      WHERE p.is_active = 1 AND (p.name LIKE ? OR p.name_bn LIKE ? OR p.sku LIKE ?)
      LIMIT 8
    `).all(`%${q}%`, `%${q}%`, `%${q}%`);

    const results = rows.map(formatProductRecord);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Single Product by Slug or ID
app.get('/api/products/:identifier', (req, res) => {
  try {
    const { identifier } = req.params;
    const isId = /^\d+$/.test(identifier);
    const rawProduct = db.prepare(`
      SELECT p.*, c.name as category_name, c.name_bn as category_name_bn, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${isId ? 'p.id = ?' : 'p.slug = ?'}
    `).get(identifier);

    if (!rawProduct) return res.status(404).json({ error: 'Product not found' });

    const product = formatProductRecord(rawProduct);

    const reviews = db.prepare(`
      SELECT * FROM reviews WHERE product_id = ? AND is_approved = 1 ORDER BY id DESC
    `).all(product.id);
    product.reviews = reviews;

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Validate Coupon
app.post('/api/coupons/validate', (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ error: 'Coupon code is required' });

    const coupon = db.prepare('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1').get(code);
    if (!coupon) return res.status(404).json({ valid: false, message: 'কুপনটি সঠিক নয় অথবা মেয়াদ শেষ।' });

    if (coupon.min_spend && subtotal < coupon.min_spend) {
      return res.status(400).json({
        valid: false,
        message: `এই কুপনটি ব্যবহার করতে সর্বনিম্ন ৳${coupon.min_spend} টাকার অর্ডার প্রয়োজন।`
      });
    }

    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = Math.round((subtotal * coupon.discount_value) / 100);
    } else {
      discount = Math.min(coupon.discount_value, subtotal);
    }

    res.json({
      valid: true,
      code: coupon.code,
      discount,
      message: `অভিনন্দন! আপনি ৳${discount} ছাড় পেয়েছেন।`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Place Order (One-Page / Instant Checkout)
app.post('/api/orders', (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_address,
      delivery_zone = 'inside_dhaka',
      items = [],
      coupon_code,
      payment_method = 'cod',
      notes = ''
    } = req.body;

    if (!customer_name || !customer_phone || !customer_address) {
      return res.status(400).json({ error: 'নাম, মোবাইল নাম্বার এবং ডেলিভারি ঠিকানা পূরণ করুন।' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'আপনার অর্ডার কার্ট খালি!' });
    }

    // Calculate subtotal
    let subtotal = 0;
    items.forEach(item => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.quantity) || 1;
      subtotal += price * qty;
    });

    // Get delivery fee
    const feeInside = parseFloat(db.prepare("SELECT value FROM settings WHERE key = 'delivery_inside_dhaka'").get()?.value || 70);
    const feeOutside = parseFloat(db.prepare("SELECT value FROM settings WHERE key = 'delivery_outside_dhaka'").get()?.value || 130);
    const delivery_fee = delivery_zone === 'outside_dhaka' ? feeOutside : feeInside;

    // Calculate coupon discount
    let discount = 0;
    if (coupon_code) {
      const coupon = db.prepare('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1').get(coupon_code);
      if (coupon && (!coupon.min_spend || subtotal >= coupon.min_spend)) {
        if (coupon.discount_type === 'percentage') {
          discount = Math.round((subtotal * coupon.discount_value) / 100);
        } else {
          discount = Math.min(coupon.discount_value, subtotal);
        }
        db.prepare('UPDATE coupons SET uses_count = uses_count + 1 WHERE id = ?').run(coupon.id);
      }
    }

    const total = Math.max(0, subtotal - discount + delivery_fee);

    // Generate Order Number: CC-100XX
    const lastOrder = db.prepare('SELECT id FROM orders ORDER BY id DESC LIMIT 1').get();
    const nextNum = lastOrder ? 10020 + lastOrder.id + 1 : 10024;
    const order_number = `CC-${nextNum}`;

    const insert = db.prepare(`
      INSERT INTO orders (
        order_number, customer_name, customer_phone, customer_address,
        delivery_zone, delivery_fee, subtotal, discount, coupon_code,
        total, payment_method, payment_status, order_status, notes, items_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?)
    `).run(
      order_number,
      customer_name.trim(),
      customer_phone.trim(),
      customer_address.trim(),
      delivery_zone,
      delivery_fee,
      subtotal,
      discount,
      coupon_code || null,
      total,
      payment_method,
      notes,
      JSON.stringify(items)
    );

    // Deduct stock if product ID exists
    items.forEach(item => {
      if (item.id) {
        db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(item.quantity || 1, item.id);
      }
    });

    res.status(201).json({
      success: true,
      order_id: insert.lastInsertRowid,
      order_number,
      total,
      delivery_fee,
      message: 'আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে!'
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'অর্ডার সম্পন্ন করতে সমস্যা হয়েছে: ' + err.message });
  }
});

// 9. Live Order Tracking
app.get('/api/orders/track/:query', (req, res) => {
  try {
    const q = req.params.query.trim();
    const order = db.prepare(`
      SELECT id, order_number, customer_name, customer_phone, customer_address,
             delivery_zone, delivery_fee, subtotal, discount, total,
             payment_method, payment_status, order_status, courier_tracking,
             created_at, items_json
      FROM orders
      WHERE order_number = ? OR customer_phone = ?
      ORDER BY id DESC LIMIT 1
    `).get(q, q);

    if (!order) {
      return res.status(404).json({ error: 'এই অর্ডার নাম্বার বা ফোন নাম্বারে কোনো অর্ডার পাওয়া যায়নি।' });
    }

    order.items = JSON.parse(order.items_json);
    delete order.items_json;

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Submit Customer Review
app.post('/api/reviews', (req, res) => {
  try {
    const { product_id, customer_name, customer_phone, rating, comment } = req.body;
    if (!product_id || !customer_name || !comment) {
      return res.status(400).json({ error: 'সবগুলো তথ্য প্রদান করুন।' });
    }
    db.prepare(`
      INSERT INTO reviews (product_id, customer_name, customer_phone, rating, comment, is_approved)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(product_id, customer_name, customer_phone || null, rating || 5, comment);

    // Update product rating and reviews count
    const stats = db.prepare(`
      SELECT AVG(rating) as avg_rating, COUNT(id) as count
      FROM reviews WHERE product_id = ? AND is_approved = 1
    `).get(product_id);

    if (stats) {
      db.prepare('UPDATE products SET rating = ?, reviews_count = ? WHERE id = ?')
        .run(parseFloat(stats.avg_rating.toFixed(1)), stats.count, product_id);
    }

    res.json({ success: true, message: 'রিভিউ যোগ করার জন্য ধন্যবাদ!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ADMIN CMS APIs
// -------------------------------------------------------------

// Admin Login
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(401).json({ error: 'ভুল ইউজারনেম অথবা পাসওয়ার্ড!' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role, name: admin.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      admin: { id: admin.id, username: admin.username, name: admin.name, role: admin.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Current Admin
app.get('/api/admin/me', authenticateAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

// Admin Dashboard Analytics & Overview Stats
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
  try {
    const totalOrders = db.prepare('SELECT COUNT(id) as count FROM orders').get().count;
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(total), 0) as rev FROM orders WHERE order_status != 'cancelled'").get().rev;
    const pendingOrders = db.prepare("SELECT COUNT(id) as count FROM orders WHERE order_status = 'pending'").get().count;
    const deliveredOrders = db.prepare("SELECT COUNT(id) as count FROM orders WHERE order_status = 'delivered'").get().count;
    const totalProducts = db.prepare('SELECT COUNT(id) as count FROM products WHERE is_active = 1').get().count;
    const lowStockCount = db.prepare('SELECT COUNT(id) as count FROM products WHERE stock <= 10 AND is_active = 1').get().count;

    const recentOrders = db.prepare(`
      SELECT id, order_number, customer_name, customer_phone, total, payment_method, order_status, created_at
      FROM orders
      ORDER BY id DESC LIMIT 6
    `).all();

    const statusCounts = db.prepare(`
      SELECT order_status, COUNT(id) as count
      FROM orders
      GROUP BY order_status
    `).all();

    res.json({
      totalOrders,
      totalRevenue,
      pendingOrders,
      deliveredOrders,
      totalProducts,
      lowStockCount,
      recentOrders,
      statusCounts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Image Upload (Single)
app.post('/api/admin/upload', authenticateAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  const imageUrl = `/images/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// Admin Multiple Images Upload (Up to 10 images)
app.post('/api/admin/upload-multiple', authenticateAdmin, upload.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No image files uploaded' });
  }
  const urls = req.files.map(f => `/images/uploads/${f.filename}`);
  res.json({ urls });
});

// Admin Orders List & Filter
app.get('/api/admin/orders', authenticateAdmin, (req, res) => {
  try {
    const { status, search, limit = 100 } = req.query;
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      query += ' AND order_status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (order_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(parseInt(limit));

    const orders = db.prepare(query).all(...params);
    orders.forEach(o => {
      try {
        o.items = JSON.parse(o.items_json);
      } catch (e) {
        o.items = [];
      }
    });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Update Order Status
app.patch('/api/admin/orders/:id/status', authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { order_status, payment_status, courier_tracking } = req.body;

    const updates = [];
    const params = [];

    if (order_status) {
      updates.push('order_status = ?');
      params.push(order_status);
    }
    if (payment_status) {
      updates.push('payment_status = ?');
      params.push(payment_status);
    }
    if (courier_tracking !== undefined) {
      updates.push('courier_tracking = ?');
      params.push(courier_tracking);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    res.json({ success: true, message: 'Order updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Delete Order
app.delete('/api/admin/orders/:id', authenticateAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Products CRUD
app.get('/api/admin/products', authenticateAdmin, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT p.*, c.name as category_name, c.name_bn as category_name_bn
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `).all();

    const products = rows.map(formatProductRecord);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/products', authenticateAdmin, (req, res) => {
  try {
    const {
      name, name_bn, slug, description, short_desc, category_id,
      base_price, discount_price, stock = 100, sku, image,
      additional_images, variations = [], is_featured = 0, is_active = 1
    } = req.body;

    if (!name || !base_price) {
      return res.status(400).json({ error: 'Product name and base price are required' });
    }

    const finalSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')) + '-' + Date.now();

    const addImagesStr = additional_images ? (typeof additional_images === 'string' ? additional_images : JSON.stringify(additional_images)) : null;

    const stmt = db.prepare(`
      INSERT INTO products (
        name, name_bn, slug, description, short_desc, category_id,
        base_price, discount_price, stock, sku, image, additional_images, variations_json,
        is_featured, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, name_bn || null, finalSlug, description || '', short_desc || '',
      category_id ? parseInt(category_id) : null,
      parseFloat(base_price), discount_price ? parseFloat(discount_price) : null,
      parseInt(stock), sku || null, image || null, addImagesStr,
      JSON.stringify(variations),
      is_featured ? 1 : 0, is_active ? 1 : 0
    );

    res.status(201).json({ success: true, id: stmt.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, name_bn, description, short_desc, category_id,
      base_price, discount_price, stock, sku, image,
      additional_images, variations = [], is_featured, is_active
    } = req.body;

    const addImagesStr = additional_images !== undefined ? (typeof additional_images === 'string' ? additional_images : JSON.stringify(additional_images)) : null;

    db.prepare(`
      UPDATE products SET
        name = ?, name_bn = ?, description = ?, short_desc = ?, category_id = ?,
        base_price = ?, discount_price = ?, stock = ?, sku = ?, image = ?,
        additional_images = ?, variations_json = ?, is_featured = ?, is_active = ?
      WHERE id = ?
    `).run(
      name, name_bn || null, description, short_desc,
      category_id ? parseInt(category_id) : null,
      parseFloat(base_price), discount_price ? parseFloat(discount_price) : null,
      parseInt(stock), sku || null, image || null,
      addImagesStr,
      JSON.stringify(variations),
      is_featured ? 1 : 0, is_active !== undefined ? (is_active ? 1 : 0) : 1,
      id
    );

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quick toggle product active status
app.patch('/api/admin/products/:id/toggle-status', authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const current = db.prepare('SELECT is_active FROM products WHERE id = ?').get(id);
    if (!current) return res.status(404).json({ error: 'Product not found' });
    const newStatus = current.is_active ? 0 : 1;
    db.prepare('UPDATE products SET is_active = ? WHERE id = ?').run(newStatus, id);
    res.json({ success: true, is_active: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quick edit product (fast update for price, stock, status)
app.patch('/api/admin/products/:id/quick-edit', authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { base_price, discount_price, stock, is_active, is_featured, category_id } = req.body;
    db.prepare(`
      UPDATE products SET
        base_price = COALESCE(?, base_price),
        discount_price = ?,
        stock = COALESCE(?, stock),
        is_active = COALESCE(?, is_active),
        is_featured = COALESCE(?, is_featured),
        category_id = COALESCE(?, category_id)
      WHERE id = ?
    `).run(
      base_price !== undefined ? parseFloat(base_price) : null,
      discount_price !== undefined && discount_price !== '' ? parseFloat(discount_price) : null,
      stock !== undefined ? parseInt(stock) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      is_featured !== undefined ? (is_featured ? 1 : 0) : null,
      category_id !== undefined ? parseInt(category_id) : null,
      id
    );
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(formatProductRecord(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', authenticateAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Categories CRUD
app.get('/api/admin/categories', authenticateAdmin, (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/categories', authenticateAdmin, (req, res) => {
  try {
    const { name, name_bn, slug, icon, image, display_order = 0 } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const stmt = db.prepare(`
      INSERT INTO categories (name, name_bn, slug, icon, image, display_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, name_bn || null, finalSlug, icon || '🌿', image || null, parseInt(display_order));

    res.status(201).json({ success: true, id: stmt.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/categories/:id', authenticateAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Coupons CRUD
app.get('/api/admin/coupons', authenticateAdmin, (req, res) => {
  try {
    const coupons = db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/coupons', authenticateAdmin, (req, res) => {
  try {
    const { code, discount_type = 'percentage', discount_value, min_spend = 0 } = req.body;
    if (!code || !discount_value) return res.status(400).json({ error: 'Code and discount value required' });

    db.prepare(`
      INSERT INTO coupons (code, discount_type, discount_value, min_spend)
      VALUES (?, ?, ?, ?)
    `).run(code.toUpperCase().trim(), discount_type, parseFloat(discount_value), parseFloat(min_spend));

    res.status(201).json({ success: true, message: 'Coupon created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/coupons/:id', authenticateAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Banners CRUD
app.get('/api/admin/banners', authenticateAdmin, (req, res) => {
  try {
    const banners = db.prepare('SELECT * FROM banners ORDER BY display_order ASC').all();
    res.json(banners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/banners', authenticateAdmin, (req, res) => {
  try {
    const { title, title_bn, subtitle, subtitle_bn, image, badge_text, button_text, link, display_order = 0 } = req.body;
    if (!title || !image) return res.status(400).json({ error: 'Title and image are required' });

    db.prepare(`
      INSERT INTO banners (title, title_bn, subtitle, subtitle_bn, image, badge_text, button_text, link, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, title_bn || null, subtitle || null, subtitle_bn || null, image, badge_text || null, button_text || 'অর্ডার করুন', link || '#', parseInt(display_order));

    res.status(201).json({ success: true, message: 'Banner created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/banners/:id', authenticateAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Banner deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Settings
app.get('/api/admin/settings', authenticateAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/settings', authenticateAdmin, (req, res) => {
  try {
    const settings = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, String(value));
    }
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html for SPA-style routing if needed
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/track', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

app.get('/invoice', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'invoice.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 CureCare Server & Admin CMS running live at http://localhost:${PORT}`);
  console.log(`🛒 Storefront: http://localhost:${PORT}/`);
  console.log(`⚙️ Admin CMS: http://localhost:${PORT}/admin (Login: admin / curecare123)`);
});

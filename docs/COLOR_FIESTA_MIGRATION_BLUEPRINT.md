# Color Fiesta CMS & Frontend Overhaul — The Complete Copy-Paste Replication Blueprint
> **Upstream Authority Template**: CureCare Platform (`D:\Dev stuff\Rebel mama\CureCare` & `new-ecom`)  
> **Target Project**: Color Fiesta (`D:\Dev stuff\Rebel mama\Color fiesta`)  
> **Document Purpose**: Complete, step-by-step copy-paste guide for AI agents and developers to replicate the full CureCare database schema, backend APIs, robust Admin CMS overhaul, 5-image gallery, interactive image cropper, animated save status popup, and storefront thumbnail gallery directly into Color Fiesta.

---

## 📋 Executive Overview & Feature Parity Checklist

Color Fiesta shares the identical baseline architecture with CureCare (Node.js v24 + Express.js + SQLite via `better-sqlite3` + Vanilla HTML5/CSS/JS Admin & Storefront). CureCare has been upgraded with a high-conversion CMS overhaul that Color Fiesta needs to replicate:

| Feature | CureCare (Implemented & Live) | Color Fiesta (Current State) | Blueprint Section |
|---|---|---|---|
| **Database Schema** | `additional_images TEXT` column in `products` table | Field declared in `db.js`, needs data normalization & seed | [Section 1](#1-database-schema--migration) |
| **Multi-Image API** | `POST /api/admin/upload-multiple` (up to 10 files) | Only single upload `/api/admin/upload` | [Section 2](#2-backend-api-overhaul-serverjs) |
| **Product Record Formatter** | `formatProductRecord()` unifies `image` + `additional_images` into `gallery` | Raw record with unparsed images | [Section 2](#2-backend-api-overhaul-serverjs) |
| **Admin Gallery Manager** | Dedicated `#editProductModal` with 5-slot cards, cover badges, drag-drop & URL inputs | Only simple `#addProductModal` with single URL input | [Section 3](#3-admin-cms-markup-indexhtml) |
| **Admin Gallery Logic** | Full gallery state (`editingGallery`), reorder, cover selection (`⭐`), delete | No gallery state management | [Section 4](#4-admin-cms-javascript-adminjs) |
| **Interactive Image Cropper** | HTML5 Canvas Modal with 1:1, 4:5, 3:4, 16:9 presets, zoom, pan, rotate | None | [Section 5](#5-interactive-image-cropper-system) |
| **Save Status Popup & Feedback** | Fixed floating animated popup with countdown line & dynamic reactive buttons | Standard browser `alert()` | [Section 6](#6-animated-save-status-popup--button-states) |
| **Admin Styling** | Gallery slot grids, cover badges, pulsing indicators, backdrop modals | Basic styles | [Section 7](#7-admin-cms-styling-admincss) |
| **Storefront Gallery** | Interactive thumbnail gallery row under main modal image with click-to-swap | Single static image | [Section 8](#8-storefront-frontend-changes) |
| **Next.js Stack Parity** | `ProductGallerySection.tsx`, `ImageCropperModal.tsx`, `SaveStatusPopup.tsx` | N/A (Ready for future Next.js port) | [Section 9](#9-nextjs-stack-blueprint-reference) |

---

## 1. Database Schema & Migration

### 1.1 Products Table Schema Requirement
In SQLite (`database/colorfiesta.db`), the `products` table requires an `additional_images` column to store JSON stringified arrays of image URLs (e.g. `["/images/uploads/img1.webp", "https://..."]`).

### 1.2 Migration Script (`database/migrate-gallery.js`)
Create `database/migrate-gallery.js` in Color Fiesta to safely add the column to existing SQLite databases without losing any data:

```javascript
// database/migrate-gallery.js
const path = require('path');
const dbPath = path.join(__dirname, 'colorfiesta.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(dbPath);
} catch (e) {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(dbPath);
  db.pragma = (sql) => db.exec('PRAGMA ' + sql);
}

try {
  // Check if additional_images column exists
  const tableInfo = db.prepare ? db.prepare('PRAGMA table_info(products)').all() : [];
  const hasCol = tableInfo.some(col => col.name === 'additional_images');

  if (!hasCol) {
    console.log('Adding additional_images column to products table...');
    db.exec(`ALTER TABLE products ADD COLUMN additional_images TEXT DEFAULT '[]';`);
    console.log('✅ Column additional_images added successfully.');
  } else {
    console.log('ℹ️ Column additional_images already exists.');
  }

  // Populate placeholder gallery images for products that have only a single image
  const rows = db.prepare('SELECT id, image, additional_images FROM products').all();
  const updateStmt = db.prepare('UPDATE products SET additional_images = ? WHERE id = ?');

  rows.forEach(p => {
    let currentGallery = [];
    try {
      currentGallery = p.additional_images ? JSON.parse(p.additional_images) : [];
    } catch (e) {
      currentGallery = [];
    }

    if (!Array.isArray(currentGallery) || currentGallery.length === 0) {
      const initial = p.image ? [p.image] : [];
      updateStmt.run(JSON.stringify(initial), p.id);
    }
  });

  console.log(`✅ Normalized galleries for ${rows.length} products.`);
} catch (err) {
  console.error('Migration error:', err.message);
}
```

### 1.3 Update `database/seed.js`
Ensure `database/seed.js` inserts `additional_images`:
```javascript
// In database/seed.js:
const prodStmt = db.prepare(`
  INSERT OR REPLACE INTO products (
    name, name_bn, slug, description, short_desc, category_id,
    base_price, discount_price, stock, sku, image, additional_images, variations_json,
    is_featured, is_active, rating, reviews_count
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
`);

// When iterating products:
products.forEach(p => {
  const addImgs = p.additional_images || (p.image ? [p.image] : []);
  prodStmt.run(
    p.name,
    p.name_bn,
    p.slug,
    p.description,
    p.short_desc,
    p.category_id,
    p.base_price,
    p.discount_price || null,
    p.stock || 100,
    p.sku || null,
    p.image,
    addImgs.length > 0 ? JSON.stringify(addImgs) : null,
    JSON.stringify(p.variations || []),
    p.is_featured ? 1 : 0,
    p.rating || 4.9,
    p.reviews_count || 12
  );
});
```

---

## 2. Backend API Overhaul (`server.js`)

In `Color fiesta/server.js`, apply the following exact modifications:

### 2.1 Add the `formatProductRecord` Normalization Helper
Place this helper near the top of `server.js` (right after middleware initializers):

```javascript
// ==========================================================================
// Helper: Normalize product with parsed variations & multi-image gallery
// ==========================================================================
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
```

### 2.2 Add the Multi-Image Upload Endpoint
Under the single image upload route (`/api/admin/upload`), add `/api/admin/upload-multiple`:

```javascript
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
```

### 2.3 Update Product API Routes to Use `formatProductRecord`
Replace the mapping in:
1. `GET /api/products`:
   ```javascript
   const rows = db.prepare(query).all(...params);
   const products = rows.map(formatProductRecord);
   res.json(products);
   ```
2. `GET /api/products/search`:
   ```javascript
   const rows = db.prepare(`
     SELECT p.id, p.name, p.name_bn, p.slug, p.base_price, p.discount_price, p.image, p.additional_images, p.variations_json
     FROM products p
     WHERE p.is_active = 1 AND (p.name LIKE ? OR p.name_bn LIKE ? OR p.sku LIKE ?)
     LIMIT 8
   `).all(`%${q}%`, `%${q}%`, `%${q}%`);
   res.json(rows.map(formatProductRecord));
   ```
3. `GET /api/products/:identifier`:
   ```javascript
   const rawProduct = db.prepare(`
     SELECT p.*, c.name as category_name, c.name_bn as category_name_bn, c.slug as category_slug
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE ${isId ? 'p.id = ?' : 'p.slug = ?'}
   `).get(identifier);

   if (!rawProduct) return res.status(404).json({ error: 'Product not found' });
   const product = formatProductRecord(rawProduct);
   ```
4. `GET /api/admin/products`:
   ```javascript
   const rows = db.prepare(`
     SELECT p.*, c.name as category_name, c.name_bn as category_name_bn
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     ORDER BY p.id DESC
   `).all();
   res.json(rows.map(formatProductRecord));
   ```
5. `POST /api/admin/products`:
   ```javascript
   const {
     name, name_bn, slug, description, short_desc, category_id,
     base_price, discount_price, stock = 100, sku, image,
     additional_images, variations = [], is_featured = 0, is_active = 1
   } = req.body;

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
   ```
6. `PUT /api/admin/products/:id`:
   ```javascript
   const {
     name, name_bn, description, short_desc, category_id,
     base_price, discount_price, stock, sku, image,
     additional_images, variations = [], is_featured, is_active
   } = req.body;

   const addImagesStr = additional_images !== undefined 
     ? (typeof additional_images === 'string' ? additional_images : JSON.stringify(additional_images)) 
     : null;

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
   ```

---

## 3. Admin CMS Markup (`public/admin/index.html`)

In `Color fiesta/public/admin/index.html`, add the comprehensive **Edit Product Details & Multi-Image Gallery Modal**, the **Interactive Image Cropper Modal**, and the **Floating Animated Save Status Popup Container**.

### 3.1 Edit Details & Gallery Modal HTML
Paste this directly before the closing `</body>` tag (beside `addProductModal`):

```html
<!-- Modal: Edit Product Details & 5-Image Gallery -->
<div id="editProductModal" class="admin-modal-overlay">
  <div class="admin-modal-box" style="max-width: 880px; width: 95%; max-height: 92vh; overflow-y: auto;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; position: sticky; top: -16px; background: #fff; z-index: 20;">
      <div>
        <h3 style="font-size: 17px; font-weight: 700; color: #0f766e; margin: 0; display: flex; align-items: center; gap: 8px;">
          <span>✏️ পণ্যের বিস্তারিত তথ্য ও গ্যালারি এডিট (Product Details & Gallery)</span>
          <span id="editModalSkuBadge" style="font-size: 11px; background: #f0fdfa; color: #0f766e; border: 1px solid #ccfbf1; padding: 2px 8px; border-radius: 12px; font-family: monospace;"></span>
        </h3>
        <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">
          পণ্যের বিবরণ, মূল্য, স্টক এবং ৫টি ছবির পূর্ণাঙ্গ গ্যালারি ক্রপিং সহ পরিচালনা করুন।
        </p>
      </div>
      <button type="button" onclick="closeEditProductModal()" style="border: none; background: #f1f5f9; width: 32px; height: 32px; border-radius: 50%; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
    </div>

    <form id="editProductForm" onsubmit="saveProductDetails(event)">
      <input type="hidden" id="editProdId">

      <!-- Basic Info Section -->
      <div style="background: #f8fafc; padding: 14px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #edf2f7;">
        <h4 style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
          📌 মৌলিক তথ্য (Basic Info)
        </h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div>
            <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">ইংরেজি নাম (English Name) *</label>
            <input type="text" id="editProdNameEn" class="btn-sm" style="width: 100%; padding: 8px; background: #fff;" required>
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">বাংলা নাম (Bengali Name) *</label>
            <input type="text" id="editProdNameBn" class="btn-sm" style="width: 100%; padding: 8px; background: #fff;" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">ক্যাটাগরি</label>
            <select id="editProdCategory" class="btn-sm" style="width: 100%; padding: 8px; background: #fff;"></select>
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">SKU কোড</label>
            <input type="text" id="editProdSku" class="btn-sm" style="width: 100%; padding: 8px; background: #fff;">
          </div>
        </div>
      </div>

      <!-- Pricing, Stock & Status Section -->
      <div style="background: #f8fafc; padding: 14px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #edf2f7;">
        <h4 style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
          💰 মূল্য, স্টক ও স্ট্যাটাস (Pricing & Availability)
        </h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div>
            <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">রেগুলার মূল্য (৳) *</label>
            <input type="number" id="editProdPrice" class="btn-sm" style="width: 100%; padding: 8px; background: #fff;" required>
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">অফার মূল্য (৳)</label>
            <input type="number" id="editProdDiscountPrice" class="btn-sm" style="width: 100%; padding: 8px; background: #fff;" placeholder="ঐচ্ছিক">
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">স্টক পরিমাণ (Units)</label>
            <input type="number" id="editProdStock" class="btn-sm" style="width: 100%; padding: 8px; background: #fff;" value="100">
          </div>
        </div>

        <div style="display: flex; gap: 20px; align-items: center; padding-top: 4px;">
          <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;">
            <input type="checkbox" id="editProdIsActive" checked>
            <span>পণ্যটি ওয়েবসাইটে দৃশ্যমান (Active)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;">
            <input type="checkbox" id="editProdIsFeatured">
            <span>ফিচার্ড পণ্য হিসেবে প্রদর্শন (Featured)</span>
          </label>
        </div>
      </div>

      <!-- SECTION 4: ROBUST 5-IMAGE GALLERY SECTION -->
      <div style="background: #fff; padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 2px solid #0f766e; box-shadow: 0 4px 12px rgba(15, 118, 110, 0.08);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; pb: 8px;">
          <div>
            <h4 style="font-size: 14px; font-weight: 800; color: #0f766e; margin: 0; display: flex; align-items: center; gap: 6px;">
              <span>🖼️ ৫-ছবির পূর্ণাঙ্গ গ্যালারি (Product Media Gallery)</span>
            </h4>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              সর্বোচ্চ ৫টি ছবি আপলোড করুন। যেকোনো ছবিকে ক্রপ বা কভার হিসেবে নির্ধারণ করুন।
            </div>
          </div>
          <div style="background: #ccfbf1; color: #0f766e; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">
            মোট ছবি: <span id="editGalleryCount">0</span> / 5 টি
          </div>
        </div>

        <!-- Hero Canvas Preview (Large inspection) -->
        <div id="editGalleryHeroCanvas" style="width: 100%; height: 260px; background: #0f172a; border-radius: 10px; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 14px; border: 1px solid #1e293b;">
          <img id="editGalleryHeroImg" src="" alt="Hero Preview" style="max-height: 240px; max-width: 95%; object-fit: contain; border-radius: 6px;">
          <div id="editGalleryHeroBadge" style="position: absolute; top: 10px; left: 10px; background: #0d9488; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px;">
            ⭐ প্রধান কভার ছবি (Primary Cover)
          </div>
          <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 6px;">
            <button type="button" onclick="cropCurrentHeroImage()" style="background: rgba(0,0,0,0.7); color: #fff; border: 1px solid #475569; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">
              ✂️ ক্রপ ও ফ্রেম ঠিক করুন
            </button>
          </div>
        </div>

        <!-- 5 Slots Thumbnails Grid -->
        <div id="editGalleryGrid" class="gallery-grid-container" style="min-height: 110px; margin-bottom: 14px; padding: 10px; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
          <!-- Rendered dynamically by renderEditGallery() in JS -->
        </div>

        <!-- Multi-Image Upload & Direct Link Zone -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px;">
          <div class="gallery-upload-dropzone" onclick="document.getElementById('editGalleryFileInput').click()" style="border: 2px dashed #0d9488; border-radius: 8px; padding: 16px; text-align: center; background: #f0fdfa; cursor: pointer; transition: all 0.2s;">
            <input type="file" id="editGalleryFileInput" multiple accept="image/*" style="display: none;" onchange="handleGalleryUploadFiles(event)">
            <div style="font-size: 24px; margin-bottom: 4px;">📤</div>
            <div style="font-size: 13px; font-weight: 700; color: #0f766e;">একাধিক ছবি আপলোড করুন</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">এক সাথে ১ থেকে ৫টি ছবি নির্বাচন করুন (JPG, PNG, WEBP)</div>
            <div id="uploadProgressText" style="font-size: 11px; font-weight: 600; color: #0284c7; margin-top: 6px; display: none;">⏳ ছবি আপলোড হচ্ছে...</div>
          </div>

          <!-- Add URL directly -->
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc; display: flex; flex-direction: column; justify-content: center;">
            <label style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px; display: block;">
              🔗 ছবির সরাসরি লিংক (Image URL) যোগ করুন
            </label>
            <div style="display: flex; gap: 6px;">
              <input type="url" id="editGalleryUrlInput" class="btn-sm" style="flex: 1; padding: 8px; background: #fff;" placeholder="https://...">
              <button type="button" onclick="addUrlToEditGallery()" class="btn-primary" style="white-space: nowrap; padding: 8px 12px; font-size: 12px;">+ যোগ করুন</button>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">সরাসরি ওয়েব লিংক পেস্ট করে গ্যালারিতে সংযুক্ত করুন।</div>
          </div>
        </div>
      </div>

      <!-- Descriptions Section -->
      <div style="background: #f8fafc; padding: 14px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #edf2f7;">
        <h4 style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
          📝 পণ্যের বিবরণ ও স্বাস্থ্য উপকারিতা (Descriptions)
        </h4>
        <div style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">সংক্ষিপ্ত বিবরণ (Short Description)</label>
          <input type="text" id="editProdShortDesc" class="btn-sm" style="width: 100%; padding: 8px; background: #fff;">
        </div>
        <div>
          <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">বিস্তারিত বর্ণনা (Full Description)</label>
          <textarea id="editProdDesc" class="btn-sm" rows="4" style="width: 100%; padding: 8px; background: #fff;"></textarea>
        </div>
      </div>

      <!-- Form Actions (With Dynamic Reaction States) -->
      <div style="display: flex; justify-content: flex-end; gap: 10px; padding-top: 14px; border-top: 1px solid #e2e8f0; position: sticky; bottom: -16px; background: #fff; z-index: 20;">
        <button type="button" onclick="closeEditProductModal()" class="btn-sm" style="padding: 8px 18px; font-size: 13px;">বাতিল</button>
        <button type="submit" id="editSaveSubmitBtn" class="btn-primary" style="padding: 10px 28px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
          <span id="editSaveBtnIcon">💾</span>
          <span id="editSaveBtnText">পরিবর্তন সংরক্ষণ করুন (Save All Details)</span>
        </button>
      </div>
    </form>
  </div>
</div>
```

### 3.2 Image Cropper Modal HTML
Paste this directly below `#editProductModal`:

```html
<!-- Modal: Interactive Image Cropper (1:1, 4:5, 3:4, 16:9, Zoom & Rotate) -->
<div id="imageCropperModal" class="admin-modal-overlay" style="z-index: 10000;">
  <div class="admin-modal-box" style="max-width: 720px; width: 95%; background: #0f172a; color: #fff; border-radius: 16px; border: 1px solid #334155;">
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 10px; margin-bottom: 12px;">
      <div>
        <h4 style="font-size: 15px; font-weight: 700; color: #fff; margin: 0;">✂️ ছবি ক্রপ ও সাইজ ফ্রেম করুন (Image Cropper)</h4>
        <span style="font-size: 11px; color: #94a3b8;">স্টোরফ্রন্ট কার্ডে সুন্দরভাবে ফিট করার জন্য অনুপাত ঠিক করুন</span>
      </div>
      <button type="button" onclick="closeCropperModal()" style="border: none; background: #1e293b; color: #fff; width: 28px; height: 28px; border-radius: 50%; cursor: pointer;">✕</button>
    </div>

    <!-- Toolbar: Aspect Ratio Presets -->
    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
      <button type="button" class="cropper-ratio-btn active" data-ratio="1" onclick="setCropperRatio(1, this)">1:1 স্কয়ার (কার্ড সাইজ)</button>
      <button type="button" class="cropper-ratio-btn" data-ratio="0.8" onclick="setCropperRatio(0.8, this)">4:5 পোর্ট্রেট</button>
      <button type="button" class="cropper-ratio-btn" data-ratio="0.75" onclick="setCropperRatio(0.75, this)">3:4 স্ট্যান্ডার্ড</button>
      <button type="button" class="cropper-ratio-btn" data-ratio="1.777" onclick="setCropperRatio(1.777, this)">16:9 ব্যানার</button>
      <button type="button" class="cropper-ratio-btn" data-ratio="0" onclick="setCropperRatio(0, this)">মূল আকার (Original)</button>
      
      <div style="margin-left: auto; display: flex; gap: 6px;">
        <button type="button" onclick="rotateCropperImage()" style="background: #1e293b; color: #fff; border: 1px solid #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;">🔄 ৯০° ঘুরান</button>
        <button type="button" onclick="resetCropperTransform()" style="background: #1e293b; color: #94a3b8; border: 1px solid #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;">রিসেট</button>
      </div>
    </div>

    <!-- Viewport with Interactive Canvas Box -->
    <div id="cropperViewport" style="width: 100%; height: 380px; background: #020617; border-radius: 12px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: grab; user-select: none;">
      <img id="cropperSourceImg" src="" alt="Cropper Source" style="position: absolute; transform-origin: center center; pointer-events: none; max-width: none;">
      
      <!-- Frame Overlay Box -->
      <div id="cropperFrame" style="position: absolute; border: 2px solid #0d9488; box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.78); border-radius: 8px; pointer-events: none;">
        <!-- 3x3 Grid Lines -->
        <div style="position: absolute; inset: 0; display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr 1fr; opacity: 0.35;">
          <div style="border-right: 1px dashed #0d9488; border-bottom: 1px dashed #0d9488;"></div>
          <div style="border-right: 1px dashed #0d9488; border-bottom: 1px dashed #0d9488;"></div>
          <div style="border-bottom: 1px dashed #0d9488;"></div>
          <div style="border-right: 1px dashed #0d9488; border-bottom: 1px dashed #0d9488;"></div>
          <div style="border-right: 1px dashed #0d9488; border-bottom: 1px dashed #0d9488;"></div>
          <div style="border-bottom: 1px dashed #0d9488;"></div>
          <div style="border-right: 1px dashed #0d9488;"></div>
          <div style="border-right: 1px dashed #0d9488;"></div>
          <div></div>
        </div>
      </div>
      <div style="position: absolute; bottom: 8px; font-size: 11px; background: rgba(0,0,0,0.6); padding: 3px 10px; border-radius: 20px; color: #94a3b8; pointer-events: none;">
        মাউস দিয়ে টেনে পজিশন করুন • স্ক্রল বা স্লাইডার দিয়ে জুম করুন
      </div>
    </div>

    <!-- Zoom Slider Controls -->
    <div style="display: flex; align-items: center; gap: 12px; margin-top: 12px; padding: 8px 12px; background: #1e293b; border-radius: 8px;">
      <span style="font-size: 12px; color: #94a3b8;">🔍 জুম:</span>
      <input type="range" id="cropperZoomSlider" min="0.6" max="3" step="0.05" value="1" oninput="updateCropperZoom(parseFloat(this.value))" style="flex: 1; accent-color: #0d9488; cursor: pointer;">
      <span id="cropperZoomLabel" style="font-size: 12px; font-family: monospace; color: #fff; width: 44px; text-align: right;">100%</span>
    </div>

    <!-- Actions -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; border-top: 1px solid #1e293b; padding-top: 12px;">
      <button type="button" onclick="skipCroppingAndUseOriginal()" style="background: none; border: none; color: #94a3b8; font-size: 12px; cursor: pointer;">
        না কেটে মূল ছবি ব্যবহার করুন (Use Original)
      </button>
      <div style="display: flex; gap: 8px;">
        <button type="button" onclick="closeCropperModal()" class="btn-sm" style="background: #334155; color: #fff;">বাতিল</button>
        <button type="button" onclick="applyAndSaveCroppedImage()" class="btn-primary" style="padding: 8px 20px; font-weight: 700; background: #0d9488;">
          ✓ ক্রপ ও সংরক্ষণ করুন
        </button>
      </div>
    </div>
  </div>
</div>
```

### 3.3 Animated Floating Save Status Popup Container
Paste this directly before the closing `</body>` tag:

```html
<!-- Floating Animated Save Status Notification Popup -->
<div id="saveStatusPopup" class="save-popup-container" style="display: none;">
  <div id="savePopupCard" class="save-popup-card">
    <div class="save-popup-glow"></div>
    <div style="display: flex; items-center; gap: 12px; position: relative; z-index: 2;">
      <div id="savePopupIconBox" class="save-popup-icon-box">
        <!-- Rendered by JS -->
      </div>
      <div style="flex: 1; min-width: 0;">
        <h5 id="savePopupTitle" style="margin: 0; font-size: 14px; font-weight: 700; color: #fff;"></h5>
        <p id="savePopupMessage" style="margin: 3px 0 0 0; font-size: 12px; color: #cbd5e1; line-height: 1.4;"></p>
        <div id="savePopupRetryBox" style="margin-top: 8px; display: none;">
          <button type="button" onclick="saveProductDetails()" class="btn-sm" style="background: #ef4444; color: #fff; padding: 4px 10px; font-size: 11px; font-weight: 700;">পুনরায় চেষ্টা করুন (Retry)</button>
        </div>
      </div>
      <button type="button" onclick="hideSaveStatusPopup()" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 14px; padding: 4px;">✕</button>
    </div>
    <div id="savePopupProgressLine" class="save-popup-progress"></div>
  </div>
</div>
```

---

## 4. Admin CMS JavaScript (`public/admin/admin.js`)

In `Color fiesta/public/admin/admin.js`, implement the state management, gallery functions, modal controllers, and save logic:

### 4.1 Update `AdminState`
```javascript
const AdminState = {
  token: localStorage.getItem('colorfiesta_admin_token') || null,
  user: JSON.parse(localStorage.getItem('colorfiesta_admin_user') || 'null'),
  currentTab: 'dashboard',
  orders: [],
  products: [],
  categories: [],
  coupons: [],
  banners: [],
  settings: {},
  // Gallery & Cropper States
  editingGallery: [],
  editingPrimaryImage: '',
  editingProduct: null,
  cropperState: {
    isOpen: false,
    source: null,
    targetIndex: null,
    zoom: 1,
    rotation: 0,
    pan: { x: 0, y: 0 },
    aspectRatio: 1
  }
};
```

### 4.2 Product Table Row "Edit Details" Button
Inside `loadProducts()`, update the Actions column template to add the prominent `✏️ Edit Details` button:
```javascript
<td>
  <div style="display: flex; gap: 6px; align-items: center;">
    <button onclick="openEditProductModal(${p.id})" class="btn-sm" style="background: #0d9488; color: #fff; font-weight: 600; padding: 5px 10px; border-radius: 4px; border: none; cursor: pointer;" title="পণ্যের বিস্তারিত তথ্য ও গ্যালারি এডিট">
      ✏️ Edit Details
    </button>
    <button onclick="deleteProduct(${p.id})" class="btn-sm btn-danger-sm" title="পণ্য ডিলিট করুন">
      🗑️
    </button>
  </div>
</td>
```

### 4.3 Modal Open / Close & Gallery Rendering Logic
```javascript
// Open Edit Product Details Modal
function openEditProductModal(id) {
  const p = AdminState.products.find(item => item.id === id);
  if (!p) return alert('পণ্য খুঁজে পাওয়া যায়নি');

  AdminState.editingProduct = p;
  document.getElementById('editProdId').value = p.id;
  document.getElementById('editModalSkuBadge').textContent = `ID: #${p.id} | SKU: ${p.sku || 'N/A'}`;

  // Populate Categories
  const catSelect = document.getElementById('editProdCategory');
  catSelect.innerHTML = AdminState.categories.map(c => `
    <option value="${c.id}" ${c.id === p.category_id ? 'selected' : ''}>${c.name_bn || c.name}</option>
  `).join('');

  // Populate Inputs
  document.getElementById('editProdNameEn').value = p.name || '';
  document.getElementById('editProdNameBn').value = p.name_bn || '';
  document.getElementById('editProdSku').value = p.sku || '';
  document.getElementById('editProdPrice').value = p.base_price || '';
  document.getElementById('editProdDiscountPrice').value = p.discount_price || '';
  document.getElementById('editProdStock').value = p.stock !== undefined ? p.stock : 100;
  document.getElementById('editProdIsActive').checked = p.is_active !== 0;
  document.getElementById('editProdIsFeatured').checked = !!p.is_featured;
  document.getElementById('editProdShortDesc').value = p.short_desc || '';
  document.getElementById('editProdDesc').value = p.description || '';

  // Initialize Gallery (enforce 5 image limit)
  let initialGallery = [];
  if (Array.isArray(p.gallery) && p.gallery.length > 0) {
    initialGallery = [...p.gallery];
  } else if (p.image) {
    initialGallery = [p.image];
  }

  AdminState.editingGallery = initialGallery.slice(0, 5);
  AdminState.editingPrimaryImage = p.image || initialGallery[0] || '';

  renderEditGallery();
  document.getElementById('editProductModal').classList.add('active');
}

function closeEditProductModal() {
  document.getElementById('editProductModal').classList.remove('active');
  AdminState.editingProduct = null;
}

// Render 5 Gallery Slots & Hero Preview
function renderEditGallery() {
  const grid = document.getElementById('editGalleryGrid');
  const countEl = document.getElementById('editGalleryCount');
  const heroImg = document.getElementById('editGalleryHeroImg');
  const heroCanvas = document.getElementById('editGalleryHeroCanvas');

  const gallery = AdminState.editingGallery || [];
  const primaryImg = AdminState.editingPrimaryImage || gallery[0] || '';
  countEl.textContent = gallery.length;

  // Update Hero Preview
  if (primaryImg) {
    heroCanvas.style.display = 'flex';
    heroImg.src = primaryImg;
  } else {
    heroCanvas.style.display = 'none';
  }

  // Render 5 Dedicated Slots
  let html = '';
  for (let i = 0; i < 5; i++) {
    const imgUrl = gallery[i];
    const isPrimary = imgUrl && imgUrl === primaryImg;
    const slotLabel = i === 0 ? 'কভার ছবি' : `অ্যাঙ্গেল #${i + 1}`;

    if (imgUrl) {
      html += `
        <div class="gallery-slot-card ${isPrimary ? 'is-primary' : ''}">
          <img src="${imgUrl}" alt="Slot ${i + 1}" class="gallery-slot-img">
          
          <div class="gallery-slot-badge ${isPrimary ? 'badge-primary' : ''}">
            ${isPrimary ? '⭐ কভার' : `#${i + 1}`}
          </div>

          <div class="gallery-slot-actions">
            <button type="button" onclick="openCropperForSlot('${imgUrl}', ${i})" title="ছবি ক্রপ করুন" class="slot-btn slot-crop-btn">✂️</button>
            ${!isPrimary ? `<button type="button" onclick="setPrimaryGalleryImage('${imgUrl}')" title="কভার হিসেবে নির্ধারণ করুন" class="slot-btn slot-star-btn">⭐</button>` : ''}
            <button type="button" onclick="removeGalleryImage(${i})" title="মুছে ফেলুন" class="slot-btn slot-delete-btn">🗑️</button>
          </div>

          <div class="gallery-slot-footer">${slotLabel}</div>
        </div>
      `;
    } else {
      html += `
        <div class="gallery-slot-card slot-empty" onclick="document.getElementById('editGalleryFileInput').click()" title="নতুন ছবি যোগ করুন">
          <div style="font-size: 20px; color: #94a3b8;">+</div>
          <div style="font-size: 11px; font-weight: 600; color: #64748b;">স্লট #${i + 1}</div>
          <div style="font-size: 9px; color: #94a3b8;">${slotLabel}</div>
        </div>
      `;
    }
  }

  grid.innerHTML = html;
}

function setPrimaryGalleryImage(url) {
  AdminState.editingPrimaryImage = url;
  // Move primary image to front of array
  const remaining = AdminState.editingGallery.filter(u => u !== url);
  AdminState.editingGallery = [url, ...remaining].slice(0, 5);
  renderEditGallery();
}

function removeGalleryImage(index) {
  const removed = AdminState.editingGallery[index];
  AdminState.editingGallery.splice(index, 1);
  if (removed === AdminState.editingPrimaryImage) {
    AdminState.editingPrimaryImage = AdminState.editingGallery[0] || '';
  }
  renderEditGallery();
}

function addUrlToEditGallery() {
  const input = document.getElementById('editGalleryUrlInput');
  const url = input.value.trim();
  if (!url) return alert('অনুগ্রহ করে একটি সঠিক ছবির লিঙ্ক দিন');

  if (AdminState.editingGallery.length >= 5) {
    return alert('সর্বোচ্চ ৫টি ছবির লিমিট পূর্ণ হয়েছে। নতুন ছবি যোগ করতে আগের ছবি মুছুন।');
  }

  if (AdminState.editingGallery.includes(url)) {
    return alert('এই ছবিটি ইতিমধ্যে গ্যালারিতে আছে');
  }

  AdminState.editingGallery.push(url);
  if (!AdminState.editingPrimaryImage) AdminState.editingPrimaryImage = url;
  input.value = '';
  renderEditGallery();
}

async function handleGalleryUploadFiles(e) {
  const files = Array.from(e.target.files);
  if (!files || files.length === 0) return;

  const remainingSlots = 5 - AdminState.editingGallery.length;
  if (remainingSlots <= 0) {
    alert('সর্বোচ্চ ৫টি ছবির লিমিট পূর্ণ হয়েছে।');
    return;
  }

  const filesToUpload = files.slice(0, remainingSlots);
  const formData = new FormData();
  filesToUpload.forEach(f => formData.append('images', f));

  const progressEl = document.getElementById('uploadProgressText');
  progressEl.style.display = 'block';

  try {
    const res = await fetch('/api/admin/upload-multiple', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AdminState.token}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.urls) {
      data.urls.forEach(u => AdminState.editingGallery.push(u));
      if (!AdminState.editingPrimaryImage) AdminState.editingPrimaryImage = data.urls[0];
      renderEditGallery();
    } else {
      alert(data.error || 'ছবি আপলোড ব্যর্থ হয়েছে');
    }
  } catch (err) {
    alert('ছবি আপলোডে নেটওয়ার্ক এরর');
  } finally {
    progressEl.style.display = 'none';
    e.target.value = '';
  }
}
```

---

## 5. Interactive Image Cropper System

Implement the interactive HTML5 canvas cropping system in `public/admin/admin.js`:

```javascript
// ==========================================================================
// Interactive HTML5 Canvas Cropper Logic
// ==========================================================================
let cropperImgObj = null;
let cropperDrag = { isDragging: false, startX: 0, startY: 0 };

function openCropperForSlot(imgUrl, slotIndex) {
  AdminState.cropperState.source = imgUrl;
  AdminState.cropperState.targetIndex = slotIndex;
  AdminState.cropperState.zoom = 1;
  AdminState.cropperState.rotation = 0;
  AdminState.cropperState.pan = { x: 0, y: 0 };
  AdminState.cropperState.aspectRatio = 1;

  const modal = document.getElementById('imageCropperModal');
  const sourceImg = document.getElementById('cropperSourceImg');
  const slider = document.getElementById('cropperZoomSlider');
  const zoomLabel = document.getElementById('cropperZoomLabel');

  slider.value = 1;
  zoomLabel.textContent = '100%';

  sourceImg.src = imgUrl;
  cropperImgObj = new Image();
  cropperImgObj.crossOrigin = 'anonymous';
  cropperImgObj.src = imgUrl;
  cropperImgObj.onload = () => {
    updateCropperTransform();
    repositionCropperFrame();
  };

  setupCropperDragEvents();
  modal.classList.add('active');
}

function closeCropperModal() {
  document.getElementById('imageCropperModal').classList.remove('active');
}

function cropCurrentHeroImage() {
  const primary = AdminState.editingPrimaryImage || (AdminState.editingGallery[0] || '');
  if (!primary) return alert('কোনো ছবি নির্বাচিত নেই');
  const idx = AdminState.editingGallery.indexOf(primary);
  openCropperForSlot(primary, idx >= 0 ? idx : 0);
}

function setCropperRatio(ratio, btn) {
  AdminState.cropperState.aspectRatio = ratio;
  document.querySelectorAll('.cropper-ratio-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  repositionCropperFrame();
}

function updateCropperZoom(val) {
  AdminState.cropperState.zoom = val;
  document.getElementById('cropperZoomLabel').textContent = Math.round(val * 100) + '%';
  updateCropperTransform();
}

function rotateCropperImage() {
  AdminState.cropperState.rotation = (AdminState.cropperState.rotation + 90) % 360;
  updateCropperTransform();
}

function resetCropperTransform() {
  AdminState.cropperState.zoom = 1;
  AdminState.cropperState.rotation = 0;
  AdminState.cropperState.pan = { x: 0, y: 0 };
  document.getElementById('cropperZoomSlider').value = 1;
  document.getElementById('cropperZoomLabel').textContent = '100%';
  updateCropperTransform();
}

function updateCropperTransform() {
  const img = document.getElementById('cropperSourceImg');
  const { zoom, rotation, pan } = AdminState.cropperState;
  img.style.transform = `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`;
}

function repositionCropperFrame() {
  const vp = document.getElementById('cropperViewport');
  const frame = document.getElementById('cropperFrame');
  const ratio = AdminState.cropperState.aspectRatio;

  const vpW = vp.clientWidth || 600;
  const vpH = vp.clientHeight || 380;
  const pad = 30;

  let effectiveRatio = ratio;
  if (ratio === 0 && cropperImgObj && cropperImgObj.naturalWidth) {
    effectiveRatio = cropperImgObj.naturalWidth / cropperImgObj.naturalHeight;
  } else if (!effectiveRatio) {
    effectiveRatio = 1;
  }

  const maxW = vpW - pad * 2;
  const maxH = vpH - pad * 2;

  let fW, fH;
  if (maxW / maxH > effectiveRatio) {
    fH = maxH;
    fW = fH * effectiveRatio;
  } else {
    fW = maxW;
    fH = fW / effectiveRatio;
  }

  frame.style.width = Math.round(fW) + 'px';
  frame.style.height = Math.round(fH) + 'px';
  frame.style.left = Math.round((vpW - fW) / 2) + 'px';
  frame.style.top = Math.round((vpH - fH) / 2) + 'px';
}

function setupCropperDragEvents() {
  const vp = document.getElementById('cropperViewport');
  vp.onmousedown = (e) => {
    e.preventDefault();
    cropperDrag.isDragging = true;
    cropperDrag.startX = e.clientX - AdminState.cropperState.pan.x;
    cropperDrag.startY = e.clientY - AdminState.cropperState.pan.y;
    vp.style.cursor = 'grabbing';
  };

  window.onmousemove = (e) => {
    if (!cropperDrag.isDragging) return;
    AdminState.cropperState.pan.x = e.clientX - cropperDrag.startX;
    AdminState.cropperState.pan.y = e.clientY - cropperDrag.startY;
    updateCropperTransform();
  };

  window.onmouseup = () => {
    cropperDrag.isDragging = false;
    vp.style.cursor = 'grab';
  };

  vp.onwheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    const newZoom = Math.min(3, Math.max(0.6, AdminState.cropperState.zoom + delta));
    updateCropperZoom(parseFloat(newZoom.toFixed(2)));
    document.getElementById('cropperZoomSlider').value = newZoom;
  };
}

async function applyAndSaveCroppedImage() {
  if (!cropperImgObj) return;
  const frame = document.getElementById('cropperFrame');
  const cropW = frame.clientWidth;
  const cropH = frame.clientHeight;
  const { zoom, rotation, pan } = AdminState.cropperState;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = Math.round(1200 * (cropH / cropW));
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scaleMult = canvas.width / cropW;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.translate(pan.x * scaleMult, pan.y * scaleMult);
  ctx.rotate((rotation * Math.PI) / 180);

  const drawW = cropperImgObj.naturalWidth * zoom * scaleMult;
  const drawH = cropperImgObj.naturalHeight * zoom * scaleMult;
  ctx.drawImage(cropperImgObj, -drawW / 2, -drawH / 2, drawW, drawH);

  canvas.toBlob(async (blob) => {
    const file = new File([blob], `colorfiesta_cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AdminState.token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const targetIdx = AdminState.cropperState.targetIndex;
        if (targetIdx !== null && targetIdx !== undefined) {
          AdminState.editingGallery[targetIdx] = data.url;
        } else {
          AdminState.editingGallery.push(data.url);
        }
        if (targetIdx === 0 || !AdminState.editingPrimaryImage) {
          AdminState.editingPrimaryImage = data.url;
        }
        renderEditGallery();
        closeCropperModal();
      } else {
        alert('ক্রপ করা ছবি সংরক্ষণ করা যায়নি');
      }
    } catch (e) {
      alert('আপলোডে নেটওয়ার্ক এরর');
    }
  }, 'image/jpeg', 0.92);
}

function skipCroppingAndUseOriginal() {
  closeCropperModal();
}
```

---

## 6. Animated Save Status Popup & Button States

Implement the dynamic reactive save button feedback and floating countdown toast in `public/admin/admin.js`:

```javascript
// ==========================================================================
// Save Status Notification Popup & Dynamic Buttons
// ==========================================================================
let savePopupTimer = null;

function showSaveStatusPopup(status, message, onRetry = null) {
  const container = document.getElementById('saveStatusPopup');
  const card = document.getElementById('savePopupCard');
  const iconBox = document.getElementById('savePopupIconBox');
  const title = document.getElementById('savePopupTitle');
  const msg = document.getElementById('savePopupMessage');
  const retryBox = document.getElementById('savePopupRetryBox');
  const line = document.getElementById('savePopupProgressLine');

  if (savePopupTimer) clearTimeout(savePopupTimer);

  container.style.display = 'block';
  card.className = `save-popup-card status-${status}`;

  if (status === 'saving') {
    iconBox.innerHTML = `<span class="spin-loader">⏳</span>`;
    title.textContent = 'পরিবর্তন সংরক্ষণ করা হচ্ছে...';
    msg.textContent = message || 'ডাটাবেস ও গ্যালারি আপডেট হচ্ছে...';
    retryBox.style.display = 'none';
    line.style.animation = 'pulseLine 1.5s infinite';
  } else if (status === 'success') {
    const time = new Date().toLocaleTimeString();
    iconBox.innerHTML = `<span>✓</span>`;
    title.textContent = 'সফলভাবে সংরক্ষিত হয়েছে!';
    msg.textContent = message || `সব পরিবর্তন ও গ্যালারি লাইভ ওয়েবসাইটে যুক্ত হয়েছে (${time})।`;
    retryBox.style.display = 'none';
    line.style.animation = 'shrinkLine 4s linear forwards';

    savePopupTimer = setTimeout(() => {
      hideSaveStatusPopup();
    }, 4000);
  } else if (status === 'error') {
    iconBox.innerHTML = `<span>⚠️</span>`;
    title.textContent = 'সংরক্ষণ ব্যর্থ হয়েছে!';
    msg.textContent = message || 'সার্ভারে তথ্য সংরক্ষণ করা সম্ভব হয়নি।';
    retryBox.style.display = onRetry ? 'block' : 'none';
    line.style.animation = 'none';
    line.style.background = '#ef4444';
  }
}

function hideSaveStatusPopup() {
  document.getElementById('saveStatusPopup').style.display = 'none';
}

// Update saveProductDetails with full animation workflow
async function saveProductDetails(e) {
  if (e) e.preventDefault();

  const btn = document.getElementById('editSaveSubmitBtn');
  const btnIcon = document.getElementById('editSaveBtnIcon');
  const btnText = document.getElementById('editSaveBtnText');

  // Trigger 'Saving' state
  btn.disabled = true;
  btn.style.background = '#0d9488';
  btnIcon.textContent = '⏳';
  btnText.textContent = 'সংরক্ষণ হচ্ছে...';
  showSaveStatusPopup('saving', 'পণ্যের তথ্য ও গ্যালারি সংরক্ষণ করা হচ্ছে...');

  const id = document.getElementById('editProdId').value;
  const name = document.getElementById('editProdNameEn').value.trim();
  const name_bn = document.getElementById('editProdNameBn').value.trim();
  const category_id = document.getElementById('editProdCategory').value;
  const sku = document.getElementById('editProdSku').value.trim();
  const base_price = parseFloat(document.getElementById('editProdPrice').value);
  const discount_price = parseFloat(document.getElementById('editProdDiscountPrice').value) || null;
  const stock = parseInt(document.getElementById('editProdStock').value) || 0;
  const is_active = document.getElementById('editProdIsActive').checked ? 1 : 0;
  const is_featured = document.getElementById('editProdIsFeatured').checked ? 1 : 0;
  const short_desc = document.getElementById('editProdShortDesc').value.trim();
  const description = document.getElementById('editProdDesc').value.trim();

  const primaryImage = AdminState.editingPrimaryImage || (AdminState.editingGallery[0] || null);
  const additionalImages = AdminState.editingGallery.filter(url => url !== primaryImage);

  const payload = {
    name, name_bn, category_id, sku,
    base_price, discount_price, stock,
    is_active, is_featured, short_desc, description,
    image: primaryImage,
    additional_images: additionalImages
  };

  try {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AdminState.token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      // Trigger 'Success' state
      btn.style.background = '#10b981';
      btnIcon.textContent = '✓';
      btnText.textContent = 'সংরক্ষিত হয়েছে!';
      showSaveStatusPopup('success', 'পণ্যের বিস্তারিত তথ্য ও ৫টি ছবির গ্যালারি সফলভাবে সংরক্ষিত হয়েছে।');

      setTimeout(() => {
        btn.disabled = false;
        btn.style.background = '';
        btnIcon.textContent = '💾';
        btnText.textContent = 'পরিবর্তন সংরক্ষণ করুন (Save All Details)';
        closeEditProductModal();
        loadProducts();
      }, 1500);
    } else {
      const err = await res.json();
      btn.disabled = false;
      btn.style.background = '#ef4444';
      btnIcon.textContent = '⚠️';
      btnText.textContent = 'ব্যর্থ হয়েছে (Retry)';
      showSaveStatusPopup('error', err.error || 'সার্ভারে সংরক্ষণ করা যায়নি', () => saveProductDetails());
    }
  } catch (err) {
    btn.disabled = false;
    btn.style.background = '#ef4444';
    btnIcon.textContent = '⚠️';
    btnText.textContent = 'ব্যর্থ হয়েছে (Retry)';
    showSaveStatusPopup('error', 'নেটওয়ার্ক এরর: তথ্য আপডেট করা যায়নি', () => saveProductDetails());
  }
}
```

---

## 7. Admin CMS Styling (`public/admin/admin.css`)

In `Color fiesta/public/admin/admin.css`, append the CSS rules for the 5-slot grid, cropper overlays, and floating save status card:

```css
/* ==========================================================================
   Color Fiesta - Multi-Image Gallery & Cropper Styling
   ========================================================================== */

.gallery-grid-container {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

@media (max-width: 768px) {
  .gallery-grid-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

.gallery-slot-card {
  position: relative;
  aspect-ratio: 1 / 1;
  background: #f1f5f9;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.2s ease;
}

.gallery-slot-card.is-primary {
  border-color: #0d9488;
  box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.25);
}

.gallery-slot-card:hover {
  transform: translateY(-2px);
  border-color: #94a3b8;
}

.gallery-slot-card.slot-empty {
  border: 2px dashed #cbd5e1;
  background: #f8fafc;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
}

.gallery-slot-card.slot-empty:hover {
  border-color: #0d9488;
  background: #f0fdfa;
}

.gallery-slot-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-slot-badge {
  position: relative;
  z-index: 2;
  margin: 4px;
  align-self: flex-start;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
}

.gallery-slot-badge.badge-primary {
  background: #0d9488;
}

.gallery-slot-actions {
  position: relative;
  z-index: 2;
  display: flex;
  gap: 4px;
  padding: 4px;
  justify-content: flex-end;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
  opacity: 0;
  transition: opacity 0.2s;
}

.gallery-slot-card:hover .gallery-slot-actions {
  opacity: 1;
}

.slot-btn {
  background: rgba(0, 0, 0, 0.75);
  border: none;
  color: #fff;
  font-size: 11px;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slot-btn:hover {
  background: #0d9488;
}

.slot-btn.slot-delete-btn:hover {
  background: #ef4444;
}

.gallery-slot-footer {
  position: relative;
  z-index: 2;
  background: rgba(0, 0, 0, 0.7);
  color: #e2e8f0;
  font-size: 9px;
  text-align: center;
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Cropper Toolbar Ratio Buttons */
.cropper-ratio-btn {
  background: #1e293b;
  color: #cbd5e1;
  border: 1px solid #334155;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.cropper-ratio-btn.active,
.cropper-ratio-btn:hover {
  background: #0d9488;
  color: #fff;
  border-color: #0d9488;
}

/* Floating Save Status Popup */
.save-popup-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 99999;
  max-width: 380px;
  width: 90%;
  animation: slideInDown 0.25s ease-out;
}

@keyframes slideInDown {
  from { opacity: 0; transform: translateY(-15px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.save-popup-card {
  position: relative;
  background: #090d16;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.save-popup-card.status-saving {
  border-color: #0d9488;
}

.save-popup-card.status-success {
  border-color: #10b981;
}

.save-popup-card.status-error {
  border-color: #ef4444;
}

.save-popup-icon-box {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
  flex-shrink: 0;
}

.status-saving .save-popup-icon-box { background: rgba(13, 148, 136, 0.2); color: #0d9488; }
.status-success .save-popup-icon-box { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.status-error .save-popup-icon-box { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.save-popup-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
}

.status-saving .save-popup-progress { background: #0d9488; }
.status-success .save-popup-progress { background: #10b981; }

@keyframes shrinkLine {
  from { width: 100%; }
  to { width: 0%; }
}

@keyframes pulseLine {
  0% { opacity: 0.3; }
  50% { opacity: 1; }
  100% { opacity: 0.3; }
}
```

---

## 8. Storefront Frontend Changes

In `Color fiesta/public/js/app.js`, update `openProductDetail(productId)` to render interactive thumbnails beneath the main product image:

```javascript
// In openProductDetail(productId):
const gallery = Array.isArray(product.gallery) && product.gallery.length > 0 
  ? product.gallery 
  : (product.image ? [product.image] : []);

content.innerHTML = `
  <div class="product-detail-layout">
    <div class="detail-img-box">
      <img src="${product.image || gallery[0]}" alt="${product.name}" class="detail-img" id="mainProductDetailImg">
      ${gallery.length > 1 ? `
        <div class="detail-gallery-thumbs" style="display: flex; gap: 8px; margin-top: 10px; overflow-x: auto; padding: 4px 2px;">
          ${gallery.map((imgUrl, i) => `
            <img src="${imgUrl}" class="detail-gallery-thumb ${i === 0 ? 'active' : ''}"
                 style="width: 56px; height: 56px; border-radius: 6px; object-fit: cover; cursor: pointer; border: 2px solid ${i === 0 ? '#0f766e' : '#e2e8f0'}; transition: all 0.2s;"
                 onclick="switchStorefrontDetailImage('${imgUrl.replace(/'/g, "\\'")}', this)"
                 alt="Thumbnail">
          `).join('')}
        </div>
      ` : ''}
    </div>
    <div class="detail-info">
      <!-- rest of details -->
    </div>
  </div>
`;

// Helper: Switch main preview on thumbnail click
function switchStorefrontDetailImage(src, el) {
  const mainImg = document.getElementById('mainProductDetailImg');
  if (mainImg) mainImg.src = src;
  const thumbs = document.querySelectorAll('.detail-gallery-thumb');
  thumbs.forEach(t => {
    t.classList.remove('active');
    t.style.borderColor = '#e2e8f0';
  });
  if (el) {
    el.classList.add('active');
    el.style.borderColor = '#0f766e';
  }
}
```

---

## 9. Next.js Stack Blueprint Reference

If Color Fiesta is ported to Next.js (mirroring CureCare's `new-ecom` repo), copy these production components directly:

1. **`src/components/admin/ProductGallerySection.tsx`**:
   - 280px Hero Canvas with `object-contain`.
   - 5-slot grid with Primary Cover (`⭐`) and Hover badges.
   - Built-in drag-and-drop file upload, URL linking, and fullscreen lightbox.
2. **`src/components/admin/ImageCropperModal.tsx`**:
   - HTML5 Canvas high-resolution export.
   - 1:1, 4:5, 3:4, 16:9, Original presets.
   - Wheel & slider zoom (0.6x to 3x), pan positioning, and 90° clockwise rotation.
3. **`src/components/admin/SaveStatusPopup.tsx`**:
   - Fixed top-right floating toast with spring pop-in.
   - States: `saving`, `success` (4s countdown progress bar), `error` (retry button).

---

## 🚀 Execution Order for an AI Working on Color Fiesta

1. **Step 1**: Run `node database/migrate-gallery.js` to ensure the `additional_images` column exists in `colorfiesta.db`.
2. **Step 2**: Add `formatProductRecord` and the `/api/admin/upload-multiple` endpoint to `server.js`.
3. **Step 3**: Paste the `#editProductModal`, `#imageCropperModal`, and `#saveStatusPopup` markup into `public/admin/index.html`.
4. **Step 4**: Append the gallery, cropper, and popup handlers to `public/admin/admin.js`.
5. **Step 5**: Append the styling rules to `public/admin/admin.css`.
6. **Step 6**: Add the thumbnail switcher to `public/js/app.js`.
7. **Step 7**: Test locally at `http://localhost:3000/admin` with credentials `admin` / `colorfiesta123`.

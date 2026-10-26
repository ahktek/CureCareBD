// ==========================================================================
// CureCare - Robust Admin CMS Logic
// ==========================================================================

const AdminState = {
  token: localStorage.getItem('curecare_admin_token') || null,
  user: JSON.parse(localStorage.getItem('curecare_admin_user') || 'null'),
  currentTab: 'dashboard',
  orders: [],
  products: [],
  categories: [],
  coupons: [],
  banners: [],
  settings: {}
};

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupNav();
  setupLoginForm();
});

// -------------------------------------------------------------
// Authentication
// -------------------------------------------------------------
function checkAuth() {
  if (AdminState.token && AdminState.user) {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('adminLayout').style.display = 'flex';
    document.getElementById('adminUsername').textContent = AdminState.user.name || AdminState.user.username;
    loadDashboard();
  } else {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('adminLayout').style.display = 'none';
  }
}

function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();
    const errEl = document.getElementById('loginError');

    errEl.style.display = 'none';
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      const data = await res.json();

      if (res.ok && data.token) {
        AdminState.token = data.token;
        AdminState.user = data.admin;
        localStorage.setItem('curecare_admin_token', data.token);
        localStorage.setItem('curecare_admin_user', JSON.stringify(data.admin));
        checkAuth();
      } else {
        errEl.textContent = data.error || 'ভুল তথ্য!';
        errEl.style.display = 'block';
      }
    } catch (err) {
      errEl.textContent = 'সার্ভারে কানেক্ট করা যাচ্ছে না';
      errEl.style.display = 'block';
    }
  });
}

function logout() {
  localStorage.removeItem('curecare_admin_token');
  localStorage.removeItem('curecare_admin_user');
  AdminState.token = null;
  AdminState.user = null;
  checkAuth();
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AdminState.token}`
  };
}

// -------------------------------------------------------------
// Navigation Tabs
// -------------------------------------------------------------
function setupNav() {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tab) {
  AdminState.currentTab = tab;
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));

  const navEl = document.querySelector(`.sidebar-nav .nav-item[data-tab="${tab}"]`);
  const pageEl = document.getElementById(`view-${tab}`);

  if (navEl) navEl.classList.add('active');
  if (pageEl) pageEl.classList.add('active');

  const titles = {
    dashboard: '📊 ড্যাশবোর্ড ওভারভিউ',
    orders: '📦 অর্ডার ম্যানেজমেন্ট (CMS)',
    products: '🌿 পণ্য ম্যানেজমেন্ট (Products)',
    categories: '📁 ক্যাটাগরি ম্যানেজমেন্ট',
    coupons: '🏷️ ডিসকাউন্ট কুপন',
    banners: '🖼️ ব্যানার ও ক্যাম্পেইন',
    settings: '⚙️ স্টোর সেটিংস'
  };
  document.getElementById('pageTitle').textContent = titles[tab] || 'Admin';

  if (tab === 'dashboard') loadDashboard();
  if (tab === 'orders') loadOrders();
  if (tab === 'products') loadProducts();
  if (tab === 'categories') loadCategories();
  if (tab === 'coupons') loadCoupons();
  if (tab === 'banners') loadBanners();
  if (tab === 'settings') loadSettings();
}

// -------------------------------------------------------------
// 1. Dashboard Tab
// -------------------------------------------------------------
async function loadDashboard() {
  try {
    const res = await fetch('/api/admin/stats', { headers: authHeaders() });
    const data = await res.json();

    document.getElementById('statRevenue').textContent = `৳${data.totalRevenue.toLocaleString()}`;
    document.getElementById('statTotalOrders').textContent = data.totalOrders;
    document.getElementById('statPendingOrders').textContent = data.pendingOrders;
    document.getElementById('statProductsCount').textContent = data.totalProducts;

    // Render Recent Orders
    const tbody = document.getElementById('recentOrdersTbody');
    if (tbody) {
      tbody.innerHTML = data.recentOrders.map(o => `
        <tr>
          <td><strong>${o.order_number}</strong></td>
          <td>${o.customer_name}<br><small style="color: #64748b;">${o.customer_phone}</small></td>
          <td><strong style="color: var(--admin-primary);">৳${o.total}</strong></td>
          <td>${o.payment_method.toUpperCase()}</td>
          <td><span class="status-badge status-${o.order_status}">${o.order_status}</span></td>
          <td>${new Date(o.created_at).toLocaleDateString('bn-BD')}</td>
          <td>
            <a href="/invoice.html?order=${o.order_number}" target="_blank" class="btn-sm" style="text-decoration: none;">📄 ইনভয়েস</a>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// -------------------------------------------------------------
// 2. Orders Tab
// -------------------------------------------------------------
async function loadOrders(status = 'all', search = '') {
  try {
    const url = `/api/admin/orders?status=${status}&search=${encodeURIComponent(search)}`;
    const res = await fetch(url, { headers: authHeaders() });
    const orders = await res.json();
    AdminState.orders = orders;

    const tbody = document.getElementById('ordersTableTbody');
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td>
          <strong>${o.order_number}</strong>
          <div style="font-size: 11px; color: #64748b;">${new Date(o.created_at).toLocaleDateString('bn-BD')}</div>
        </td>
        <td>
          <strong>${o.customer_name}</strong>
          <div style="font-size: 12px; color: #0284c7;">📞 ${o.customer_phone}</div>
          <div style="font-size: 11px; color: #64748b; max-width: 220px;">📍 ${o.customer_address}</div>
        </td>
        <td>
          <div style="font-size: 12px; font-weight: 600;">${o.items.map(i => `${i.name} (${i.weight}) × ${i.quantity}`).join('<br>')}</div>
        </td>
        <td>
          <strong style="color: var(--admin-primary); font-size: 14px;">৳${o.total}</strong>
          <div style="font-size: 11px; color: #64748b;">${o.delivery_zone === 'outside_dhaka' ? 'ঢাকার বাইরে' : 'ঢাকার ভিতরে'}</div>
        </td>
        <td>
          <select class="btn-sm" style="font-weight: 700;" onchange="updateOrderStatus(${o.id}, this.value)">
            <option value="pending" ${o.order_status === 'pending' ? 'selected' : ''}>Pending (গৃহীত)</option>
            <option value="confirmed" ${o.order_status === 'confirmed' ? 'selected' : ''}>Confirmed (নিশ্চিত)</option>
            <option value="processing" ${o.order_status === 'processing' ? 'selected' : ''}>Processing (প্যাকিং)</option>
            <option value="shipped" ${o.order_status === 'shipped' ? 'selected' : ''}>Shipped (কুরিয়ারে)</option>
            <option value="delivered" ${o.order_status === 'delivered' ? 'selected' : ''}>Delivered (সম্পন্ন)</option>
            <option value="cancelled" ${o.order_status === 'cancelled' ? 'selected' : ''}>Cancelled (বাতিল)</option>
          </select>
        </td>
        <td>
          <input type="text" class="btn-sm" placeholder="ট্র্যাকিং আইডি দিন" value="${o.courier_tracking || ''}"
            onchange="updateCourierTracking(${o.id}, this.value)" style="width: 130px;">
        </td>
        <td>
          <div style="display: flex; gap: 4px;">
            <a href="/invoice.html?order=${o.order_number}" target="_blank" class="btn-sm" title="ইনভয়েস">📄</a>
            <button onclick="deleteOrder(${o.id})" class="btn-sm btn-danger-sm" title="ডিলিট">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load orders:', err);
  }
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ order_status: newStatus })
    });
    alert('অর্ডার স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে!');
  } catch (err) {
    alert('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে');
  }
}

async function updateCourierTracking(orderId, code) {
  try {
    await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ courier_tracking: code })
    });
    alert('কুরিয়ার ট্র্যাকিং কোড সেভ করা হয়েছে!');
  } catch (err) {
    alert('সেভ করতে সমস্যা হয়েছে');
  }
}

async function deleteOrder(id) {
  if (!confirm('আপনি কি নিশ্চিত এই অর্ডারটি ডিলিট করতে চান?')) return;
  try {
    await fetch(`/api/admin/orders/${id}`, { method: 'DELETE', headers: authHeaders() });
    loadOrders();
  } catch (err) {
    alert('অর্ডার ডিলিট করা যায়নি');
  }
}

// -------------------------------------------------------------
// 3. Products Tab
// -------------------------------------------------------------
async function loadProducts() {
  try {
    const res = await fetch('/api/admin/products', { headers: authHeaders() });
    const products = await res.json();
    AdminState.products = products;

    const tbody = document.getElementById('productsTableTbody');
    tbody.innerHTML = products.map(p => {
      const galleryCount = (p.gallery && p.gallery.length) || (p.image ? 1 : 0);
      return `
      <tr>
        <td>
          <div style="position: relative; width: 44px; height: 44px; display: inline-block;">
            <img src="${p.image || (p.gallery && p.gallery[0]) || '/images/placeholder.png'}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
            ${galleryCount > 1 ? `<span style="position: absolute; bottom: -3px; right: -3px; background: #0f766e; color: #fff; font-size: 9px; font-weight: 700; border-radius: 10px; padding: 1px 5px; border: 1px solid #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.2);">${galleryCount}</span>` : ''}
          </div>
        </td>
        <td>
          <strong>${p.name_bn || p.name}</strong>
          <div style="font-size: 11px; color: #64748b;">${p.name} | SKU: ${p.sku || 'N/A'}</div>
          ${p.is_active === 0 ? '<span style="font-size: 10px; background: #fee2e2; color: #b91c1c; padding: 1px 5px; border-radius: 4px; font-weight: 600;">নিষ্ক্রিয় (Hidden)</span>' : ''}
          ${p.is_featured ? '<span style="font-size: 10px; background: #fef3c7; color: #b45309; padding: 1px 5px; border-radius: 4px; font-weight: 600; margin-left: 4px;">ফিচার্ড ⭐</span>' : ''}
        </td>
        <td>${p.category_name_bn || p.category_name || '-'}</td>
        <td>
          <strong>৳${p.discount_price || p.base_price}</strong>
          ${p.discount_price ? `<span style="text-decoration: line-through; color: #94a3b8; font-size: 11px; margin-left: 4px;">৳${p.base_price}</span>` : ''}
        </td>
        <td>
          <span style="font-weight: 700; color: ${p.stock <= 10 ? '#ef4444' : '#10b981'};">
            ${p.stock} টি
          </span>
        </td>
        <td>${p.variations ? p.variations.length : 0} টি সাইজ</td>
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
      </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load products:', err);
  }
}

function openAddProductModal() {
  // Populate category select
  const catSelect = document.getElementById('prodCategory');
  catSelect.innerHTML = AdminState.categories.map(c => `
    <option value="${c.id}">${c.name_bn || c.name}</option>
  `).join('');

  document.getElementById('addProductModal').classList.add('active');
}

function closeAddProductModal() {
  document.getElementById('addProductModal').classList.remove('active');
}

async function handleNewProductImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
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
      document.getElementById('prodImage').value = data.url;
      alert('ছবি সফলভাবে আপলোড হয়েছে!');
    } else {
      alert(data.error || 'ছবি আপলোড করা যায়নি');
    }
  } catch (err) {
    alert('ছবি আপলোডে এরর হয়েছে');
  }
}

async function saveProduct(e) {
  e.preventDefault();

  const name = document.getElementById('prodNameEn').value.trim();
  const name_bn = document.getElementById('prodNameBn').value.trim();
  const category_id = document.getElementById('prodCategory').value;
  const base_price = parseFloat(document.getElementById('prodPrice').value);
  const discount_price = parseFloat(document.getElementById('prodDiscountPrice').value) || null;
  const stock = parseInt(document.getElementById('prodStock').value) || 100;
  const sku = document.getElementById('prodSku').value.trim();
  const image = document.getElementById('prodImage').value.trim();
  const short_desc = document.getElementById('prodShortDesc').value.trim();
  const description = document.getElementById('prodDesc').value.trim();

  // Handle variations
  const varWeight = document.getElementById('prodVarWeight').value.trim();
  const varPrice = parseFloat(document.getElementById('prodVarPrice').value);
  const variations = [];
  if (varWeight && varPrice) {
    variations.push({ weight: varWeight, price: varPrice, discount_price: varPrice, stock: 50 });
  }

  const payload = {
    name, name_bn, category_id, base_price, discount_price, stock, sku,
    image, additional_images: [image], short_desc, description, variations, is_featured: 1
  };

  try {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert('নতুন পণ্য সফলভাবে যুক্ত হয়েছে! এখন আপনি "Edit Details" থেকে একাধিক ছবি যোগ করতে পারবেন।');
      closeAddProductModal();
      loadProducts();
    } else {
      alert('পণ্য যোগ করতে সমস্যা হয়েছে');
    }
  } catch (err) {
    alert('সার্ভার এরর');
  }
}

// -------------------------------------------------------------
// Edit Product Details & Gallery Logic
// -------------------------------------------------------------
AdminState.editingProductId = null;
AdminState.editingGallery = [];
AdminState.editingPrimaryImage = '';
AdminState.editingVariations = [];

async function openEditProductModal(productId) {
  let product = AdminState.products.find(p => p.id === productId);
  if (!product) {
    try {
      const res = await fetch(`/api/products/${productId}`);
      product = await res.json();
    } catch (e) {
      console.error(e);
    }
  }
  if (!product) {
    alert('পণ্য খুঁজে পাওয়া যায়নি');
    return;
  }

  AdminState.editingProductId = product.id;
  document.getElementById('editProdId').value = product.id;
  document.getElementById('editProdNameEn').value = product.name || '';
  document.getElementById('editProdNameBn').value = product.name_bn || '';
  document.getElementById('editProdSku').value = product.sku || '';
  document.getElementById('editProdPrice').value = product.base_price || '';
  document.getElementById('editProdDiscountPrice').value = product.discount_price || '';
  document.getElementById('editProdStock').value = product.stock !== undefined ? product.stock : 100;
  document.getElementById('editProdIsActive').checked = product.is_active !== 0;
  document.getElementById('editProdIsFeatured').checked = !!product.is_featured;
  document.getElementById('editProdShortDesc').value = product.short_desc || '';
  document.getElementById('editProdDesc').value = product.description || '';

  // Populate categories
  const catSelect = document.getElementById('editProdCategory');
  catSelect.innerHTML = AdminState.categories.map(c => `
    <option value="${c.id}" ${c.id === product.category_id ? 'selected' : ''}>${c.name_bn || c.name}</option>
  `).join('');

  // Variations
  AdminState.editingVariations = Array.isArray(product.variations) ? JSON.parse(JSON.stringify(product.variations)) : [];
  renderEditVariations();

  // Unified Gallery Construction: link placeholder image and all additional images
  let gallery = [];
  if (Array.isArray(product.gallery) && product.gallery.length > 0) {
    gallery = [...product.gallery];
  } else {
    if (product.image) gallery.push(product.image);
    if (Array.isArray(product.additional_images)) {
      product.additional_images.forEach(img => {
        if (img && !gallery.includes(img)) gallery.push(img);
      });
    }
  }

  // Filter invalid or blank strings
  gallery = gallery.filter(img => img && typeof img === 'string' && img.trim().length > 0);

  AdminState.editingGallery = gallery;
  AdminState.editingPrimaryImage = product.image || (gallery[0] || '');
  renderEditGallery();

  document.getElementById('editProductModal').classList.add('active');
}

function closeEditProductModal() {
  document.getElementById('editProductModal').classList.remove('active');
  AdminState.editingProductId = null;
  AdminState.editingGallery = [];
  AdminState.editingPrimaryImage = '';
}

function renderEditGallery() {
  const container = document.getElementById('editGalleryGrid');
  const countSpan = document.getElementById('editGalleryCount');
  if (countSpan) countSpan.textContent = AdminState.editingGallery.length;

  if (!AdminState.editingGallery || AdminState.editingGallery.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: #94a3b8; font-size: 13px; padding: 24px;">
        📸 এই পণ্যের গ্যালারিতে কোনো ছবি নেই। নিচে থেকে একাধিক ফাইল আপলোড করুন অথবা ছবির লিঙ্ক যোগ করুন।
      </div>
    `;
    return;
  }

  // Ensure there is always a primary image if gallery has items
  if (!AdminState.editingPrimaryImage && AdminState.editingGallery.length > 0) {
    AdminState.editingPrimaryImage = AdminState.editingGallery[0];
  }

  container.innerHTML = AdminState.editingGallery.map((imgUrl, idx) => {
    const isPrimary = (imgUrl === AdminState.editingPrimaryImage);
    const safeUrl = imgUrl.replace(/"/g, '&quot;');
    return `
      <div class="gallery-card ${isPrimary ? 'is-primary' : ''}">
        <div class="gallery-card-img-wrap">
          ${isPrimary ? '<span class="gallery-primary-badge">⭐ প্রধান ছবি</span>' : ''}
          <img src="${safeUrl}" class="gallery-card-img" alt="Gallery Photo" onerror="this.src='/images/placeholder.png'">
        </div>
        <div class="gallery-card-actions">
          ${isPrimary ? `
            <span style="font-size: 11px; color: #0d9488; font-weight: 700;">প্রধান</span>
          ` : `
            <button type="button" onclick="setGalleryPrimaryImage(${idx})" class="gallery-btn-action gallery-btn-set-main" title="এই ছবিকে মূল/প্রধান ছবি বানান">
              ⭐ প্রধান বানান
            </button>
          `}
          <button type="button" onclick="removeGalleryImage(${idx})" class="gallery-btn-action gallery-btn-delete" title="গ্যালারি থেকে মুছে ফেলুন">
            🗑️ মুছুন
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function setGalleryPrimaryImage(index) {
  if (AdminState.editingGallery[index]) {
    AdminState.editingPrimaryImage = AdminState.editingGallery[index];
    renderEditGallery();
  }
}

function removeGalleryImage(index) {
  const removedUrl = AdminState.editingGallery.splice(index, 1)[0];
  if (removedUrl === AdminState.editingPrimaryImage) {
    AdminState.editingPrimaryImage = AdminState.editingGallery[0] || '';
  }
  renderEditGallery();
}

async function handleGalleryUploadFiles(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  const progressEl = document.getElementById('uploadProgressText');
  if (progressEl) {
    progressEl.style.display = 'block';
    progressEl.textContent = `⏳ ${files.length} টি ছবি আপলোড হচ্ছে...`;
  }

  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('images', files[i]);
  }

  try {
    const res = await fetch('/api/admin/upload-multiple', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AdminState.token}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.urls && data.urls.length > 0) {
      data.urls.forEach(url => {
        if (!AdminState.editingGallery.includes(url)) {
          AdminState.editingGallery.push(url);
        }
      });
      if (!AdminState.editingPrimaryImage && AdminState.editingGallery.length > 0) {
        AdminState.editingPrimaryImage = AdminState.editingGallery[0];
      }
      renderEditGallery();
    } else {
      alert(data.error || 'ছবি আপলোড করতে ব্যর্থ হয়েছে');
    }
  } catch (err) {
    console.error('Gallery file upload error:', err);
    alert('সার্ভারে ছবি আপলোড করতে সমস্যা হয়েছে');
  } finally {
    if (progressEl) progressEl.style.display = 'none';
    e.target.value = '';
  }
}

function addUrlToEditGallery() {
  const input = document.getElementById('editGalleryUrlInput');
  const url = input.value.trim();
  if (!url) {
    alert('অনুগ্রহ করে ছবির একটি বৈধ URL লিখুন');
    return;
  }
  if (!AdminState.editingGallery.includes(url)) {
    AdminState.editingGallery.push(url);
  }
  if (!AdminState.editingPrimaryImage) {
    AdminState.editingPrimaryImage = url;
  }
  input.value = '';
  renderEditGallery();
}

// Edit Variations Rows
function renderEditVariations() {
  const container = document.getElementById('editVariationsList');
  if (!container) return;
  if (!AdminState.editingVariations || AdminState.editingVariations.length === 0) {
    container.innerHTML = `<div style="font-size: 12px; color: #94a3b8;">কোনো অতিরিক্ত ভেরিয়েশন সাইজ যুক্ত নেই (ঐচ্ছিক)।</div>`;
    return;
  }

  container.innerHTML = AdminState.editingVariations.map((v, i) => `
    <div style="display: flex; gap: 8px; align-items: center; background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
      <input type="text" placeholder="ওজন/সাইজ (যেমন: 500g)" value="${v.weight || ''}" onchange="updateEditVariation(${i}, 'weight', this.value)" class="btn-sm" style="flex: 2; padding: 6px;">
      <input type="number" placeholder="রেগুলার মূল্য" value="${v.price || ''}" onchange="updateEditVariation(${i}, 'price', this.value)" class="btn-sm" style="flex: 1.5; padding: 6px;">
      <input type="number" placeholder="অফার মূল্য" value="${v.discount_price || ''}" onchange="updateEditVariation(${i}, 'discount_price', this.value)" class="btn-sm" style="flex: 1.5; padding: 6px;">
      <input type="number" placeholder="স্টক" value="${v.stock !== undefined ? v.stock : 50}" onchange="updateEditVariation(${i}, 'stock', this.value)" class="btn-sm" style="flex: 1; padding: 6px;">
      <button type="button" onclick="removeEditVariation(${i})" class="btn-sm btn-danger-sm" style="padding: 6px 10px;" title="ভেরিয়েশন মুছে ফেলুন">✕</button>
    </div>
  `).join('');
}

function addEditVariationRow() {
  AdminState.editingVariations.push({ weight: '', price: 0, discount_price: 0, stock: 50 });
  renderEditVariations();
}

function updateEditVariation(idx, field, val) {
  if (!AdminState.editingVariations[idx]) return;
  if (field === 'weight') {
    AdminState.editingVariations[idx].weight = val;
  } else {
    AdminState.editingVariations[idx][field] = parseFloat(val) || 0;
  }
}

function removeEditVariation(idx) {
  AdminState.editingVariations.splice(idx, 1);
  renderEditVariations();
}

async function saveProductDetails(e) {
  e.preventDefault();

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

  // Validate gallery has at least 1 image
  const primaryImage = AdminState.editingPrimaryImage || (AdminState.editingGallery[0] || null);
  const additionalImages = AdminState.editingGallery.filter(url => url !== primaryImage);

  // Clean variations
  const validVariations = AdminState.editingVariations.filter(v => v.weight && v.price);

  const payload = {
    name,
    name_bn,
    category_id,
    sku,
    base_price,
    discount_price,
    stock,
    is_active,
    is_featured,
    short_desc,
    description,
    variations: validVariations,
    image: primaryImage,
    additional_images: additionalImages
  };

  try {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert('পণ্যের বিস্তারিত তথ্য ও গ্যালারি সফলভাবে সংরক্ষিত হয়েছে!');
      closeEditProductModal();
      loadProducts();
    } else {
      const err = await res.json();
      alert(err.error || 'পণ্য আপডেট করা সম্ভব হয়নি');
    }
  } catch (err) {
    console.error('Error saving product details:', err);
    alert('সার্ভার এরর: তথ্য আপডেট করা সম্ভব হয়নি');
  }
}

async function deleteProduct(id) {
  if (!confirm('আপনি কি নিশ্চিত এই পণ্যটি ডিলিট করতে চান?')) return;
  try {
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE', headers: authHeaders() });
    loadProducts();
  } catch (err) {
    alert('পণ্য ডিলিট করা যায়নি');
  }
}

// -------------------------------------------------------------
// 4. Categories Tab
// -------------------------------------------------------------
async function loadCategories() {
  try {
    const res = await fetch('/api/admin/categories', { headers: authHeaders() });
    const categories = await res.json();
    AdminState.categories = categories;

    const tbody = document.getElementById('categoriesTableTbody');
    tbody.innerHTML = categories.map(c => `
      <tr>
        <td style="font-size: 20px;">${c.icon || '🌿'}</td>
        <td><strong>${c.name_bn || c.name}</strong></td>
        <td>${c.name}</td>
        <td><code>${c.slug}</code></td>
        <td>
          <button onclick="deleteCategory(${c.id})" class="btn-sm btn-danger-sm">🗑️ ডিলিট</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function addCategory(e) {
  e.preventDefault();
  const name = document.getElementById('catNameEn').value.trim();
  const name_bn = document.getElementById('catNameBn').value.trim();
  const icon = document.getElementById('catIcon').value.trim() || '🌿';

  if (!name) return;

  try {
    await fetch('/api/admin/categories', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, name_bn, icon })
    });
    document.getElementById('catNameEn').value = '';
    document.getElementById('catNameBn').value = '';
    loadCategories();
  } catch (err) {
    alert('ক্যাটাগরি তৈরি করতে সমস্যা হয়েছে');
  }
}

async function deleteCategory(id) {
  if (!confirm('ক্যাটাগরি ডিলিট করতে চান?')) return;
  try {
    await fetch(`/api/admin/categories/${id}`, { method: 'DELETE', headers: authHeaders() });
    loadCategories();
  } catch (err) {
    alert('ডিলিট করা যায়নি');
  }
}

// -------------------------------------------------------------
// 5. Coupons Tab
// -------------------------------------------------------------
async function loadCoupons() {
  try {
    const res = await fetch('/api/admin/coupons', { headers: authHeaders() });
    const coupons = await res.json();
    AdminState.coupons = coupons;

    const tbody = document.getElementById('couponsTableTbody');
    tbody.innerHTML = coupons.map(c => `
      <tr>
        <td><strong style="color: var(--admin-primary); font-family: 'Outfit';">${c.code}</strong></td>
        <td>${c.discount_type === 'percentage' ? `${c.discount_value}% ছাড়` : `৳${c.discount_value} ফ্ল্যাট ছাড়`}</td>
        <td>৳${c.min_spend || 0}</td>
        <td>${c.uses_count || 0} বার</td>
        <td>
          <button onclick="deleteCoupon(${c.id})" class="btn-sm btn-danger-sm">🗑️ ডিলিট</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function addCoupon(e) {
  e.preventDefault();
  const code = document.getElementById('couponCode').value.trim();
  const type = document.getElementById('couponType').value;
  const value = document.getElementById('couponValue').value;
  const minSpend = document.getElementById('couponMinSpend').value || 0;

  try {
    await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ code, discount_type: type, discount_value: value, min_spend: minSpend })
    });
    document.getElementById('couponCode').value = '';
    document.getElementById('couponValue').value = '';
    loadCoupons();
  } catch (err) {
    alert('কুপন তৈরি করা যায়নি');
  }
}

async function deleteCoupon(id) {
  if (!confirm('কুপনটি ডিলিট করতে চান?')) return;
  try {
    await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE', headers: authHeaders() });
    loadCoupons();
  } catch (err) {
    alert('ডিলিট করা যায়নি');
  }
}

// -------------------------------------------------------------
// 6. Banners Tab
// -------------------------------------------------------------
async function loadBanners() {
  try {
    const res = await fetch('/api/admin/banners', { headers: authHeaders() });
    const banners = await res.json();
    AdminState.banners = banners;

    const tbody = document.getElementById('bannersTableTbody');
    tbody.innerHTML = banners.map(b => `
      <tr>
        <td><img src="${b.image}" style="width: 80px; height: 45px; border-radius: 4px; object-fit: cover;"></td>
        <td><strong>${b.title_bn || b.title}</strong></td>
        <td>${b.subtitle_bn || b.subtitle || '-'}</td>
        <td>${b.button_text || 'অর্ডার করুন'}</td>
        <td>
          <button onclick="deleteBanner(${b.id})" class="btn-sm btn-danger-sm">🗑️ ডিলিট</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function addBanner(e) {
  e.preventDefault();
  const title = document.getElementById('bannerTitleEn').value.trim();
  const title_bn = document.getElementById('bannerTitleBn').value.trim();
  const subtitle_bn = document.getElementById('bannerSubtitleBn').value.trim();
  const image = document.getElementById('bannerImage').value.trim();
  const button_text = document.getElementById('bannerBtnText').value.trim();

  try {
    await fetch('/api/admin/banners', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title, title_bn, subtitle_bn, image, button_text })
    });
    alert('নতুন ব্যানার তৈরি হয়েছে!');
    loadBanners();
  } catch (err) {
    alert('ব্যানার তৈরি করা যায়নি');
  }
}

async function deleteBanner(id) {
  if (!confirm('ব্যানার ডিলিট করতে চান?')) return;
  try {
    await fetch(`/api/admin/banners/${id}`, { method: 'DELETE', headers: authHeaders() });
    loadBanners();
  } catch (err) {
    alert('ডিলিট করা যায়নি');
  }
}

// -------------------------------------------------------------
// 7. Settings Tab
// -------------------------------------------------------------
async function loadSettings() {
  try {
    const res = await fetch('/api/admin/settings', { headers: authHeaders() });
    const settings = await res.json();
    AdminState.settings = settings;

    document.getElementById('setStoreName').value = settings.store_name || '';
    document.getElementById('setPhone').value = settings.phone || '';
    document.getElementById('setWhatsApp').value = settings.whatsapp || '';
    document.getElementById('setEmail').value = settings.email || '';
    document.getElementById('setAddress').value = settings.address || '';
    document.getElementById('setInsideDhaka').value = settings.delivery_inside_dhaka || '70';
    document.getElementById('setOutsideDhaka').value = settings.delivery_outside_dhaka || '130';
    document.getElementById('setBkash').value = settings.bkash_number || '';
    document.getElementById('setNagad').value = settings.nagad_number || '';
    document.getElementById('setAnnouncement').value = settings.announcement || '';
  } catch (err) {
    console.error(err);
  }
}

async function saveSettings(e) {
  e.preventDefault();

  const payload = {
    store_name: document.getElementById('setStoreName').value.trim(),
    phone: document.getElementById('setPhone').value.trim(),
    whatsapp: document.getElementById('setWhatsApp').value.trim(),
    email: document.getElementById('setEmail').value.trim(),
    address: document.getElementById('setAddress').value.trim(),
    delivery_inside_dhaka: document.getElementById('setInsideDhaka').value.trim(),
    delivery_outside_dhaka: document.getElementById('setOutsideDhaka').value.trim(),
    bkash_number: document.getElementById('setBkash').value.trim(),
    nagad_number: document.getElementById('setNagad').value.trim(),
    announcement: document.getElementById('setAnnouncement').value.trim()
  };

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert('সকল সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
    }
  } catch (err) {
    alert('সেটিংস সংরক্ষণ করা যায়নি');
  }
}

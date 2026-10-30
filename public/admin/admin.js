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
// 3. Products Tab (Dual Edit Architecture & Real-Time Gallery)
// -------------------------------------------------------------
AdminState.editingProductId = null;
AdminState.editingGallery = [];
AdminState.editingPrimaryImage = '';
AdminState.editingVariations = [];
AdminState.cropperState = {
  targetIndex: 0,
  imageSrc: '',
  zoom: 1,
  rotation: 0,
  pan: { x: 0, y: 0 },
  aspectRatio: 1
};

async function loadProducts() {
  try {
    const res = await fetch('/api/admin/products', { headers: authHeaders() });
    const products = await res.json();
    AdminState.products = products;
    renderProductsTable();
  } catch (err) {
    console.error('Failed to load products:', err);
  }
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTableTbody');
  if (!tbody) return;

  tbody.innerHTML = AdminState.products.map(p => {
    const galleryCount = (p.gallery && p.gallery.length) || (p.image ? 1 : 0);
    const isOutOfStock = p.stock !== undefined && p.stock !== null && p.stock <= 0;
    const stockDisplay = isOutOfStock
      ? '<span style="background: #fee2e2; color: #b91c1c; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 11px;">স্টক শেষ (Out)</span>'
      : `<span style="font-weight: 700; color: ${p.stock <= 10 ? '#f59e0b' : '#10b981'};">${p.stock} টি</span>`;

    return `
    <tr>
      <td>
        <div style="position: relative; width: 44px; height: 44px; display: inline-block;">
          <img src="${p.image || (p.gallery && p.gallery[0]) || '/images/placeholder.png'}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
          ${galleryCount > 1 ? `<span style="position: absolute; bottom: -3px; right: -3px; background: #0f766e; color: #fff; font-size: 9px; font-weight: 700; border-radius: 10px; padding: 1px 5px; border: 1px solid #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.2);" title="${galleryCount} টি ছবি গ্যালারিতে আছে">${galleryCount}</span>` : ''}
        </div>
      </td>
      <td>
        <strong>${p.name_bn || p.name}</strong>
        <div style="font-size: 11px; color: #64748b;">${p.name} | SKU: ${p.sku || 'N/A'}</div>
        <div style="margin-top: 4px; display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
          <button type="button" onclick="toggleProductActive(${p.id}, event)" class="status-toggle-btn ${p.is_active ? 'active' : 'inactive'}" title="ক্লিক করে স্ট্যাটাস পরিবর্তন করুন">
            ${p.is_active ? '🟢 সক্রিয় (Live)' : '⚪ নিষ্ক্রিয় (Hidden)'}
          </button>
          ${p.is_featured ? '<span style="font-size: 10px; background: #fef3c7; color: #b45309; padding: 1px 5px; border-radius: 4px; font-weight: 600;">ফিচার্ড ⭐</span>' : ''}
        </div>
      </td>
      <td>${p.category_name_bn || p.category_name || '-'}</td>
      <td>
        <strong>৳${p.discount_price || p.base_price}</strong>
        ${p.discount_price ? `<span style="text-decoration: line-through; color: #94a3b8; font-size: 11px; margin-left: 4px;">৳${p.base_price}</span>` : ''}
      </td>
      <td>${stockDisplay}</td>
      <td>${p.variations ? p.variations.length : 0} টি ভেরিয়েন্ট</td>
      <td>
        <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
          <button onclick="openQuickEditModal(${p.id})" class="btn-sm" style="background: #0284c7; color: #fff; font-weight: 600; padding: 5px 9px; border-radius: 4px; border: none; cursor: pointer;" title="মূল্য ও স্টক কুইক এডিট করুন">
            ⚡ Quick Edit
          </button>
          <button onclick="openEditProductModal(${p.id})" class="btn-sm" style="background: #0d9488; color: #fff; font-weight: 600; padding: 5px 9px; border-radius: 4px; border: none; cursor: pointer;" title="গ্যালারি, ছবি ক্রপার ও বিস্তারিত এডিট করুন">
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
}

// -------------------------------------------------------------
// 1-Click Fast Visibility Toggle
// -------------------------------------------------------------
async function toggleProductActive(id, event) {
  if (event) event.stopPropagation();
  try {
    const res = await fetch(`/api/admin/products/${id}/toggle-status`, {
      method: 'PATCH',
      headers: authHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      const p = AdminState.products.find(item => item.id == id);
      if (p) p.is_active = data.is_active;
      showSaveStatusPopup('success', `পণ্যের স্ট্যাটাস ${data.is_active ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Hidden)'} করা হয়েছে`);
      renderProductsTable();
    } else {
      alert('স্ট্যাটাস পরিবর্তন করা সম্ভব হয়নি');
    }
  } catch (err) {
    alert('সার্ভার এরর: ' + err.message);
  }
}

// -------------------------------------------------------------
// Quick Edit Modal Logic
// -------------------------------------------------------------
function openQuickEditModal(id) {
  const p = AdminState.products.find(item => item.id == id);
  if (!p) return;

  document.getElementById('quickEditProdId').value = p.id;
  document.getElementById('quickEditProdSubtitle').textContent = `${p.name_bn || p.name} (SKU: ${p.sku || 'N/A'})`;

  // Categories
  const catSelect = document.getElementById('quickEditProdCategory');
  catSelect.innerHTML = AdminState.categories.map(c => `
    <option value="${c.id}" ${p.category_id == c.id ? 'selected' : ''}>${c.name_bn || c.name}</option>
  `).join('');

  document.getElementById('quickEditProdPrice').value = p.base_price || '';
  document.getElementById('quickEditProdDiscountPrice').value = p.discount_price || '';
  document.getElementById('quickEditProdStock').value = p.stock !== undefined ? p.stock : 100;
  document.getElementById('quickEditProdIsActive').checked = p.is_active !== 0;
  document.getElementById('quickEditProdIsFeatured').checked = !!p.is_featured;

  document.getElementById('quickEditProductModal').classList.add('active');
}

function closeQuickEditModal() {
  document.getElementById('quickEditProductModal').classList.remove('active');
}

function openEditDetailsFromQuickEdit() {
  const id = document.getElementById('quickEditProdId').value;
  closeQuickEditModal();
  if (id) openEditProductModal(id);
}

async function saveQuickEdit(e) {
  if (e) e.preventDefault();
  const id = document.getElementById('quickEditProdId').value;
  if (!id) return;

  const payload = {
    category_id: document.getElementById('quickEditProdCategory').value,
    base_price: parseFloat(document.getElementById('quickEditProdPrice').value),
    discount_price: document.getElementById('quickEditProdDiscountPrice').value ? parseFloat(document.getElementById('quickEditProdDiscountPrice').value) : null,
    stock: parseInt(document.getElementById('quickEditProdStock').value) || 0,
    is_active: document.getElementById('quickEditProdIsActive').checked ? 1 : 0,
    is_featured: document.getElementById('quickEditProdIsFeatured').checked ? 1 : 0
  };

  try {
    showSaveStatusPopup('saving', 'কুইক এডিট আপডেট হচ্ছে...');
    const res = await fetch(`/api/admin/products/${id}/quick-edit`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AdminState.token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showSaveStatusPopup('success', 'মূল্য ও স্টক সফলভাবে সংরক্ষিত হয়েছে!');
      closeQuickEditModal();
      await loadProducts();
    } else {
      const err = await res.json();
      showSaveStatusPopup('error', err.error || 'আপডেট করতে সমস্যা হয়েছে');
    }
  } catch (err) {
    showSaveStatusPopup('error', err.message);
  }
}

// -------------------------------------------------------------
// Add Product Modal
// -------------------------------------------------------------
function openAddProductModal() {
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
      alert('নতুন পণ্য সফলভাবে যোগ করা হয়েছে! এখন আপনি "Edit Details" থেকে একাধিক ছবি ও ক্রপ সুবিধা পরিচালনা করতে পারেন।');
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
// Detailed Edit Product & 5-Slot Gallery Logic
// -------------------------------------------------------------
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
    alert('পণ্যের তথ্য পাওয়া যায়নি');
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

  // Unified Gallery Construction: enforce 5 image limit
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

  gallery = gallery.filter(img => img && typeof img === 'string' && img.trim().length > 0);
  AdminState.editingGallery = gallery.slice(0, 5);
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
    const slotLabel = i === 0 ? 'মূল কভার' : (i === 1 ? 'হোভার অ্যাঙ্গেল' : `অ্যাঙ্গেল #${i + 1}`);

    if (imgUrl) {
      html += `
        <div class="gallery-slot-card ${isPrimary ? 'is-primary' : ''}">
          <img src="${imgUrl}" alt="Slot ${i + 1}" class="gallery-slot-img">
          
          <div class="gallery-slot-badge ${isPrimary ? 'badge-primary' : ''}">
            ${isPrimary ? '⭐ কভার' : `#${i + 1}`}
          </div>

          <div class="gallery-slot-actions">
            <button type="button" onclick="openCropperForSlot('${imgUrl}', ${i})" title="ছবি ক্রপ করুন" class="slot-btn slot-crop-btn">✂️</button>
            ${!isPrimary ? `<button type="button" onclick="setPrimaryGalleryImage('${imgUrl}')" title="মূল ছবি হিসেবে নির্ধারণ করুন" class="slot-btn slot-star-btn">⭐</button>` : ''}
            <button type="button" onclick="removeGalleryImage(${i})" title="মুছে ফেলুন" class="slot-btn slot-delete-btn">🗑️</button>
          </div>

          <div class="gallery-slot-footer">${slotLabel}</div>
        </div>
      `;
    } else {
      html += `
        <div class="gallery-slot-card slot-empty" onclick="document.getElementById('editGalleryFileInput').click()" title="নতুন ছবি যোগ করতে ক্লিক করুন">
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
    return alert('সর্বোচ্চ ৫টি ছবি যোগ করা সম্ভব। নতুন ছবি যোগ করতে পূর্বের ছবি মুছুন।');
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
    alert('সর্বোচ্চ ৫টি ছবি যোগ করা সম্ভব।');
    return;
  }

  const filesToUpload = files.slice(0, remainingSlots);
  const formData = new FormData();
  filesToUpload.forEach(f => formData.append('images', f));

  const progressEl = document.getElementById('uploadProgressText');
  if (progressEl) {
    progressEl.style.display = 'block';
    progressEl.textContent = `⏳ ${filesToUpload.length} টি ছবি আপলোড হচ্ছে...`;
  }

  try {
    const res = await fetch('/api/admin/upload-multiple', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AdminState.token}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.urls && data.urls.length > 0) {
      data.urls.forEach(u => AdminState.editingGallery.push(u));
      if (!AdminState.editingPrimaryImage && AdminState.editingGallery.length > 0) {
        AdminState.editingPrimaryImage = AdminState.editingGallery[0];
      }
      renderEditGallery();
    } else {
      alert(data.error || 'ছবি আপলোড করা যায়নি');
    }
  } catch (err) {
    console.error('Upload multiple error:', err);
    alert('সার্ভার এরর');
  } finally {
    if (progressEl) progressEl.style.display = 'none';
    e.target.value = '';
  }
}

// -------------------------------------------------------------
// Variations Editor Logic
// -------------------------------------------------------------
function renderEditVariations() {
  const container = document.getElementById('editVariationsList');
  if (!container) return;
  if (!AdminState.editingVariations || AdminState.editingVariations.length === 0) {
    container.innerHTML = `<div style="font-size: 12px; color: #94a3b8;">কোনো ভেরিয়েশন সাইজ যুক্ত করা হয়নি (ঐচ্ছিক)।</div>`;
    return;
  }

  container.innerHTML = AdminState.editingVariations.map((v, i) => `
    <div style="display: flex; gap: 8px; align-items: center; background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
      <input type="text" placeholder="সাইজ/ওজন (যেমন: 100g, 200g)" value="${v.weight || ''}" onchange="updateEditVariation(${i}, 'weight', this.value)" class="btn-sm" style="flex: 2; padding: 6px;">
      <input type="number" placeholder="রেগুলার মূল্য" value="${v.price || ''}" onchange="updateEditVariation(${i}, 'price', this.value)" class="btn-sm" style="flex: 1.5; padding: 6px;">
      <input type="number" placeholder="অফার মূল্য" value="${v.discount_price || ''}" onchange="updateEditVariation(${i}, 'discount_price', this.value)" class="btn-sm" style="flex: 1.5; padding: 6px;">
      <input type="number" placeholder="স্টক" value="${v.stock !== undefined ? v.stock : 50}" onchange="updateEditVariation(${i}, 'stock', this.value)" class="btn-sm" style="flex: 1; padding: 6px;">
      <button type="button" onclick="removeEditVariation(${i})" class="btn-sm btn-danger-sm" style="padding: 6px 10px;" title="মুছে ফেলুন">✕</button>
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

// -------------------------------------------------------------
// Interactive HTML5 Canvas Image Cropper Logic
// -------------------------------------------------------------
let cropperImgObj = null;
let cropperDrag = { isDragging: false, startX: 0, startY: 0 };

function openCropperForSlot(imgUrl, slotIndex) {
  const modal = document.getElementById('imageCropperModal');
  const sourceImg = document.getElementById('cropperSourceImg');

  AdminState.cropperState.targetIndex = slotIndex;
  AdminState.cropperState.imageSrc = imgUrl;
  AdminState.cropperState.zoom = 1;
  AdminState.cropperState.rotation = 0;
  AdminState.cropperState.pan = { x: 0, y: 0 };
  AdminState.cropperState.aspectRatio = 1;

  document.getElementById('cropperZoomSlider').value = 1;
  document.getElementById('cropperZoomLabel').textContent = '100%';

  document.querySelectorAll('.cropper-ratio-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.ratio === "1");
  });

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
    const file = new File([blob], `curecare_cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });
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
        alert('ক্রপ করা ছবি সেভ করা যায়নি');
      }
    } catch (e) {
      alert('আপলোডে সমস্যা হয়েছে');
    }
  }, 'image/jpeg', 0.92);
}

function skipCroppingAndUseOriginal() {
  closeCropperModal();
}

// -------------------------------------------------------------
// Save Status Notification Popup & Dynamic Reactive Buttons
// -------------------------------------------------------------
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
    iconBox.innerHTML = `<span>⏳</span>`;
    title.textContent = 'তথ্য সংরক্ষণ করা হচ্ছে...';
    msg.textContent = message || 'অনুগ্রহ করে অপেক্ষা করুন, ডাটাবেস আপডেট হচ্ছে...';
    retryBox.style.display = 'none';
    line.style.animation = 'pulseLine 1.5s infinite';
  } else if (status === 'success') {
    const time = new Date().toLocaleTimeString();
    iconBox.innerHTML = `<span>✓</span>`;
    title.textContent = 'সফলভাবে সংরক্ষিত হয়েছে!';
    msg.textContent = message || `সব তথ্য ডাটাবেসে সফলভাবে আপডেট করা হয়েছে (${time})।`;
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

// Save Product Details with Reactive Dynamic Button States
async function saveProductDetails(e) {
  if (e) e.preventDefault();

  const btn = document.getElementById('editSaveSubmitBtn');
  const btnIcon = document.getElementById('editSaveBtnIcon');
  const btnText = document.getElementById('editSaveBtnText');

  // Trigger 'Saving' state
  if (btn) {
    btn.disabled = true;
    btn.style.background = '#0f766e';
    btnIcon.textContent = '⏳';
    btnText.textContent = 'সংরক্ষণ হচ্ছে...';
  }
  showSaveStatusPopup('saving', 'পণ্যের গ্যালারি ও বিবরণ ডাটাবেসে সেভ হচ্ছে...');

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

  // Validate gallery
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
      if (btn) {
        btn.style.background = '#10b981';
        btnIcon.textContent = '✓';
        btnText.textContent = 'সফলভাবে সংরক্ষিত!';
      }
      showSaveStatusPopup('success', 'পণ্যের সকল তথ্য, গ্যালারি ও ভেরিয়েশন সফলভাবে আপডেট হয়েছে!');
      setTimeout(() => {
        if (btn) {
          btn.disabled = false;
          btn.style.background = '';
          btnIcon.textContent = '💾';
          btnText.textContent = 'পরিবর্তন সংরক্ষণ করুন (Save All Details)';
        }
        closeEditProductModal();
        loadProducts();
      }, 900);
    } else {
      const err = await res.json();
      if (btn) {
        btn.disabled = false;
        btn.style.background = '#ef4444';
        btnIcon.textContent = '⚠️';
        btnText.textContent = 'ব্যর্থ - পুনরায় চেষ্টা করুন';
      }
      showSaveStatusPopup('error', err.error || 'সংরক্ষণ ব্যর্থ হয়েছে', () => saveProductDetails());
    }
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.style.background = '#ef4444';
      btnIcon.textContent = '⚠️';
      btnText.textContent = 'ব্যর্থ - পুনরায় চেষ্টা করুন';
    }
    showSaveStatusPopup('error', err.message, () => saveProductDetails());
  }
}

async function deleteProduct(id) {
  if (!confirm('আপনি কি নিশ্চিত এই পণ্যটি ডিলিট করতে চান?')) return;
  try {
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE', headers: authHeaders() });
    showSaveStatusPopup('success', 'পণ্য সফলভাবে মুছে ফেলা হয়েছে');
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

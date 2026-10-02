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
    tbody.innerHTML = products.map(p => `
      <tr>
        <td>
          <img src="${p.image}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
        </td>
        <td>
          <strong>${p.name_bn || p.name}</strong>
          <div style="font-size: 11px; color: #64748b;">${p.name} | SKU: ${p.sku || 'N/A'}</div>
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
          <button onclick="deleteProduct(${p.id})" class="btn-sm btn-danger-sm">🗑️ ডিলিট</button>
        </td>
      </tr>
    `).join('');
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
    image, short_desc, description, variations, is_featured: 1
  };

  try {
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert('নতুন পণ্য সফলভাবে যুক্ত হয়েছে!');
      closeAddProductModal();
      loadProducts();
    } else {
      alert('পণ্য যোগ করতে সমস্যা হয়েছে');
    }
  } catch (err) {
    alert('সার্ভার এরর');
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

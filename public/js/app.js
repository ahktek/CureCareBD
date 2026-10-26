// ==========================================================================
// CureCare - Core Client Application JavaScript
// ==========================================================================

const AppState = {
  products: [],
  categories: [],
  banners: [],
  settings: {},
  cart: JSON.parse(localStorage.getItem('curecare_cart') || '[]'),
  currentSlide: 0,
  activeCategory: 'all',
  checkoutItems: [],
  appliedCoupon: null,
  deliveryZone: 'inside_dhaka'
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  initCartUI();
  setupEventListeners();
  await loadStoreData();
  setupLiveSearch();
  setupBannerSlider();
});

// -------------------------------------------------------------
// Data Fetching
// -------------------------------------------------------------
async function loadStoreData() {
  try {
    const [settingsRes, bannersRes, categoriesRes, productsRes] = await Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/banners').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/products').then(r => r.json())
    ]);

    AppState.settings = settingsRes;
    AppState.banners = bannersRes;
    AppState.categories = categoriesRes;
    AppState.products = productsRes;

    renderSettings();
    renderBanners();
    renderCategories();
    renderProducts();
  } catch (err) {
    console.error('Failed to load store data:', err);
    showToast('ডাটা লোড করতে সমস্যা হয়েছে!', 'error');
  }
}

// -------------------------------------------------------------
// Rendering Functions
// -------------------------------------------------------------
function renderSettings() {
  const { announcement, phone, email, address } = AppState.settings;
  if (announcement) {
    const annEl = document.getElementById('announcement-text');
    if (annEl) annEl.textContent = announcement;
  }
  if (phone) {
    document.querySelectorAll('.store-phone').forEach(el => {
      el.textContent = phone;
      if (el.tagName === 'A') el.href = `tel:${phone.replace(/[^0-9+]/g, '')}`;
    });
  }
  if (email) {
    document.querySelectorAll('.store-email').forEach(el => {
      el.textContent = email;
      if (el.tagName === 'A') el.href = `mailto:${email}`;
    });
  }
  if (address) {
    document.querySelectorAll('.store-address').forEach(el => el.textContent = address);
  }
}

function renderBanners() {
  const sliderContainer = document.getElementById('heroSlider');
  const dotsContainer = document.getElementById('sliderDots');
  if (!sliderContainer || !AppState.banners.length) return;

  sliderContainer.querySelectorAll('.slide-item').forEach(el => el.remove());
  if (dotsContainer) dotsContainer.innerHTML = '';

  AppState.banners.forEach((banner, idx) => {
    const slide = document.createElement('div');
    slide.className = `slide-item ${idx === 0 ? 'active' : ''}`;
    slide.innerHTML = `
      <img src="${banner.image}" alt="${banner.title}" class="slide-img">
      <div class="slide-content">
        ${banner.badge_text ? `<span class="slide-badge">${banner.badge_text}</span>` : ''}
        <h2 class="slide-title">${banner.title_bn || banner.title}</h2>
        <p class="slide-subtitle">${banner.subtitle_bn || banner.subtitle || ''}</p>
        <a href="${banner.link || '#products-section'}" class="slide-btn">
          ${banner.button_text || 'অর্ডার করুন'} <span>→</span>
        </a>
      </div>
    `;
    sliderContainer.appendChild(slide);

    if (dotsContainer) {
      const dot = document.createElement('div');
      dot.className = `dot ${idx === 0 ? 'active' : ''}`;
      dot.onclick = () => goToSlide(idx);
      dotsContainer.appendChild(dot);
    }
  });
}

function setupBannerSlider() {
  setInterval(() => {
    if (AppState.banners.length > 1) {
      goToSlide((AppState.currentSlide + 1) % AppState.banners.length);
    }
  }, 5000);
}

function goToSlide(index) {
  const slides = document.querySelectorAll('.slide-item');
  const dots = document.querySelectorAll('.dot');
  if (!slides.length) return;

  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));

  AppState.currentSlide = index;
  slides[index]?.classList.add('active');
  dots[index]?.classList.add('active');
}

function renderCategories() {
  const navContainer = document.getElementById('categoryNavBar');
  const gridContainer = document.getElementById('featuredCategoriesGrid');

  if (navContainer) {
    let navHtml = `
      <a href="javascript:void(0)" class="cat-nav-link active" onclick="filterByCategory('all', this)">
        <span>✨</span> সব প্রোডাক্টস
      </a>
    `;
    AppState.categories.forEach(cat => {
      navHtml += `
        <a href="javascript:void(0)" class="cat-nav-link" onclick="filterByCategory('${cat.slug}', this)">
          <span>${cat.icon || '🌿'}</span> ${cat.name_bn || cat.name}
        </a>
      `;
    });
    navContainer.innerHTML = navHtml;
  }

  if (gridContainer) {
    gridContainer.innerHTML = AppState.categories.map(cat => `
      <div class="category-card" onclick="filterByCategory('${cat.slug}')">
        <div class="category-icon-wrapper">
          <span>${cat.icon || '🌿'}</span>
        </div>
        <div class="category-name">${cat.name_bn || cat.name}</div>
        <div class="category-count">${cat.product_count || 0}+ আইটেম</div>
      </div>
    `).join('');
  }
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  let filtered = AppState.products;
  if (AppState.activeCategory !== 'all') {
    filtered = AppState.products.filter(p => p.category_slug === AppState.activeCategory);
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">
        <p style="font-size: 16px;">এই ক্যাটাগরিতে বর্তমানে কোনো পণ্য পাওয়া যায়নি।</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const hasDiscount = p.discount_price && p.discount_price < p.base_price;
    const discountPercent = hasDiscount ? Math.round(((p.base_price - p.discount_price) / p.base_price) * 100) : 0;
    const variations = p.variations || [];
    const activeVar = variations[0] || null;

    return `
      <div class="product-card" id="product-${p.id}">
        ${hasDiscount ? `<div class="badge-discount">${discountPercent}% ছাড়</div>` : ''}
        <div class="badge-cure">১০০% অর্গানিক</div>
        <div class="product-image-box" onclick="openProductDetail(${p.id})">
          <img src="${p.image}" alt="${p.name}" class="product-img" loading="lazy">
        </div>
        <div class="product-content">
          <div class="product-category">${p.category_name_bn || p.category_name || 'CureCare'}</div>
          <h3 class="product-title" onclick="openProductDetail(${p.id})">${p.name_bn || p.name}</h3>
          <div class="product-rating">
            <span>⭐ ${p.rating || '4.9'}</span>
            <span>(${p.reviews_count || 12} রিভিউ)</span>
          </div>

          ${variations.length > 0 ? `
            <div class="variation-picker">
              ${variations.map((v, i) => `
                <button type="button" class="variation-pill ${i === 0 ? 'active' : ''}"
                  onclick="selectVariation(${p.id}, '${v.weight}', ${v.price}, ${v.discount_price || v.price}, this)">
                  ${v.weight}
                </button>
              `).join('')}
            </div>
          ` : ''}

          <div class="price-box">
            <span class="current-price" id="curr-price-${p.id}">৳${activeVar ? (activeVar.discount_price || activeVar.price) : (p.discount_price || p.base_price)}</span>
            ${hasDiscount ? `<span class="original-price" id="orig-price-${p.id}">৳${activeVar ? activeVar.price : p.base_price}</span>` : ''}
          </div>

          <div class="product-actions">
            <button class="btn-order-now" onclick="openInstantCheckout(${p.id})">
              <span>⚡</span> অর্ডার করুন
            </button>
            <button class="btn-add-cart" onclick="addToCart(${p.id})">
              <span>🛒</span> কার্ট
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// Variation Selector
// -------------------------------------------------------------
function selectVariation(productId, weight, price, discountPrice, btnEl) {
  const card = document.getElementById(`product-${productId}`);
  if (!card) return;

  card.querySelectorAll('.variation-pill').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');

  const currEl = document.getElementById(`curr-price-${productId}`);
  const origEl = document.getElementById(`orig-price-${productId}`);

  if (currEl) currEl.textContent = `৳${discountPrice}`;
  if (origEl) origEl.textContent = `৳${price}`;

  // Store active selection in DOM dataset
  card.dataset.selectedWeight = weight;
  card.dataset.selectedPrice = discountPrice;
}

// -------------------------------------------------------------
// Live Search
// -------------------------------------------------------------
function setupLiveSearch() {
  const searchInput = document.getElementById('searchInput');
  const resultsBox = document.getElementById('liveSearchResults');
  if (!searchInput || !resultsBox) return;

  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();

    if (query.length < 1) {
      resultsBox.style.display = 'none';
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
        const items = await res.json();

        if (items.length === 0) {
          resultsBox.innerHTML = `
            <div style="padding: 14px; text-align: center; color: #64748b; font-size: 13px;">
              "${query}" এর সাথে মিলে এমন কোনো পণ্য পাওয়া যায়নি।
            </div>
          `;
        } else {
          resultsBox.innerHTML = items.map(p => `
            <div class="search-item" onclick="openProductDetail(${p.id})">
              <img src="${p.image}" alt="${p.name}" class="search-item-img">
              <div class="search-item-info">
                <div class="search-item-title">${p.name_bn || p.name}</div>
                <div class="search-item-price">৳${p.discount_price || p.base_price}</div>
              </div>
              <div class="search-item-action">
                <button type="button" onclick="event.stopPropagation(); openInstantCheckout(${p.id})">
                  অর্ডার করুন
                </button>
              </div>
            </div>
          `).join('');
        }
        resultsBox.style.display = 'block';
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 250);
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !resultsBox.contains(e.target)) {
      resultsBox.style.display = 'none';
    }
  });
}

// -------------------------------------------------------------
// Cart System
// -------------------------------------------------------------
function addToCart(productId, customWeight = null, customPrice = null) {
  const product = AppState.products.find(p => p.id === productId);
  if (!product) return;

  const card = document.getElementById(`product-${productId}`);
  let weight = customWeight;
  let price = customPrice;

  if (!weight && card) {
    weight = card.dataset.selectedWeight || (product.variations?.[0]?.weight || 'স্ট্যান্ডার্ড');
    price = parseFloat(card.dataset.selectedPrice) || (product.discount_price || product.base_price);
  } else if (!weight) {
    weight = product.variations?.[0]?.weight || 'স্ট্যান্ডার্ড';
    price = product.discount_price || product.base_price;
  }

  const existingIdx = AppState.cart.findIndex(i => i.id === product.id && i.weight === weight);
  if (existingIdx > -1) {
    AppState.cart[existingIdx].quantity += 1;
  } else {
    AppState.cart.push({
      id: product.id,
      name: product.name_bn || product.name,
      weight: weight,
      price: price,
      quantity: 1,
      image: product.image
    });
  }

  saveCart();
  updateCartBadge();
  showToast(`"${product.name_bn || product.name}" কার্ট-এ যোগ হয়েছে!`);
  openCartDrawer();
}

function updateCartQty(index, delta) {
  if (!AppState.cart[index]) return;
  AppState.cart[index].quantity += delta;
  if (AppState.cart[index].quantity <= 0) {
    AppState.cart.splice(index, 1);
  }
  saveCart();
  renderCartDrawer();
}

function removeCartItem(index) {
  AppState.cart.splice(index, 1);
  saveCart();
  renderCartDrawer();
}

function saveCart() {
  localStorage.setItem('curecare_cart', JSON.stringify(AppState.cart));
  updateCartBadge();
}

function initCartUI() {
  updateCartBadge();
}

function updateCartBadge() {
  const count = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
}

function openCartDrawer() {
  renderCartDrawer();
  document.getElementById('cartDrawerOverlay').classList.add('active');
  document.getElementById('cartDrawer').classList.add('active');
}

function closeCartDrawer() {
  document.getElementById('cartDrawerOverlay').classList.remove('active');
  document.getElementById('cartDrawer').classList.remove('active');
}

function renderCartDrawer() {
  const listEl = document.getElementById('cartItemsList');
  const subtotalEl = document.getElementById('cartSubtotal');
  if (!listEl) return;

  if (AppState.cart.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: #94a3b8;">
        <span style="font-size: 40px; display: block; margin-bottom: 10px;">🛒</span>
        <p style="font-size: 15px; font-weight: 600;">আপনার কার্ট বর্তমানে খালি আছে!</p>
        <button onclick="closeCartDrawer()" style="margin-top: 14px; padding: 8px 18px; background: var(--primary); color: #fff; border: none; border-radius: 9999px; cursor: pointer;">
          কেনাকাটা শুরু করুন
        </button>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = '৳0';
    return;
  }

  let subtotal = 0;
  listEl.innerHTML = AppState.cart.map((item, idx) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div class="cart-drawer-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-weight">পরিমাণ: ${item.weight}</div>
          <div class="cart-item-price">৳${item.price} × ${item.quantity} = ৳${itemTotal}</div>
          <div style="margin-top: 6px;" class="qty-ctrl-sm">
            <button class="qty-btn-sm" onclick="updateCartQty(${idx}, -1)">-</button>
            <span class="qty-val-sm">${item.quantity}</span>
            <button class="qty-btn-sm" onclick="updateCartQty(${idx}, 1)">+</button>
          </div>
        </div>
        <button onclick="removeCartItem(${idx})" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px; padding: 4px;">
          ✕
        </button>
      </div>
    `;
  }).join('');

  if (subtotalEl) subtotalEl.textContent = `৳${subtotal}`;
}

// -------------------------------------------------------------
// 1-Click Instant Order / One-Page Checkout (GhorerBazar Signature Feature)
// -------------------------------------------------------------
function openInstantCheckout(productId = null) {
  closeCartDrawer();
  AppState.appliedCoupon = null;

  if (productId) {
    const product = AppState.products.find(p => p.id === productId);
    if (!product) return;

    const card = document.getElementById(`product-${productId}`);
    let weight = card?.dataset.selectedWeight || product.variations?.[0]?.weight || 'স্ট্যান্ডার্ড';
    let price = parseFloat(card?.dataset.selectedPrice) || product.discount_price || product.base_price;

    AppState.checkoutItems = [{
      id: product.id,
      name: product.name_bn || product.name,
      weight: weight,
      price: price,
      quantity: 1,
      image: product.image
    }];
  } else {
    if (AppState.cart.length === 0) {
      showToast('আপনার কার্ট খালি! অনুগ্রহ করে পণ্য নির্বাচন করুন।', 'error');
      return;
    }
    AppState.checkoutItems = JSON.parse(JSON.stringify(AppState.cart));
  }

  renderCheckoutSummary();
  document.getElementById('instantCheckoutModal').classList.add('active');
}

function closeCheckoutModal() {
  document.getElementById('instantCheckoutModal').classList.remove('active');
}

function updateCheckoutQty(index, delta) {
  if (!AppState.checkoutItems[index]) return;
  AppState.checkoutItems[index].quantity += delta;
  if (AppState.checkoutItems[index].quantity <= 0) {
    if (AppState.checkoutItems.length > 1) {
      AppState.checkoutItems.splice(index, 1);
    } else {
      AppState.checkoutItems[index].quantity = 1;
    }
  }
  renderCheckoutSummary();
}

function setDeliveryZone(zone) {
  AppState.deliveryZone = zone;
  document.querySelectorAll('.delivery-radio-card').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`zone-${zone}`);
  if (target) target.classList.add('active');
  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  const tableBody = document.getElementById('checkoutItemsTbody');
  if (!tableBody) return;

  let subtotal = 0;
  tableBody.innerHTML = AppState.checkoutItems.map((item, idx) => {
    const total = item.price * item.quantity;
    subtotal += total;
    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${item.image}" style="width: 36px; height: 36px; border-radius: 4px; object-fit: cover;">
            <div>
              <strong>${item.name}</strong>
              <div style="font-size: 11px; color: #64748b;">${item.weight}</div>
            </div>
          </div>
        </td>
        <td>৳${item.price}</td>
        <td>
          <div class="qty-ctrl-sm">
            <button type="button" class="qty-btn-sm" onclick="updateCheckoutQty(${idx}, -1)">-</button>
            <span class="qty-val-sm">${item.quantity}</span>
            <button type="button" class="qty-btn-sm" onclick="updateCheckoutQty(${idx}, 1)">+</button>
          </div>
        </td>
        <td style="text-align: right; font-weight: 700; color: var(--primary);">৳${total}</td>
      </tr>
    `;
  }).join('');

  // Shipping
  const feeInside = parseFloat(AppState.settings.delivery_inside_dhaka || 70);
  const feeOutside = parseFloat(AppState.settings.delivery_outside_dhaka || 130);
  const deliveryFee = AppState.deliveryZone === 'outside_dhaka' ? feeOutside : feeInside;

  // Discount
  let discount = 0;
  if (AppState.appliedCoupon) {
    discount = AppState.appliedCoupon.discount;
  }

  const grandTotal = Math.max(0, subtotal - discount + deliveryFee);

  document.getElementById('checkoutSubtotal').textContent = `৳${subtotal}`;
  document.getElementById('checkoutShipping').textContent = `৳${deliveryFee}`;
  document.getElementById('checkoutDiscount').textContent = `৳${discount}`;
  document.getElementById('checkoutGrandTotal').textContent = `৳${grandTotal}`;
}

async function applyCoupon() {
  const codeInput = document.getElementById('couponCodeInput');
  const code = codeInput ? codeInput.value.trim() : '';
  if (!code) {
    showToast('দয়া করে একটি কুপন কোড লিখুন', 'error');
    return;
  }

  const subtotal = AppState.checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  try {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotal })
    });
    const data = await res.json();

    if (data.valid) {
      AppState.appliedCoupon = { code: data.code, discount: data.discount };
      showToast(data.message, 'success');
      renderCheckoutSummary();
    } else {
      showToast(data.message || 'কুপনটি সঠিক নয়', 'error');
    }
  } catch (err) {
    showToast('কুপন যাচাই করতে সমস্যা হয়েছে', 'error');
  }
}

async function submitOrder(e) {
  e.preventDefault();

  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || 'cod';
  const notes = document.getElementById('custNotes')?.value.trim() || '';

  if (!name || !phone || !address) {
    showToast('দয়া করে নাম, মোবাইল নাম্বার এবং পূর্ণাঙ্গ ঠিকানা দিন', 'error');
    return;
  }

  // BD Phone validation: 11 digits starting with 01
  if (!/^01[3-9]\d{8}$/.test(phone.replace(/[^0-9]/g, ''))) {
    showToast('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)', 'error');
    return;
  }

  const submitBtn = document.getElementById('btnConfirmOrder');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `অর্ডার প্রসেস হচ্ছে... ⏳`;

  try {
    const payload = {
      customer_name: name,
      customer_phone: phone,
      customer_address: address,
      delivery_zone: AppState.deliveryZone,
      items: AppState.checkoutItems,
      coupon_code: AppState.appliedCoupon?.code || null,
      payment_method: paymentMethod,
      notes: notes
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.success) {
      // Clear cart
      AppState.cart = [];
      saveCart();

      closeCheckoutModal();
      openSuccessModal(result);
    } else {
      showToast(result.error || 'অর্ডার করতে সমস্যা হয়েছে', 'error');
    }
  } catch (err) {
    console.error('Order error:', err);
    showToast('নেটওয়ার্ক সমস্যার কারণে অর্ডার সম্পন্ন করা যায়নি।', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>✔</span> অর্ডার কনফার্ম করুন`;
  }
}

function openSuccessModal(orderData) {
  const modal = document.getElementById('orderSuccessModal');
  if (!modal) return;

  document.getElementById('successOrderNumber').textContent = orderData.order_number;
  document.getElementById('successTotal').textContent = `৳${orderData.total}`;
  document.getElementById('invoiceLink').href = `/invoice.html?order=${orderData.order_number}`;
  document.getElementById('trackOrderLink').href = `/track.html?query=${orderData.order_number}`;

  modal.classList.add('active');
}

function closeSuccessModal() {
  document.getElementById('orderSuccessModal').classList.remove('active');
}

// -------------------------------------------------------------
// Product Detail Modal
// -------------------------------------------------------------
async function openProductDetail(productId) {
  try {
    const res = await fetch(`/api/products/${productId}`);
    const product = await res.json();
    if (!product || product.error) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productDetailBody');

    const hasDiscount = product.discount_price && product.discount_price < product.base_price;
    const variations = product.variations || [];
    const activeVar = variations[0] || null;
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
                     style="width: 54px; height: 54px; border-radius: 6px; object-fit: cover; cursor: pointer; border: 2px solid ${i === 0 ? 'var(--primary)' : '#e2e8f0'}; transition: all 0.2s;"
                     onclick="switchStorefrontDetailImage('${imgUrl.replace(/'/g, "\\'")}', this)"
                     alt="Thumbnail">
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div class="detail-info">
          <div class="product-category">${product.category_name_bn || product.category_name}</div>
          <h2>${product.name_bn || product.name}</h2>
          <div class="product-rating">
            <span>⭐ ${product.rating || '4.9'}</span>
            <span>(${product.reviews_count || 12} টি কাস্টমার রিভিউ)</span>
          </div>

          <div class="price-box" style="margin: 12px 0;">
            <span class="current-price" id="modal-curr-price">৳${activeVar ? (activeVar.discount_price || activeVar.price) : (product.discount_price || product.base_price)}</span>
            ${hasDiscount ? `<span class="original-price" id="modal-orig-price">৳${activeVar ? activeVar.price : product.base_price}</span>` : ''}
          </div>

          ${variations.length > 0 ? `
            <div style="margin-bottom: 14px;">
              <label style="font-size: 12px; font-weight: 700; color: #64748b; display: block; margin-bottom: 6px;">সাইজ / পরিমাপ নির্বাচন করুন:</label>
              <div class="variation-picker">
                ${variations.map((v, i) => `
                  <button type="button" class="variation-pill ${i === 0 ? 'active' : ''}"
                    onclick="selectModalVariation('${v.weight}', ${v.price}, ${v.discount_price || v.price}, this)">
                    ${v.weight}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <p class="detail-short-desc">${product.short_desc || ''}</p>

          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button class="btn-order-now" style="flex: 2; padding: 12px; font-size: 15px;" onclick="closeProductDetail(); openInstantCheckout(${product.id})">
              <span>⚡</span> সরাসরি অর্ডার করুন
            </button>
            <button class="btn-add-cart" style="flex: 1; padding: 12px; font-size: 14px;" onclick="addToCart(${product.id}); closeProductDetail();">
              <span>🛒</span> কার্টে রাখুন
            </button>
          </div>

          <div class="detail-desc">
            <h4 style="font-size: 15px; font-weight: 700; color: var(--primary); margin-bottom: 8px;">প্রাকৃতিক উপকারিতা ও বর্ণনা:</h4>
            <p>${product.description || ''}</p>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');
  } catch (err) {
    console.error('Failed to load product detail:', err);
  }
}

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
    el.style.borderColor = 'var(--primary)';
  }
}

function selectModalVariation(weight, price, discountPrice, btnEl) {
  document.querySelectorAll('#productDetailBody .variation-pill').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');

  const currEl = document.getElementById('modal-curr-price');
  const origEl = document.getElementById('modal-orig-price');
  if (currEl) currEl.textContent = `৳${discountPrice}`;
  if (origEl) origEl.textContent = `৳${price}`;
}

function closeProductDetail() {
  document.getElementById('productDetailModal').classList.remove('active');
}

// -------------------------------------------------------------
// Category Filtering
// -------------------------------------------------------------
function filterByCategory(slug, linkEl = null) {
  AppState.activeCategory = slug;

  if (linkEl) {
    document.querySelectorAll('.cat-nav-link').forEach(l => l.classList.remove('active'));
    linkEl.classList.add('active');
  }

  renderProducts();

  const sec = document.getElementById('products-section');
  if (sec) {
    sec.scrollIntoView({ behavior: 'smooth' });
  }
}

// -------------------------------------------------------------
// Toast Notification
// -------------------------------------------------------------
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✔' : '⚠️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// -------------------------------------------------------------
// Global Event Listeners
// -------------------------------------------------------------
function setupEventListeners() {
  const checkoutForm = document.getElementById('instantOrderForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', submitOrder);
  }
}

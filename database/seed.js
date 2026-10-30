const bcrypt = require('bcryptjs');
const db = require('./db');

function seed() {
  console.log('🌱 Seeding CureCare Database...');

  // 1. Seed Enterprise Admins
  const passwordHash = bcrypt.hashSync('CureCare@2026!AdminPortal', 10);
  const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
  if (!adminExists) {
    db.prepare(`
      INSERT INTO admins (username, password_hash, name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin', passwordHash, 'Super Admin', 'superadmin');
  } else {
    db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(passwordHash, 'admin');
  }

  const enterpriseAdmin = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin@curecarebd.com');
  if (!enterpriseAdmin) {
    db.prepare(`
      INSERT INTO admins (username, password_hash, name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin@curecarebd.com', passwordHash, 'Master Administrator', 'superadmin');
  } else {
    db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(passwordHash, 'admin@curecarebd.com');
  }
  console.log('✅ Enterprise Admin credentials seeded (admin@curecarebd.com / CureCare@2026!AdminPortal)');

  // 2. Seed Settings
  const defaultSettings = [
    { key: 'store_name', value: 'CureCare' },
    { key: 'tagline', value: 'বিশুদ্ধ প্রাকৃতিক খাবার ও স্বাস্থ্য সুরক্ষায় নিবেদিত' },
    { key: 'phone', value: '+880 1799-880022' },
    { key: 'whatsapp', value: '+880 1799-880022' },
    { key: 'email', value: 'support@curecare.com.bd' },
    { key: 'address', value: 'House 28, Road 7, Dhanmondi, Dhaka - 1205' },
    { key: 'delivery_inside_dhaka', value: '70' },
    { key: 'delivery_outside_dhaka', value: '130' },
    { key: 'bkash_number', value: '01799880022' },
    { key: 'nagad_number', value: '01799880022' },
    { key: 'announcement', value: '🎉 সারাদেশে দ্রুততম ডেলিভারি ও ক্যাশ অন ডেলিভারি সুবিধা! অর্ডার করতে কল করুন 01799-880022' },
    { key: 'currency', value: '৳' }
  ];

  const setStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  defaultSettings.forEach(s => setStmt.run(s.key, s.value));

  // 3. Seed Categories
  const categories = [
    {
      name: 'Pure Honey',
      name_bn: 'খাঁটি মধু',
      slug: 'pure-honey',
      icon: '🍯',
      image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80',
      display_order: 1
    },
    {
      name: 'Pure Ghee & Oils',
      name_bn: 'খাঁটি ঘি ও ঘানিভাঙা তেল',
      slug: 'ghee-and-oils',
      icon: '🧈',
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
      display_order: 2
    },
    {
      name: 'Premium Dates',
      name_bn: 'প্রিমিয়াম খেজুর',
      slug: 'premium-dates',
      icon: '🌴',
      image: 'https://images.unsplash.com/photo-1596797882870-8c33deeac224?auto=format&fit=crop&w=600&q=80',
      display_order: 3
    },
    {
      name: 'Nuts & Super Seeds',
      name_bn: 'বাদাম ও পুষ্টিকর বীজ',
      slug: 'nuts-and-seeds',
      icon: '🥜',
      image: 'https://images.unsplash.com/photo-1508736793122-f516e3ba5569?auto=format&fit=crop&w=600&q=80',
      display_order: 4
    },
    {
      name: 'Herbal & Wellness',
      name_bn: 'ভেষজ ও স্বাস্থ্য প্রতিকার',
      slug: 'herbal-and-wellness',
      icon: '🌿',
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      display_order: 5
    },
    {
      name: 'Organic Spices & Salt',
      name_bn: 'খাঁটি মসলা ও পিঙ্ক সল্ট',
      slug: 'spices-and-salt',
      icon: '🧂',
      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
      display_order: 6
    },
    {
      name: 'Healthy Teas & Drinks',
      name_bn: 'অর্গানিক চা ও পানীয়',
      slug: 'teas-and-drinks',
      icon: '🍵',
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
      display_order: 7
    }
  ];

  const catStmt = db.prepare(`
    INSERT OR IGNORE INTO categories (name, name_bn, slug, icon, image, display_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  categories.forEach(c => catStmt.run(c.name, c.name_bn, c.slug, c.icon, c.image, c.display_order));

  // Get category IDs
  const catMap = {};
  db.prepare('SELECT id, slug FROM categories').all().forEach(row => {
    catMap[row.slug] = row.id;
  });

  // 4. Seed Products
  const products = [
    {
      name: 'Sundarban Raw Natural Honey',
      name_bn: 'সুন্দরবনের খলিসা ফুলের প্রাকৃতিক মধু',
      slug: 'sundarban-raw-natural-honey',
      short_desc: 'সুন্দরবনের গভীর অরণ্য থেকে সরাসরি সংগৃহীত ১০০% বিশুদ্ধ ও প্রাকৃতিক মধু। কোনো কৃত্রিম মিষ্টি বা প্রিজারভেটিভ নেই।',
      description: 'CureCare সুন্দরবনের খলিসা ফুলের মধু সরাসরি সুন্দরবনের অভিজ্ঞ মৌয়ালদের কাছ থেকে সংগ্রহ করে ল্যাব টেস্টের মাধ্যমে প্রক্রিয়াজাত করা হয়। এটি অ্যান্টিঅক্সিডেন্ট, এনজাইম এবং মিনারেলসে ভরপুর। প্রতিদিন সকালে কুসুম গরম পানিতে ১ চামচ মধু ও লেবুর রস মিশিয়ে পান করলে রোগ প্রতিরোধ ক্ষমতা বৃদ্ধি পায়, সর্দি-কাশি নিরাময়ে সহায়তা করে এবং হজম শক্তি বৃদ্ধি করে।',
      category_id: catMap['pure-honey'],
      base_price: 950,
      discount_price: 850,
      stock: 75,
      sku: 'CC-HNY-01',
      image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
      variations: [
        { weight: '500g', price: 950, discount_price: 850, stock: 40 },
        { weight: '1kg', price: 1800, discount_price: 1600, stock: 35 }
      ],
      is_featured: 1,
      rating: 4.9,
      reviews_count: 38
    },
    {
      name: 'Black Seed Flower Honey',
      name_bn: 'কালোজিরা ফুলের প্রিমিয়াম মধু',
      slug: 'black-seed-flower-honey',
      short_desc: 'কালোজিরা ক্ষেতের নেকটার থেকে সংগৃহীত বিশেষ ভেষজ গুণসম্পন্ন পুষ্টিকর মধু।',
      description: 'কালোজিরা ফুলের মধু রোগ প্রতিরোধ ক্ষমতা বৃদ্ধিতে অপ্রতিদ্বন্দ্বী। কালোজিরার ভেষজ নির্যাস সমৃদ্ধ এই মধু রক্তচাপ নিয়ন্ত্রণে এবং শারীরিক দুর্বলতা দূর করতে অত্যন্ত কার্যকর।',
      category_id: catMap['pure-honey'],
      base_price: 1100,
      discount_price: 980,
      stock: 60,
      sku: 'CC-HNY-02',
      image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=800&q=80',
      variations: [
        { weight: '500g', price: 1100, discount_price: 980, stock: 30 },
        { weight: '1kg', price: 2100, discount_price: 1850, stock: 30 }
      ],
      is_featured: 1,
      rating: 4.8,
      reviews_count: 24
    },
    {
      name: 'Traditional Bilona Pure Cow Ghee',
      name_bn: 'খাঁটি গাওয়া ঘি (ঘাসের গরুর দুধের বিলোনা ঘি)',
      slug: 'traditional-bilona-pure-cow-ghee',
      short_desc: 'ঘাস খাওয়া গাভীর দুধ থেকে সনাতন পদ্ধতিতে মাখনের তৈরি ঘ্রাণযুক্ত খাঁটি গাওয়া ঘি।',
      description: 'আমাদের গাওয়া ঘি সম্পূর্ণ ঐতিহ্যবাহী বিলোনা পদ্ধতিতে প্রস্তুতকৃত। কোনো ডালডা বা কৃত্রিম সুগন্ধি নেই। এটি ভিটামিন A, D, E, K এবং হেলদি ফ্যাটি এসিডে ভরপুর, যা ব্রেইনের কার্যক্ষমতা ও জয়েন্টের সুরক্ষায় অনন্য।',
      category_id: catMap['ghee-and-oils'],
      base_price: 1250,
      discount_price: 1150,
      stock: 50,
      sku: 'CC-GHE-01',
      image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=800&q=80',
      variations: [
        { weight: '450g', price: 1250, discount_price: 1150, stock: 25 },
        { weight: '900g', price: 2400, discount_price: 2200, stock: 25 }
      ],
      is_featured: 1,
      rating: 5.0,
      reviews_count: 52
    },
    {
      name: 'Cold Pressed Virgin Mustard Oil',
      name_bn: 'কাঠের ঘানিভাঙা খাঁটি সরিষার তেল',
      slug: 'cold-pressed-virgin-mustard-oil',
      short_desc: 'দেশি বাছাইকৃত মাঘি সরিষা থেকে কাঠের ঘানিতে ঠাণ্ডা চাপে ভাঙানো ঝাঁজালো বিশুদ্ধ সরিষার তেল।',
      description: '১০০% ভেজালমুক্ত ও কেমিক্যালমুক্ত কাঠের ঘানিভাঙা সরিষার তেল। রান্নায় আসল ঐতিহ্যবাহী স্বাদ ও সুবাস আনে, পাশাপাশি ত্বক ও চুলের মালিশেও অতুলনীয়। হৃদযন্ত্রের সুরক্ষায় এর মোনোআনস্যাচুরেটেড ফ্যাট বিশেষভাবে উপকারী।',
      category_id: catMap['ghee-and-oils'],
      base_price: 420,
      discount_price: 380,
      stock: 120,
      sku: 'CC-OIL-01',
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80',
      variations: [
        { weight: '1 Litre', price: 420, discount_price: 380, stock: 60 },
        { weight: '2 Litre', price: 820, discount_price: 740, stock: 40 },
        { weight: '5 Litre', price: 1980, discount_price: 1800, stock: 20 }
      ],
      is_featured: 1,
      rating: 4.9,
      reviews_count: 67
    },
    {
      name: 'Extra Virgin Cold Pressed Black Seed Oil',
      name_bn: 'কোল্ড প্রেসড প্রিমিয়াম কালোজিরা তেল',
      slug: 'cold-pressed-black-seed-oil',
      short_desc: 'মৃত্যু ব্যতীত সকল রোগের উপশমকারী ভেষজ পথ্য - ১০০% প্রথম চাপের খাঁটি কালোজিরা তেল।',
      description: 'CureCare কালোজিরা তেল সর্বোচ্চ মানসম্পন্ন কালোজিরা থেকে সরাসরি কোল্ড প্রেস পদ্ধতিতে তৈরি। এতে রয়েছে থাইমোকুইনোন নামক শক্তিশালী অ্যান্টিঅক্সিডেন্ট। হাঁপানি, এলার্জি, জয়েন্টের ব্যথা ও ডায়াবেটিস নিয়ন্ত্রণে চমৎকার সহায়ক।',
      category_id: catMap['ghee-and-oils'],
      base_price: 550,
      discount_price: 490,
      stock: 80,
      sku: 'CC-OIL-02',
      image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
      variations: [
        { weight: '100ml', price: 320, discount_price: 290, stock: 40 },
        { weight: '250ml', price: 550, discount_price: 490, stock: 40 }
      ],
      is_featured: 1,
      rating: 4.9,
      reviews_count: 45
    },
    {
      name: 'Premium Saudi Ajwa Dates (Madinah)',
      name_bn: 'মদিনার অরিজিনাল প্রিমিয়াম আজওয়া খেজুর',
      slug: 'premium-saudi-ajwa-dates',
      short_desc: 'মদিনা মুনাওয়ারা থেকে সরাসরি আমদানিকৃত নরম, পুষ্টিকর ও সুস্বাদু গ্রেড-A আজওয়া খেজুর।',
      description: 'রাসূলুল্লাহ (সাঃ) এর অত্যন্ত প্রিয় মদিনার বিশেষ আজওয়া খেজুর। এটি হৃদরোগ প্রতিরোধে ও তাৎক্ষণিক শক্তিবর্ধক হিসেবে সুপরিচিত। কোনোরকম কৃত্রিম প্রিজারভেটিভ ছাড়া সরাসরি ফুড গ্রেড জিপলক প্যাকেজিং এ সংরক্ষিত।',
      category_id: catMap['premium-dates'],
      base_price: 1200,
      discount_price: 1050,
      stock: 90,
      sku: 'CC-DTE-01',
      image: 'https://images.unsplash.com/photo-1596797882870-8c33deeac224?auto=format&fit=crop&w=800&q=80',
      variations: [
        { weight: '500g', price: 1200, discount_price: 1050, stock: 50 },
        { weight: '1kg', price: 2300, discount_price: 2000, stock: 40 }
      ],
      is_featured: 1,
      rating: 5.0,
      reviews_count: 83
    },
    {
      name: 'Jumbo Medjool Dates',
      name_bn: 'কিং সাইজ মেদজুল খেজুর (জ্যাম্বো)',
      slug: 'jumbo-medjool-dates',
      short_desc: 'বিশাল আকারের রসালো ও প্রাকৃতিক ক্যান্ডিসদৃশ মিষ্টি মেদজুল খেজুর।',
      description: 'খেজুরের রাজা মেদজুল খেজুর। প্রাকৃতিকভাবে পাকা, মসৃণ ত্বক ও মাখনের মতো নরম ভেতরের শাঁস। রোজার ইফতার কিংবা প্রাত্যহিক পুষ্টি চাহিদায় সেরা পছন্দ।',
      category_id: catMap['premium-dates'],
      base_price: 1450,
      discount_price: 1300,
      stock: 65,
      sku: 'CC-DTE-02',
      image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
      variations: [
        { weight: '500g', price: 1450, discount_price: 1300, stock: 35 },
        { weight: '1kg', price: 2800, discount_price: 2500, stock: 30 }
      ],
      is_featured: 1,
      rating: 4.9,
      reviews_count: 31
    },
    {
      name: 'Organic Super Food Chia Seeds',
      name_bn: 'আমদানিকৃত অর্গানিক চিয়া সিড (সুপারফুড)',
      slug: 'organic-super-food-chia-seeds',
      short_desc: 'ওমেগা-৩ ফ্যাটি এসিড, ফাইবার ও প্রোটিনে সমৃদ্ধ প্রিমিয়াম গ্রেড চিয়া সিড।',
      description: 'ওজন নিয়ন্ত্রণ, হজম প্রক্রিয়া সুস্থ রাখা এবং হৃদযন্ত্রের যত্নে প্রতিদিন ১-২ চামচ চিয়া সিড পানিতে ভিজিয়ে লেবুর রস ও মধু সহকারে খান। ১০০% প্রাকৃতিকভাবে রোদে শুকানো পরিষ্কার দানা।',
      category_id: catMap['nuts-and-seeds'],
      base_price: 450,
      discount_price: 390,
      stock: 140,
      sku: 'CC-SED-01',
      image: 'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=800&q=80',
      variations: [
        { weight: '250g', price: 450, discount_price: 390, stock: 80 },
        { weight: '500g', price: 850, discount_price: 740, stock: 60 }
      ],
      is_featured: 1,
      rating: 4.8,
      reviews_count: 94
    },
    {
      name: 'Royal Mixed Nuts & Dry Fruit Cocktail',
      name_bn: 'রয়্যাল মিক্সড নাট ও ড্রাই ফ্রুটস (স্বাস্থ্যকর স্ন্যাক্স)',
      slug: 'royal-mixed-nuts-and-dry-fruits',
      short_desc: 'কাজু, পেস্তা, কাঠবাদাম, আখরোট, কিশমিশ, ক্র্যানবেরি ও কুমড়ার বীজের পারফেক্ট ব্লেন্ড।',
      description: 'অফিসে কাজের ফাঁকে বা বাচ্চাদের বিকেলে স্বাস্থ্যকর নাস্তার জন্য পারফেক্ট সুপারফুড। শক্তি বৃদ্ধি করে, স্মৃতিশক্তি প্রখর করে এবং সারাদিনের ক্লান্তি দূর করে।',
      category_id: catMap['nuts-and-seeds'],
      base_price: 850,
      discount_price: 750,
      stock: 95,
      sku: 'CC-NUT-01',
      image: 'https://images.unsplash.com/photo-1508736793122-f516e3ba5569?auto=format&fit=crop&w=800&q=80',
      variations: [
        { weight: '400g', price: 850, discount_price: 750, stock: 50 },
        { weight: '800g', price: 1650, discount_price: 1450, stock: 45 }
      ],
      is_featured: 1,
      rating: 4.9,
      reviews_count: 58
    },
    {
      name: 'Organic Moringa Miracle Leaf Powder',
      name_bn: 'প্রিমিয়াম মরিঙ্গা পাতা গুঁড়া (সজিনা পাতা)',
      slug: 'organic-moringa-leaf-powder',
      short_desc: '৩০০+ রোগের প্রতিরোধক পুষ্টির পাওয়ারহাউজ - ১০০% খাঁটি ছায়ায় শুকানো মরিঙ্গা।',
      description: 'দুধের চেয়ে ৪ গুণ বেশি ক্যালসিয়াম, কমলার চেয়ে ৭ গুণ বেশি ভিটামিন-সি এবং পালং শাকের চেয়ে ২৫ গুণ বেশি আয়রন সমৃদ্ধ অলৌকিক পাতা মরিঙ্গা। উচ্চ রক্তচাপ, ডায়াবেটিস এবং এনার্জি বুস্টে ম্যাজিকের মত কাজ করে।',
      category_id: catMap['herbal-and-wellness'],
      base_price: 350,
      discount_price: 290,
      stock: 110,
      sku: 'CC-HRB-01',
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
      variations: [
        { weight: '200g', price: 350, discount_price: 290, stock: 60 },
        { weight: '400g', price: 650, discount_price: 550, stock: 50 }
      ],
      is_featured: 1,
      rating: 4.9,
      reviews_count: 73
    },
    {
      name: 'Pure Himalayan Pink Rock Salt',
      name_bn: 'হিমালয়ান ক্রিস্টাল পিঙ্ক সল্ট (গুঁড়া)',
      slug: 'himalayan-pink-rock-salt',
      short_desc: '৮৪টি প্রাকৃতিক খনিজ সমৃদ্ধ অপরিশোধিত ১০০% খাঁটি প্রাকৃতিক পাহাড়ি লবণ।',
      description: 'সাধারণ রিফাইন্ড সাদা লবণের ক্ষতিকর প্রভাব থেকে বাঁচতে খাঁটি পিঙ্ক সল্ট ব্যবহার করুন। এটি রক্তচাপের ভারসাম্য বজায় রাখে, শরীরের ইলেক্ট্রোলাইট লেভেল ঠিক রাখে এবং এসিডিটি কমায়।',
      category_id: catMap['spices-and-salt'],
      base_price: 250,
      discount_price: 195,
      stock: 150,
      sku: 'CC-SLT-01',
      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
      variations: [
        { weight: '500g', price: 250, discount_price: 195, stock: 80 },
        { weight: '1kg', price: 450, discount_price: 360, stock: 70 }
      ],
      is_featured: 0,
      rating: 4.8,
      reviews_count: 42
    },
    {
      name: 'Organic Tulsi Ginger Green Tea',
      name_bn: 'অর্গানিক তুলসী ও আদা গ্রিন টি',
      slug: 'organic-tulsi-ginger-green-tea',
      short_desc: 'সিলেটের অর্গানিক বাগান থেকে সংগৃহীত ভেষজ তুলসী ও আদা মিশ্রিত অ্যান্টিঅক্সিডেন্ট চা।',
      description: 'স্ট্রেস ও মানসিক ক্লান্তি দূর করতে, মেটাবলিজম বাড়িয়ে চর্বি কমাতে এবং হজমশক্তি উন্নত করতে তুলসী আদা গ্রিন টি অত্যন্ত উপকারী। কোনো রাসায়নিক কীটনাশক বা কেমিক্যাল ব্যবহৃত হয়নি।',
      category_id: catMap['teas-and-drinks'],
      base_price: 380,
      discount_price: 320,
      stock: 70,
      sku: 'CC-TEA-01',
      image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
      variations: [
        { weight: '100g (Pouch)', price: 380, discount_price: 320, stock: 40 },
        { weight: '250g (Family Pack)', price: 780, discount_price: 660, stock: 30 }
      ],
      is_featured: 0,
      rating: 4.7,
      reviews_count: 29
    }
  ];

  const seedGalleries = {
    'sundarban-raw-natural-honey': [
      'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1471943311424-646960669fbc?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80'
    ],
    'black-seed-flower-honey': [
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1471943311424-646960669fbc?auto=format&fit=crop&w=800&q=80'
    ],
    'traditional-bilona-pure-cow-ghee': [
      'https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80'
    ],
    'cold-pressed-virgin-mustard-oil': [
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
    ],
    'extra-virgin-cold-pressed-black-seed-oil': [
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=800&q=80'
    ],
    'premium-saudi-ajwa-dates-madinah': [
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1508736793122-f516e3ba5569?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=800&q=80'
    ],
    'jumbo-medjool-dates': [
      'https://images.unsplash.com/photo-1596797882870-8c33deeac224?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1508736793122-f516e3ba5569?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=800&q=80'
    ],
    'organic-super-food-chia-seeds': [
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1508736793122-f516e3ba5569?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80'
    ],
    'royal-mixed-nuts-dry-fruit-cocktail': [
      'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1596797882870-8c33deeac224?auto=format&fit=crop&w=800&q=80'
    ],
    'organic-moringa-miracle-leaf-powder': [
      'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80'
    ],
    'himalayan-pink-rock-salt': [
      'https://images.unsplash.com/photo-1508736793122-f516e3ba5569?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
    ],
    'organic-tulsi-ginger-green-tea': [
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=800&q=80'
    ]
  };

  const prodStmt = db.prepare(`
    INSERT OR REPLACE INTO products (
      name, name_bn, slug, description, short_desc, category_id,
      base_price, discount_price, stock, sku, image, additional_images, variations_json,
      is_featured, is_active, rating, reviews_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  products.forEach(p => {
    const addImgs = p.additional_images || seedGalleries[p.slug] || [];
    prodStmt.run(
      p.name,
      p.name_bn,
      p.slug,
      p.description,
      p.short_desc,
      p.category_id,
      p.base_price,
      p.discount_price,
      p.stock,
      p.sku,
      p.image,
      addImgs.length > 0 ? JSON.stringify(addImgs) : null,
      JSON.stringify(p.variations),
      p.is_featured,
      p.rating,
      p.reviews_count
    );
  });

  // 5. Seed Banners
  const banners = [
    {
      title: '100% Pure & Organic Living',
      title_bn: 'সুস্বাস্থ্যের বিশ্বস্ত ঠিকানা - খাঁটি ও বিশুদ্ধ ন্যাচারাল ফুড',
      subtitle: 'Free delivery across Dhaka on orders over ৳1500',
      subtitle_bn: 'সুন্দরবনের খাঁটি মধু, কাঠের ঘানিভাঙা তেল ও মদিনার খেজুর কিনুন বিশেষ ছাড়ে',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80',
      badge_text: 'প্রাকৃতিক সুস্বাস্থ্য',
      button_text: 'অর্ডার করুন এখনই',
      link: '#products-section',
      display_order: 1
    },
    {
      title: 'Immunity & Cure Booster Essentials',
      title_bn: 'রোগ প্রতিরোধ ক্ষমতা বৃদ্ধির বিশেষ প্যাকেজ',
      subtitle: 'Extra 10% OFF with code HEALTHY10',
      subtitle_bn: 'কালোজিরা তেল, বিলোনা গাওয়া ঘি এবং মরিঙ্গা সুপারফুডে আকর্ষণীয় কম্বো অফার',
      image: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=1600&q=80',
      badge_text: 'স্পেশাল অফার',
      button_text: 'প্যাকেজ দেখুন',
      link: '#products-section',
      display_order: 2
    }
  ];

  const bannerStmt = db.prepare(`
    INSERT OR IGNORE INTO banners (title, title_bn, subtitle, subtitle_bn, image, badge_text, button_text, link, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  banners.forEach(b => bannerStmt.run(b.title, b.title_bn, b.subtitle, b.subtitle_bn, b.image, b.badge_text, b.button_text, b.link, b.display_order));

  // 6. Seed Coupons
  const coupons = [
    { code: 'HEALTHY10', discount_type: 'percentage', discount_value: 10, min_spend: 800 },
    { code: 'CURECARE50', discount_type: 'fixed', discount_value: 50, min_spend: 500 }
  ];
  const couponStmt = db.prepare(`
    INSERT OR IGNORE INTO coupons (code, discount_type, discount_value, min_spend)
    VALUES (?, ?, ?, ?)
  `);
  coupons.forEach(c => couponStmt.run(c.code, c.discount_type, c.discount_value, c.min_spend));

  // 7. Seed Sample Orders for Admin CMS Demonstration
  const orderExists = db.prepare('SELECT id FROM orders LIMIT 1').get();
  if (!orderExists) {
    const sampleOrders = [
      {
        order_number: 'CC-10021',
        customer_name: 'Mahfuzur Rahman',
        customer_phone: '01819234567',
        customer_address: 'House 14, Road 5, Sector 3, Uttara, Dhaka',
        delivery_zone: 'inside_dhaka',
        delivery_fee: 70,
        subtotal: 1600,
        discount: 160,
        coupon_code: 'HEALTHY10',
        total: 1510,
        payment_method: 'cod',
        payment_status: 'pending',
        order_status: 'processing',
        courier_tracking: 'STEADFAST-99881',
        notes: 'Please call before delivery',
        items: [
          { id: 1, name: 'সুন্দরবনের খলিসা ফুলের প্রাকৃতিক মধু', weight: '1kg', price: 1600, quantity: 1, image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=400&q=80' }
        ]
      },
      {
        order_number: 'CC-10022',
        customer_name: 'Tahmina Akhter',
        customer_phone: '01712334455',
        customer_address: 'Chawkbazar, Chittagong',
        delivery_zone: 'outside_dhaka',
        delivery_fee: 130,
        subtotal: 1150,
        discount: 0,
        coupon_code: null,
        total: 1280,
        payment_method: 'bkash',
        payment_status: 'paid',
        order_status: 'shipped',
        courier_tracking: 'REDX-CHTG-552',
        notes: 'bKash TrxID: 9JH7612AA',
        items: [
          { id: 3, name: 'খাঁটি গাওয়া ঘি (বিলোনা ঘি)', weight: '450g', price: 1150, quantity: 1, image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=400&q=80' }
        ]
      },
      {
        order_number: 'CC-10023',
        customer_name: 'Dr. Kabir Hasan',
        customer_phone: '01911445566',
        customer_address: 'Mirpur DOHS, Road 9, Dhaka',
        delivery_zone: 'inside_dhaka',
        delivery_fee: 70,
        subtotal: 1440,
        discount: 50,
        coupon_code: 'CURECARE50',
        total: 1460,
        payment_method: 'cod',
        payment_status: 'pending',
        order_status: 'pending',
        courier_tracking: null,
        notes: 'Delivery in the evening',
        items: [
          { id: 8, name: 'আমদানিকৃত অর্গানিক চিয়া সিড', weight: '250g', price: 390, quantity: 1, image: 'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=400&q=80' },
          { id: 6, name: 'মদিনার অরিজিনাল প্রিমিয়াম আজওয়া খেজুর', weight: '500g', price: 1050, quantity: 1, image: 'https://images.unsplash.com/photo-1596797882870-8c33deeac224?auto=format&fit=crop&w=400&q=80' }
        ]
      }
    ];

    const orderStmt = db.prepare(`
      INSERT INTO orders (
        order_number, customer_name, customer_phone, customer_address,
        delivery_zone, delivery_fee, subtotal, discount, coupon_code,
        total, payment_method, payment_status, order_status, courier_tracking, notes, items_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    sampleOrders.forEach(o => {
      orderStmt.run(
        o.order_number,
        o.customer_name,
        o.customer_phone,
        o.customer_address,
        o.delivery_zone,
        o.delivery_fee,
        o.subtotal,
        o.discount,
        o.coupon_code,
        o.total,
        o.payment_method,
        o.payment_status,
        o.order_status,
        o.courier_tracking,
        o.notes,
        JSON.stringify(o.items)
      );
    });
  }

  console.log('✅ Seed completed successfully!');
}

if (require.main === module) {
  seed();
}

module.exports = seed;

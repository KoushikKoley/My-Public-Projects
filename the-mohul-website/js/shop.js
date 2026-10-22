/* ============================================================
   THE MOHUL — SHOP PAGE LOGIC
   - Loads data/products.json
   - Renders product grid + home teaser grid
   - Filter, search, quick view, buy now, add to cart
   - Checkout modal (built here so it only loads on shop page)
============================================================ */
(function () {
  "use strict";

  var PRODUCTS = [];
  var shopCategory = "all";
  var shopQuery = "";

  function $(s, c) { return (c || document).querySelector(s); }
  function $all(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m];
    });
  }
  function fmtINR(n) { return "\u20B9" + Number(n).toLocaleString("en-IN"); }

  function productCardHTML(p) {
    var discount = p.oldPrice && p.oldPrice > p.price
      ? '<span class="price-off">' + Math.round((1 - p.price / p.oldPrice) * 100) + '% OFF</span>'
      : '';
    var badge = p.badge ? '<span class="product-badge">' + escapeHtml(p.badge) + '</span>' : '';
    var stars = '';
    for (var i = 0; i < 5; i++) stars += '<svg class="icon-sm"><use href="#i-star"/></svg>';
    return '' +
      '<div class="product-card reveal" data-id="' + escapeHtml(p.id) + '" data-cat="' + escapeHtml(p.category) + '">' +
        '<div class="product-img">' + badge +
          '<button class="product-quick" onclick="openQuickView(\'' + p.id + '\')" aria-label="Quick view"><svg class="icon-md"><use href="#i-eye"/></svg></button>' +
          '<img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '" loading="lazy">' +
        '</div>' +
        '<div class="product-info">' +
          '<div class="product-cat">' + escapeHtml(p.category) + '</div>' +
          '<h3 class="product-name">' + escapeHtml(p.name) + '</h3>' +
          '<div class="product-brand">' + escapeHtml(p.brand) + '</div>' +
          '<div class="product-rating"><span class="stars-mini">' + stars + '</span><span class="review-count">(' + p.reviews + ')</span></div>' +
          '<div class="product-price"><span class="price-now">' + fmtINR(p.price) + '</span>' +
            (p.oldPrice ? '<span class="price-old">' + fmtINR(p.oldPrice) + '</span>' : '') + discount + '</div>' +
          '<div class="product-actions">' +
            '<button class="btn btn-outline" onclick="addToCart(\'' + p.id + '\')">Add to Cart</button>' +
            '<button class="btn btn-primary" onclick="buyNow(\'' + p.id + '\')">Buy Now</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function renderShopProducts() {
    var grid = $("#shopProducts");
    if (!grid) return;
    var filtered = PRODUCTS.filter(function (p) {
      var matchCat = shopCategory === "all" || p.category === shopCategory;
      var q = shopQuery.toLowerCase().trim();
      var matchQ = !q || (p.name + " " + p.brand + " " + p.category + " " + p.description).toLowerCase().indexOf(q) !== -1;
      return matchCat && matchQ;
    });
    if (!filtered.length) { grid.innerHTML = '<div class="shop-loading">No products match your search.</div>'; return; }
    grid.innerHTML = filtered.map(productCardHTML).join("");
    // re-trigger reveal
    if (window.IntersectionObserver) {
      grid.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("visible"); });
    }
  }

  function renderHomeProducts() {
    var grid = $("#homeProducts");
    if (!grid) return;
    grid.innerHTML = PRODUCTS.slice(0, 4).map(productCardHTML).join("");
    if (window.IntersectionObserver) {
      grid.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("visible"); });
    }
  }

  function initShopFilters() {
    var filters = $("#shopFilters");
    if (filters) {
      filters.addEventListener("click", function (e) {
        var btn = e.target.closest(".filter-btn");
        if (!btn) return;
        $all(".filter-btn", filters).forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        shopCategory = btn.dataset.cat;
        renderShopProducts();
      });
    }
    var search = $("#shopSearch");
    if (search) {
      search.addEventListener("input", function () { shopQuery = search.value; renderShopProducts(); });
    }
  }

  /* ===== PORTFOLIO FILTER (if on portfolio page) ===== */
  function initPortfolioFilters() {
    var bar = $("#portfolioFilters");
    if (!bar) return;
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter-btn");
      if (!btn) return;
      $all(".filter-btn", bar).forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var f = btn.dataset.filter;
      $all("#portfolioGrid .gallery-item").forEach(function (item) {
        item.style.display = (f === "all" || item.dataset.cat === f) ? "" : "none";
      });
    });
  }

  /* ===== QUICK VIEW MODAL ===== */
  window.openQuickView = function (id) {
    var p = PRODUCTS.find(function (x) { return x.id === id; });
    if (!p) return;
    var imgs = p.images && p.images.length ? p.images : [p.image];
    var discount = p.oldPrice && p.oldPrice > p.price
      ? '<span class="price-off">' + Math.round((1 - p.price / p.oldPrice) * 100) + '% OFF</span>'
      : '';
    var stars = '';
    for (var i = 0; i < 5; i++) stars += '<svg class="icon-sm"><use href="#i-star"/></svg>';
    var features = (p.features || []).map(function (f) { return '<li>' + escapeHtml(f) + '</li>'; }).join("");
    $("#qvContent").innerHTML =
      '<div class="qv-imgs"><img class="qv-main-img" src="' + escapeHtml(imgs[0]) + '" alt="' + escapeHtml(p.name) + '">' +
        (imgs.length > 1 ? '<div class="qv-thumbs">' + imgs.map(function (im, idx) {
          return '<img src="' + escapeHtml(im) + '" data-idx="' + idx + '" class="' + (idx === 0 ? "active" : "") + '">';
        }).join("") + '</div>' : '') +
      '</div>' +
      '<div class="qv-info">' +
        '<div class="qv-cat">' + escapeHtml(p.category) + '</div>' +
        '<h2 class="qv-name">' + escapeHtml(p.name) + '</h2>' +
        '<div class="qv-brand">' + escapeHtml(p.brand) + '</div>' +
        '<div class="qv-rating"><span class="stars-mini">' + stars + '</span><span class="review-count">' + p.rating + ' (' + p.reviews + ' reviews)</span></div>' +
        '<div class="qv-price"><span class="price-now">' + fmtINR(p.price) + '</span>' + (p.oldPrice ? '<span class="price-old">' + fmtINR(p.oldPrice) + '</span>' : '') + discount + '</div>' +
        '<p class="qv-desc">' + escapeHtml(p.description) + '</p>' +
        (features ? '<ul class="qv-features">' + features + '</ul>' : '') +
        '<div class="qv-actions">' +
          '<button class="btn btn-outline" onclick="addToCart(\'' + p.id + '\');closeQuickView()">Add to Cart</button>' +
          '<button class="btn btn-primary" onclick="buyNow(\'' + p.id + '\');closeQuickView()">Buy Now</button>' +
        '</div>' +
      '</div>';
    $("#quickViewModal").classList.add("open");
    document.body.style.overflow = "hidden";
    $all(".qv-thumbs img").forEach(function (t) {
      t.addEventListener("click", function () {
        $all(".qv-thumbs img").forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active");
        $(".qv-main-img").src = t.src;
      });
    });
  };
  window.closeQuickView = function () {
    var m = $("#quickViewModal");
    if (!m) return;
    m.classList.remove("open");
    document.body.style.overflow = "";
  };

  /* ===== INJECT QUICK VIEW MODAL + CHECKOUT MODAL (only on shop page) ===== */
  function injectShopModals() {
    var mount = $("#shop-modal-mount");
    if (!mount) return;
    mount.innerHTML =
      '<div class="modal" id="quickViewModal">' +
        '<div class="modal-overlay" onclick="closeQuickView()"></div>' +
        '<div class="modal-content qv-modal">' +
          '<button class="modal-close" onclick="closeQuickView()" aria-label="Close"><svg class="icon-md"><use href="#i-close"/></svg></button>' +
          '<div class="qv-grid" id="qvContent"></div>' +
        '</div>' +
      '</div>' +
      '<div class="modal" id="checkoutModal">' +
        '<div class="modal-overlay" onclick="closeCheckout()"></div>' +
        '<div class="modal-content checkout-modal">' +
          '<button class="modal-close" onclick="closeCheckout()" aria-label="Close"><svg class="icon-md"><use href="#i-close"/></svg></button>' +
          '<div class="checkout-grid">' +
            '<div class="checkout-form-side">' +
              '<h2>Checkout</h2>' +
              '<p class="muted">Fill in your details and your order will be sent to our WhatsApp for confirmation and payment.</p>' +
              '<form id="checkoutForm" class="form" onsubmit="return submitCheckoutToWhatsApp(event)">' +
                '<input type="text" name="name" placeholder="Full Name *" required>' +
                '<input type="tel" name="phone" placeholder="Phone Number *" required>' +
                '<input type="email" name="email" placeholder="Email (optional)">' +
                '<textarea name="address" rows="3" placeholder="Delivery Address *" required></textarea>' +
                '<div class="form-row"><input type="text" name="city" placeholder="City *" required><input type="text" name="pincode" placeholder="Pincode *" required></div>' +
                '<input type="text" name="notes" placeholder="Order Notes (optional)">' +
                '<div class="payment-note">Payment: UPI / Google Pay / PhonePe (details sent on WhatsApp after confirmation)</div>' +
                '<button type="submit" class="btn btn-primary btn-full"><svg class="icon-sm"><use href="#i-whatsapp"/></svg> Place Order via WhatsApp</button>' +
              '</form>' +
            '</div>' +
            '<div class="checkout-summary-side">' +
              '<h3>Order Summary</h3>' +
              '<div id="checkoutItems" class="checkout-items"></div>' +
              '<div class="checkout-total"><span>Grand Total</span><span id="checkoutTotal">' + fmtINR(0) + '</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ===== INLINE PRODUCT FALLBACK =====
     Used when data/products.json cannot be fetched (e.g., file:// protocol).
     When deployed on a real server, the fetch succeeds and products.json wins.
     Keep this array in sync with data/products.json. */
  var PRODUCTS_FALLBACK = [
    { id:"p1", name:"HD Bridal Foundation Kit", category:"Bridal", price:1800, oldPrice:2200, rating:4.9, reviews:128,
      image:"https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80",
      images:["https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80","https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80","https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80"],
      brand:"MAC", description:"High-definition bridal foundation kit designed for 12+ hour wear. Sweat-proof, humidity resistant, and camera-ready finish for the perfect bridal glow. Includes primer, foundation, and setting powder.",
      features:["12+ hour durability","HD camera ready","Sweat & humidity proof","All skin tones"], inStock:true, badge:"Bestseller" },
    { id:"p2", name:"Luxury Eyeshadow Palette - 18 Shades", category:"Eyes", price:1450, oldPrice:1700, rating:4.8, reviews:96,
      image:"https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80",
      images:["https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80","https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80","https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80"],
      brand:"Urban Decay", description:"18 highly-pigmented matte and shimmer shades for every occasion. From natural day looks to bold smokey eyes. Long-lasting, crease-proof formula with rich color payoff.",
      features:["18 versatile shades","Matte & shimmer","Crease-proof","High pigmentation"], inStock:true, badge:"Popular" },
    { id:"p3", name:"Airbrush Makeup System Pro", category:"Tools", price:4500, oldPrice:5200, rating:4.7, reviews:54,
      image:"https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80",
      images:["https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80","https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80","https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=80"],
      brand:"Temptu", description:"Professional airbrush makeup system for flawless, weightless coverage. Perfect for bridal and editorial work. Includes compressor, airbrush stylus, and 4 foundation shades.",
      features:["Flawless finish","Weightless coverage","Pro compressor","4 shades included"], inStock:true, badge:"Premium" },
    { id:"p4", name:"Gold Highlighter Glow Kit", category:"Face", price:980, oldPrice:1200, rating:4.9, reviews:211,
      image:"https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80",
      images:["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80","https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=80","https://images.unsplash.com/photo-1595959183082-7b570b7e08e2?w=600&q=80"],
      brand:"Charlotte Tilbury", description:"Achieve that divine bridal glow with our gold highlighter kit. Finely milled powder blends seamlessly for a lit-from-within radiance. Suitable for all skin tones.",
      features:["Lit-from-within glow","Finely milled","All skin tones","Long-lasting"], inStock:true, badge:"Trending" },
    { id:"p5", name:"Long-Wear Matte Lipstick Set (6 pcs)", category:"Lips", price:1250, oldPrice:1500, rating:4.6, reviews:87,
      image:"https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=80",
      images:["https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=80","https://images.unsplash.com/photo-1595959183082-7b570b7e08e2?w=600&q=80","https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&q=80"],
      brand:"MAC", description:"Set of 6 long-wearing matte lipsticks in bridal-favorite shades. Transfer-proof, comfortable matte finish that lasts through eating, drinking, and kissing. Rich, opaque color.",
      features:["6 bridal shades","Transfer-proof","8-hour wear","Comfortable matte"], inStock:true, badge:null },
    { id:"p6", name:"Professional Brush Set (12 pcs)", category:"Tools", price:1650, oldPrice:2000, rating:4.8, reviews:143,
      image:"https://images.unsplash.com/photo-1595959183082-7b570b7e08e2?w=600&q=80",
      images:["https://images.unsplash.com/photo-1595959183082-7b570b7e08e2?w=600&q=80","https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&q=80","https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80"],
      brand:"Morphe", description:"Complete 12-piece professional makeup brush set with soft, synthetic bristles. Includes face, eyes, and detail brushes in a luxury roll case. Perfect for professionals and beginners.",
      features:["12 essential brushes","Soft synthetic bristles","Luxury roll case","Vegan"], inStock:true, badge:"Bestseller" },
    { id:"p7", name:"Setting Spray - 12 Hour Lock", category:"Face", price:720, oldPrice:890, rating:4.7, reviews:178,
      image:"https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&q=80",
      images:["https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&q=80","https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80","https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80"],
      brand:"Smashbox", description:"Lock in your makeup for up to 12 hours with our humidity-resistant setting spray. Prevents melting, fading, and settling into fine lines. The bridal essential for all-day perfection.",
      features:["12-hour lock","Humidity resistant","No melting or fading","Lightweight mist"], inStock:true, badge:null },
    { id:"p8", name:"Kryolan HD Foundation", category:"Face", price:1100, oldPrice:1350, rating:4.8, reviews:92,
      image:"https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80",
      images:["https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80","https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80","https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80"],
      brand:"Kryolan", description:"Professional HD foundation for camera-ready, flawless skin. Buildable coverage with a natural satin finish. Specially formulated for Indian skin tones. Sweat and water resistant.",
      features:["HD camera-ready","Buildable coverage","Indian skin tones","Sweat resistant"], inStock:true, badge:"Pro Choice" },
    { id:"p9", name:"NARS Blush & Contour Duo", category:"Face", price:1380, oldPrice:1600, rating:4.9, reviews:76,
      image:"https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80",
      images:["https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80","https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80","https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80"],
      brand:"NARS", description:"Sculpt and define with this blush and contour duo. Matte contour for cheekbone definition plus a natural flush of color. Silky powder formula blends effortlessly.",
      features:["Sculpt & define","Silky formula","Natural flush","Easy blend"], inStock:true, badge:null },
    { id:"p10", name:"Smoky Eye Kajal & Liner Combo", category:"Eyes", price:540, oldPrice:680, rating:4.7, reviews:156,
      image:"https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80",
      images:["https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80","https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80","https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80"],
      brand:"Lakme", description:"Intense black kajal and smudge-proof eyeliner combo for defined, dramatic eyes. Waterproof formula lasts 16 hours without smudging. Perfect for bridal and party looks.",
      features:["Intense black","16-hour wear","Waterproof","Smudge-proof"], inStock:true, badge:"Popular" },
    { id:"p11", name:"Anastasia Brow Kit", category:"Eyes", price:860, oldPrice:1050, rating:4.8, reviews:119,
      image:"https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80",
      images:["https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80","https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80","https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80"],
      brand:"Anastasia", description:"Complete brow shaping kit with pomade, powder, and angled brush. Create natural, defined brows that frame your face perfectly. Long-wearing, smudge-proof formula.",
      features:["Full brow kit","Pomade + powder","Angled brush","Smudge-proof"], inStock:true, badge:null },
    { id:"p12", name:"Pre-Bridal Skin Prep Kit", category:"Bridal", price:2400, oldPrice:2900, rating:4.9, reviews:64,
      image:"https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80",
      images:["https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80","https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80","https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=80"],
      brand:"Fixderma", description:"Complete pre-bridal skincare prep kit. Cleanser, primer, moisturizer, and brightening serum to prep your skin for flawless makeup application. 7-day bridal glow routine.",
      features:["7-day routine","Primer included","Brightening serum","All skin types"], inStock:true, badge:"Bridal Essential" }
  ];

  /* ===== LOAD PRODUCTS (try data/products.json, fall back to inline) ===== */
  function loadProducts(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "data/products.json", true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var parsed = JSON.parse(xhr.responseText);
            if (parsed && parsed.length) { PRODUCTS = parsed; }
            else { PRODUCTS = PRODUCTS_FALLBACK.slice(); }
          } catch (e) { PRODUCTS = PRODUCTS_FALLBACK.slice(); }
        } else {
          // Fetch fails (e.g., file:// protocol) — use inline fallback
          PRODUCTS = PRODUCTS_FALLBACK.slice();
        }
        callback();
      }
    };
    xhr.onerror = function () { PRODUCTS = PRODUCTS_FALLBACK.slice(); callback(); };
    try { xhr.send(); }
    catch (err) { PRODUCTS = PRODUCTS_FALLBACK.slice(); callback(); }
  }

  /* ===== INIT ===== */
  function init() {
    injectShopModals();
    initShopFilters();
    initPortfolioFilters();
    loadProducts(function () {
      window.PRODUCTS = PRODUCTS; // expose for script.js addToCart lookup
      renderShopProducts();
      renderHomeProducts();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

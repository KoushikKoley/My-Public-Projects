/* ============================================================
   THE MOHUL MAKEUP STUDIO — SCRIPT
   - Products inline (no products.json needed)
   - SPA navigation
   - Hero slider (auto + manual, mobile/desktop images)
   - Auto gallery carousel
   - Shopping cart (localStorage)
   - Quick view, checkout -> WhatsApp, contact -> WhatsApp
   - Fixed before/after slider (mouse + touch)
============================================================ */

(function () {
  "use strict";

  /* ===== CONFIG ===== */
  var WHATSAPP_NUMBER = "917980203100"; // +91 79802 03100

  /* ===== INLINE PRODUCTS (no products.json needed) ===== */
  var IMG = {
    bridal:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80",
    prep: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80",
    kit: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80",
    foundation:
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80",
    lipstick:
      "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=80",
    flatlay:
      "https://images.unsplash.com/photo-1595959183082-7b570b7e08e2?w=600&q=80",
    brushes:
      "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&q=80",
    cosmetics:
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80",
    makeup:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80",
  };

  var PRODUCTS = [
    {
      id: "p1",
      name: "HD Bridal Foundation Kit",
      category: "Bridal",
      price: 1800,
      oldPrice: 2200,
      rating: 4.9,
      reviews: 128,
      image: IMG.foundation,
      images: [IMG.foundation, IMG.lipstick, IMG.bridal],
      brand: "MAC",
      description:
        "High-definition bridal foundation kit designed for 12+ hour wear. Sweat-proof, humidity resistant, and camera-ready finish for the perfect bridal glow. Includes primer, foundation, and setting powder.",
      features: [
        "12+ hour durability",
        "HD camera ready",
        "Sweat & humidity proof",
        "All skin tones",
      ],
      inStock: true,
      badge: "Bestseller",
    },
    {
      id: "p2",
      name: "Luxury Eyeshadow Palette - 18 Shades",
      category: "Eyes",
      price: 1450,
      oldPrice: 1700,
      rating: 4.8,
      reviews: 96,
      image: IMG.kit,
      images: [IMG.kit, IMG.flatlay, IMG.makeup],
      brand: "Urban Decay",
      description:
        "18 highly-pigmented matte and shimmer shades for every occasion. From natural day looks to bold smokey eyes. Long-lasting, crease-proof formula with rich color payoff.",
      features: [
        "18 versatile shades",
        "Matte & shimmer",
        "Crease-proof",
        "High pigmentation",
      ],
      inStock: true,
      badge: "Popular",
    },
    {
      id: "p3",
      name: "Airbrush Makeup System Pro",
      category: "Tools",
      price: 4500,
      oldPrice: 5200,
      rating: 4.7,
      reviews: 54,
      image: IMG.cosmetics,
      images: [IMG.cosmetics, IMG.foundation, IMG.kit],
      brand: "Temptu",
      description:
        "Professional airbrush makeup system for flawless, weightless coverage. Perfect for bridal and editorial work. Includes compressor, airbrush stylus, and 4 foundation shades.",
      features: [
        "Flawless finish",
        "Weightless coverage",
        "Pro compressor",
        "4 shades included",
      ],
      inStock: true,
      badge: "Premium",
    },
    {
      id: "p4",
      name: "Gold Highlighter Glow Kit",
      category: "Face",
      price: 980,
      oldPrice: 1200,
      rating: 4.9,
      reviews: 211,
      image: IMG.flatlay,
      images: [IMG.flatlay, IMG.makeup, IMG.cosmetics],
      brand: "Charlotte Tilbury",
      description:
        "Achieve that divine bridal glow with our gold highlighter kit. Finely milled powder blends seamlessly for a lit-from-within radiance. Suitable for all skin tones.",
      features: [
        "Lit-from-within glow",
        "Finely milled",
        "All skin tones",
        "Long-lasting",
      ],
      inStock: true,
      badge: "Trending",
    },
    {
      id: "p5",
      name: "Long-Wear Matte Lipstick Set (6 pcs)",
      category: "Lips",
      price: 1250,
      oldPrice: 1500,
      rating: 4.6,
      reviews: 87,
      image: IMG.lipstick,
      images: [IMG.lipstick, IMG.foundation, IMG.bridal],
      brand: "MAC",
      description:
        "Set of 6 long-wearing matte lipsticks in bridal-favorite shades. Transfer-proof, comfortable matte finish that lasts through eating, drinking, and kissing. Rich, opaque color.",
      features: [
        "6 bridal shades",
        "Transfer-proof",
        "8-hour wear",
        "Comfortable matte",
      ],
      inStock: true,
      badge: null,
    },
    {
      id: "p6",
      name: "Professional Brush Set (12 pcs)",
      category: "Tools",
      price: 1650,
      oldPrice: 2000,
      rating: 4.8,
      reviews: 143,
      image: IMG.brushes,
      images: [IMG.brushes, IMG.kit, IMG.cosmetics],
      brand: "Morphe",
      description:
        "Complete 12-piece professional makeup brush set with soft, synthetic bristles. Includes face, eyes, and detail brushes in a luxury roll case. Perfect for professionals and beginners.",
      features: [
        "12 essential brushes",
        "Soft synthetic bristles",
        "Luxury roll case",
        "Vegan",
      ],
      inStock: true,
      badge: "Bestseller",
    },
    {
      id: "p7",
      name: "Setting Spray - 12 Hour Lock",
      category: "Face",
      price: 720,
      oldPrice: 890,
      rating: 4.7,
      reviews: 178,
      image: IMG.makeup,
      images: [IMG.makeup, IMG.flatlay, IMG.prep],
      brand: "Smashbox",
      description:
        "Lock in your makeup for up to 12 hours with our humidity-resistant setting spray. Prevents melting, fading, and settling into fine lines. The bridal essential for all-day perfection.",
      features: [
        "12-hour lock",
        "Humidity resistant",
        "No melting or fading",
        "Lightweight mist",
      ],
      inStock: true,
      badge: null,
    },
    {
      id: "p8",
      name: "Kryolan HD Foundation",
      category: "Face",
      price: 1100,
      oldPrice: 1350,
      rating: 4.8,
      reviews: 92,
      image: IMG.foundation,
      images: [IMG.foundation, IMG.makeup, IMG.bridal],
      brand: "Kryolan",
      description:
        "Professional HD foundation for camera-ready, flawless skin. Buildable coverage with a natural satin finish. Specially formulated for Indian skin tones. Sweat and water resistant.",
      features: [
        "HD camera-ready",
        "Buildable coverage",
        "Indian skin tones",
        "Sweat resistant",
      ],
      inStock: true,
      badge: "Pro Choice",
    },
    {
      id: "p9",
      name: "NARS Blush & Contour Duo",
      category: "Face",
      price: 1380,
      oldPrice: 1600,
      rating: 4.9,
      reviews: 76,
      image: IMG.cosmetics,
      images: [IMG.cosmetics, IMG.flatlay, IMG.kit],
      brand: "NARS",
      description:
        "Sculpt and define with this blush and contour duo. Matte contour for cheekbone definition plus a natural flush of color. Silky powder formula blends effortlessly.",
      features: [
        "Sculpt & define",
        "Silky formula",
        "Natural flush",
        "Easy blend",
      ],
      inStock: true,
      badge: null,
    },
    {
      id: "p10",
      name: "Smoky Eye Kajal & Liner Combo",
      category: "Eyes",
      price: 540,
      oldPrice: 680,
      rating: 4.7,
      reviews: 156,
      image: IMG.bridal,
      images: [IMG.bridal, IMG.lipstick, IMG.kit],
      brand: "Lakmé",
      description:
        "Intense black kajal and smudge-proof eyeliner combo for defined, dramatic eyes. Waterproof formula lasts 16 hours without smudging. Perfect for bridal and party looks.",
      features: ["Intense black", "16-hour wear", "Waterproof", "Smudge-proof"],
      inStock: true,
      badge: "Popular",
    },
    {
      id: "p11",
      name: "Anastasia Brow Kit",
      category: "Eyes",
      price: 860,
      oldPrice: 1050,
      rating: 4.8,
      reviews: 119,
      image: IMG.prep,
      images: [IMG.prep, IMG.foundation, IMG.brushes],
      brand: "Anastasia",
      description:
        "Complete brow shaping kit with pomade, powder, and angled brush. Create natural, defined brows that frame your face perfectly. Long-wearing, smudge-proof formula.",
      features: [
        "Full brow kit",
        "Pomade + powder",
        "Angled brush",
        "Smudge-proof",
      ],
      inStock: true,
      badge: null,
    },
    {
      id: "p12",
      name: "Pre-Bridal Skin Prep Kit",
      category: "Bridal",
      price: 2400,
      oldPrice: 2900,
      rating: 4.9,
      reviews: 64,
      image: IMG.prep,
      images: [IMG.prep, IMG.flatlay, IMG.foundation],
      brand: "Fixderma",
      description:
        "Complete pre-bridal skincare prep kit. Cleanser, primer, moisturizer, and brightening serum to prep your skin for flawless makeup application. 7-day bridal glow routine.",
      features: [
        "7-day routine",
        "Primer included",
        "Brightening serum",
        "All skin types",
      ],
      inStock: true,
      badge: "Bridal Essential",
    },
  ];

  /* ===== STATE ===== */
  var cart = JSON.parse(localStorage.getItem("mohul_cart") || "[]");
  var shopCategory = "all";
  var shopQuery = "";

  /* ===== UTIL ===== */
  function $(s, c) {
    return (c || document).querySelector(s);
  }
  function $all(s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  }
  function fmtINR(n) {
    return "\u20B9" + Number(n).toLocaleString("en-IN");
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m];
    });
  }
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(function () {
      t.classList.remove("show");
    }, 2400);
  }
  function isMobile() {
    return window.innerWidth <= 768;
  }

  /* ============================================================
     NAVIGATION (SPA)
  ============================================================ */
  window.navigateTo = function (pageId) {
    var pages = $all(".page");
    pages.forEach(function (p) {
      p.classList.remove("active");
    });
    var target = document.getElementById("page-" + pageId) || $("#page-home");
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", "#" + pageId);
    closeMobileMenu();
    setTimeout(triggerReveal, 80);
    // init before/after sliders when navigating to that page
    if (pageId === "before-after") {
      setTimeout(function () {
        initBeforeAfterSliders();
        // re-position any sliders whose handle is still at default
        $all(".ba-slider").forEach(function (s) {
          if (s.dataset.init) {
            var rect = s.getBoundingClientRect();
            if (rect.width > 0) {
              var handle = s.querySelector(".ba-handle");
              var beforeImg = s.querySelector(".ba-before");
              handle.style.left = "50%";
              beforeImg.style.clipPath = "inset(0 50% 0 0)";
            }
          }
        });
      }, 100);
    }
  };

  function routeFromHash() {
    var h = location.hash.replace("#", "");
    if (h && document.getElementById("page-" + h)) navigateTo(h);
    else navigateTo("home");
  }

  /* ============================================================
     NAVBAR SCROLL + MOBILE MENU
  ============================================================ */
  var navbar = $("#navbar");
  window.addEventListener(
    "scroll",
    function () {
      if (window.scrollY > 30) navbar.classList.add("scrolled");
      else navbar.classList.remove("scrolled");
    },
    { passive: true },
  );

  var menuToggle = $("#menuToggle");
  var mobileMenu = $("#mobileMenu");
  var overlay = $("#overlay");
  function closeMobileMenu() {
    mobileMenu.classList.remove("open");
    overlay.classList.remove("show");
  }
  menuToggle.addEventListener("click", function () {
    mobileMenu.classList.add("open");
    overlay.classList.add("show");
  });
  $("#mobileClose").addEventListener("click", closeMobileMenu);
  overlay.addEventListener("click", function () {
    closeMobileMenu();
    closeCart();
  });

  /* ============================================================
     REVEAL ON SCROLL
  ============================================================ */
  var revealObserver;
  function triggerReveal() {
    if (!("IntersectionObserver" in window)) {
      $all(".reveal").forEach(function (el) {
        el.classList.add("visible");
      });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add("visible");
              revealObserver.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12 },
      );
    }
    var visible = document.querySelector(".page.active");
    if (!visible) return;
    $all(".reveal:not(.visible)", visible).forEach(function (el) {
      revealObserver.observe(el);
    });
  }
  window.addEventListener("scroll", triggerReveal, { passive: true });

  /* ============================================================
     HERO SLIDER
  ============================================================ */
  var heroSlides = $all(".hero-slide");
  var heroDotsContainer = $("#heroDots");
  var heroIndex = 0;
  var heroTimer = null;

  // build dots
  heroSlides.forEach(function (_, i) {
    var dot = document.createElement("button");
    dot.className = "hero-dot" + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", "Slide " + (i + 1));
    dot.addEventListener("click", function () {
      goToHeroSlide(i);
      resetHeroTimer();
    });
    heroDotsContainer.appendChild(dot);
  });

  function applyHeroBg() {
    var mobile = isMobile();
    heroSlides.forEach(function (slide) {
      var bg = slide.querySelector(".hero-bg");
      var url = mobile ? slide.dataset.mobile : slide.dataset.desktop;
      if (url && bg) bg.style.backgroundImage = 'url("' + url + '")';
    });
  }
  function goToHeroSlide(i) {
    heroSlides[heroIndex].classList.remove("active");
    $all(".hero-dot")[heroIndex].classList.remove("active");
    heroIndex = (i + heroSlides.length) % heroSlides.length;
    heroSlides[heroIndex].classList.add("active");
    $all(".hero-dot")[heroIndex].classList.add("active");
  }
  function nextHero() {
    goToHeroSlide(heroIndex + 1);
  }
  function prevHero() {
    goToHeroSlide(heroIndex - 1);
  }
  function startHeroTimer() {
    stopHeroTimer();
    heroTimer = setInterval(nextHero, 5500);
  }
  function stopHeroTimer() {
    if (heroTimer) clearInterval(heroTimer);
  }
  function resetHeroTimer() {
    stopHeroTimer();
    startHeroTimer();
  }

  $("#heroNext").addEventListener("click", function () {
    nextHero();
    resetHeroTimer();
  });
  $("#heroPrev").addEventListener("click", function () {
    prevHero();
    resetHeroTimer();
  });

  // swipe support
  var heroSwipeStart = null;
  var heroEl = $("#heroSlider");
  heroEl.addEventListener(
    "touchstart",
    function (e) {
      heroSwipeStart = e.touches[0].clientX;
      stopHeroTimer();
    },
    { passive: true },
  );
  heroEl.addEventListener(
    "touchend",
    function (e) {
      if (heroSwipeStart === null) return;
      var dx = e.changedTouches[0].clientX - heroSwipeStart;
      if (Math.abs(dx) > 50) {
        dx < 0 ? nextHero() : prevHero();
      }
      heroSwipeStart = null;
      resetHeroTimer();
    },
    { passive: true },
  );

  applyHeroBg();
  startHeroTimer();
  window.addEventListener("resize", debounce(applyHeroBg, 200));

  /* ============================================================
     GALLERY CAROUSEL — duplicate track for infinite loop
  ============================================================ */
  function initGalleryCarousel() {
    var track = $("#carouselTrack");
    if (!track || track.dataset.duplicated) return;
    track.dataset.duplicated = "1";
    // duplicate all items so the -50% translate loops seamlessly
    track.innerHTML += track.innerHTML;
  }

  /* ============================================================
     PRODUCTS — RENDER (inline data, no fetch)
  ============================================================ */
  function productCardHTML(p) {
    var discount =
      p.oldPrice && p.oldPrice > p.price
        ? '<span class="price-off">' +
          Math.round((1 - p.price / p.oldPrice) * 100) +
          "% OFF</span>"
        : "";
    var badge = p.badge
      ? '<span class="product-badge">' + escapeHtml(p.badge) + "</span>"
      : "";
    var fullStars = Math.round(p.rating);
    var stars = "";
    for (var i = 0; i < 5; i++) {
      stars += '<svg class="icon-sm"><use href="#i-star"/></svg>';
    }
    return (
      "" +
      '<div class="product-card reveal" data-id="' +
      escapeHtml(p.id) +
      '" data-cat="' +
      escapeHtml(p.category) +
      '">' +
      '<div class="product-img">' +
      badge +
      '<button class="product-quick" onclick="openQuickView(\'' +
      p.id +
      '\')" aria-label="Quick view"><svg class="icon-md"><use href="#i-eye"/></svg></button>' +
      '<img src="' +
      escapeHtml(p.image) +
      '" alt="' +
      escapeHtml(p.name) +
      '" loading="lazy">' +
      "</div>" +
      '<div class="product-info">' +
      '<div class="product-cat">' +
      escapeHtml(p.category) +
      "</div>" +
      '<h3 class="product-name">' +
      escapeHtml(p.name) +
      "</h3>" +
      '<div class="product-brand">' +
      escapeHtml(p.brand) +
      "</div>" +
      '<div class="product-rating"><span class="stars-mini">' +
      stars +
      '</span><span class="review-count">(' +
      p.reviews +
      ")</span></div>" +
      '<div class="product-price"><span class="price-now">' +
      fmtINR(p.price) +
      "</span>" +
      (p.oldPrice
        ? '<span class="price-old">' + fmtINR(p.oldPrice) + "</span>"
        : "") +
      discount +
      "</div>" +
      '<div class="product-actions">' +
      '<button class="btn btn-outline" onclick="addToCart(\'' +
      p.id +
      "')\">Add to Cart</button>" +
      '<button class="btn btn-primary" onclick="buyNow(\'' +
      p.id +
      "')\">Buy Now</button>" +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function renderShopProducts() {
    var grid = $("#shopProducts");
    if (!grid) return;
    var filtered = PRODUCTS.filter(function (p) {
      var matchCat = shopCategory === "all" || p.category === shopCategory;
      var q = shopQuery.toLowerCase().trim();
      var matchQ =
        !q ||
        (p.name + " " + p.brand + " " + p.category + " " + p.description)
          .toLowerCase()
          .indexOf(q) !== -1;
      return matchCat && matchQ;
    });
    if (!filtered.length) {
      grid.innerHTML =
        '<div class="shop-loading">No products match your search.</div>';
      return;
    }
    grid.innerHTML = filtered.map(productCardHTML).join("");
    triggerReveal();
  }

  function renderHomeProducts() {
    var grid = $("#homeProducts");
    if (!grid) return;
    grid.innerHTML = PRODUCTS.slice(0, 4).map(productCardHTML).join("");
    triggerReveal();
  }

  /* ============================================================
     SHOP FILTERS + SEARCH
  ============================================================ */
  function initShopFilters() {
    var filters = $("#shopFilters");
    if (!filters) return;
    filters.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter-btn");
      if (!btn) return;
      $all(".filter-btn", filters).forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      shopCategory = btn.dataset.cat;
      renderShopProducts();
    });
    var search = $("#shopSearch");
    if (search) {
      search.addEventListener("input", function () {
        shopQuery = search.value;
        renderShopProducts();
      });
    }
  }

  /* ============================================================
     PORTFOLIO FILTER
  ============================================================ */
  function initPortfolioFilters() {
    var bar = $("#portfolioFilters");
    if (!bar) return;
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest(".filter-btn");
      if (!btn) return;
      $all(".filter-btn", bar).forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      var f = btn.dataset.filter;
      $all("#portfolioGrid .gallery-item").forEach(function (item) {
        item.style.display =
          f === "all" || item.dataset.cat === f ? "" : "none";
      });
    });
  }

  /* ============================================================
     BEFORE / AFTER SLIDER (FIXED — works on mouse + touch)
  ============================================================ */
  function initBeforeAfterSliders() {
    $all(".ba-slider").forEach(function (slider) {
      if (slider.dataset.init) return;
      slider.dataset.init = "1";

      var before = slider.dataset.before;
      var after = slider.dataset.after;
      var label = slider.dataset.label || "";

      // build inner DOM — convention: BEFORE on LEFT, AFTER on RIGHT
      // .ba-before (top, z2) shows the BEFORE image, clipped to LEFT portion (0..pos%)
      // .ba-after  (bottom, z1) shows the AFTER image, full, revealed on the RIGHT side
      slider.innerHTML =
        '<img class="ba-after" src="' +
        after +
        '" alt="After" draggable="false">' +
        '<img class="ba-before" src="' +
        before +
        '" alt="Before" draggable="false">' +
        '<span class="ba-tag before">Before</span>' +
        '<span class="ba-tag after">After</span>' +
        '<div class="ba-handle"></div>' +
        '<div class="ba-label">' +
        escapeHtml(label) +
        "</div>";

      var beforeImg = slider.querySelector(".ba-before");
      var handle = slider.querySelector(".ba-handle");
      var pos = 50;

      function setPos(clientX) {
        var rect = slider.getBoundingClientRect();
        if (rect.width === 0) return; // hidden page — skip; CSS defaults to 50%
        var pct = ((clientX - rect.left) / rect.width) * 100;
        pct = Math.max(0, Math.min(100, pct));
        pos = pct;
        beforeImg.style.clipPath = "inset(0 " + (100 - pct) + "% 0 0)";
        handle.style.left = pct + "%";
      }
      // initial (no-op when slider is on a hidden page; CSS defaults to 50%)
      setPos(
        slider.getBoundingClientRect().left +
          slider.getBoundingClientRect().width / 2,
      );

      // mouse
      var dragging = false;
      slider.addEventListener("mousedown", function (e) {
        dragging = true;
        setPos(e.clientX);
        e.preventDefault();
      });
      window.addEventListener("mousemove", function (e) {
        if (dragging) setPos(e.clientX);
      });
      window.addEventListener("mouseup", function () {
        dragging = false;
      });

      // touch (single handler, passive so we manually preventDefault in touchmove where needed)
      slider.addEventListener(
        "touchstart",
        function (e) {
          if (e.touches.length === 1) setPos(e.touches[0].clientX);
        },
        { passive: true },
      );
      slider.addEventListener(
        "touchmove",
        function (e) {
          if (e.touches.length === 1) {
            setPos(e.touches[0].clientX);
            e.preventDefault();
          }
        },
        { passive: false },
      );
      slider.addEventListener("touchend", function () {});

      // click anywhere on slider
      slider.addEventListener("click", function (e) {
        setPos(e.clientX);
      });
    });
  }

  /* ============================================================
     FAQ ACCORDION
  ============================================================ */
  function initFaq() {
    $all(".faq-q").forEach(function (q) {
      q.addEventListener("click", function () {
        var item = q.closest(".faq-item");
        var open = item.classList.contains("active");
        $all(".faq-item").forEach(function (i) {
          i.classList.remove("active");
        });
        if (!open) item.classList.add("active");
      });
    });
  }

  /* ============================================================
     CART MANAGEMENT
  ============================================================ */
  function saveCart() {
    localStorage.setItem("mohul_cart", JSON.stringify(cart));
  }
  function findProduct(id) {
    return PRODUCTS.find(function (p) {
      return p.id === id;
    });
  }
  function cartCount() {
    return cart.reduce(function (s, i) {
      return s + i.qty;
    }, 0);
  }
  function cartTotal() {
    return cart.reduce(function (s, i) {
      return s + i.price * i.qty;
    }, 0);
  }

  function updateCartBadge() {
    var badge = $("#cartCount");
    var n = cartCount();
    badge.textContent = n;
    badge.classList.toggle("empty", n === 0);
  }

  function renderCart() {
    var body = $("#cartItems");
    var empty = $("#cartEmpty");
    var footer = $("#cartFooter");
    var countEl = $("#cartItemCount");
    var totalEl = $("#cartTotal");

    var n = cartCount();
    countEl.textContent = n;

    if (n === 0) {
      body.innerHTML = "";
      empty.style.display = "block";
      footer.style.display = "none";
      return;
    }
    empty.style.display = "none";
    footer.style.display = "block";
    totalEl.textContent = fmtINR(cartTotal());

    body.innerHTML = cart
      .map(function (item) {
        return (
          "" +
          '<div class="cart-item">' +
          '<img src="' +
          escapeHtml(item.image) +
          '" alt="' +
          escapeHtml(item.name) +
          '">' +
          '<div class="cart-item-info">' +
          '<div class="cart-item-name">' +
          escapeHtml(item.name) +
          "</div>" +
          '<div class="cart-item-brand">' +
          escapeHtml(item.brand) +
          "</div>" +
          '<div class="cart-item-price">' +
          fmtINR(item.price) +
          "</div>" +
          '<div class="cart-qty">' +
          "<button onclick=\"changeQty('" +
          item.id +
          '\',-1)" aria-label="Decrease"><svg class="icon-sm"><use href="#i-minus"/></svg></button>' +
          "<span>" +
          item.qty +
          "</span>" +
          "<button onclick=\"changeQty('" +
          item.id +
          '\',1)" aria-label="Increase"><svg class="icon-sm"><use href="#i-plus"/></svg></button>' +
          '<button class="cart-item-remove" onclick="removeFromCart(\'' +
          item.id +
          "')\">Remove</button>" +
          "</div>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  window.addToCart = function (id) {
    var p = findProduct(id);
    if (!p) return;
    var existing = cart.find(function (i) {
      return i.id === id;
    });
    if (existing) existing.qty += 1;
    else
      cart.push({
        id: p.id,
        name: p.name,
        brand: p.brand,
        price: p.price,
        image: p.image,
        qty: 1,
      });
    saveCart();
    updateCartBadge();
    renderCart();
    toast("\u2713 " + p.name + " added to cart");
  };

  window.changeQty = function (id, delta) {
    var item = cart.find(function (i) {
      return i.id === id;
    });
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0)
      cart = cart.filter(function (i) {
        return i.id !== id;
      });
    saveCart();
    updateCartBadge();
    renderCart();
  };

  window.removeFromCart = function (id) {
    cart = cart.filter(function (i) {
      return i.id !== id;
    });
    saveCart();
    updateCartBadge();
    renderCart();
    toast("Item removed");
  };

  window.clearCart = function () {
    cart = [];
    saveCart();
    updateCartBadge();
    renderCart();
    toast("Cart cleared");
  };

  window.openCart = function () {
    $("#cartDrawer").classList.add("open");
    overlay.classList.add("show");
    renderCart();
  };
  window.closeCart = function () {
    $("#cartDrawer").classList.remove("open");
    overlay.classList.remove("show");
  };

  window.buyNow = function (id) {
    addToCart(id);
    openCheckout();
  };

  /* ============================================================
     QUICK VIEW MODAL
  ============================================================ */
  window.openQuickView = function (id) {
    var p = findProduct(id);
    if (!p) return;
    var imgs = p.images && p.images.length ? p.images : [p.image];
    var discount =
      p.oldPrice && p.oldPrice > p.price
        ? '<span class="price-off">' +
          Math.round((1 - p.price / p.oldPrice) * 100) +
          "% OFF</span>"
        : "";
    var stars = "";
    for (var i = 0; i < 5; i++)
      stars += '<svg class="icon-sm"><use href="#i-star"/></svg>';
    var features = (p.features || [])
      .map(function (f) {
        return "<li>" + escapeHtml(f) + "</li>";
      })
      .join("");

    $("#qvContent").innerHTML =
      '<div class="qv-imgs">' +
      '<img class="qv-main-img" src="' +
      escapeHtml(imgs[0]) +
      '" alt="' +
      escapeHtml(p.name) +
      '">' +
      (imgs.length > 1
        ? '<div class="qv-thumbs">' +
          imgs
            .map(function (im, idx) {
              return (
                '<img src="' +
                escapeHtml(im) +
                '" data-idx="' +
                idx +
                '" class="' +
                (idx === 0 ? "active" : "") +
                '">'
              );
            })
            .join("") +
          "</div>"
        : "") +
      "</div>" +
      '<div class="qv-info">' +
      '<div class="qv-cat">' +
      escapeHtml(p.category) +
      "</div>" +
      '<h2 class="qv-name">' +
      escapeHtml(p.name) +
      "</h2>" +
      '<div class="qv-brand">' +
      escapeHtml(p.brand) +
      "</div>" +
      '<div class="qv-rating"><span class="stars-mini">' +
      stars +
      '</span><span class="review-count">' +
      p.rating +
      " (" +
      p.reviews +
      " reviews)</span></div>" +
      '<div class="qv-price"><span class="price-now">' +
      fmtINR(p.price) +
      "</span>" +
      (p.oldPrice
        ? '<span class="price-old">' + fmtINR(p.oldPrice) + "</span>"
        : "") +
      discount +
      "</div>" +
      '<p class="qv-desc">' +
      escapeHtml(p.description) +
      "</p>" +
      (features ? '<ul class="qv-features">' + features + "</ul>" : "") +
      '<div class="qv-actions">' +
      '<button class="btn btn-outline" onclick="addToCart(\'' +
      p.id +
      "');closeQuickView()\">Add to Cart</button>" +
      '<button class="btn btn-primary" onclick="buyNow(\'' +
      p.id +
      "');closeQuickView()\">Buy Now</button>" +
      "</div>" +
      "</div>";

    $("#quickViewModal").classList.add("open");
    document.body.style.overflow = "hidden";

    $all(".qv-thumbs img").forEach(function (t) {
      t.addEventListener("click", function () {
        $all(".qv-thumbs img").forEach(function (x) {
          x.classList.remove("active");
        });
        t.classList.add("active");
        $(".qv-main-img").src = t.src;
      });
    });
  };
  window.closeQuickView = function () {
    $("#quickViewModal").classList.remove("open");
    document.body.style.overflow = "";
  };

  /* ============================================================
     CHECKOUT MODAL + WHATSAPP
  ============================================================ */
  window.openCheckout = function () {
    if (cartCount() === 0) {
      toast("Your cart is empty");
      return;
    }
    closeCart();
    renderCheckoutSummary();
    $("#checkoutModal").classList.add("open");
    document.body.style.overflow = "hidden";
  };
  window.closeCheckout = function () {
    $("#checkoutModal").classList.remove("open");
    document.body.style.overflow = "";
  };

  function renderCheckoutSummary() {
    var itemsEl = $("#checkoutItems");
    var totalEl = $("#checkoutTotal");
    itemsEl.innerHTML = cart
      .map(function (i) {
        return (
          "" +
          '<div class="co-item">' +
          '<img src="' +
          escapeHtml(i.image) +
          '" alt="' +
          escapeHtml(i.name) +
          '">' +
          '<div class="co-item-info">' +
          '<div class="co-item-name">' +
          escapeHtml(i.name) +
          "</div>" +
          '<div class="co-item-qty">Qty: ' +
          i.qty +
          " x " +
          fmtINR(i.price) +
          "</div>" +
          "</div>" +
          '<div class="co-item-price">' +
          fmtINR(i.price * i.qty) +
          "</div>" +
          "</div>"
        );
      })
      .join("");
    totalEl.textContent = fmtINR(cartTotal());
  }

  window.submitCheckoutToWhatsApp = function (e) {
    e.preventDefault();
    var f = e.target;
    var data = {
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      email: f.email.value.trim(),
      address: f.address.value.trim(),
      city: f.city.value.trim(),
      pincode: f.pincode.value.trim(),
      notes: f.notes.value.trim(),
    };
    if (
      !data.name ||
      !data.phone ||
      !data.address ||
      !data.city ||
      !data.pincode
    ) {
      toast("Please fill all required fields");
      return false;
    }
    var orderItems = cart
      .map(function (i, idx) {
        return (
          idx +
          1 +
          ". " +
          i.name +
          " (" +
          i.brand +
          ")\n   Qty: " +
          i.qty +
          " x " +
          fmtINR(i.price) +
          " = " +
          fmtINR(i.price * i.qty)
        );
      })
      .join("\n");

    var msg = "*NEW ORDER - The Mohul Makeup Studio*\n";
    msg += "------------------------------------\n\n";
    msg += "*Customer Details*\n";
    msg += "*Name:* " + data.name + "\n";
    msg += "*Phone:* " + data.phone + "\n";
    if (data.email) msg += "*Email:* " + data.email + "\n";
    msg += "*Address:* " + data.address + "\n";
    msg += "*City:* " + data.city + "\n";
    msg += "*Pincode:* " + data.pincode + "\n";
    if (data.notes) msg += "*Notes:* " + data.notes + "\n";
    msg += "\n*Order Items*\n" + orderItems + "\n\n";
    msg += "------------------------------------\n";
    msg += "*Grand Total: " + fmtINR(cartTotal()) + "*\n";
    msg += "------------------------------------\n\n";
    msg += "Please confirm my order and share payment details. Thank you!";

    window.open(
      "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg),
      "_blank",
    );

    setTimeout(function () {
      cart = [];
      saveCart();
      updateCartBadge();
      renderCart();
      f.reset();
      closeCheckout();
      toast("Order sent to WhatsApp!");
    }, 600);
    return false;
  };

  /* ============================================================
     CONTACT FORM -> WHATSAPP
  ============================================================ */
  window.submitContactToWhatsApp = function (e) {
    e.preventDefault();
    var f = e.target;
    var data = {
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      email: f.email.value.trim(),
      date: f.date.value,
      event: f.event.value.trim(),
      location: f.location.value.trim(),
      message: f.message.value.trim(),
    };
    if (!data.name || !data.phone) {
      toast("Please fill your name and phone");
      return false;
    }
    var msg = "*NEW INQUIRY - The Mohul Makeup Studio*\n";
    msg += "------------------------------------\n\n";
    msg += "*Name:* " + data.name + "\n";
    msg += "*Phone:* " + data.phone + "\n";
    if (data.email) msg += "*Email:* " + data.email + "\n";
    if (data.date) msg += "*Event Date:* " + data.date + "\n";
    if (data.event) msg += "*Event Type:* " + data.event + "\n";
    if (data.location) msg += "*Location:* " + data.location + "\n";
    if (data.message) msg += "\n*Message:*\n" + data.message + "\n";
    msg += "\n------------------------------------\n";
    msg += "Looking forward to your response. Thank you!";

    window.open(
      "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg),
      "_blank",
    );
    setTimeout(function () {
      f.reset();
      toast("Message sent to WhatsApp!");
    }, 600);
    return false;
  };

  /* ============================================================
     MODAL OVERLAY / ESC HANDLERS
  ============================================================ */
  $all(".modal-overlay").forEach(function (o) {
    o.addEventListener("click", function () {
      o.closest(".modal").classList.remove("open");
      document.body.style.overflow = "";
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeQuickView();
      closeCheckout();
      closeCart();
      closeMobileMenu();
    }
  });

  /* ============================================================
     DEBOUNCE HELPER
  ============================================================ */
  function debounce(fn, wait) {
    var t;
    return function () {
      var ctx = this,
        args = arguments;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait);
    };
  }

  /* ============================================================
     INIT
  ============================================================ */
  document.addEventListener("DOMContentLoaded", function () {
    updateCartBadge();
    routeFromHash();
    initShopFilters();
    initPortfolioFilters();
    initFaq();
    initGalleryCarousel();
    initBeforeAfterSliders();
    renderShopProducts();
    renderHomeProducts();
    triggerReveal();
  });

  window.addEventListener("hashchange", routeFromHash);
  window.addEventListener("resize", debounce(triggerReveal, 200));
})();

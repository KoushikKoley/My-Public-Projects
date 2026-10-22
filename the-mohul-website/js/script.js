/* ============================================================
   THE MOHUL MAKEUP & BEAUTY STUDIO — SHARED SCRIPT (multi-page)
   - Injects: SVG sprite, header, footer, mobile menu, cart drawer,
     WhatsApp widget, image popup (2-min CTA), toast container
   - Manages: cart (localStorage), mobile menu, navbar scroll,
     popup timer, FAQ accordion, before/after sliders, reveal-on-scroll
   - Note: shop-specific logic (product rendering, quick view, checkout)
     lives in js/shop.js and is loaded only on the shop page.
============================================================ */
(function () {
  "use strict";

  /* ===== CONFIG ===== */
  var WHATSAPP_NUMBER = "917980203100";   // +91 79802 03100
  var PHONE_NUMBER = "+917980203100";
  var POPUP_DELAY_MS = 120000;            // 2 minutes
  var POPUP_SESSION_KEY = "mohul_popup_dismissed";

  /* ===== UTIL ===== */
  function $(s, c) { return (c || document).querySelector(s); }
  function $all(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function fmtINR(n) { return "\u20B9" + Number(n).toLocaleString("en-IN"); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m];
    });
  }
  function currentPath() {
    var p = location.pathname.split("/").pop() || "index.html";
    return p;
  }
  function debounce(fn, wait) {
    var t;
    return function () { var ctx = this, args = arguments; clearTimeout(t); t = setTimeout(function(){ fn.apply(ctx, args); }, wait); };
  }
  function toast(msg) {
    var t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2400);
  }
  window.toast = toast;

  /* ===== SVG ICON SPRITE ===== */
  var SVG_SPRITE =
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">' +
    '<symbol id="i-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>' +
    '<symbol id="i-camera" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="3.5"/></symbol>' +
    '<symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></symbol>' +
    '<symbol id="i-star" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.3 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z"/></symbol>' +
    '<symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4.5 4.5L19 7"/></symbol>' +
    '<symbol id="i-bag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1 13H5z"/><path d="M9 7a3 3 0 016 0"/></symbol>' +
    '<symbol id="i-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></symbol>' +
    '<symbol id="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></symbol>' +
    '<symbol id="i-minus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></symbol>' +
    '<symbol id="i-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></symbol>' +
    '<symbol id="i-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-7 8-12a8 8 0 10-16 0c0 5 8 12 8 12z"/><circle cx="12" cy="10" r="3"/></symbol>' +
    '<symbol id="i-phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16v3a2 2 0 01-2 2 19 19 0 01-17-17 2 2 0 012-2h3a2 2 0 012 2v3l-2 1a14 14 0 006 6l1-2h3a2 2 0 012 2z"/></symbol>' +
    '<symbol id="i-mail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></symbol>' +
    '<symbol id="i-chevron-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></symbol>' +
    '<symbol id="i-chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></symbol>' +
    '<symbol id="i-chevron-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></symbol>' +
    '<symbol id="i-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>' +
    '<symbol id="i-arrow-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>' +
    '<symbol id="i-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 8a5 5 0 00-8-3 5 5 0 00-8 3c0 6 8 11 8 11s8-5 8-11z"/></symbol>' +
    '<symbol id="i-sparkles" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 14v3M5 14v3"/></symbol>' +
    '<symbol id="i-drop" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6 6 11a6 6 0 01-12 0c0-5 6-11 6-11z"/></symbol>' +
    '<symbol id="i-brush" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4l6 6-9 9-6 1 1-6z"/><path d="M11 7l6 6"/></symbol>' +
    '<symbol id="i-palette" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 000 18c1 0 2-1 2-2 0-2 1-2 2-2h2a4 4 0 004-4 9 9 0 00-10-8z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="12" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="11" r="1" fill="currentColor"/></symbol>' +
    '<symbol id="i-graduation" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l10 5-10 5L2 9z"/><path d="M6 11v5c0 1 3 3 6 3s6-2 6-3v-5"/></symbol>' +
    '<symbol id="i-calendar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></symbol>' +
    '<symbol id="i-truck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></symbol>' +
    '<symbol id="i-zap" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></symbol>' +
    '<symbol id="i-gem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3l-3 6 6 12 6-12-3-6M9 3l3 6 3-6"/></symbol>' +
    '<symbol id="i-instagram" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></symbol>' +
    '<symbol id="i-facebook" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2 0-3 1.5-3 3v2H8v3h3v6h3v-6h3l1-3h-4V9c0-.6.4-1 1-1z"/></symbol>' +
    '<symbol id="i-whatsapp" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.15-1.7-.85-2-.95-.3-.1-.5-.15-.65.15s-.7.95-.9 1.15-.3.2-.6.07c-.3-.15-1.25-.46-2.4-1.47-.9-.78-1.5-1.75-1.65-2.05-.15-.3 0-.45.13-.6l.45-.5c.15-.2.2-.34.3-.56.1-.2.05-.37-.03-.52l-.9-2.16c-.23-.56-.47-.48-.65-.49h-.55c-.2 0-.5.07-.77.37-.27.3-1 1-1 2.45s1 2.85 1.2 3.05c.15.2 2.05 3.15 5 4.42.7.3 1.25.48 1.67.62.7.22 1.34.2 1.85.12.56-.08 1.7-.7 1.95-1.4.25-.68.25-1.27.17-1.4-.07-.13-.27-.2-.55-.35zM12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2z"/></symbol>' +
    '<symbol id="i-cart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6"/></symbol>' +
    '<symbol id="i-leaf" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4 19 2c1 4 0 9-5 11-2 1-3 1-3 5"/><path d="M2 21c4-4 6-6 6-9"/></symbol>' +
    '<symbol id="i-lotus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4 0 8-3 8-7-2 0-4 1-5 3 .5-3-1-6-3-8-2 2-3.5 5-3 8-1-2-3-3-5-3 0 4 4 7 8 7z"/><path d="M12 22V11"/></symbol>' +
    '<symbol id="i-user" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></symbol>' +
    '<symbol id="i-scissors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><path d="M8 7.5L20 18M8 16.5L20 6"/></symbol>' +
    '<symbol id="i-gift" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M3 12v9h18v-9"/><path d="M12 8S10 4 7 4s-2 4 5 4M12 8s2-4 5-4 2 4-5 4"/></symbol>' +
    '</svg>';

  /* ===== HEADER HTML ===== */
  function headerHTML() {
    var path = currentPath();
    function navLink(file, label) {
      var cls = path === file ? ' class="active"' : '';
      return '<a href="' + file + '"' + cls + '>' + label + '</a>';
    }
    return '' +
      '<header class="navbar" id="navbar">' +
        '<div class="nav-container">' +
          '<a href="index.html" class="logo">' +
            '<span class="logo-mark">M</span>' +
            '<span class="logo-text"><span class="logo-name">The Mohul</span><span class="logo-tag">Makeup &amp; Beauty Studio</span></span>' +
          '</a>' +
          '<nav class="nav-links" id="navLinks">' +
            navLink('index.html', 'Home') +
            '<div class="nav-dropdown" id="navDropdown">' +
              '<button class="nav-dropdown-toggle" type="button" aria-haspopup="true">Services <svg class="icon-sm"><use href="#i-chevron-down"/></svg></button>' +
              '<div class="nav-dropdown-menu">' +
                '<a href="services.html">All Services <small>Overview of every service</small></a>' +
                '<a href="skin-consultant.html">Skin Consultant <small>Personalized skin analysis</small></a>' +
                '<a href="beauty-therapist.html">Beauty Therapist <small>Facials, cleanups &amp; therapy</small></a>' +
                '<a href="beauty-salon.html">Beauty Salon <small>Full-service salon at home</small></a>' +
                '<a href="makeup-services.html">Makeup Services <small>Bridal, party &amp; HD makeup</small></a>' +
                '<a href="makeup-artists.html">Makeup Artists <small>Professional MUAs on request</small></a>' +
              '</div>' +
            '</div>' +
            navLink('about.html', 'About') +
            navLink('portfolio.html', 'Portfolio') +
            navLink('before-after.html', 'Before/After') +
            navLink('shop.html', 'Shop') +
            navLink('blog.html', 'Blog') +
            navLink('testimonials.html', 'Reviews') +
            navLink('contact.html', 'Contact') +
          '</nav>' +
          '<div class="nav-actions">' +
            '<button class="cart-btn" onclick="openCart()" aria-label="Shopping cart"><svg class="icon-md"><use href="#i-cart"/></svg><span class="cart-count empty" id="cartCount">0</span></button>' +
            '<a href="https://wa.me/' + WHATSAPP_NUMBER + '" class="btn btn-primary nav-cta" target="_blank" rel="noopener">Book Now</a>' +
            '<button class="menu-toggle" id="menuToggle" aria-label="Open menu"><svg class="icon-md"><use href="#i-menu"/></svg></button>' +
          '</div>' +
        '</div>' +
      '</header>';
  }

  /* ===== MOBILE MENU HTML ===== */
  function mobileMenuHTML() {
    var path = currentPath();
    function mLink(file, label, sub) {
      var cls = path === file ? ' class="active"' : '';
      if (sub) return '<a href="' + file + '"' + cls + '>' + label + '</a>';
      return '<a href="' + file + '"' + cls + '>' + label + '</a>';
    }
    return '' +
      '<div class="mobile-menu" id="mobileMenu">' +
        '<div class="mobile-menu-header"><span class="logo-name">The Mohul</span>' +
          '<button class="mobile-close" id="mobileClose" aria-label="Close menu"><svg class="icon-md"><use href="#i-close"/></svg></button>' +
        '</div>' +
        '<nav class="mobile-links">' +
          mLink('index.html', 'Home') +
          mLink('about.html', 'About') +
          '<span class="mobile-section-label">Services</span>' +
          mLink('services.html', 'All Services') +
          mLink('skin-consultant.html', 'Skin Consultant', true) +
          mLink('beauty-therapist.html', 'Beauty Therapist', true) +
          mLink('beauty-salon.html', 'Beauty Salon', true) +
          mLink('makeup-services.html', 'Makeup Services', true) +
          mLink('makeup-artists.html', 'Makeup Artists', true) +
          '<div class="mobile-divider"></div>' +
          mLink('portfolio.html', 'Portfolio') +
          mLink('before-after.html', 'Before &amp; After') +
          mLink('shop.html', 'Shop Products') +
          mLink('products-used.html', 'Products We Use') +
          mLink('booking.html', 'Booking Process') +
          mLink('testimonials.html', 'Client Reviews') +
          mLink('blog.html', 'Blog') +
          mLink('contact.html', 'Contact &amp; Location') +
          mLink('faq.html', 'FAQ') +
          mLink('hygiene.html', 'Hygiene &amp; Safety') +
          mLink('social.html', 'Social Feed') +
          '<div class="mobile-divider"></div>' +
          mLink('privacy.html', 'Privacy Policy') +
          mLink('terms.html', 'Terms &amp; Conditions') +
          mLink('refund.html', 'Refund Policy') +
        '</nav>' +
        '<a href="https://wa.me/' + WHATSAPP_NUMBER + '" class="btn btn-primary mobile-wa-btn" target="_blank" rel="noopener"><svg class="icon-sm"><use href="#i-whatsapp"/></svg> WhatsApp Us</a>' +
      '</div>';
  }

  /* ===== FOOTER HTML ===== */
  function footerHTML() {
    var path = currentPath();
    function fLink(file, label) {
      var cls = path === file ? ' style="color:var(--gold-300)"' : '';
      return '<a href="' + file + '"' + cls + '>' + label + '</a>';
    }
    return '' +
      '<footer class="footer">' +
        '<div class="container">' +
          '<div class="footer-grid">' +
            '<div class="footer-col">' +
              '<a href="index.html" class="logo"><span class="logo-mark">M</span><span class="logo-text"><span class="logo-name">The Mohul</span><span class="logo-tag">Makeup &amp; Beauty Studio</span></span></a>' +
              '<p style="display:block;margin-top:14px">Premium skin consultancy, beauty therapy, salon services &amp; makeup artistry in Bankura, West Bengal. Trusted by 500+ clients for radiant, long-lasting results.</p>' +
              '<div class="footer-social">' +
                '<a href="https://www.facebook.com/Themohuul" target="_blank" rel="noopener" aria-label="Facebook"><svg class="icon-md"><use href="#i-facebook"/></svg></a>' +
                '<a href="https://instagram.com/themohulmakeup" target="_blank" rel="noopener" aria-label="Instagram"><svg class="icon-md"><use href="#i-instagram"/></svg></a>' +
                '<a href="https://wa.me/' + WHATSAPP_NUMBER + '" target="_blank" rel="noopener" aria-label="WhatsApp"><svg class="icon-md"><use href="#i-whatsapp"/></svg></a>' +
              '</div>' +
            '</div>' +
            '<div class="footer-col">' +
              '<h4>Services</h4>' +
              fLink('skin-consultant.html', 'Skin Consultant') +
              fLink('beauty-therapist.html', 'Beauty Therapist') +
              fLink('beauty-salon.html', 'Beauty Salon') +
              fLink('makeup-services.html', 'Makeup Services') +
              fLink('makeup-artists.html', 'Makeup Artists') +
              fLink('services.html', 'All Services') +
            '</div>' +
            '<div class="footer-col">' +
              '<h4>Quick Links</h4>' +
              fLink('index.html', 'Home') +
              fLink('about.html', 'About') +
              fLink('portfolio.html', 'Portfolio') +
              fLink('shop.html', 'Shop') +
              fLink('blog.html', 'Blog') +
              fLink('booking.html', 'Book Appointment') +
              fLink('contact.html', 'Contact') +
              fLink('faq.html', 'FAQ') +
            '</div>' +
            '<div class="footer-col">' +
              '<h4>Contact</h4>' +
              '<p><svg class="icon-sm footer-icon"><use href="#i-pin"/></svg> Jhantipahari, Bankura, West Bengal - 722212</p>' +
              '<p><svg class="icon-sm footer-icon"><use href="#i-phone"/></svg> <a href="tel:' + PHONE_NUMBER + '">+91 79802 03100</a></p>' +
              '<p><svg class="icon-sm footer-icon"><use href="#i-mail"/></svg> <a href="mailto:themohulmakeup@gmail.com">themohulmakeup@gmail.com</a></p>' +
              '<p><svg class="icon-sm footer-icon"><use href="#i-clock"/></svg> Mon-Sat 8AM-8PM</p>' +
              '<div class="mobile-divider" style="margin:14px 0"></div>' +
              fLink('privacy.html', 'Privacy Policy') + ' | ' + fLink('terms.html', 'Terms') + ' | ' + fLink('refund.html', 'Refund') +
            '</div>' +
          '</div>' +
          '<div class="footer-bottom">' +
            '<p>(c) 2026 The Mohul Makeup &amp; Beauty Studio. All rights reserved.</p>' +
            '<p class="footer-credit">Designed by <a href="https://buynsofts.in" target="_blank" rel="noopener">buynsofts.in</a></p>' +
          '</div>' +
        '</div>' +
      '</footer>';
  }

  /* ===== OVERLAY HTML (cart drawer, modals, widgets, popup) ===== */
  function overlaysHTML() {
    return '' +
      /* Overlay */
      '<div class="overlay" id="overlay"></div>' +
      /* Cart drawer */
      '<div class="cart-drawer" id="cartDrawer">' +
        '<div class="cart-head"><h3>Your Cart (<span id="cartItemCount">0</span>)</h3><button class="cart-close" onclick="closeCart()" aria-label="Close cart"><svg class="icon-md"><use href="#i-close"/></svg></button></div>' +
        '<div class="cart-body" id="cartBody">' +
          '<div class="cart-empty" id="cartEmpty"><div class="cart-empty-icon"><svg class="icon-xl"><use href="#i-bag"/></svg></div><p>Your cart is empty</p><a href="shop.html" class="btn btn-outline">Browse Products</a></div>' +
          '<div class="cart-items" id="cartItems"></div>' +
        '</div>' +
        '<div class="cart-footer" id="cartFooter" style="display:none">' +
          '<div class="cart-total"><span>Total</span><span id="cartTotal">' + fmtINR(0) + '</span></div>' +
          '<button class="btn btn-primary btn-full" onclick="openCheckout()">Proceed to Checkout</button>' +
          '<button class="btn btn-outline btn-full mt" onclick="clearCart()">Clear Cart</button>' +
        '</div>' +
      '</div>' +
      /* WhatsApp widget */
      '<div class="wa-widget"><a href="https://wa.me/' + WHATSAPP_NUMBER + '" target="_blank" rel="noopener" class="wa-btn" aria-label="Chat on WhatsApp"><svg class="icon-lg"><use href="#i-whatsapp"/></svg></a></div>' +
      /* Image popup CTA (after 2 min) */
      '<div class="cta-popup-overlay" id="ctaPopupOverlay">' +
        '<div class="cta-popup">' +
          '<button class="cta-popup-close" id="ctaPopupClose" aria-label="Close popup"><svg class="icon-md"><use href="#i-close"/></svg></button>' +
          '<img class="cta-popup-img" src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80" alt="Beauty treatment at The Mohul" loading="lazy">' +
          '<div class="cta-popup-body">' +
            '<span class="cta-popup-eyebrow">Limited Time Offer</span>' +
            '<h3>Get 20% Off Your First Visit</h3>' +
            '<p>Skin consultation, facial, or bridal makeup - book today and avail a special 20% welcome discount on your first appointment with The Mohul.</p>' +
            '<div class="cta-popup-actions">' +
              '<a href="tel:' + PHONE_NUMBER + '" class="btn btn-call"><svg class="icon-sm"><use href="#i-phone"/></svg> Call Now - ' + PHONE_NUMBER + '</a>' +
              '<a href="https://wa.me/' + WHATSAPP_NUMBER + '?text=Hi%20The%20Mohul%2C%20I%20saw%20the%20popup%20offer%20and%20want%20to%20book%20my%20first%20appointment" class="btn btn-whatsapp" target="_blank" rel="noopener"><svg class="icon-sm"><use href="#i-whatsapp"/></svg> Chat on WhatsApp</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      /* Toast */
      '<div class="toast" id="toast"></div>';
  }

  /* ===== STATE (cart) ===== */
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem("mohul_cart") || "[]"); } catch (e) { cart = []; }

  function saveCart() { localStorage.setItem("mohul_cart", JSON.stringify(cart)); }
  function cartCount() { return cart.reduce(function (s, i) { return s + i.qty; }, 0); }
  function cartTotal() { return cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0); }
  function findProduct(id) {
    if (!window.PRODUCTS) return null;
    return window.PRODUCTS.find(function (p) { return p.id === id; });
  }

  function updateCartBadge() {
    var badge = $("#cartCount");
    if (!badge) return;
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
    if (!body) return;
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
    body.innerHTML = cart.map(function (item) {
      return '' +
        '<div class="cart-item">' +
          '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '">' +
          '<div class="cart-item-info">' +
            '<div class="cart-item-name">' + escapeHtml(item.name) + '</div>' +
            '<div class="cart-item-brand">' + escapeHtml(item.brand) + '</div>' +
            '<div class="cart-item-price">' + fmtINR(item.price) + '</div>' +
            '<div class="cart-qty">' +
              '<button onclick="changeQty(\'' + item.id + '\',-1)" aria-label="Decrease"><svg class="icon-sm"><use href="#i-minus"/></svg></button>' +
              '<span>' + item.qty + '</span>' +
              '<button onclick="changeQty(\'' + item.id + '\',1)" aria-label="Increase"><svg class="icon-sm"><use href="#i-plus"/></svg></button>' +
              '<button class="cart-item-remove" onclick="removeFromCart(\'' + item.id + '\')">Remove</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join("");
  }

  window.addToCart = function (id) {
    var p = findProduct(id);
    if (!p) { toast("Product not found"); return; }
    var existing = cart.find(function (i) { return i.id === id; });
    if (existing) existing.qty += 1;
    else cart.push({ id: p.id, name: p.name, brand: p.brand, price: p.price, image: p.image, qty: 1 });
    saveCart();
    updateCartBadge();
    renderCart();
    toast("\u2713 " + p.name + " added to cart");
  };

  window.changeQty = function (id, delta) {
    var item = cart.find(function (i) { return i.id === id; });
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(function (i) { return i.id !== id; });
    saveCart();
    updateCartBadge();
    renderCart();
  };

  window.removeFromCart = function (id) {
    cart = cart.filter(function (i) { return i.id !== id; });
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
    var d = $("#cartDrawer");
    if (!d) return;
    d.classList.add("open");
    $("#overlay").classList.add("show");
    renderCart();
  };
  window.closeCart = function () {
    var d = $("#cartDrawer");
    if (!d) return;
    d.classList.remove("open");
    $("#overlay").classList.remove("show");
  };

  window.buyNow = function (id) {
    addToCart(id);
    openCheckout();
  };

  /* ===== CHECKOUT (defined in shop.js for shop page; here for others) ===== */
  window.openCheckout = function () {
    if (cartCount() === 0) { toast("Your cart is empty"); return; }
    closeCart();
    var m = $("#checkoutModal");
    if (!m) {
      // Redirect to shop page where checkout modal exists
      window.location.href = "shop.html#checkout";
      return;
    }
    renderCheckoutSummary();
    m.classList.add("open");
    document.body.style.overflow = "hidden";
  };
  window.closeCheckout = function () {
    var m = $("#checkoutModal");
    if (!m) return;
    m.classList.remove("open");
    document.body.style.overflow = "";
  };

  function renderCheckoutSummary() {
    var itemsEl = $("#checkoutItems");
    var totalEl = $("#checkoutTotal");
    if (!itemsEl) return;
    itemsEl.innerHTML = cart.map(function (i) {
      return '' +
        '<div class="co-item">' +
          '<img src="' + escapeHtml(i.image) + '" alt="' + escapeHtml(i.name) + '">' +
          '<div class="co-item-info"><div class="co-item-name">' + escapeHtml(i.name) + '</div>' +
          '<div class="co-item-qty">Qty: ' + i.qty + ' x ' + fmtINR(i.price) + '</div></div>' +
          '<div class="co-item-price">' + fmtINR(i.price * i.qty) + '</div>' +
        '</div>';
    }).join("");
    totalEl.textContent = fmtINR(cartTotal());
  }

  window.submitCheckoutToWhatsApp = function (e) {
    e.preventDefault();
    var f = e.target;
    var data = {
      name: f.name.value.trim(), phone: f.phone.value.trim(),
      email: f.email.value.trim(), address: f.address.value.trim(),
      city: f.city.value.trim(), pincode: f.pincode.value.trim(),
      notes: f.notes.value.trim()
    };
    if (!data.name || !data.phone || !data.address || !data.city || !data.pincode) {
      toast("Please fill all required fields"); return false;
    }
    var orderItems = cart.map(function (i, idx) {
      return (idx + 1) + ". " + i.name + " (" + i.brand + ")\n   Qty: " + i.qty + " x " + fmtINR(i.price) + " = " + fmtINR(i.price * i.qty);
    }).join("\n");
    var msg = "*NEW ORDER - The Mohul Makeup & Beauty Studio*\n------------------------------------\n\n*Customer Details*\n*Name:* " + data.name + "\n*Phone:* " + data.phone + "\n";
    if (data.email) msg += "*Email:* " + data.email + "\n";
    msg += "*Address:* " + data.address + "\n*City:* " + data.city + "\n*Pincode:* " + data.pincode + "\n";
    if (data.notes) msg += "*Notes:* " + data.notes + "\n";
    msg += "\n*Order Items*\n" + orderItems + "\n\n------------------------------------\n*Grand Total: " + fmtINR(cartTotal()) + "*\n------------------------------------\n\nPlease confirm my order and share payment details. Thank you!";
    window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg), "_blank");
    setTimeout(function () {
      cart = []; saveCart(); updateCartBadge(); renderCart(); f.reset();
      closeCheckout(); toast("Order sent to WhatsApp!");
    }, 600);
    return false;
  };

  /* ===== CONTACT FORM -> WHATSAPP ===== */
  window.submitContactToWhatsApp = function (e) {
    e.preventDefault();
    var f = e.target;
    var data = {
      name: f.name.value.trim(), phone: f.phone.value.trim(),
      email: f.email.value.trim(), date: f.date.value,
      event: f.event.value.trim(), location: f.location.value.trim(),
      message: f.message.value.trim()
    };
    if (!data.name || !data.phone) { toast("Please fill your name and phone"); return false; }
    var msg = "*NEW INQUIRY - The Mohul Makeup & Beauty Studio*\n------------------------------------\n\n*Name:* " + data.name + "\n*Phone:* " + data.phone + "\n";
    if (data.email) msg += "*Email:* " + data.email + "\n";
    if (data.date) msg += "*Event Date:* " + data.date + "\n";
    if (data.event) msg += "*Event Type:* " + data.event + "\n";
    if (data.location) msg += "*Location:* " + data.location + "\n";
    if (data.message) msg += "\n*Message:*\n" + data.message + "\n";
    msg += "\n------------------------------------\nLooking forward to your response. Thank you!";
    window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg), "_blank");
    setTimeout(function () { f.reset(); toast("Message sent to WhatsApp!"); }, 600);
    return false;
  };

  /* ===== NAVBAR SCROLL + MOBILE MENU + DROPDOWN ===== */
  function initNavbar() {
    var navbar = $("#navbar");
    if (!navbar) return;
    window.addEventListener("scroll", function () {
      if (window.scrollY > 30) navbar.classList.add("scrolled");
      else navbar.classList.remove("scrolled");
    }, { passive: true });
  }

  function initMobileMenu() {
    var toggle = $("#menuToggle");
    var menu = $("#mobileMenu");
    var overlay = $("#overlay");
    var closeBtn = $("#mobileClose");
    if (!toggle || !menu) return;
    function close() { menu.classList.remove("open"); overlay.classList.remove("show"); }
    toggle.addEventListener("click", function () { menu.classList.add("open"); overlay.classList.add("show"); });
    if (closeBtn) closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function () { close(); closeCart(); });
  }

  function initNavDropdown() {
    var dd = $("#navDropdown");
    if (!dd) return;
    var toggle = dd.querySelector(".nav-dropdown-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      dd.classList.toggle("open");
    });
    // Close on outside click
    document.addEventListener("click", function (e) {
      if (!dd.contains(e.target)) dd.classList.remove("open");
    });
  }

  /* ===== CTA POPUP (after 2 min, once per session) ===== */
  function initCtaPopup() {
    var overlay = $("#ctaPopupOverlay");
    var closeBtn = $("#ctaPopupClose");
    if (!overlay) return;
    var dismissed = false;
    try { dismissed = sessionStorage.getItem(POPUP_SESSION_KEY) === "1"; } catch (e) {}
    if (dismissed) return;
    setTimeout(function () {
      overlay.classList.add("show");
      document.body.style.overflow = "hidden";
    }, POPUP_DELAY_MS);
    function close() {
      overlay.classList.remove("show");
      document.body.style.overflow = "";
      try { sessionStorage.setItem(POPUP_SESSION_KEY, "1"); } catch (e) {}
    }
    if (closeBtn) closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("show")) close();
    });
  }

  /* ===== FAQ ACCORDION ===== */
  function initFaq() {
    $all(".faq-q").forEach(function (q) {
      q.addEventListener("click", function () {
        var item = q.closest(".faq-item");
        var open = item.classList.contains("active");
        $all(".faq-item").forEach(function (i) { i.classList.remove("active"); });
        if (!open) item.classList.add("active");
      });
    });
  }

  /* ===== BEFORE/AFTER SLIDERS ===== */
  function initBeforeAfterSliders() {
    $all(".ba-slider").forEach(function (slider) {
      if (slider.dataset.init) return;
      slider.dataset.init = "1";
      var before = slider.dataset.before;
      var after = slider.dataset.after;
      var label = slider.dataset.label || "";
      slider.innerHTML =
        '<img class="ba-after" src="' + after + '" alt="After" draggable="false">' +
        '<img class="ba-before" src="' + before + '" alt="Before" draggable="false">' +
        '<span class="ba-tag before">Before</span>' +
        '<span class="ba-tag after">After</span>' +
        '<div class="ba-handle"></div>' +
        '<div class="ba-label">' + escapeHtml(label) + '</div>';
      var beforeImg = slider.querySelector(".ba-before");
      var handle = slider.querySelector(".ba-handle");

      function setPos(clientX) {
        var rect = slider.getBoundingClientRect();
        if (rect.width === 0) return;
        var pct = ((clientX - rect.left) / rect.width) * 100;
        pct = Math.max(0, Math.min(100, pct));
        beforeImg.style.clipPath = "inset(0 " + (100 - pct) + "% 0 0)";
        handle.style.left = pct + "%";
      }
      var rect = slider.getBoundingClientRect();
      if (rect.width > 0) setPos(rect.left + rect.width / 2);
      else { beforeImg.style.clipPath = "inset(0 50% 0 0)"; handle.style.left = "50%"; }

      var dragging = false;
      slider.addEventListener("mousedown", function (e) { dragging = true; setPos(e.clientX); e.preventDefault(); });
      window.addEventListener("mousemove", function (e) { if (dragging) setPos(e.clientX); });
      window.addEventListener("mouseup", function () { dragging = false; });
      slider.addEventListener("touchstart", function (e) { if (e.touches.length === 1) setPos(e.touches[0].clientX); }, { passive: true });
      slider.addEventListener("touchmove", function (e) { if (e.touches.length === 1) { setPos(e.touches[0].clientX); e.preventDefault(); } }, { passive: false });
      slider.addEventListener("click", function (e) { setPos(e.clientX); });
    });
  }

  /* ===== REVEAL ON SCROLL ===== */
  var revealObserver;
  function initReveal() {
    if (!("IntersectionObserver" in window)) {
      $all(".reveal").forEach(function (el) { el.classList.add("visible"); });
      return;
    }
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("visible"); revealObserver.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    $all(".reveal").forEach(function (el) { revealObserver.observe(el); });
  }

  /* ===== INJECT EVERYTHING ===== */
  function injectAll() {
    // SVG sprite at top of body
    var bodyEl = document.body;
    var spriteContainer = document.createElement("div");
    spriteContainer.innerHTML = SVG_SPRITE;
    bodyEl.insertBefore(spriteContainer.firstChild, bodyEl.firstChild);

    // Header
    var headerMount = $("#header-mount");
    if (headerMount) headerMount.innerHTML = headerHTML();

    // Footer
    var footerMount = $("#footer-mount");
    if (footerMount) footerMount.innerHTML = footerHTML();

    // Overlays (mobile menu, cart, widget, popup, toast) - append to body
    var overlayMount = $("#overlay-mount") || (function () {
      var div = document.createElement("div");
      bodyEl.appendChild(div);
      return div;
    })();
    overlayMount.innerHTML = mobileMenuHTML() + overlaysHTML();
  }

  /* ===== HERO SLIDER (home page only) ===== */
  function initHeroSlider() {
    var slider = $("#heroSlider");
    if (!slider) return;
    var slides = $all(".hero-slide", slider);
    if (!slides.length) return;
    var dotsContainer = $("#heroDots", slider);
    var prevBtn = $("#heroPrev", slider);
    var nextBtn = $("#heroNext", slider);
    var index = 0;
    var timer = null;
    var DELAY = 5500;

    // Build dots
    if (dotsContainer) {
      slides.forEach(function (_, i) {
        var dot = document.createElement("button");
        dot.className = "hero-dot" + (i === 0 ? " active" : "");
        dot.setAttribute("aria-label", "Slide " + (i + 1));
        dot.addEventListener("click", function () { goTo(i); resetTimer(); });
        dotsContainer.appendChild(dot);
      });
    }

    function isMobile() { return window.innerWidth <= 768; }

    function applyBg() {
      var mobile = isMobile();
      slides.forEach(function (slide) {
        var bg = slide.querySelector(".hero-bg");
        var url = mobile ? slide.dataset.mobile : slide.dataset.desktop;
        if (url && bg) bg.style.backgroundImage = 'url("' + url + '")';
      });
    }

    function dots() { return $all(".hero-dot", slider); }

    function goTo(i) {
      slides[index].classList.remove("active");
      dots()[index].classList.remove("active");
      index = (i + slides.length) % slides.length;
      slides[index].classList.add("active");
      dots()[index].classList.add("active");
    }

    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }

    function startTimer() { stopTimer(); timer = setInterval(next, DELAY); }
    function stopTimer() { if (timer) clearInterval(timer); }
    function resetTimer() { stopTimer(); startTimer(); }

    if (nextBtn) nextBtn.addEventListener("click", function () { next(); resetTimer(); });
    if (prevBtn) prevBtn.addEventListener("click", function () { prev(); resetTimer(); });

    // Swipe support
    var swipeStart = null;
    slider.addEventListener("touchstart", function (e) { swipeStart = e.touches[0].clientX; stopTimer(); }, { passive: true });
    slider.addEventListener("touchend", function (e) {
      if (swipeStart === null) return;
      var dx = e.changedTouches[0].clientX - swipeStart;
      if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
      swipeStart = null; resetTimer();
    }, { passive: true });

    applyBg();
    startTimer();
    window.addEventListener("resize", debounce(applyBg, 200));
  }

  /* ===== INIT ===== */
  function init() {
    injectAll();
    initNavbar();
    initMobileMenu();
    initNavDropdown();
    initHeroSlider();
    initFaq();
    initBeforeAfterSliders();
    initReveal();
    updateCartBadge();
    renderCart();
    initCtaPopup();

    // ESC to close drawers/modals
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeCart();
        if (window.closeQuickView) window.closeQuickView();
        closeCheckout();
        var mm = $("#mobileMenu"); if (mm) mm.classList.remove("open");
        var ov = $("#overlay"); if (ov) ov.classList.remove("show");
      }
    });

    // Check #checkout hash on shop page
    if (location.hash === "#checkout") {
      setTimeout(function () { openCheckout(); }, 500);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

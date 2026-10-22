# The Mohul Makeup & Beauty Studio — Multi-Page Website

A multi-page static website built with **HTML, CSS, JavaScript, and JSON only** — no framework, no build step, no backend.

## Quick Start

1. Unzip the file
2. Upload the contents (all files and folders) to your web host's `public_html` or `www` directory
3. Visit your domain — `index.html` will load automatically

To preview locally: just open `index.html` in any modern browser. The Shop page fetches `data/products.json` via JavaScript — for this to work locally, you may need to serve the files via a local server (e.g., `python -m http.server` in this folder).

## Folder Structure

```
the-mohul-website/
|-- index.html              Home page (hero, services, gallery, testimonials, blog teaser)
|-- services.html           Overview of all 5 services
|-- skin-consultant.html    Service page: Skin Consultant (Priority #1)
|-- beauty-therapist.html   Service page: Beauty Therapist (Priority #2)
|-- beauty-salon.html       Service page: Beauty Salon (Priority #3)
|-- makeup-services.html    Service page: Makeup Services
|-- makeup-artists.html     Service page: Makeup Artists
|-- about.html              About the artist & certifications
|-- portfolio.html          Filterable gallery of work
|-- before-after.html       Before/after slider transformations
|-- shop.html               Online store with cart & checkout
|-- products-used.html      Brands used at the studio
|-- booking.html            Booking process & trial details
|-- testimonials.html       Client reviews
|-- contact.html            Contact info, form, map, travel charges
|-- faq.html                Frequently asked questions
|-- hygiene.html            Hygiene & safety practices
|-- social.html             Social feed & features
|-- blog.html               Blog listing
|-- blog-skin-care-tips.html
|-- blog-bridal-makeup-guide.html
|-- blog-monsoon-skincare.html
|-- privacy.html            Privacy policy
|-- terms.html              Terms & conditions
|-- refund.html             Refund & cancellation policy
|-- 404.html                Custom 404 page
|-- sitemap.xml             Sitemap for search engines
|-- robots.txt              Crawl directives for bots
|-- llms.txt                LLM-friendly site summary
|-- .htaccess               Apache config (404, caching, security)
|-- favicon.svg             Site favicon
|-- README.md               This file
|-- css/
|   `-- styles.css          All styles (new gold + green + black theme)
|-- js/
|   |-- script.js           Shared script: header, footer, nav, mobile menu,
|   |                        cart drawer, WhatsApp widget, popup CTA, FAQ,
|   |                        before/after sliders, reveal-on-scroll
|   `-- shop.js             Shop-only script: products rendering, quick view,
|                            checkout modal
`-- data/
    `-- products.json       Product catalog (12 products)
```

## How the Header & Footer Work

The header, footer, mobile menu, cart drawer, WhatsApp widget, and popup CTA are **injected by JavaScript on every page**. Look at any HTML file and you'll see:

```html
<body>
  <div id="header-mount"></div>     <!-- header injected here -->
  <main>...page content...</main>
  <div id="footer-mount"></div>     <!-- footer injected here -->
  <div id="overlay-mount"></div>    <!-- cart, popup, mobile menu, etc. -->
  <script src="js/script.js"></script>
</body>
```

To edit the navigation, footer links, popup text, or WhatsApp number — **edit `js/script.js` only**. All pages update automatically.

## Image Popup CTA (After 2 Minutes)

A popup appears 2 minutes after a user lands on any page, showing:
- An image
- A headline ("Get 20% Off Your First Visit")
- A "Call Now" button (tel: link)
- A "Chat on WhatsApp" button (wa.me link)
- A close button

The popup only shows **once per session** (controlled by `sessionStorage`). To change the popup delay, edit `POPUP_DELAY_MS` in `js/script.js`.

## Theme Colors

The site uses a **Golden Yellow + Deep Forest Green + Black + Cream** palette:

- Golden Yellow: `#D4A017` (primary accent), `#F2C84B` (highlights)
- Deep Forest Green: `#0F5132` (brand primary), `#1B7345` (medium)
- Black: `#0A0A0A` (footer, dark sections)
- Cream: `#FAF7F0` (background)

All colors are defined as CSS variables in `:root` in `css/styles.css`. Change them once there and the whole site updates.

## Services (Priority Order)

1. **Skin Consultant** — `skin-consultant.html`
2. **Beauty Therapist** — `beauty-therapist.html`
3. **Beauty Salon** — `beauty-salon.html`
4. **Makeup Services** — `makeup-services.html`
5. **Makeup Artists** — `makeup-artists.html`

The first three are marked as "Priority" with a gold badge in the homepage grid and services overview.

## SEO Features

- Each page has unique `<title>`, `<meta description>`, canonical URL
- `sitemap.xml` lists all 25+ pages
- `robots.txt` allows all bots including GPTBot, ClaudeBot, Google-Extended, PerplexityBot
- `llms.txt` provides a clean text summary for LLMs
- Structured data (JSON-LD) on home page (`BeautySalon`), service page (`Service`), FAQ page (`FAQPage`)
- Open Graph tags on home and blog pages
- Mobile-friendly, fast-loading (no framework, no jQuery)

## Shop Page (Cart & Checkout)

The shop page (`shop.html`) loads `data/products.json` and renders products client-side. Features:
- Category filters (All, Bridal, Face, Eyes, Lips, Tools)
- Live search
- Quick view modal with multiple product images
- Add to cart / Buy now
- Cart drawer (persists across pages via localStorage)
- Checkout modal that sends order details to WhatsApp

To add or edit products, **edit `data/products.json`** only.

## Contact Form & Checkout

Both the contact form (on `contact.html`) and the checkout form (in the cart) send their data formatted to WhatsApp at `+91 79802 03100`. No backend, no email server — the form data is URL-encoded and opened in WhatsApp with a prefilled message.

To change the WhatsApp number, edit `WHATSAPP_NUMBER` in `js/script.js`. To change the phone number, edit `PHONE_NUMBER` in the same file.

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge — last 2 versions). IE not supported.

## Credits

- Fonts: Inter & Playfair Display (Google Fonts)
- Images: Unsplash, Pinterest, WedMeGood, Bodycraft (replace with your own for production)
- Icons: Custom inline SVG sprite (in `js/script.js`)
- Designed by: [buynsofts.in](https://buynsofts.in)

## License

(c) 2026 The Mohul Makeup & Beauty Studio. All rights reserved.

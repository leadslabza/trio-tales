# Trio Tales Website

A responsive, dependency-free e-commerce front-end built with semantic HTML, CSS and vanilla JavaScript.

## Run locally

Open `index.html` directly, or serve the folder with:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Architecture

- Existing multi-page static frontend remains the customer-facing source of truth for design and UX.
- WooCommerce is the intended commerce source of truth for products, prices, inventory, customers and orders.
- A standalone Node/Express Store API now lives in `backend/` and provides the secure integration boundary.
- `assets/js/api.js` is the frontend client for the Store API.
- The current `assets/js/data.js` and localStorage checkout remain in place temporarily as the visual/demo fallback while the WooCommerce environment is configured.
- Live payment, order creation, invoices, transactional email and shipping notifications are deliberately not enabled yet.

## Production integration boundary

Replace the demo checkout submission in `renderCheckout()` with a secure backend call that:

1. validates products and prices server-side;
2. calculates shipping server-side;
3. creates a pending order in a database;
4. starts a payment session with the chosen provider;
5. verifies the provider webhook before marking the order paid;
6. sends customer and admin confirmations.

Custom contact icons updated July 2026: email, Facebook, WhatsApp and Instagram artwork is stored in assets/images as optimized WebP files and used on the Contact page and footer.

## Final design assets

The decorative artwork supplied inside `Website Decisions.docx` is included in
`assets/decor` and appears as gentle, non-interactive accents throughout the
site. Animation automatically switches off for visitors who prefer reduced
motion.

The embedded **Dreaming Outloud Pro** regular, bold and italic font files are
included in `assets/fonts` and loaded locally by the website, so headings render
consistently without requiring the font to be installed on the viewing device.

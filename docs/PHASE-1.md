# Trio Tales Headless WooCommerce — Phase 1 Foundation

## Completed

- Added a standalone Node/Express Store API under `backend/`.
- Added environment-based WooCommerce credentials; no secrets are stored in source.
- Added health endpoint.
- Added WooCommerce-backed product endpoint.
- Added WooCommerce-backed series endpoint using product categories prefixed with `series-`.
- Added a checkout API contract without enabling order creation/payment yet.
- Added a browser API client at `assets/js/api.js`.
- Loaded the API client on all frontend pages without changing the existing visual design.

## Local API setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Set these values in `.env`:

- `WC_BASE_URL`
- `WC_CONSUMER_KEY`
- `WC_CONSUMER_SECRET`
- `FRONTEND_ORIGIN`

## WooCommerce data model for the next phase

### Series

Create WooCommerce product categories with slugs:

- `series-fruits-of-the-spirit`
- `series-armour-of-god`

The API treats categories beginning with `series-` as storefront series. Series-specific fields such as scripture can be stored as category metadata in the final WordPress integration.

### Products

The current Trio Tales products should become WooCommerce products. Product-specific metadata currently expected by the API:

- `trio_virtue`
- `trio_coming_soon`

The frontend remains responsible for presentation; WooCommerce becomes the source of truth for product name, price, images, stock and publication status.

## Deliberately not enabled yet

- Live payment processing
- WooCommerce order creation from the browser
- Persistent cart implementation
- Invoice generation
- Transactional emails
- Shipping/tracking notifications
- Customer accounts

Those are the next integration stages and should only be enabled once WooCommerce and the chosen payment gateway are configured.

## Local WooCommerce REST authentication

The local WordPress environment may use a plain HTTP URL such as `http://triotales.local`.
WooCommerce requires one-legged OAuth 1.0a authentication for REST API requests over HTTP.
The Store API client therefore signs requests automatically in `backend/src/services/woocommerce.js`.

Keep the WooCommerce consumer key and secret in `backend/.env` only. Never commit `.env` or paste the secret into source control.

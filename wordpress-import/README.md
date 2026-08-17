# Trio Tales WooCommerce Catalogue Import

This is the first real catalogue migration from the supplied Trio Tales frontend into WooCommerce.

## What it creates

- The Fruits of the Spirit Series as a WooCommerce product category
- The Armour of God Series as a WooCommerce product category
- The 10 current products from the frontend catalogue
- Stable SKUs for each product
- Prices and the bundle's R1,341 regular / R1,275 sale pricing
- Product descriptions
- Virtue metadata
- Coming-soon metadata and out-of-stock status for unpublished adventures
- Local cover images in the WordPress Media Library
- Trio Tales-specific metadata for future API/frontend use

## Safe to rerun

The importer matches products by SKU and updates existing products rather than creating duplicates.

## Run it in Local

1. Copy this entire `wordpress-import` folder into the WordPress site root. With Local, this is normally the site's `app/public` folder.
2. Open Local's **Site Shell**.
3. Confirm you are in the WordPress root:

```bash
cd /app/public
```

4. Run:

```bash
wp eval-file wordpress-import/import.php
```

5. Check **WooCommerce → Products**.

The test product `TEST-001` is intentionally left alone so the API connection can continue to be tested. Delete it manually after the real catalogue is confirmed.

## Notes

The "Complete Series Bundle" is currently represented as a simple WooCommerce product with bundle metadata. The final implementation can use WooCommerce Product Bundles (or an equivalent bundle system) once we decide how stock should decrement across the nine books.

Series are initially represented using WooCommerce product categories because that works without installing a custom WordPress plugin. The API/frontend can later expose these as a dedicated series taxonomy if needed.

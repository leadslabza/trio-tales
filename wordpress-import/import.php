<?php
/**
 * Trio Tales WooCommerce catalogue importer.
 *
 * Run from the WordPress root with:
 *   wp eval-file trio-import/import.php
 *
 * The script is idempotent: products are matched by SKU and updated when run again.
 */

if (!defined('ABSPATH')) {
    exit("This importer must run inside WordPress via WP-CLI (wp eval-file).\n");
}

if (!class_exists('WooCommerce')) {
    exit("WooCommerce is not active.\n");
}

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

$base = __DIR__;
$manifest_file = $base . '/trio-catalogue.json';
$images_dir = $base . '/images';

if (!file_exists($manifest_file)) {
    exit("Manifest not found: {$manifest_file}\n");
}

$data = json_decode(file_get_contents($manifest_file), true);
if (!is_array($data)) {
    exit("Could not parse trio-catalogue.json\n");
}

function trio_log($message) {
    echo '[Trio Tales] ' . $message . PHP_EOL;
}

function trio_upsert_series_category(array $series) {
    $term = get_term_by('slug', 'series-' . $series['slug'], 'product_cat');
    if (!$term) {
        $result = wp_insert_term($series['name'], 'product_cat', [
            'slug' => 'series-' . $series['slug'],
            'description' => $series['description'],
        ]);
        if (is_wp_error($result)) {
            throw new RuntimeException('Could not create series category ' . $series['name'] . ': ' . $result->get_error_message());
        }
        $term_id = (int) $result['term_id'];
    } else {
        $term_id = (int) $term->term_id;
        wp_update_term($term_id, 'product_cat', [
            'name' => $series['name'],
            'description' => $series['description'],
        ]);
    }

    update_term_meta($term_id, 'trio_series_id', $series['id']);
    update_term_meta($term_id, 'trio_scripture', $series['scripture']);
    update_term_meta($term_id, 'trio_coming_soon', !empty($series['comingSoon']) ? 'yes' : 'no');
    update_term_meta($term_id, 'trio_image', $series['image']);

    return $term_id;
}

function trio_attach_local_image($file_path, $parent_id, $title) {
    if (!file_exists($file_path)) {
        trio_log("Image not found, skipping: {$file_path}");
        return 0;
    }

    $filename = wp_basename($file_path);
    $existing = get_posts([
        'post_type' => 'attachment',
        'post_status' => 'inherit',
        'posts_per_page' => 1,
        'meta_key' => '_trio_source_filename',
        'meta_value' => $filename,
        'fields' => 'ids',
    ]);

    if (!empty($existing)) {
        $attachment_id = (int) $existing[0];
        wp_update_post(['ID' => $attachment_id, 'post_parent' => $parent_id]);
        return $attachment_id;
    }

    $tmp = wp_tempnam($filename);
    if (!$tmp || !copy($file_path, $tmp)) {
        trio_log("Could not stage image: {$filename}");
        return 0;
    }

    $file_array = [
        'name' => $filename,
        'tmp_name' => $tmp,
    ];

    $attachment_id = media_handle_sideload($file_array, $parent_id, $title);
    if (is_wp_error($attachment_id)) {
        @unlink($tmp);
        trio_log("Image import failed for {$filename}: " . $attachment_id->get_error_message());
        return 0;
    }

    update_post_meta($attachment_id, '_trio_source_filename', $filename);
    return (int) $attachment_id;
}

$categories = [];
foreach (($data['series'] ?? []) as $series) {
    $categories[$series['id']] = trio_upsert_series_category($series);
    trio_log("Series ready: {$series['name']} (term {$categories[$series['id']]})");
}

$created = 0;
$updated = 0;
$images = 0;

foreach (($data['products'] ?? []) as $item) {
    $sku = sanitize_text_field($item['sku']);
    $product_id = wc_get_product_id_by_sku($sku);
    $is_new = !$product_id;

    $product = $product_id ? wc_get_product($product_id) : new WC_Product_Simple();
    if (!$product) {
        trio_log("Could not load product for SKU {$sku}; skipping.");
        continue;
    }

    $product->set_name($item['title']);
    $product->set_slug($item['id']);
    $product->set_sku($sku);
    $product->set_description($item['description'] ?? '');
    $product->set_short_description('');
    $product->set_regular_price((string) ($item['regularPrice'] ?? $item['price']));

    if (!empty($item['bundle']) && isset($item['price'])) {
        $product->set_sale_price((string) $item['price']);
    } else {
        $product->set_sale_price('');
    }

    $product->set_catalog_visibility('visible');
    $product->set_status('publish');
    $product->set_category_ids(isset($categories[$item['series']]) ? [$categories[$item['series']]] : []);

    // Coming-soon titles remain visible but cannot be purchased.
    $coming_soon = !empty($item['comingSoon']);
    $product->set_stock_status($coming_soon ? 'outofstock' : 'instock');
    $product->set_manage_stock(false);

    $product->update_meta_data('_trio_product_id', $item['id']);
    $product->update_meta_data('_trio_series', $item['series']);
    $product->update_meta_data('_trio_virtue', $item['virtue'] ?? '');
    $product->update_meta_data('_trio_coming_soon', $coming_soon ? 'yes' : 'no');
    $product->update_meta_data('_trio_bundle', !empty($item['bundle']) ? 'yes' : 'no');
    $product->update_meta_data('_trio_badge', $item['badge'] ?? '');

    $product_id = $product->save();

    if (!empty($item['image'])) {
        $attachment_id = trio_attach_local_image($images_dir . '/' . $item['image'], $product_id, $item['title']);
        if ($attachment_id) {
            $product = wc_get_product($product_id);
            $product->set_image_id($attachment_id);
            $product->save();
            $images++;
        }
    }

    if ($is_new) {
        $created++;
        trio_log("Created: {$item['title']} ({$sku})");
    } else {
        $updated++;
        trio_log("Updated: {$item['title']} ({$sku})");
    }
}

trio_log("Import complete. Created: {$created}; Updated: {$updated}; Images attached: {$images}.");
trio_log('The existing TEST-001 product was not modified.');

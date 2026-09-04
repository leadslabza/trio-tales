import { Router } from 'express';
import { getProductBySlug, getProducts } from '../services/woocommerce.js';

const router = Router();
const catalogueCache = 'public, s-maxage=60, stale-while-revalidate=300';

function mapProduct(product) {
  const seriesCategory = product.categories?.[0];
  const virtue = product.meta_data?.find(x => x.key === 'trio_virtue')?.value || '';
  const comingSoon = product.meta_data?.find(x => x.key === 'trio_coming_soon')?.value === 'yes';
  const image = product.images?.[0]?.src || '';

  return {
    id: product.slug,
    wooId: product.id,
    sku: product.sku,
    title: product.name,
    slug: product.slug,
    price: Number(product.price || product.regular_price || 0),
    regularPrice: Number(product.regular_price || 0),
    salePrice: product.sale_price ? Number(product.sale_price) : null,
    stockStatus: product.stock_status,
    stockQuantity: product.manage_stock ? product.stock_quantity : null,
    series: (seriesCategory?.slug || '').replace(/^series-/, ''),
    seriesName: seriesCategory?.name || '',
    virtue,
    image,
    images: product.images?.map(x => x.src) || [],
    description: product.short_description || product.description || '',
    comingSoon,
    permalink: product.permalink
  };
}

router.get('/', async (req, res, next) => {
  try {
    const products = await getProducts({
      page: Number(req.query.page || 1),
      perPage: Math.min(Number(req.query.perPage || 100), 100),
      category: req.query.category || ''
    });
    // Product data changes infrequently. Let Vercel cache this response, while
    // keeping cart and checkout endpoints entirely dynamic.
    res.set('Cache-Control', catalogueCache);
    res.json({ products: products.map(mapProduct) });
  } catch (error) { next(error); }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const product = await getProductBySlug(req.params.slug);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.set('Cache-Control', catalogueCache);
    res.json({ product: mapProduct(product) });
  } catch (error) { next(error); }
});

export default router;

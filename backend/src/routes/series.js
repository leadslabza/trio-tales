import { Router } from 'express';
import { getCategories } from '../services/woocommerce.js';

const router = Router();
const catalogueCache = 'public, s-maxage=600, stale-while-revalidate=3600';

function mapSeries(category) {
  const scripture = category.meta_data?.find(x => x.key === 'trio_scripture')?.value || '';
  const image = category.image?.src || '';
  const comingSoon = category.meta_data?.find(x => x.key === 'trio_coming_soon')?.value === 'yes';
  return {
    id: category.slug.replace(/^series-/, ''),
    wooId: category.id,
    name: category.name,
    description: category.description || '',
    scripture,
    image,
    comingSoon
  };
}

router.get('/', async (_req, res, next) => {
  try {
    const categories = await getCategories();
    // Series content is catalogue data, so it is safe to cache at Vercel.
    res.set('Cache-Control', catalogueCache);
    res.json({ series: categories.filter(c => c.slug.startsWith('series-')).map(mapSeries) });
  } catch (error) { next(error); }
});

export default router;

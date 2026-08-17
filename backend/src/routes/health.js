import { Router } from 'express';
import { isConfigured } from '../services/woocommerce.js';

const router = Router();
router.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'trio-tales-store-api',
    version: '0.1.0',
    integrations: { woocommerce: isConfigured() ? 'configured' : 'not-configured' }
  });
});
export default router;

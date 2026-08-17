import { Router } from 'express';

const router = Router();

// Phase A intentionally stops before payment/order creation. The endpoint exists
// now so the frontend has a stable contract while WooCommerce/payment credentials
// and the South African gateway are configured.
router.post('/validate', async (req, res) => {
  if (!Array.isArray(req.body?.items) || req.body.items.length === 0) {
    return res.status(400).json({ error: 'Checkout requires at least one cart item.' });
  }

  res.json({
    valid: false,
    phase: 'foundation',
    message: 'Checkout validation endpoint is scaffolded. WooCommerce order creation and payment will be enabled in the next integration phase.'
  });
});

router.post('/create', async (_req, res) => {
  res.status(501).json({
    error: 'Checkout is not enabled yet.',
    phase: 'foundation'
  });
});

export default router;

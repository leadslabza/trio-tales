import { Router } from 'express';
import { storeRequest } from '../services/woocommerce.js';

const router = Router();
const allowed = new Set(['cart', 'cart/add-item', 'cart/update-item', 'cart/remove-item', 'cart/update-customer', 'cart/select-shipping-rate', 'checkout']);

router.use(async (req, res, next) => {
  try {
    const path = req.path.replace(/^\//, '');
    if (!allowed.has(path)) return res.status(404).json({ error: 'Store endpoint not found' });
    const headers = { 'Content-Type': 'application/json' };
    if (req.get('Cart-Token')) headers['Cart-Token'] = req.get('Cart-Token');
    const result = await storeRequest(path, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body });
    res.json({ data: result.body, cartToken: result.cartToken || req.get('Cart-Token') || null });
  } catch (error) { next(error); }
});

export default router;

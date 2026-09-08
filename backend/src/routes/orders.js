import { Router } from 'express';
import { wcRequest } from '../services/woocommerce.js';

const router = Router();

router.get('/:id/status', async (req, res, next) => {
  res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');

  try {
    const orderId = Number(req.params.id);
    const orderKey = String(req.query.key || '');

    if (!Number.isInteger(orderId) || orderId < 1 || !orderKey) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = await wcRequest(`orders/${orderId}`);
    if (!order || order.order_key !== orderKey) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const paid = ['processing', 'completed'].includes(order.status) || Boolean(order.date_paid);
    return res.json({
      order: {
        id: order.id,
        number: order.number,
        status: order.status,
        paid,
        datePaid: order.date_paid,
        total: Number(order.total || 0),
        currency: order.currency
      }
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return next(error);
  }
});

export default router;

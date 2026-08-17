import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import health from './routes/health.js';
import products from './routes/products.js';
import series from './routes/series.js';
import checkout from './routes/checkout.js';
import store from './routes/store.js';

const app = express();
const port = Number(process.env.PORT || 8787);
const backendDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(backendDir, '../..');
const pages = {
  home: 'index.html', author: 'author.html', trio: 'trio.html', shop: 'shop.html',
  contact: 'contact.html', cart: 'cart.html', checkout: 'checkout.html',
  series: 'series.html', product: 'product.html', 'thank-you': 'thank-you.html',
  shipping: 'shipping.html', privacy: 'privacy.html', terms: 'terms.html'
};

app.disable('x-powered-by');

app.use(helmet({
  // The static frontend runs on a different local origin during development.
  // CORS below authorizes it; this must not block the permitted API response.
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Local development CORS.
// Allows the frontend to run from localhost/127.0.0.1
// regardless of the development server port.
app.use(cors({
  origin: true,
  credentials: false
}));

app.use(express.json({ limit: '100kb' }));

app.use('/api/health', health);
app.use('/api/products', products);
app.use('/api/series', series);
app.use('/api/checkout', checkout);
app.use('/api/store', store);

// Serve only public frontend assets and named pages. The backend directory,
// including its environment file, is never exposed by this static routing.
app.use('/assets', express.static(path.join(frontendDir, 'assets')));
app.get('/', (_req, res) => res.redirect(302, '/home'));

for (const [slug, file] of Object.entries(pages)) {
  app.get(`/${file}`, (req, res) => res.redirect(301, `/${slug}${req.url.slice(file.length + 1)}`));
  app.get(`/${slug}`, (_req, res) => res.sendFile(path.join(frontendDir, file)));
}

app.use((error, _req, res, _next) => {
  console.error(error);

  res.status(error.statusCode || 500).json({
    error: error.message || 'Internal server error',
    details:
      process.env.NODE_ENV === 'development'
        ? error.details
        : undefined
  });
});

export default app;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(
      `Trio Tales Store API listening on http://localhost:${port}`
    );
  });
}

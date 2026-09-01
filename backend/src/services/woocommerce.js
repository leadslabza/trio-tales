import crypto from 'node:crypto';

// Preview deployments can use an isolated WooCommerce store without changing
// the credentials used by the production deployment.
const usePreviewStore = process.env.VERCEL_ENV === 'preview';
const baseUrl = (usePreviewStore ? process.env.PREVIEW_WC_BASE_URL : process.env.WC_BASE_URL)?.replace(/\/$/, '');
const consumerKey = usePreviewStore ? process.env.PREVIEW_WC_CONSUMER_KEY : process.env.WC_CONSUMER_KEY;
const consumerSecret = usePreviewStore ? process.env.PREVIEW_WC_CONSUMER_SECRET : process.env.WC_CONSUMER_SECRET;

export function isConfigured() {
  return Boolean(baseUrl && consumerKey && consumerSecret);
}

function requireConfigured() {
  if (!isConfigured()) {
    const error = new Error('WooCommerce is not configured. Set WC_BASE_URL, WC_CONSUMER_KEY and WC_CONSUMER_SECRET.');
    error.statusCode = 503;
    throw error;
  }
}

function percentEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function createNonce() {
  return crypto.randomBytes(16).toString('hex');
}

function createOAuthQuery({ method, url, queryParams = {} }) {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: createNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString()
  };

  // OAuth 1.0a signs both OAuth parameters and ordinary query parameters.
  // The signature itself is added only after the base string has been created.
  const pairs = [];

  for (const [key, value] of Object.entries(queryParams)) {
    if (value === undefined || value === null) continue;
    pairs.push([key, String(value)]);
  }

  for (const [key, value] of Object.entries(oauthParams)) {
    pairs.push([key, String(value)]);
  }

  const normalizedParams = pairs
    .map(([key, value]) => [percentEncode(key), percentEncode(value)])
    .sort(([keyA, valueA], [keyB, valueB]) => keyA.localeCompare(keyB) || valueA.localeCompare(valueB))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const parsedUrl = new URL(url);
  const baseUrlForSignature = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
  const signatureBaseString = [
    method.toUpperCase(),
    percentEncode(baseUrlForSignature),
    percentEncode(normalizedParams)
  ].join('&');

  const signingKey = `${percentEncode(consumerSecret)}&`;
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  oauthParams.oauth_signature = signature;

  return oauthParams;
}

function buildHttpOAuthRequest(url, method, queryParams) {
  const oauthParams = createOAuthQuery({ method, url, queryParams });
  const requestUrl = new URL(url);

  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null) requestUrl.searchParams.set(key, String(value));
  }

  for (const [key, value] of Object.entries(oauthParams)) {
    requestUrl.searchParams.set(key, String(value));
  }

  return requestUrl;
}

export async function wcRequest(path, options = {}) {
  requireConfigured();

  const method = (options.method || 'GET').toUpperCase();
  const url = new URL(`/wp-json/wc/v3/${path.replace(/^\//, '')}`, baseUrl);

  // WooCommerce requires one-legged OAuth 1.0a for REST API authentication over
  // plain HTTP. This is primarily for local development (e.g. Local WP/nginx).
  // In production, use HTTPS and the same OAuth implementation remains valid.
  const queryParams = Object.fromEntries(url.searchParams.entries());
  url.search = '';
  const requestUrl = buildHttpOAuthRequest(url.toString(), method, queryParams);

  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }

  if (!response.ok) {
    const error = new Error(body?.message || `WooCommerce request failed (${response.status})`);
    error.statusCode = response.status;
    error.details = body;
    throw error;
  }
  return body;
}

export async function storeRequest(path, options = {}) {
  const url = new URL(`/wp-json/wc/store/v1/${path.replace(/^\//, '')}`, baseUrl);
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: { Accept: 'application/json', ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || `Store request failed (${response.status})`);
    error.statusCode = response.status;
    error.details = body;
    throw error;
  }
  return { body, cartToken: response.headers.get('cart-token') };
}

export async function getProducts({ page = 1, perPage = 100, category = '', slug = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage), status: 'publish' });
  if (category) params.set('category', category);
  if (slug) params.set('slug', slug);
  return wcRequest(`products?${params.toString()}`);
}

export async function getProductBySlug(slug) {
  const products = await getProducts({ slug, perPage: 1 });
  return products[0] || null;
}

export async function getCategories() {
  return wcRequest('products/categories?per_page=100&hide_empty=false');
}

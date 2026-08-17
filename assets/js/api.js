window.TRIO_API = window.TRIO_API || {
  // Vercel serves the API function at the same origin. Keep the isolated
  // Python static-server workflow working for local development.
  baseUrl: location.hostname === 'localhost' && location.port === '8080'
    ? 'http://localhost:8787/api'
    : '/api'
};

window.TrioAPI = {
  async request(path, options = {}) {
    const response = await fetch(`${window.TRIO_API.baseUrl}${path}`, {
      // Catalogue requests use server-side WooCommerce authentication; no browser cookie is needed.
      credentials: 'omit',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    return body;
  },

  products(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/products${query ? `?${query}` : ''}`);
  },

  product(slug) {
    return this.request(`/products/${encodeURIComponent(slug)}`);
  },

  series() {
    return this.request('/series');
  },

  store(path, options = {}) {
    return this.request(`/store/${path.replace(/^\//, '')}`, options);
  }
};

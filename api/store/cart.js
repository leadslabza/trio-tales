import app from '../../backend/src/server.js';

// Explicit entry point: Vercel does not consistently route nested Store API
// paths through the top-level catch-all function.
export default app;

// Dev-server proxy: the app always calls relative /api URLs, as it does behind nginx.
// In Docker the API is reachable as http://api:3000, locally as http://localhost:3000.
export default {
  '/api': {
    target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    changeOrigin: false,
  },
};

// Admin worker: handles admins CRUD and login auth check
export const ADMIN_WORKER_URL = import.meta.env.VITE_ADMIN_WORKER_URL;
export const MEDIA_WORKER_URL = import.meta.env.VITE_MEDIA_WORKER_URL;
export const OAUTH_URL = import.meta.env.VITE_OAUTH_URL;
// Must match the hostname the Sveltia auth worker was configured with (the Hugo site).
// Stays fixed whether the admin portal runs on localhost or Cloudflare Pages.
export const OAUTH_SITE_ID = import.meta.env.VITE_OAUTH_SITE_ID;

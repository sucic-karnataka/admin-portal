// Admin worker: handles admins CRUD and login auth check
export const ADMIN_WORKER_URL = import.meta.env.VITE_ADMIN_WORKER_URL
  || 'https://cms-membership.e-anandraj.workers.dev';
export const MEDIA_WORKER_URL = import.meta.env.VITE_MEDIA_WORKER_URL
  || 'https://cms-media.e-anandraj.workers.dev';
export const OAUTH_URL = import.meta.env.VITE_OAUTH_URL
  || 'https://sveltia-cms-auth.e-anandraj.workers.dev';
// Must match the hostname the Sveltia auth worker was configured with (the Hugo site).
// Stays fixed whether the admin portal runs on localhost or Cloudflare Pages.
export const OAUTH_SITE_ID = import.meta.env.VITE_OAUTH_SITE_ID || 'anand-raj.github.io';

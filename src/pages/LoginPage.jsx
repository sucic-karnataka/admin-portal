import { OAUTH_URL, OAUTH_SITE_ID, ADMIN_WORKER_URL } from '../lib/config';
import { useAuth } from '../lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

const GH_SVG = (
  <svg width="18" height="18" viewBox="0 0 98 96" fill="currentColor" aria-hidden="true" className="mr-2">
    <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
  </svg>
);

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function openOAuth() {
    setError('');
    setLoading(true);

    const popup = window.open(
      `${OAUTH_URL}/auth?provider=github&site_id=${encodeURIComponent(OAUTH_SITE_ID)}`,
      'github-oauth',
      `width=600,height=700,left=${Math.round((screen.width - 600) / 2)},top=${Math.round((screen.height - 700) / 2)}`
    );

    if (!popup) {
      setError('Popup blocked — please allow popups for this page and try again.');
      setLoading(false);
      return;
    }

    const oauthOrigin = new URL(OAUTH_URL).origin;

    const pollClosed = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(pollClosed);
        window.removeEventListener('message', handleMessage);
        setLoading(false);
      }
    }, 500);

    async function handleMessage(e) {
      if (e.origin !== oauthOrigin || typeof e.data !== 'string') return;

      if (e.data === 'authorizing:github') {
        e.source.postMessage('authorizing:github', e.origin);
        return;
      }

      const prefix = 'authorization:github:success:';
      if (!e.data.startsWith(prefix)) return;

      window.removeEventListener('message', handleMessage);
      clearInterval(pollClosed);
      try { popup.close(); } catch { /* ignore */ }

      let ghToken;
      try {
        ghToken = JSON.parse(e.data.slice(prefix.length)).token;
      } catch {
        setError('Could not parse GitHub response.');
        setLoading(false);
        return;
      }

      await verifyAndLogin(ghToken);
    }

    window.addEventListener('message', handleMessage);
  }

  async function verifyAndLogin(ghToken) {
    try {
      // Verify the token belongs to an admin
      const res = await fetch(`${ADMIN_WORKER_URL}/admin/members`, {
        headers: { Authorization: `token ${ghToken}` },
      });
      if (res.status === 401) {
        setError('GitHub account is not authorised as an admin.');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(`Worker error: ${res.status}`);
        setLoading(false);
        return;
      }

      // Fetch GitHub user info and admin list in parallel
      const [userRes, adminsRes] = await Promise.all([
        fetch('https://api.github.com/user', {
          headers: { Authorization: `token ${ghToken}`, 'User-Agent': 'admin-portal' },
        }),
        fetch(`${ADMIN_WORKER_URL}/admin/admins`, {
          headers: { Authorization: `token ${ghToken}` },
        }),
      ]);

      const userInfo = userRes.ok ? await userRes.json() : {};
      const admins   = adminsRes.ok ? await adminsRes.json() : [];

      const myEntry = Array.isArray(admins)
        ? admins.find(a => a.github_login.toLowerCase() === (userInfo.login || '').toLowerCase())
        : null;

      login(ghToken, {
        login:   userInfo.login,
        avatar:  userInfo.avatar_url,
        role:    myEntry?.role    || 'moderator',
        section: myEntry?.section || null,
      });
    } catch (e) {
      setError(`Could not reach worker: ${e.message}`);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Admin Portal</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in with a GitHub account that has admin access.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={openOAuth} disabled={loading}>
            {GH_SVG}
            {loading ? 'Connecting…' : 'Sign in with GitHub'}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

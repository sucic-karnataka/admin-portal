import { ADMIN_WORKER_URL, MEDIA_WORKER_URL } from './config';

function authHeaders(token) {
  return { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' };
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Admins ─────────────────────────────────────────────────────────────────
export async function getAdmins(token) {
  const res = await fetch(`${ADMIN_WORKER_URL}/admin/admins`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function addAdmin(token, { github_login, role, section }) {
  const res = await fetch(`${ADMIN_WORKER_URL}/admin/admins`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ github_login, role, section: section || null }),
  });
  return handleResponse(res);
}

export async function removeAdmin(token, id) {
  const res = await fetch(`${ADMIN_WORKER_URL}/admin/admins/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

// ── Media ──────────────────────────────────────────────────────────────────
export async function getMedia(token) {
  const res = await fetch(`${MEDIA_WORKER_URL}/media`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function uploadMedia(token, file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${MEDIA_WORKER_URL}/media/upload`);
    xhr.setRequestHeader('Authorization', `token ${token}`);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error('Invalid response from server.')); }
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText).error || `Upload failed: HTTP ${xhr.status}`)); }
        catch { reject(new Error(`Upload failed: HTTP ${xhr.status}`)); }
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(formData);
  });
}

export async function deleteMedia(token, key) {
  const res = await fetch(`${MEDIA_WORKER_URL}/media?key=${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

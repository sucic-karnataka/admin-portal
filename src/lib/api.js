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
  const res = await fetch(`${MEDIA_WORKER_URL}/media/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

// ── Members ────────────────────────────────────────────────────────────────
export async function getMembers(token) {
  const res = await fetch(`${WORKER_URL}/admin/members`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function approveMember(token, id) {
  const res = await fetch(`${WORKER_URL}/admin/approve`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  return handleResponse(res);
}

export async function rejectMember(token, id) {
  const res = await fetch(`${WORKER_URL}/admin/reject`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  return handleResponse(res);
}

export async function renewMember(token, id) {
  const res = await fetch(`${WORKER_URL}/admin/renew`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  return handleResponse(res);
}

export async function sendReminders(token) {
  const res = await fetch(`${WORKER_URL}/admin/remind`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

// ── Newsletter ─────────────────────────────────────────────────────────────
export async function sendNewsletter(token, { subject, html }) {
  const res = await fetch(`${WORKER_URL}/newsletter`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ subject, html }),
  });
  return handleResponse(res);
}

// ── Books ──────────────────────────────────────────────────────────────────
export async function getBooks(token) {
  const res = await fetch(`${BOOKS_WORKER_URL}/admin/books`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function createBook(token, book) {
  const res = await fetch(`${BOOKS_WORKER_URL}/admin/books`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(book),
  });
  return handleResponse(res);
}

export async function updateBook(token, id, book) {
  const res = await fetch(`${BOOKS_WORKER_URL}/admin/books/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(book),
  });
  return handleResponse(res);
}

export async function uploadBookImage(token, bookId, file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${BOOKS_WORKER_URL}/admin/books/${bookId}/image`, {
    method: 'POST',
    headers: { 'Authorization': `token ${token}` },
    body: formData,
  });
  return handleResponse(res);
}

// ── Orders ─────────────────────────────────────────────────────────────────
export async function getOrders(token) {
  const res = await fetch(`${BOOKS_WORKER_URL}/admin/orders`, { headers: authHeaders(token) });
  return handleResponse(res);
}

// ── Admins ─────────────────────────────────────────────────────────────────
export async function getAdmins(token) {
  const res = await fetch(`${WORKER_URL}/admin/admins`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function addAdmin(token, { github_login, role, section }) {
  const res = await fetch(`${WORKER_URL}/admin/admins`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ github_login, role, section: section || null }),
  });
  return handleResponse(res);
}

export async function removeAdmin(token, id) {
  const res = await fetch(`${WORKER_URL}/admin/admins/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

// ── Event Registrations ────────────────────────────────────────────────────
export async function getEventSummaries(token) {
  const res = await fetch(`${EVENTS_WORKER_URL}/admin/events`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function getEventRegistrations(token, eventSlug) {
  const url = eventSlug
    ? `${EVENTS_WORKER_URL}/admin/registrations?event=${encodeURIComponent(eventSlug)}`
    : `${EVENTS_WORKER_URL}/admin/registrations`;
  const res = await fetch(url, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function confirmRegistration(token, id) {
  const res = await fetch(`${EVENTS_WORKER_URL}/admin/confirm`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  return handleResponse(res);
}

export async function cancelRegistration(token, id) {
  const res = await fetch(`${EVENTS_WORKER_URL}/admin/cancel`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
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
  const res = await fetch(`${MEDIA_WORKER_URL}/media/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

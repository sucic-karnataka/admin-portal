import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../lib/auth';
import { getMedia, uploadMedia, deleteMedia } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, Trash2, Upload, Image as ImageIcon, FileVideo, File } from 'lucide-react';

function FilePreview({ obj }) {
  const ext = obj.key.split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext);
  const isVideo = ['mp4', 'webm'].includes(ext);

  if (isImage) {
    return (
      <img
        src={obj.publicUrl}
        alt={obj.key}
        className="w-full h-36 object-cover rounded-t-lg bg-muted"
        loading="lazy"
      />
    );
  }
  if (isVideo) {
    return (
      <div className="w-full h-36 rounded-t-lg bg-muted flex items-center justify-center text-muted-foreground">
        <FileVideo size={36} />
      </div>
    );
  }
  return (
    <div className="w-full h-36 rounded-t-lg bg-muted flex items-center justify-center text-muted-foreground">
      <File size={36} />
    </div>
  );
}

// image/svg+xml excluded — SVGs can embed <script> tags and execute JS when opened directly
const ALLOWED_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,application/pdf';
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

function formatDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function monthLabel(yyyymm) {
  if (yyyymm === 'Unknown') return 'Unknown date';
  const [y, m] = yyyymm.split('/');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
}

function uploadTime(obj) {
  const time = obj.uploaded ? new Date(obj.uploaded).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function monthKeyFor(obj) {
  if (obj.uploaded) {
    const d = new Date(obj.uploaded);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }
  const fallback = obj.key.split('/').slice(0, 2).join('/');
  return /^\d{4}\/\d{2}$/.test(fallback) ? fallback : 'Unknown';
}

function userFilterValue(uploadedBy) {
  return uploadedBy ? String(uploadedBy).trim().toLowerCase() : '__unknown__';
}

export default function MediaPage() {
  const { token, user } = useAuth();
  const [media, setMedia]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // {name, percent}
  const [deleteTarget, setDeleteTarget]     = useState(null); // obj to confirm deletion
  const [deleting, setDeleting]     = useState(false);
  const [dragging, setDragging]     = useState(false);
  const [monthPageIndex, setMonthPageIndex] = useState(0);
  const [selectedUser, setSelectedUser] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const fileInputRef                = useRef(null);

  const canDelete = ['owner', 'moderator'].includes(user?.role);

  const sortedMedia = useMemo(
    () => [...media].sort((a, b) => uploadTime(b) - uploadTime(a) || b.key.localeCompare(a.key)),
    [media]
  );

  const userOptions = useMemo(() => {
    const options = new Map();
    for (const obj of sortedMedia) {
      const value = userFilterValue(obj.uploadedBy);
      const label = obj.uploadedBy || 'Unknown user';
      if (!options.has(value)) options.set(value, label);
    }
    return [...options.entries()].map(([value, label]) => ({ value, label }));
  }, [sortedMedia]);

  const filteredMedia = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;

    return sortedMedia.filter(obj => {
      if (selectedUser !== 'all' && userFilterValue(obj.uploadedBy) !== selectedUser) return false;

      const time = uploadTime(obj);
      if (start !== null && time < start) return false;
      if (end !== null && time > end) return false;

      return true;
    });
  }, [sortedMedia, selectedUser, startDate, endDate]);

  const monthKeys = useMemo(
    () => [...new Set(filteredMedia.map(monthKeyFor))].sort().reverse(),
    [filteredMedia]
  );

  const currentMonthKey = monthKeys[Math.min(monthPageIndex, Math.max(monthKeys.length - 1, 0))] || '';
  const currentMonthMedia = currentMonthKey
    ? filteredMedia.filter(obj => monthKeyFor(obj) === currentMonthKey)
    : [];
  const hasFilters = selectedUser !== 'all' || startDate || endDate;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMedia(token);
      setMedia(data.objects || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setMonthPageIndex(0);
  }, [selectedUser, startDate, endDate]);

  useEffect(() => {
    if (monthPageIndex > 0 && monthPageIndex >= monthKeys.length) {
      setMonthPageIndex(Math.max(monthKeys.length - 1, 0));
    }
  }, [monthPageIndex, monthKeys.length]);

  async function uploadFile(file) {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name} exceeds the 1 MB limit.`);
      return;
    }

    setUploading(true);
    setUploadProgress({ name: file.name, percent: 0 });

    try {
      await uploadMedia(token, file, (percent) => {
        setUploadProgress({ name: file.name, percent });
      });

      toast.success(`${file.name} uploaded.`);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  async function handleFiles(files) {
    for (const file of files) {
      await uploadFile(file);
    }
  }

  function onFileInput(e) {
    const files = Array.from(e.target.files || []);
    if (files.length) handleFiles(files);
    e.target.value = '';
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave() { setDragging(false); }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) handleFiles(files);
  }

  async function copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL copied to clipboard.');
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMedia(token, deleteTarget.key);
      toast.success(`${deleteTarget.key} deleted.`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Media</h1>
        {/* intentional blank — filter below */}
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={14} className="mr-1.5" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES}
            multiple
            className="hidden"
            onChange={onFileInput}
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`cursor-pointer select-none rounded-lg border-2 border-dashed p-5 text-center transition-colors sm:p-8 ${
          dragging
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/60'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <ImageIcon size={28} className="mx-auto mb-2 opacity-50" />
        {uploading && uploadProgress ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">Uploading {uploadProgress.name}…</p>
            <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
            <p className="text-xs">{uploadProgress.percent}%</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">Drag & drop files here, or click to browse</p>
            <p className="text-xs mt-1">Images, videos, PDFs — max 1 MB each</p>
          </>
        )}
      </div>

      {!loading && media.length > 0 && (
        <div className="bg-white border rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(160px,1fr)_160px_160px_auto] lg:items-end">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">User</span>
              <select
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All users</option>
                {userOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">From</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">To</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              className="w-full lg:w-auto"
              disabled={!hasFilters}
              onClick={() => {
                setSelectedUser('all');
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear filters
            </Button>
          </div>

          <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">
                {currentMonthKey ? monthLabel(currentMonthKey) : 'No matching media'}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentMonthMedia.length} of {filteredMedia.length} files
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Button
                variant="outline"
                size="sm"
                disabled={monthPageIndex >= monthKeys.length - 1}
                onClick={() => setMonthPageIndex(i => Math.min(i + 1, monthKeys.length - 1))}
              >
                Previous month
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={monthPageIndex <= 0}
                onClick={() => setMonthPageIndex(i => Math.max(i - 1, 0))}
              >
                Next month
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <p className="text-center py-16 text-muted-foreground">Loading…</p>
      ) : !media.length ? (
        <p className="text-center py-16 text-muted-foreground">No files yet. Upload one above.</p>
      ) : !filteredMedia.length ? (
        <p className="text-center py-8 text-muted-foreground">No files match these filters.</p>
      ) : !currentMonthMedia.length ? (
        <p className="text-center py-8 text-muted-foreground">No files for this month.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 xl:gap-4">
          {currentMonthMedia.map(obj => (
            <div
              key={obj.key}
              className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <FilePreview obj={obj} />
              <div className="p-2 flex-1 flex flex-col gap-1.5">
                <p
                  className="text-xs font-medium text-gray-700 truncate"
                  title={obj.key}
                >
                  {obj.key.split('/').pop()}
                </p>
                <p className="text-xs text-muted-foreground">{obj.sizeFormatted}</p>
                {obj.uploaded && (
                  <p className="text-xs text-muted-foreground/70">{formatDate(obj.uploaded)}</p>
                )}
                <p className="text-xs text-muted-foreground/70 truncate" title={obj.uploadedBy || 'Unknown user'}>
                  {obj.uploadedBy || 'Unknown user'}
                </p>
                <div className="flex gap-1 mt-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs px-2"
                    onClick={() => copyUrl(obj.publicUrl)}
                    title="Copy URL"
                  >
                    <Copy size={11} className="mr-1" />
                    Copy URL
                  </Button>
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(obj)}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete file?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground break-all">
            <span className="font-medium text-foreground">{deleteTarget?.key}</span>
            <br />
            This will permanently remove the file from R2. Any content that references
            this URL will show a broken image.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

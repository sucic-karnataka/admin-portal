import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { getMedia, uploadMedia, deleteMedia } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, Trash2, Upload, Image as ImageIcon, FileVideo, File } from 'lucide-react';

function FilePreview({ obj }) {
  const ext = obj.key.split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'].includes(ext);
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
  const [y, m] = yyyymm.split('/');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
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
  const [selectedMonth, setSelectedMonth] = useState('');
  const fileInputRef                = useRef(null);

  const canDelete = ['owner', 'moderator'].includes(user?.role);

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
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Media</h1>
        {/* intentional blank — filter below */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>↻ Refresh</Button>
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
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors select-none ${
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

      {/* Month filter */}
      {!loading && media.length > 0 && (() => {
        const months = [...new Set(media.map(o => o.key.split('/').slice(0, 2).join('/')))].sort().reverse();
        return months.length > 1 ? (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Filter by month:</span>
            <button
              onClick={() => setSelectedMonth('')}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                selectedMonth === '' ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/30 hover:border-muted-foreground/60'
              }`}
            >
              All
            </button>
            {months.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  selectedMonth === m ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/30 hover:border-muted-foreground/60'
                }`}
              >
                {monthLabel(m)}
              </button>
            ))}
          </div>
        ) : null;
      })()}

      {/* Grid */}
      {loading ? (
        <p className="text-center py-16 text-muted-foreground">Loading…</p>
      ) : !media.length ? (
        <p className="text-center py-16 text-muted-foreground">No files yet. Upload one above.</p>
      ) : (() => {
        const filtered = selectedMonth
          ? media.filter(o => o.key.startsWith(selectedMonth + '/'))
          : media;
        return filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No files for this month.</p>
        ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map(obj => (
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
        );
      })()}

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

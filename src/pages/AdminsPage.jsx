import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { getAdmins, addAdmin, removeAdmin } from '../lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

function roleBadgeVariant(role) {
  return { owner: 'default', moderator: 'secondary' }[role] ?? 'outline';
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminsPage() {
  const { token, user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ github_login: '', role: 'moderator', section: '' });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setAdmins(await getAdmins(token));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!form.github_login.trim()) { toast.error('GitHub login is required.'); return; }
    if (form.role === 'section_editor' && !form.section.trim()) {
      toast.error('State/section is required for section editor role.'); return;
    }
    setSaving(true);
    try {
      await addAdmin(token, form);
      toast.success(`${form.github_login} added as ${form.role}.`);
      setOpen(false);
      setForm({ github_login: '', role: 'moderator', section: '' });
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(admin) {
    if (!confirm(`Remove ${admin.github_login} as admin?`)) return;
    setBusy(b => ({ ...b, [admin.id]: true }));
    try {
      await removeAdmin(token, admin.id);
      toast.success(`${admin.github_login} removed.`);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(b => ({ ...b, [admin.id]: false }));
    }
  }

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Admins</h1>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
          <Button size="sm" onClick={() => setOpen(true)}>Add Admin</Button>
        </div>
      </div>

      <div className="hidden rounded-lg border bg-white md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GitHub Login</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Added</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {!loading && !admins.length && (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No admins found.</TableCell></TableRow>
            )}
            {admins.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  <a href={`https://github.com/${a.github_login}`} target="_blank" rel="noreferrer"
                    className="hover:underline">
                    @{a.github_login}
                  </a>
                  {a.github_login === user?.login && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </TableCell>
                <TableCell><Badge variant={roleBadgeVariant(a.role)} className="capitalize">{a.role.replace('_', ' ')}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.section || '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{fmtDate(a.added_at)}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" disabled={busy[a.id] || a.github_login === user?.login}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleRemove(a)}>
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {loading && (
          <p className="rounded-lg border bg-white py-10 text-center text-sm text-muted-foreground">Loading...</p>
        )}
        {!loading && !admins.length && (
          <p className="rounded-lg border bg-white py-10 text-center text-sm text-muted-foreground">No admins found.</p>
        )}
        {admins.map(a => (
          <div key={a.id} className="space-y-3 rounded-lg border bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <a
                  href={`https://github.com/${a.github_login}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-medium hover:underline"
                >
                  @{a.github_login}
                </a>
                {a.github_login === user?.login && (
                  <span className="text-xs text-muted-foreground">(you)</span>
                )}
              </div>
              <Badge variant={roleBadgeVariant(a.role)} className="shrink-0 capitalize">
                {a.role.replace('_', ' ')}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Section</p>
                <p className="truncate font-medium">{a.section || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Added</p>
                <p className="font-medium">{fmtDate(a.added_at)}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={busy[a.id] || a.github_login === user?.login}
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => handleRemove(a)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Admin</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="github_login">GitHub Username</Label>
              <Input id="github_login" placeholder="octocat"
                value={form.github_login}
                onChange={e => setForm(f => ({ ...f, github_login: e.target.value.trim() }))} />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v, section: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="section_editor">Section Editor</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === 'section_editor' && (
              <div className="space-y-1">
                <Label htmlFor="section">State / Section</Label>
                <Input id="section" placeholder="e.g. Karnataka"
                  value={form.section}
                  onChange={e => setForm(f => ({ ...f, section: e.target.value }))} />
                <p className="text-xs text-muted-foreground">This user will only see and manage members from this state.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? 'Adding…' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

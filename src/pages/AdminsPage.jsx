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
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admins</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>↻ Refresh</Button>
          <Button size="sm" onClick={() => setOpen(true)}>+ Add Admin</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
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

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import * as regionsApi from '../../api/regions';
import { extractErrorMessages } from '../../api/client';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Field } from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageLoader from '../../components/ui/PageLoader';

export default function GlobalRegions() {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    setLoading(true);
    regionsApi.list({ globalOnly: true })
      .then((res) => setRegions(res.data?.data || []))
      .catch((err) => toast.error('Failed to load regions'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm({ name: '' }); setModalOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ name: r.name }); setModalOpen(true); };
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await regionsApi.update(editing._id || editing.id, form);
        toast.success('Region updated');
      } else {
        await regionsApi.create({ ...form, isGlobal: true });
        toast.success('Region created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      await regionsApi.remove(deleteTarget._id || deleteTarget.id);
      toast.success('Region deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Super admin</span>
          <h1 className="page-title">Global Regions</h1>
          <p className="page-subtitle">Manage high-level regions for filtering subscriptions and organizations.</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>New Region</Button>
      </div>

      {regions.length === 0 ? (
        <EmptyState icon={Globe} title="No global regions yet" description="Create your first global region (e.g. North America, EMEA) to associate with organizations and plans." />
      ) : (
        <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {regions.map((r) => (
            <div key={r._id || r.id} className="card" style={{ padding: 'var(--sp-5)' }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)' }}>{r.name}</strong>
              </div>
              <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
                <Button size="sm" variant="outline" icon={Pencil} onClick={() => openEdit(r)}>Edit</Button>
                <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDeleteTarget(r)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Region' : 'New Global Region'} width={400}>
        <form className="stack" id="region-form" onSubmit={submit}>
          <Field label="Region Name" required>
            <Input value={form.name} onChange={update('name')} placeholder="e.g. North America" required />
          </Field>
        </form>
        <div className="modal-panel__foot" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
          <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="region-form" loading={saving}>{editing ? 'Save Changes' : 'Create Region'}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Delete this region?"
        description={`"${deleteTarget?.name}" will be permanently removed.`}
        confirmLabel="Delete Region"
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Compass } from 'lucide-react';
import toast from 'react-hot-toast';
import * as regionsApi from '../../api/regions';
import { extractErrorMessages } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Field } from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageLoader from '../../components/ui/PageLoader';

export default function Regions() {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', isAta: false });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    setLoading(true);
    regionsApi.list({ localOnly: true }).then((res) => setRegions(res.data?.data || [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm({ name: '' }); setModalOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ name: r.name }); setModalOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await regionsApi.update(editing._id || editing.id, form);
        toast.success('Region updated');
      } else {
        await regionsApi.create(form);
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
          <span className="page-eyebrow">Settings</span>
          <h1 className="page-title">Regions</h1>
          <p className="page-subtitle">Manage locations for region-based course pricing.</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>New Region</Button>
      </div>

      <DataTable
        emptyLabel="No regions yet."
        columns={[
          { key: 'name', header: 'Region Name' },
          {
            key: 'actions', header: 'Actions', render: (r) => (
              <div className="row" style={{ gap: 6 }}>
                <Button size="sm" variant="outline" icon={Pencil} onClick={() => openEdit(r)}>Edit</Button>
                <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDeleteTarget(r)}>Delete</Button>
              </div>
            ),
          },
        ]}
        rows={regions}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Region' : 'New Region'} width={420}>
        <form className="stack" id="region-form" onSubmit={submit}>
          <Field label="Region Name" required>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. United States" />
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={!!form.isAta} 
              onChange={(e) => setForm(f => ({ ...f, isAta: e.target.checked }))} 
            />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>ATA Accredited Region</span>
          </label>

        </form>
        <div className="modal-panel__foot" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
          <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="region-form" loading={saving}>{editing ? 'Save Changes' : 'Create Region'}</Button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete} title="Delete this region?" description={`"${deleteTarget?.name}" will be removed.`} confirmLabel="Delete Region" />
    </div>
  );
}

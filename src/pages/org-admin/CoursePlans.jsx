import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import * as organizationsApi from '../../api/organizations';
import { extractErrorMessages } from '../../api/client';
import Input, { Field } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function CoursePlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPlan, setNewPlan] = useState({ name: '', validityDays: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    setLoading(true);
    organizationsApi.getCoursePlans().then(res => setPlans(res.data?.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!newPlan.name || !newPlan.validityDays) return toast.error('Fill required fields');
    try {
      await organizationsApi.createCoursePlan({ name: newPlan.name, validityDays: Number(newPlan.validityDays) });
      toast.success('Course Plan created');
      setNewPlan({ name: '', validityDays: '' });
      load();
    } catch (err) {
      toast.error(extractErrorMessages(err).join(', '));
    }
  };

  const remove = async () => {
    try {
      await organizationsApi.deleteCoursePlan(deleteTarget._id);
      toast.success('Deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Administration</span>
          <h1 className="page-title">Course Plans</h1>
          <p className="page-subtitle">Manage course validity plans for your organization.</p>
        </div>
      </div>

      <div className="stack">
        <Card style={{ padding: 'var(--sp-5)' }}>
          <h3 style={{ marginBottom: 'var(--sp-4)' }}>Create Course Plan</h3>
          <form className="form-grid" onSubmit={create} style={{ alignItems: 'flex-end' }}>
            <Field label="Plan Name (e.g. Quarterly)" required>
              <Input value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))} required placeholder="Quarterly" />
            </Field>
            <Field label="Duration (Days)" required>
              <Input type="number" value={newPlan.validityDays} onChange={e => setNewPlan(p => ({ ...p, validityDays: e.target.value }))} required placeholder="90" min="1" />
            </Field>
            <Button type="submit">Create Plan</Button>
          </form>
        </Card>

        <Card>
          <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--border)' }}>
            <h3>Existing Plans</h3>
          </div>
          <DataTable
            columns={[
              { key: 'name', header: 'Plan Name', render: (r) => <strong>{r.name}</strong> },
              { key: 'validityDays', header: 'Validity (Days)', render: (r) => `${r.validityDays} Days` },
              {
                key: 'actions',
                header: 'Actions',
                width: 100,
                render: (r) => (
                  <Button variant="danger" size="sm" onClick={() => setDeleteTarget(r)}>
                    Delete
                  </Button>
                ),
              },
            ]}
            rows={plans}
            loading={loading}
            emptyLabel="No plans created yet."
          />
        </Card>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title="Delete Course Plan?"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete Plan"
      />
    </div>
  );
}

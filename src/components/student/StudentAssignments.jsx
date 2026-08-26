import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as assignmentsApi from '../../api/assignments';
import { extractErrorMessages, buildStaticUrl } from '../../api/client';
import DataTable from '../ui/DataTable';
import StatusBadge from '../ui/StatusBadge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Field } from '../ui/Input';
import FileUploader from '../ui/FileUploader';
import PageLoader from '../ui/PageLoader';

export default function StudentAssignments({ courseId }) {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const assnRes = await assignmentsApi.list(courseId);
      const pubAssn = (assnRes.data?.data || []).filter(a => a.isPublished || a.status === 'PUBLISHED');
      setAssignments(pubAssn);

      // fetch submissions for each assignment
      const subMap = {};
      for (const a of pubAssn) {
        try {
          const sRes = await assignmentsApi.listSubmissions(courseId, a._id || a.id);
          // For students, this API only returns their own submissions
          const subs = sRes.data?.data || [];
          if (subs.length > 0) {
            subMap[a._id || a.id] = subs[0]; // take the latest submission
          }
        } catch (e) {
          // ignore
        }
      }
      setSubmissions(subMap);
    } catch (e) {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [courseId]);

  const openSubmit = (assn) => {
    setSubmitTarget(assn);
    setFileUrl('');
    setModalOpen(true);
  };

  const doSubmit = async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('assignment-file');
    if (!fileInput || !fileInput.files[0]) {
      toast.error('Please select a file');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      await assignmentsApi.submit(courseId, submitTarget._id || submitTarget.id, formData);
      toast.success('Assignment submitted');
      setModalOpen(false);
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div style={{ padding: 'var(--sp-6)' }}>
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <h2 style={{ fontSize: 'var(--fs-lg)' }}>Assignments</h2>
        <p className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>Submit your work for grading.</p>
      </div>
      <DataTable
        emptyLabel="No assignments available for this course yet."
        columns={[
          { key: 'title', header: 'Title' },
          { key: 'dueDate', header: 'Due Date', render: (r) => r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—' },
          { key: 'totalMarks', header: 'Max Score', render: (r) => r.totalMarks },
          { key: 'status', header: 'Status', render: (r) => {
            const sub = submissions[r._id || r.id];
            if (!sub) return <StatusBadge status="PENDING" />;
            if (sub.score !== undefined) return <StatusBadge status="GRADED" />;
            return <StatusBadge status="SUBMITTED" />;
          }},
          { key: 'score', header: 'Score', render: (r) => {
            const sub = submissions[r._id || r.id];
            return sub?.score !== undefined ? `${sub.score} / ${r.totalMarks}` : '—';
          }},
          {
            key: 'actions', header: 'Actions', render: (r) => {
              const sub = submissions[r._id || r.id];
              const isGraded = sub && sub.score !== undefined;
              return (
                <div className="row" style={{ gap: '8px' }}>
                  <Button size="sm" variant={sub ? 'outline' : 'primary'} onClick={() => openSubmit(r)} disabled={isGraded}>
                    {sub ? (isGraded ? 'Graded' : 'Resubmit') : 'Submit'}
                  </Button>
                </div>
              );
            },
          },
        ]}
        rows={assignments}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Submit Assignment" width={500}>
        <form className="stack" id="submit-form" onSubmit={doSubmit}>
          <div className="stack" style={{ marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-sm)' }}>
            <strong>{submitTarget?.title}</strong>
            <p className="text-muted">{submitTarget?.description}</p>
          </div>
          <Field label="Upload File (PDF, DOC)" required>
            <input type="file" id="assignment-file" accept=".pdf,.doc,.docx" required className="input" style={{ padding: '8px' }} />
          </Field>
        </form>
        <div className="modal-panel__foot" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
          <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="submit-form" loading={saving}>Upload & Submit</Button>
        </div>
      </Modal>
    </div>
  );
}

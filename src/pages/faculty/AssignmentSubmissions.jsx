import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import * as assignmentsApi from '../../api/assignments';
import { extractErrorMessages } from '../../api/client';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Input, { Field, Textarea } from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';

export default function AssignmentSubmissions() {
  const { id: courseId, assignmentId } = useParams();
  const location = useLocation();
  const base = location.pathname.startsWith('/faculty') ? '/faculty' : '/admin';
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [gradingTarget, setGradingTarget] = useState(null);
  const [form, setForm] = useState({ score: '', feedback: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    assignmentsApi.listSubmissions(courseId, assignmentId)
      .then((res) => setSubmissions(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [courseId, assignmentId]);

  const openGrade = (sub) => {
    setGradingTarget(sub);
    setForm({ score: sub.score ?? '', feedback: sub.feedback || '' });
    setModalOpen(true);
  };

  const submitGrade = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await assignmentsApi.gradeSubmission(courseId, gradingTarget._id || gradingTarget.id, {
        score: Number(form.score),
        feedback: form.feedback,
      });
      toast.success('Grade submitted successfully');
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
    <div className="page">
      <Link to={`${base}/courses/${courseId}`} className="row text-muted" style={{ marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to Course
      </Link>
      
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Grading</span>
          <h1 className="page-title">Assignment Submissions</h1>
        </div>
      </div>

      <Card style={{ padding: 'var(--sp-6)' }}>
        <DataTable
          emptyLabel="No submissions yet."
          columns={[
            { key: 'student', header: 'Student', render: (r) => r.studentId?.fullName || r.student?.fullName || '—' },
            { key: 'submittedAt', header: 'Submitted On', render: (r) => new Date(r.createdAt).toLocaleString() },
            { key: 'file', header: 'Attachment', render: (r) => r.fileUrl ? <a href={r.fileUrl} target="_blank" rel="noreferrer">View File</a> : '—' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || (r.score !== undefined ? 'GRADED' : 'PENDING')} /> },
            { key: 'score', header: 'Score', render: (r) => r.score !== undefined ? r.score : '—' },
            {
              key: 'actions', header: 'Actions', render: (r) => (
                <Button size="sm" variant={r.score !== undefined ? 'ghost' : 'outline'} onClick={() => openGrade(r)}>
                  {r.score !== undefined ? 'Edit Grade' : 'Grade'}
                </Button>
              ),
            },
          ]}
          rows={submissions}
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Grade Submission" width={400}>
        <form className="stack" id="grade-form" onSubmit={submitGrade}>
          <div className="stack" style={{ marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-sm)' }}>
            <strong>Student:</strong> {gradingTarget?.studentId?.fullName || gradingTarget?.student?.fullName}
            {gradingTarget?.fileUrl && (
              <div>
                <a href={gradingTarget.fileUrl} target="_blank" rel="noreferrer">Open Submitted File ↗</a>
              </div>
            )}
          </div>
          <Field label="Score" required><Input type="number" min={0} value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))} required /></Field>
          <Field label="Feedback"><Textarea rows={4} value={form.feedback} onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value }))} placeholder="Optional feedback..." /></Field>
        </form>
        <div className="modal-panel__foot" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
          <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="grade-form" loading={saving}>Submit Grade</Button>
        </div>
      </Modal>
    </div>
  );
}

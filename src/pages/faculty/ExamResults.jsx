import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import * as examsApi from '../../api/exams';
import { extractErrorMessages } from '../../api/client';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';

export default function ExamResults() {
  const { id: courseId, examId } = useParams();
  const location = useLocation();
  const base = location.pathname.startsWith('/faculty') ? '/faculty' : '/admin';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    examsApi.results(examId)
      .then((res) => setResults(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [examId]);

  const publishResult = async (resultId) => {
    try {
      await examsApi.publishResult(resultId);
      toast.success('Result published');
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
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
          <h1 className="page-title">Exam Results</h1>
        </div>
      </div>

      <Card style={{ padding: 'var(--sp-6)' }}>
        <DataTable
          emptyLabel="No student has completed this exam yet."
          columns={[
            { key: 'student', header: 'Student', render: (r) => r.studentId?.fullName || '—' },
            { key: 'submittedAt', header: 'Completed On', render: (r) => new Date(r.createdAt).toLocaleString() },
            { key: 'score', header: 'Score', render: (r) => `${r.marksObtained} / ${r.totalMarks} (${Math.round(r.percentage)}%)` },
            { key: 'status', header: 'Status', render: (r) => {
              if (r.needsGrading) return <StatusBadge status="WARNING" label="PENDING REVIEW" />;
              return <StatusBadge status={r.isPassed ? 'SUCCESS' : 'FAILED'} label={r.isPassed ? 'PASSED' : 'FAILED'} />;
            } },
            { key: 'visibility', header: 'Visibility', render: (r) => <StatusBadge status={r.isPublished ? 'PUBLISHED' : 'DRAFT'} /> },
            {
              key: 'actions', header: 'Actions', render: (r) => (
                <div className="row" style={{ gap: '8px' }}>
                  <Link to={`${base}/courses/${courseId}/exams/${examId}/attempts/${r.attemptId}/review`}>
                    <Button size="sm" variant="outline">View Attempt</Button>
                  </Link>
                  {!r.isPublished && (
                    <Button size="sm" variant="outline" onClick={() => publishResult(r._id || r.id)}>Publish</Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={results}
        />
      </Card>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageLoader from '../../components/ui/PageLoader';
import DataTable from '../../components/ui/DataTable';
import * as facultyApi from '../../api/faculty';
import { formatDistanceToNow } from 'date-fns';

export default function GradingQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQueue = () => {
      facultyApi.getGradingQueue()
        .then((res) => setQueue(res.data || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    };
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Needs Action</span>
          <h1 className="page-title">Grading Queue</h1>
          <p className="page-subtitle">Oldest submissions waiting for your review.</p>
        </div>
      </div>

      <DataTable
        columns={[
          { key: 'course', header: 'Course', render: (r) => r.courseName },
          { key: 'item', header: 'Item', render: (r) => (
            <div>
              <div style={{ fontWeight: 500 }}>{r.title}</div>
              <div className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>
                {r.type.toUpperCase()}
              </div>
            </div>
          )},
          { key: 'student', header: 'Student', render: (r) => r.studentName },
          { key: 'submittedAt', header: 'Submitted', render: (r) => (
            <span>{formatDistanceToNow(new Date(r.submittedAt), { addSuffix: true })}</span>
          )},
          { key: 'action', header: 'Action', render: (r) => (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                if (r.type === 'assignment') {
                  navigate(`/faculty/courses/${r.assignmentId}/assignments/${r.assignmentId}/submissions`);
                } else {
                  navigate(`/faculty/courses/${r.examId}/exams/${r.examId}/attempts`); // Update to actual paths
                }
              }}
            >
              Grade Now
            </button>
          )}
        ]}
        rows={queue}
        emptyLabel="Your grading queue is empty. Great job!"
      />
    </div>
  );
}

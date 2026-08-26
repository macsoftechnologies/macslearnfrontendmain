import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import * as coursesApi from '../../api/courses';
import { extractErrorMessages } from '../../api/client';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';

export default function ContentApprovals() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadApprovals = async () => {
    setLoading(true);
    try {
      // Fetch courses specifically in IN_REVIEW status
      const res = await coursesApi.list({ status: 'IN_REVIEW', limit: 100 });
      setCourses(res.data?.data || []);
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Content Approvals</h1>
          <p className="page-subtitle">Review courses submitted by Faculty before they go live.</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All caught up!"
          description="There are currently no courses pending approval."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {courses.map(course => (
            <Card key={course._id || course.id} style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{course.title}</h3>
                  <StatusBadge status={course.status} />
                </div>
                <p className="text-muted" style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
                  Submitted by {course.faculty?.fullName || course.createdBy || 'Faculty'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="outline" onClick={() => navigate(`/admin/courses/${course._id || course.id}`)}>
                  Review Course
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import * as examsApi from '../../api/exams';
import * as progressApi from '../../api/progress';
import DataTable from '../ui/DataTable';
import StatusBadge from '../ui/StatusBadge';
import Button from '../ui/Button';
import PageLoader from '../ui/PageLoader';

export default function StudentExams({ courseId }) {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [attemptsMap, setAttemptsMap] = useState({});
  const [courseProgress, setCourseProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      examsApi.list(courseId).catch(() => ({ data: { data: [] } })),
      progressApi.getCourseProgress(courseId).catch(() => ({ data: { data: null } })),
    ])
      .then(async ([examsRes, progressRes]) => {
        const pub = (examsRes.data?.data || []).filter(
          (e) => e.isPublished || e.status === 'PUBLISHED',
        );
        const progress = progressRes.data?.data || null;
        const isCourseComplete = progress?.progressPercentage === 100;
        setCourseProgress(progress);
        setExams(pub.filter((e) => !e.isFinalExam || isCourseComplete));

        // Fetch attempts for all visible exams
        const map = {};
        for (const exam of pub) {
          if (exam.isFinalExam && !isCourseComplete) continue;
          try {
            const attRes = await examsApi.attempts(exam._id || exam.id);
            const data = attRes.data?.data || attRes.data || [];
            map[exam._id || exam.id] = Array.isArray(data) ? data : [];
          } catch (e) {
            console.error('Failed to fetch attempts for exam', exam._id);
          }
        }
        setAttemptsMap(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return <PageLoader />;

  const isCourseComplete = courseProgress?.progressPercentage === 100;

  return (
    <div style={{ padding: 'var(--sp-6)' }}>
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <h2 style={{ fontSize: 'var(--fs-lg)' }}>Exams</h2>
        <p className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>
          Complete these exams to pass the course.
          {courseProgress && !isCourseComplete && (
            <span style={{ display: 'block', marginTop: '8px', color: 'var(--color-text-light)', fontSize: '13px' }}>
              Final exam(s) will appear once you complete the course.
            </span>
          )}
        </p>
      </div>
      <DataTable
        emptyLabel="No exams available for this course yet."
        columns={[
          { key: 'title', header: 'Title' },
          { key: 'duration', header: 'Duration', render: (r) => `${r.durationMinutes} min` },
          { key: 'marks', header: 'Total Marks', render: (r) => r.totalMarks },
          { key: 'passing', header: 'Passing (%)', render: (r) => `${r.passingPercentage}%` },
          { 
            key: 'attempts', 
            header: 'Attempts Used', 
            render: (r) => {
              const max = r.maxAttempts || 3;
              const used = (attemptsMap[r._id || r.id] || []).length;
              return `${used} / ${max}`;
            } 
          },
          {
            key: 'highestScore',
            header: 'Highest Score',
            render: (r) => {
              const pastAttempts = attemptsMap[r._id || r.id] || [];
              if (pastAttempts.length === 0) return '—';
              const maxScore = Math.max(...pastAttempts.map(a => a.marksObtained || 0));
              return `${maxScore} / ${r.totalMarks}`;
            }
          },
          {
            key: 'actions', header: 'Actions', render: (r) => {
              const pastAttempts = attemptsMap[r._id || r.id] || [];
              const max = r.maxAttempts || 3;
              const used = pastAttempts.length;
              
              return (
                <div className="row" style={{ gap: '8px' }}>
                  {used < max && (
                    <Button size="sm" onClick={() => navigate(`/student/my-courses/${courseId}/exams/${r._id || r.id}/take`)}>
                      {used > 0 ? 'Retake Exam' : 'Take Exam'}
                    </Button>
                  )}
                </div>
              );
            },
          },
        ]}
        rows={exams}
      />
    </div>
  );
}

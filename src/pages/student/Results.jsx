import { useEffect, useState } from 'react';
import { FileCheck2, GraduationCap } from 'lucide-react';
import * as resultsApi from '../../api/results';
import * as transcriptsApi from '../../api/transcripts';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';
import Tabs from '../../components/ui/Tabs';
import { Link } from 'react-router-dom';

const getGPA = (grade) => {
  const map = {
    'A+': 4.3, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'F': 0.0, 'F+': 0.0
  };
  return map[grade] || 0.0;
};

export default function Results() {
  const [results, setResults] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [videoQuizzes, setVideoQuizzes] = useState([]);
  const [transcripts, setTranscripts] = useState({ grades: [], totalCredits: 0, averageScore: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('final');

  useEffect(() => {
    Promise.allSettled([
      resultsApi.myResults(),
      resultsApi.myAttempts(),
      resultsApi.myVideoQuizzes(),
      transcriptsApi.getMyGrades()
    ]).then(([res1, res2, res3, res4]) => {
      if (res1.status === 'fulfilled') setResults(res1.value.data?.data || []);
      if (res2.status === 'fulfilled') setAttempts(res2.value.data?.data || []);
      if (res3.status === 'fulfilled') setVideoQuizzes(res3.value.data?.data || []);
            if (res4.status === 'fulfilled') {
        const payload = res4.value?.data?.grades ? res4.value.data : (res4.value?.grades ? res4.value : { grades: [], totalCredits: 0, averageScore: 0 });
        setTranscripts(payload);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <PageLoader />;

  let totalMarks = 0;
  let totalCredits = 0;
  let totalGradePointsWeighted = 0;
  (transcripts?.grades || []).forEach(g => {
    const credits = Number(g.course?.credits || 0);
    totalCredits += credits;
    totalMarks += Number(g.totalScore || 0);
    const pts = getGPA(g.grade);
    totalGradePointsWeighted += pts * (credits || 1);
  });
  const cumulativeGPA = totalCredits > 0 ? (totalGradePointsWeighted / totalCredits).toFixed(1) : '0.0';

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Performance</span>
          <h1 className="page-title">My Results</h1>
          <p className="page-subtitle">Your exam results, attempts, and official grades across all your courses.</p>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <Tabs
          tabs={[
            { key: 'final', label: 'Final Results' },
            { key: 'attempts', label: 'Exam Attempts' },
            { key: 'video', label: 'Video Quizzes' },
            { key: 'transcripts', label: 'Official Grades' }
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {activeTab === 'final' && (
        results.length === 0 ? (
          <EmptyState icon={FileCheck2} title="No final results yet" description="Your published exam results will appear here once available." />
        ) : (
          <DataTable
            columns={[
              { key: 'exam', header: 'Exam', render: (r) => r.exam?.title || r.examId?.title || '—' },
              { key: 'course', header: 'Course', render: (r) => r.course?.title || r.courseId?.title || '—' },
              { key: 'score', header: 'Score', render: (r) => `${r.marksObtained ?? 0} / ${r.totalMarks ?? '—'}` },
              { key: 'status', header: 'Result', render: (r) => <StatusBadge status={r.isPassed ? 'SUCCESS' : 'FAILED'} label={r.isPassed ? 'Passed' : 'Failed'} /> },
              { key: 'takenAt', header: 'Date', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
            ]}
            rows={results}
          />
        )
      )}

      {activeTab === 'attempts' && (
        attempts.length === 0 ? (
          <EmptyState icon={FileCheck2} title="No exam attempts yet" description="Your attempt history will appear here." />
        ) : (
          <DataTable
            columns={[
              { key: 'exam', header: 'Exam', render: (r) => r.examId?.title || '—' },
              { key: 'course', header: 'Course', render: (r) => r.examId?.courseId?.title || '—' },
              { key: 'attempt', header: 'Attempt #', render: (r) => r.attemptNumber },
              { key: 'score', header: 'Score', render: (r) => `${r.marksObtained ?? 0} / ${r.totalMarks ?? '—'}` },
              { key: 'status', header: 'Status', render: (r) => {
                let displayStatus = r.status;
                if (r.status === 'SUBMITTED' && r.answers) {
                  try {
                    const ans = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers;
                    const needsGrading = ans.some(a => a.isGraded === false);
                    if (needsGrading) {
                      return <StatusBadge status="WARNING" label="PENDING REVIEW" />;
                    } else {
                      displayStatus = 'EVALUATED';
                    }
                  } catch(e) {}
                }
                return <StatusBadge status={displayStatus} />;
              } },
              { key: 'date', header: 'Date', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
              { key: 'actions', header: '', render: (r) => (
                <Link to={`/student/my-courses/${r.examId?.courseId}/exams/${r.examId?._id || r.examId?.id}/attempts/${r._id || r.id}/review`} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px' }}>
                  Review
                </Link>
              ) }
            ]}
            rows={attempts}
          />
        )
      )}

      {activeTab === 'video' && (
        videoQuizzes.length === 0 ? (
          <EmptyState icon={FileCheck2} title="No video quizzes answered" description="Your interactive video quiz scores will appear here." />
        ) : (
          <DataTable
            columns={[
              { key: 'course', header: 'Course', render: (r) => r.lessonId?.courseId?.title || '—' },
              { key: 'lesson', header: 'Lesson', render: (r) => r.lessonId?.title || '—' },
              { key: 'question', header: 'Question', render: (r) => r.quizId?.questionText || '—' },
              { key: 'score', header: 'Score', render: (r) => `${r.marks ?? 0} / ${r.quizId?.maxMarks ?? '—'}` },
              { key: 'status', header: 'Status', render: (r) => (
                <StatusBadge 
                  status={r.isGraded ? (r.isCorrect ? 'SUCCESS' : 'FAILED') : 'PENDING'} 
                  label={r.isGraded ? (r.isCorrect ? 'Correct' : 'Incorrect') : 'Pending Review'} 
                />
              ) },
              { key: 'date', header: 'Date', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
            ]}
            rows={videoQuizzes}
          />
        )
      )}

      {activeTab === 'transcripts' && (
        (transcripts?.grades || []).length === 0 ? (
          <EmptyState icon={GraduationCap} title="No official grades yet" description="Your manual grades and credits will appear here once faculty assigns them." />
        ) : (
          <DataTable
            columns={[
              { key: 'course', header: 'Course Name', render: (r) => <span style={{ fontWeight: 500 }}>{r.course?.title || '—'}</span> },
              { key: 'credits', header: 'Credit Earned', render: (r) => Number(r.course?.credits || 0).toFixed(0) },
              { key: 'marks', header: 'Marks', render: (r) => r.totalScore || 0 },
              { key: 'grade', header: 'Grade', render: (r) => <span style={{ fontWeight: 600 }}>{r.grade || '—'}</span> },
              { key: 'points', header: 'Points', render: (r) => getGPA(r.grade).toFixed(1) },
            ]}
            rows={transcripts?.grades || []}
            footerRow={{
              course: 'Total',
              credits: totalCredits,
              marks: totalMarks,
              grade: '',
              points: cumulativeGPA
            }}
          />
        )
      )}
    </div>
  );
}




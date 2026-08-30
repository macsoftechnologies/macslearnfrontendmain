import React, { useEffect, useState, useMemo } from 'react';
import { 
  FileCheck2, GraduationCap, CheckCircle2, Clock, 
  BookOpen, Award, TrendingUp, AlertCircle, Sparkles, FolderTree 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import * as resultsApi from '../../api/results';
import * as transcriptsApi from '../../api/transcripts';
import * as studentsApi from '../../api/students';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';
import Tabs from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';

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
  const { user } = useAuth();
  const userId = user?.id || user?.userId || user?._id;

  const [results, setResults] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [videoQuizzes, setVideoQuizzes] = useState([]);
  const [transcripts, setTranscripts] = useState({ grades: [], totalCredits: 0, averageScore: 0 });
  const [enrollments, setEnrollments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Default tab is 'progress' so students immediately see how many are done vs pending!
  const [activeTab, setActiveTab] = useState('progress');

  useEffect(() => {
    if (!userId) return;

    Promise.allSettled([
      resultsApi.myResults(),
      resultsApi.myAttempts(),
      resultsApi.myVideoQuizzes(),
      transcriptsApi.getMyGrades(),
      studentsApi.getEnrollments(userId),
      client.get(`/students/${userId}/programs`)
    ]).then(([res1, res2, res3, res4, res5, res6]) => {
      if (res1.status === 'fulfilled') setResults(res1.value.data?.data || []);
      if (res2.status === 'fulfilled') setAttempts(res2.value.data?.data || []);
      if (res3.status === 'fulfilled') setVideoQuizzes(res3.value.data?.data || []);
      if (res4.status === 'fulfilled') {
        const payload = res4.value?.data?.grades ? res4.value.data : (res4.value?.grades ? res4.value : { grades: [], totalCredits: 0, averageScore: 0 });
        setTranscripts(payload);
      }
      if (res5.status === 'fulfilled') setEnrollments(res5.value.data?.data || []);
      if (res6.status === 'fulfilled') {
        const progs = res6.value.data?.data || res6.value.data;
        setPrograms(Array.isArray(progs) ? progs : []);
      }
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <PageLoader />;

  // Progress Calculation
  const programEnrollments = enrollments.filter(e => e.programId || e.program);
  const completedEnrollments = enrollments.filter(e => e.status === 'COMPLETED' || (e.progressPercentage ?? 0) >= 100);
  const pendingEnrollments = enrollments.filter(e => e.status !== 'COMPLETED' && (e.progressPercentage ?? 0) < 100);

  const primaryProgram = programs[0] || (programEnrollments[0]?.program ? programEnrollments[0].program : null);
  const totalProgramSubjects = primaryProgram?.totalSubjects || enrollments.length || 0;
  const completedSubjectsCount = completedEnrollments.length;
  const pendingSubjectsCount = Math.max(0, totalProgramSubjects - completedSubjectsCount);
  const progressPercent = totalProgramSubjects > 0 ? Math.min(100, Math.round((completedSubjectsCount / totalProgramSubjects) * 100)) : 0;

  // Grade Totals
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
    <div className="page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-head" style={{ marginBottom: 'var(--sp-6)' }}>
        <div>
          <span className="page-eyebrow">Academic Performance & Records</span>
          <h1 className="page-title">My Results & Degree Progress</h1>
          <p className="page-subtitle">Track your degree completion, completed vs pending subjects, and comprehensive examination grades.</p>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <Tabs
          tabs={[
            { key: 'progress', label: 'Degree Progress & Status', icon: GraduationCap },
            { key: 'transcripts', label: 'Official Grades & Transcripts', icon: Award },
            { key: 'final', label: 'Final Exam Results', icon: FileCheck2 },
            { key: 'attempts', label: 'Exam & Quiz Attempts', icon: BookOpen },
            { key: 'video', label: 'In-Video Quizzes', icon: TrendingUp },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* TAB 1: DEGREE PROGRESS & STATUS (DONE VS PENDING) */}
      {activeTab === 'progress' && (
        <div className="stack" style={{ gap: 'var(--sp-6)' }}>
          {/* Executive Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <Card style={{ padding: '1.25rem', borderLeft: '4px solid #4f46e5' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Enrolled Degree Program</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '6px 0 2px', color: 'var(--text-primary)' }}>
                {primaryProgram?.name || primaryProgram?.title || 'Degree Curriculum'}
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#4f46e5', fontWeight: 600 }}>Active Student Status</span>
            </Card>

            <Card style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed Subjects</span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '4px 0 2px', color: '#059669' }}>
                {completedSubjectsCount} <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ {totalProgramSubjects}</span>
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>Passed & Accredited</span>
            </Card>

            <Card style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending / In-Progress</span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '4px 0 2px', color: '#d97706' }}>
                {pendingSubjectsCount} <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>Subjects Remaining</span>
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600 }}>To Complete Degree</span>
            </Card>

            <Card style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cumulative GPA</span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '4px 0 2px', color: '#7c3aed' }}>
                {cumulativeGPA} <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ 4.3</span>
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 600 }}>{totalCredits} Total Credits Earned</span>
            </Card>
          </div>

          {/* Progress Bar Header */}
          <Card style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Degree Completion Progress</span>
              <span style={{ fontWeight: 900, fontSize: '1rem', color: '#4f46e5' }}>{progressPercent}% Complete</span>
            </div>
            <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #4f46e5, #10b981)', borderRadius: '999px', transition: 'width 0.4s ease' }} />
            </div>
          </Card>

          {/* Subjects Status Table */}
          <Card style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>Course & Subject Completion Breakdown</h3>
            {enrollments.length === 0 ? (
              <EmptyState icon={GraduationCap} title="No enrolled subjects found" description="Enroll in courses to start tracking your progress." />
            ) : (
              <DataTable
                columns={[
                  {
                    key: 'course',
                    header: 'Course / Subject',
                    render: (r) => (
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
                          {r.course?.title || r.courseTitle || 'Subject Course'}
                        </span>
                        {r.batch?.name && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Cohort: {r.batch.name}
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'credits',
                    header: 'Credits',
                    render: (r) => <span style={{ fontWeight: 600 }}>{r.course?.credits || 3} Credits</span>,
                  },
                  {
                    key: 'progress',
                    header: 'Learning Progress',
                    render: (r) => (
                      <div style={{ width: '120px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                          {r.progressPercentage || (r.status === 'COMPLETED' ? 100 : 0)}%
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: `${r.progressPercentage || (r.status === 'COMPLETED' ? 100 : 0)}%`, height: '100%', background: (r.status === 'COMPLETED' || (r.progressPercentage ?? 0) >= 100) ? '#10b981' : '#4f46e5', borderRadius: '999px' }} />
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Completion Status',
                    render: (r) => {
                      const isDone = r.status === 'COMPLETED' || (r.progressPercentage ?? 0) >= 100;
                      return isDone ? (
                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> COMPLETED
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> IN PROGRESS
                        </span>
                      );
                    },
                  },
                  {
                    key: 'action',
                    header: 'Action',
                    render: (r) => (
                      <Link 
                        to={`/student/my-courses/${r.courseId || r.course?.id || r.course?._id}/learn`}
                        className="btn btn-outline" 
                        style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}
                      >
                        Open Course
                      </Link>
                    ),
                  },
                ]}
                rows={enrollments}
              />
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: OFFICIAL GRADES & TRANSCRIPTS (ASSESSMENT + ATTENDANCE + FINAL EXAM + TOTAL SCORE) */}
      {activeTab === 'transcripts' && (
        (transcripts?.grades || []).length === 0 ? (
          <EmptyState icon={GraduationCap} title="No official grades yet" description="Your grades and credits will appear here once faculty assigns them." />
        ) : (
          <Card style={{ padding: '1.5rem' }}>
            <DataTable
              columns={[
                { 
                  key: 'course', 
                  header: 'Course Name', 
                  render: (r) => <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.course?.title || '—'}</span> 
                },
                { 
                  key: 'credits', 
                  header: 'Credits', 
                  render: (r) => <span style={{ fontWeight: 600 }}>{Number(r.course?.credits || 3).toFixed(0)}</span> 
                },
                { 
                  key: 'assessment', 
                  header: 'Continuous Assessment (/65)', 
                  render: (r) => <strong style={{ color: '#4f46e5' }}>{r.assignmentScore ?? '—'}</strong> 
                },
                { 
                  key: 'attendance', 
                  header: 'Live Attendance (/5)', 
                  render: (r) => <strong style={{ color: '#059669' }}>{r.attendanceScore ?? '—'}</strong> 
                },
                { 
                  key: 'finalExam', 
                  header: 'Final Exam (/30)', 
                  render: (r) => <strong style={{ color: '#7c3aed' }}>{r.finalExamScore ?? '—'}</strong> 
                },
                { 
                  key: 'marks', 
                  header: 'Total Score (/100)', 
                  render: (r) => <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{r.totalScore ?? 0}</strong> 
                },
                { 
                  key: 'grade', 
                  header: 'Final Grade', 
                  render: (r) => (
                    <span style={{ fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#1e293b' }}>
                      {r.grade || '—'}
                    </span>
                  ) 
                },
                { 
                  key: 'points', 
                  header: 'Grade Points', 
                  render: (r) => <span style={{ fontWeight: 600 }}>{getGPA(r.grade).toFixed(1)}</span> 
                },
              ]}
              rows={transcripts?.grades || []}
              footerRow={{
                course: 'Total / Cumulative GPA',
                credits: totalCredits,
                assessment: '—',
                attendance: '—',
                finalExam: '—',
                marks: totalMarks,
                grade: '',
                points: cumulativeGPA
              }}
            />
          </Card>
        )
      )}

      {/* TAB 3: FINAL RESULTS */}
      {activeTab === 'final' && (
        results.length === 0 ? (
          <EmptyState icon={FileCheck2} title="No final results yet" description="Your published exam results will appear here once available." />
        ) : (
          <DataTable
            columns={[
              { key: 'exam', header: 'Exam Title', render: (r) => <span style={{ fontWeight: 700 }}>{r.exam?.title || r.examId?.title || '—'}</span> },
              { key: 'course', header: 'Course', render: (r) => r.course?.title || r.courseId?.title || '—' },
              { key: 'score', header: 'Score', render: (r) => <strong>{r.marksObtained ?? 0} / {r.totalMarks ?? '—'}</strong> },
              { key: 'status', header: 'Result', render: (r) => <StatusBadge status={r.isPassed ? 'SUCCESS' : 'FAILED'} label={r.isPassed ? 'Passed' : 'Failed'} /> },
              { key: 'takenAt', header: 'Date', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
            ]}
            rows={results}
          />
        )
      )}

      {/* TAB 4: EXAM & QUIZ ATTEMPTS */}
      {activeTab === 'attempts' && (
        attempts.length === 0 ? (
          <EmptyState icon={FileCheck2} title="No exam attempts yet" description="Your attempt history will appear here." />
        ) : (
          <DataTable
            columns={[
              { key: 'exam', header: 'Exam', render: (r) => <span style={{ fontWeight: 700 }}>{r.examId?.title || '—'}</span> },
              { key: 'course', header: 'Course', render: (r) => r.examId?.courseId?.title || '—' },
              { key: 'attempt', header: 'Attempt #', render: (r) => r.attemptNumber },
              { key: 'score', header: 'Score', render: (r) => <strong>{r.marksObtained ?? 0} / {r.totalMarks ?? '—'}</strong> },
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

      {/* TAB 5: IN-VIDEO QUIZZES */}
      {activeTab === 'video' && (
        videoQuizzes.length === 0 ? (
          <EmptyState icon={FileCheck2} title="No video quizzes answered" description="Your interactive video quiz scores will appear here." />
        ) : (
          <DataTable
            columns={[
              { key: 'course', header: 'Course', render: (r) => r.lessonId?.courseId?.title || '—' },
              { key: 'lesson', header: 'Lesson', render: (r) => r.lessonId?.title || '—' },
              { key: 'question', header: 'Question', render: (r) => r.quizId?.questionText || '—' },
              { key: 'score', header: 'Score', render: (r) => <strong>{r.marks ?? 0} / {r.quizId?.maxMarks ?? '—'}</strong> },
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
    </div>
  );
}

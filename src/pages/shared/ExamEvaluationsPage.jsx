import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Filter, BookOpen, GraduationCap, CheckCircle, Clock, Eye, AlertCircle, Users, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import * as examsApi from '../../api/exams';
import * as academicBatchesApi from '../../api/academicBatches';
import * as coursesApi from '../../api/courses';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { Select } from '../../components/ui/Input';
import DataTable from '../../components/ui/DataTable';
import PageLoader from '../../components/ui/PageLoader';
import Tabs from '../../components/ui/Tabs';

export default function ExamEvaluationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith('/faculty') ? '/faculty' : '/admin';

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);

  // Active Tab: 'assessments' | 'finals'
  const [activeTab, setActiveTab] = useState('assessments');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'GRADED'

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsRes, batchesRes, coursesRes] = await Promise.allSettled([
        examsApi.allSubmissions(),
        academicBatchesApi.list(),
        coursesApi.list({ limit: 200 })
      ]);

      if (subsRes.status === 'fulfilled') {
        const raw = subsRes.value.data?.data || subsRes.value.data || [];
        setSubmissions(Array.isArray(raw) ? raw : []);
      }
      if (batchesRes.status === 'fulfilled') {
        const bRaw = batchesRes.value.data?.data || batchesRes.value.data || [];
        setBatches(Array.isArray(bRaw) ? bRaw : []);
      }
      if (coursesRes.status === 'fulfilled') {
        const cRaw = coursesRes.value.data?.data || coursesRes.value.data || [];
        setCourses(Array.isArray(cRaw) ? cRaw : []);
      }
    } catch (err) {
      toast.error('Failed to load exam submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const isFinal = sub.exam?.isFinalExam === true;
      if (activeTab === 'assessments' && isFinal) return false;
      if (activeTab === 'finals' && !isFinal) return false;

      // Batch filter
      if (selectedBatch && sub.batch?.id !== selectedBatch) return false;

      // Course filter
      if (selectedCourse && sub.course?.id !== selectedCourse) return false;

      // Status filter
      if (statusFilter === 'PENDING' && !sub.needsGrading) return false;
      if (statusFilter === 'GRADED' && sub.needsGrading) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const studentName = (sub.student?.fullName || '').toLowerCase();
        const studentEmail = (sub.student?.email || '').toLowerCase();
        const examTitle = (sub.exam?.title || '').toLowerCase();
        const courseTitle = (sub.course?.title || '').toLowerCase();
        const batchName = (sub.batch?.name || '').toLowerCase();

        return (
          studentName.includes(q) ||
          studentEmail.includes(q) ||
          examTitle.includes(q) ||
          courseTitle.includes(q) ||
          batchName.includes(q)
        );
      }

      return true;
    });
  }, [submissions, activeTab, selectedBatch, selectedCourse, statusFilter, search]);

  const assessmentCount = useMemo(() => submissions.filter(s => !s.exam?.isFinalExam).length, [submissions]);
  const finalCount = useMemo(() => submissions.filter(s => s.exam?.isFinalExam).length, [submissions]);
  const pendingCount = useMemo(() => submissions.filter(s => s.needsGrading).length, [submissions]);

  if (loading) return <PageLoader />;

  return (
    <div className="page" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-head" style={{ marginBottom: 'var(--sp-6)' }}>
        <div>
          <span className="page-eyebrow">Academic Grading & Evaluations</span>
          <h1 className="page-title">Review Exams & Submissions</h1>
          <p className="page-subtitle">
            Evaluate student book reviews, research papers, quizzes, and final exams by cohort/batch.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <Tabs
          tabs={[
            {
              id: 'assessments',
              label: `Assessments & Quizzes (${assessmentCount})`,
              icon: BookOpen,
            },
            {
              id: 'finals',
              label: `Final Comprehensive Exams (${finalCount})`,
              icon: GraduationCap,
            },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab)}
        />
      </div>

      {/* Filter and Search Bar */}
      <Card style={{ padding: 'var(--sp-4) var(--sp-6)', marginBottom: 'var(--sp-6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
          
          {/* Search Box */}
          <div style={{ minWidth: '240px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Search Students or Exams
            </label>
            <div style={{ position: 'relative' }}>
              <Input
                placeholder="Type student name, email, or exam..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '34px' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Batch Filter */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Cohort / Batch
            </label>
            <Select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
              <option value="">All Cohorts / Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Course Subject Filter */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Course / Subject
            </label>
            <Select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
              <option value="">All Subjects</option>
              {courses.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Evaluation Status
            </label>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Submissions</option>
              <option value="PENDING">⏳ Pending Evaluation Only</option>
              <option value="GRADED">✓ Evaluated / Graded</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Submissions Table */}
      <Card style={{ padding: 'var(--sp-6)' }}>
        <DataTable
          loading={loading}
          emptyLabel="No student exam submissions match your selected filters."
          columns={[
            {
              key: 'student',
              header: 'Student',
              render: (r) => (
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
                    {r.student?.fullName || 'Student'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {r.student?.email || '—'}
                  </div>
                </div>
              ),
            },
            {
              key: 'batch',
              header: 'Cohort / Batch',
              render: (r) => (
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  padding: '3px 8px', 
                  borderRadius: '6px', 
                  background: r.batch?.name ? '#f0fdf4' : '#f1f5f9', 
                  color: r.batch?.name ? '#166534' : '#64748b',
                  border: r.batch?.name ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                }}>
                  {r.batch?.name || 'General Admission'}
                </span>
              ),
            },
            {
              key: 'courseExam',
              header: 'Course & Exam Title',
              render: (r) => (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#4f46e5' }}>
                    {r.course?.title || 'Subject Course'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {r.exam?.title || 'Exam'}
                  </div>
                  {r.questionTypes?.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                      {r.questionTypes.map(t => (
                        <span key={t} style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8' }}>
                          {t === 'BOOK_REVIEW' ? '📖 Book Review' : t === 'RESEARCH_PAPER' ? '📄 Research Paper' : t === 'VIDEO_QUIZ' ? '🎬 In-Video Quiz' : t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'submittedAt',
              header: 'Completed On',
              render: (r) => (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (
                <div>
                  {r.needsGrading ? (
                    <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> PENDING EVALUATION
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={12} /> EVALUATED
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'score',
              header: 'Score',
              render: (r) => (
                <div style={{ fontWeight: 700, fontSize: '13px' }}>
                  {r.marksObtained} / {r.exam?.totalMarks || 100}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                    ({Math.round(r.percentage)}%)
                  </span>
                </div>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (r) => (
                <Button
                  size="sm"
                  variant="primary"
                  style={{ background: '#4f46e5', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    if (r.submissionType === 'VIDEO_QUIZ') {
                      navigate(`${base}/courses/${r.course?.id}/lessons/${r.lessonId}/video-quizzes`);
                    } else {
                      navigate(`${base}/courses/${r.course?.id}/exams/${r.exam?.id}/attempts/${r.attemptId}/review`);
                    }
                  }}
                >
                  <Eye size={14} /> {r.submissionType === 'VIDEO_QUIZ' ? 'View Quiz Answer' : 'Review & Score'}
                </Button>
              ),
            },
          ]}
          rows={filteredSubmissions}
        />
      </Card>
    </div>
  );
}

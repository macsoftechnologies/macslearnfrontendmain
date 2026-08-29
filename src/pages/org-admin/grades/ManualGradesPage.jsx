import React, { useState, useEffect } from 'react';
import { Save, Search, Award, CheckCircle, Users, AlertCircle, Clock, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import DataTable from '../../../components/ui/DataTable';
import Pagination from '../../../components/ui/Pagination';
import { Field, Select } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import StatusBadge from '../../../components/ui/StatusBadge';
import Tabs from '../../../components/ui/Tabs';
import { useAuth } from '../../../contexts/AuthContext';
import * as manualGradesApi from '../../../api/manualGrades';
import * as semestersApi from '../../../api/semesters';
import * as coursesApi from '../../../api/courses';
import * as academicBatchesApi from '../../../api/academicBatches';
import * as programsApi from '../../../api/programs';

const ManualGradesPage = () => {
  const { user } = useAuth();
  const isOrgAdmin = user?.userType === 'ORG_USER' || user?.userType === 'SUPER_ADMIN';

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('needs_grading');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  const [programId, setProgramId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    programsApi.list().then(res => setPrograms(res?.data || res || [])).catch(() => {});
    academicBatchesApi.list().then(res => setBatches(res?.data || res || [])).catch(() => {});
    semestersApi.list().then(res => setSemesters(res?.data || res || [])).catch(() => {});
    coursesApi.list({ limit: 200 }).then(res => setCourses(res?.data?.data || res?.data || [])).catch(() => {});
  }, []);


  const handleLoad = async () => {
    if (!batchId || !courseId) {
      toast.error('Please select a Batch and a Course');
      return;
    }
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const sem = semesterId || 'all';
      const res = await manualGradesApi.listGrades(batchId, sem, courseId);
      const rawStudents = res.data || [];
      
      // Determine isGraded status
      const mapped = rawStudents.map(s => ({
        ...s,
        isGraded: s.isGraded !== undefined ? s.isGraded : (Number(s.finalExamScore) > 0 || Number(s.assignmentScore) > 0)
      }));
      
      setStudents(mapped);
      if (mapped.length === 0) toast.error('No enrolled students found for this selection');
      else {
        const needsGradingCount = mapped.filter(s => !s.isGraded).length;
        setActiveTab(needsGradingCount > 0 ? 'needs_grading' : 'already_graded');
      }
    } catch (err) {
      toast.error('Failed to load student grades');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (id, field, value) => {
    const maxLimit = field === 'assignmentScore' ? 70 : 30;
    const numVal = Math.min(maxLimit, Math.max(0, Number(value) || 0));
    setStudents(students.map(s => s.studentId === id ? { ...s, [field]: numVal } : s));
  };

  const calculateGradeLetter = (score) => {
    if (score >= 80) return 'A+';
    if (score >= 75) return 'A';
    if (score >= 70) return 'A-';
    if (score >= 65) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 55) return 'B-';
    if (score >= 50) return 'C+';
    if (score >= 45) return 'C';
    if (score >= 40) return 'C-';
    return 'F';
  };

  const calculateTotal = (assignment, exam) => {
    const a = Number(assignment) || 0;
    const e = Number(exam) || 0;
    return Math.min(100, Math.round((a + e) * 100) / 100);
  };

  // Save a single student's grade
  const handleSaveSingle = async (student) => {
    if (!batchId || !courseId) return;
    setSavingId(student.studentId);
    try {
      const sem = semesterId || 'all';
      const payload = [{
        studentId: student.studentId,
        assignmentScore: Number(student.assignmentScore) || 0,
        finalExamScore: Number(student.finalExamScore) || 0
      }];
      await manualGradesApi.saveGrades(batchId, sem, courseId, payload);
      
      // Update local student status to graded
      setStudents(prev => prev.map(s => s.studentId === student.studentId ? { ...s, isGraded: true } : s));
      
      // Remove from selected set if present
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(student.studentId);
        return next;
      });

      toast.success(`Grade saved for ${student.student?.firstName || 'Student'}!`);
    } catch (err) {
      toast.error('Failed to save grade');
    } finally {
      setSavingId(null);
    }
  };

  // Save multiple selected students at once
  const handleSaveSelected = async () => {
    if (!batchId || !courseId || selectedIds.size === 0) return;
    setSaving(true);
    try {
      const sem = semesterId || 'all';
      const selectedStudents = students.filter(s => selectedIds.has(s.studentId));
      const payload = selectedStudents.map(s => ({
        studentId: s.studentId,
        assignmentScore: Number(s.assignmentScore) || 0,
        finalExamScore: Number(s.finalExamScore) || 0
      }));
      
      await manualGradesApi.saveGrades(batchId, sem, courseId, payload);
      
      // Mark all selected as graded
      setStudents(prev => prev.map(s => selectedIds.has(s.studentId) ? { ...s, isGraded: true } : s));
      toast.success(`Saved grades for ${selectedStudents.length} student(s)!`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error('Failed to save selected grades');
    } finally {
      setSaving(false);
    }
  };

  const selectedBatch = batches.find(b => b.id === batchId);

  const filteredBatches = programId
    ? batches.filter(b => b.programId === programId)
    : batches;


  const filteredSemesters = programId
    ? semesters.filter(s => s.programId === programId)
    : (batchId && selectedBatch?.programId ? semesters.filter(s => s.programId === selectedBatch.programId) : semesters);

  const selectedSemester = semesters.find(s => s.id === semesterId || s._id === semesterId);
  const semCourseIds = new Set(selectedSemester?.courseIds || []);

  const filteredCourses = courses.filter(c => {
    const cId = c.id || c._id;
    // If semester selected, match semester.courseIds OR c.semesterId
    if (semesterId) {
      if (semCourseIds.has(cId) || c.semesterId === semesterId) return true;
      return false;
    }
    // If program selected, match programId OR any semester in that program
    if (programId) {
      if (c.programId === programId || (Array.isArray(c.programIds) && c.programIds.includes(programId))) return true;
      const progSems = semesters.filter(s => s.programId === programId);
      const progCourseIds = new Set(progSems.flatMap(s => s.courseIds || []));
      if (progCourseIds.has(cId)) return true;
      return false;
    }
    // If batch selected
    if (selectedBatch?.programId) {
      const progSems = semesters.filter(s => s.programId === selectedBatch.programId);
      const progCourseIds = new Set(progSems.flatMap(s => s.courseIds || []));
      if (c.programId === selectedBatch.programId || progCourseIds.has(cId)) return true;
    }
    return true;
  });

  const totalStudents = students.length;
  const gradedList = students.filter(s => s.isGraded);
  const needsGradingList = students.filter(s => !s.isGraded);
  
  const currentTabStudents = activeTab === 'needs_grading'
    ? needsGradingList
    : activeTab === 'already_graded'
    ? gradedList
    : students;

  const totalPages = Math.ceil(currentTabStudents.length / pageSize) || 1;
  const paginatedStudents = currentTabStudents.slice((page - 1) * pageSize, page * pageSize);

  const isAllCurrentSelected = paginatedStudents.length > 0 && paginatedStudents.every(s => selectedIds.has(s.studentId));

  const toggleSelectAllCurrent = () => {
    if (isAllCurrentSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedStudents.forEach(s => next.delete(s.studentId));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedStudents.forEach(s => next.add(s.studentId));
        return next;
      });
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const avgScore = totalStudents > 0 
    ? (students.reduce((acc, s) => acc + calculateTotal(s.assignmentScore, s.finalExamScore), 0) / totalStudents).toFixed(1)
    : 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Grading Management</span>
          <h1 className="page-title">Grade Entry (70/30 Formula)</h1>
          <p className="page-subtitle">
            Grade students individually as they complete exams, or select multiple to save together.
          </p>
        </div>
        {selectedIds.size > 0 && (
          <Button 
            icon={Save} 
            onClick={handleSaveSelected} 
            loading={saving} 
            variant="primary"
          >
            Save Selected Grades ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      {students.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <Card style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Total Enrolled</p>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{totalStudents} Students</h3>
            </div>
          </Card>

          <Card style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Needs Grading</p>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#b45309' }}>{needsGradingList.length} Students</h3>
            </div>
          </Card>

          <Card style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Already Graded</p>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#15803d' }}>{gradedList.length} Students</h3>
            </div>
          </Card>
        </div>
      )}

      {/* Filter Selection Controls */}
      <Card style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <Field label="Program / Department *">
            <Select value={programId} onChange={e => {
              const pId = e.target.value;
              setProgramId(pId);
              setBatchId('');
              setSemesterId('');
              setCourseId('');
            }}>
              <option value="">-- All Programs --</option>
              {programs.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
            </Select>
          </Field>

          <Field label="Cohort / Batch *">
            <Select value={batchId} onChange={e => {
              const bId = e.target.value;
              setBatchId(bId);
              setSemesterId('');
              setCourseId('');
              if (bId && bId !== 'none') {
                const bObj = batches.find(b => b.id === bId);
                if (bObj?.programId && !programId) {
                  setProgramId(bObj.programId);
                }
              }
            }}>
              <option value="">-- Select Batch --</option>
              <option value="none">-- Rolling Admissions (No Batch) --</option>
              {filteredBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>

          <Field label="Semester (Optional)">
            <Select value={semesterId} onChange={e => {
              setSemesterId(e.target.value);
              setCourseId('');
            }} disabled={!batchId}>
              <option value="">-- All Semesters --</option>
              {filteredSemesters.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name || s.term}</option>)}
            </Select>
          </Field>

          <Field label="Subject / Course *">
            <Select value={courseId} onChange={e => setCourseId(e.target.value)} disabled={!batchId}>
              <option value="">-- Select Course --</option>
              {filteredCourses.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.title}</option>)}
            </Select>
          </Field>

          <Button icon={Search} onClick={handleLoad} loading={loading} disabled={!batchId || !courseId} variant="primary">
            Load Class List
          </Button>
        </div>
      </Card>


      {/* Tabs Filter */}
      {students.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <Tabs
            tabs={[
              { key: 'needs_grading', label: 'Needs Grading', count: needsGradingList.length },
              { key: 'already_graded', label: 'Already Graded', count: gradedList.length },
              { key: 'all', label: 'All Students', count: students.length },
            ]}
            active={activeTab}
            onChange={(tab) => {
              setActiveTab(tab);
              setPage(1);
            }}
          />
        </div>
      )}

      {/* Grades Table */}
      <DataTable
        loading={loading}
        emptyLabel={
          activeTab === 'needs_grading'
            ? "🎉 All caught up! No students currently need grading for this course."
            : activeTab === 'already_graded'
            ? "No students have been graded yet."
            : "No students found for this batch/course selection."
        }
        columns={[
          {
            key: 'select',
            header: (
              <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={toggleSelectAllCurrent}>
                <input 
                  type="checkbox" 
                  checked={isAllCurrentSelected} 
                  onChange={() => {}} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }} 
                />
              </div>
            ),
            width: '40px',
            render: (r) => (
              <input 
                type="checkbox" 
                checked={selectedIds.has(r.studentId)} 
                onChange={() => toggleSelectOne(r.studentId)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
            )
          },
          { 
            key: 'name', 
            header: 'Student Name', 
            render: (r) => (
              <div>
                <strong style={{ color: 'var(--color-primary-800)', display: 'block' }}>{r.student?.firstName} {r.student?.lastName}</strong>
                <span className="text-muted" style={{ fontSize: '12px' }}>{r.student?.email}</span>
              </div>
            )
          },
          { 
            key: 'assignment', 
            header: `Automated Assessment (70%)${isOrgAdmin ? ' (Editable)' : ''}`, 
            render: (r) => isOrgAdmin ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="number" 
                  max="70" 
                  min="0"
                  value={r.assignmentScore ?? ''} 
                  onChange={(e) => handleGradeChange(r.studentId, 'assignmentScore', e.target.value)}
                  style={{ width: '80px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}
                  placeholder="Max 70"
                />
                <span style={{ fontSize: '12px', color: '#64748b' }}>/ 70</span>
              </div>
            ) : (
              <span style={{ fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '4px 10px', borderRadius: '6px' }}>
                {r.assignmentScore || 0} / 70
              </span>
            ) 
          },
          { 
            key: 'exam', 
            header: 'Faculty Manual Entry (30%)', 
            render: (r) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="number" 
                  max="30" 
                  min="0"
                  value={r.finalExamScore ?? ''} 
                  onChange={(e) => handleGradeChange(r.studentId, 'finalExamScore', e.target.value)}
                  style={{ width: '80px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}
                  placeholder="Max 30"
                />
                <span style={{ fontSize: '12px', color: '#64748b' }}>/ 30</span>
              </div>
            ) 
          },
          { 
            key: 'total', 
            header: 'Composite Total (100)', 
            render: (r) => {
              const total = calculateTotal(r.assignmentScore, r.finalExamScore);
              const letter = calculateGradeLetter(total);
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '15px', color: '#0f172a' }}>{total}</strong>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 800, background: total >= 50 ? '#dcfce7' : '#fee2e2', color: total >= 50 ? '#15803d' : '#b91c1c' }}>
                    {letter}
                  </span>
                </div>
              );
            }
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              r.isGraded 
                ? <StatusBadge status="COMPLETED" label="GRADED" tone="success" />
                : <StatusBadge status="WARNING" label="PENDING" tone="amber" />
            )
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (r) => (
              <Button
                size="sm"
                icon={Save}
                loading={savingId === r.studentId}
                variant={r.isGraded ? "outline" : "primary"}
                onClick={() => handleSaveSingle(r)}
              >
                {r.isGraded ? 'Update' : 'Save Grade'}
              </Button>
            )
          }
        ]}
        rows={paginatedStudents}
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={currentTabStudents.length}
        onChange={setPage}
      />
    </div>
  );
};

export default ManualGradesPage;

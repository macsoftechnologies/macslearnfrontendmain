import React, { useState, useEffect } from 'react';
import { 
  Video, Calendar, Clock, Plus, Users, CheckCircle2, XCircle, 
  Trash2, Pencil, ExternalLink, Search, Filter, BookOpen, 
  FolderTree, AlertCircle, Check, X, UserCheck, User, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as liveSessionsApi from '../../api/liveSessions';
import * as batchesApi from '../../api/academicBatches';
import * as coursesApi from '../../api/courses';
import * as usersApi from '../../api/users';
import * as studentsApi from '../../api/students';
import client, { extractErrorMessages } from '../../api/client';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Input, { Field, Select, Textarea } from '../../components/ui/Input';
import StatusBadge from '../../components/ui/StatusBadge';
import PageLoader from '../../components/ui/PageLoader';
import EmptyState from '../../components/ui/EmptyState';

export default function LiveSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [allStudents, setAllStudents] = useState([]);

  // Filters
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Schedule Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [form, setForm] = useState({
    meetingType: 'BATCH', // 'BATCH' | 'SINGLE_STUDENT'
    batchId: '',
    courseId: '',
    facultyId: '',
    studentId: '',
    sessionNumber: 1,
    title: '',
    scheduledDate: '',
    scheduledTime: '07:00 PM',
    meetingUrl: '',
    agenda: '',
  });
  const [saving, setSaving] = useState(false);

  // Attendance Modal
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [targetSession, setTargetSession] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [presentMap, setPresentMap] = useState({});
  const [studentSearch, setStudentSearch] = useState('');
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);

  const extractArray = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessRes, batchRes, courseRes, facRes, stuRes] = await Promise.all([
        liveSessionsApi.list({ 
          batchId: selectedBatch || undefined, 
          courseId: selectedCourse || undefined 
        }).catch(() => []),
        batchesApi.list().catch(() => []),
        coursesApi.list({ limit: 200 }).catch(() => []),
        usersApi.list({ role: 'FACULTY', limit: 100 }).catch(() => []),
        studentsApi.list({ limit: 200 }).catch(() => [])
      ]);

      setSessions(extractArray(sessRes));
      setBatches(extractArray(batchRes));
      setCourses(extractArray(courseRes));
      setFaculties(extractArray(facRes));
      setAllStudents(extractArray(stuRes));
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBatch, selectedCourse]);

  const openScheduleModal = (session = null) => {
    if (session) {
      setEditingSession(session);
      setForm({
        meetingType: session.meetingType || (session.studentId ? 'SINGLE_STUDENT' : 'BATCH'),
        batchId: session.batchId || '',
        courseId: session.courseId || '',
        facultyId: session.facultyId || '',
        studentId: session.studentId || '',
        sessionNumber: session.sessionNumber || 1,
        title: session.title || '',
        scheduledDate: session.scheduledDate ? new Date(session.scheduledDate).toISOString().split('T')[0] : '',
        scheduledTime: session.scheduledTime || '07:00 PM',
        meetingUrl: session.meetingUrl || '',
        agenda: session.agenda || '',
      });
    } else {
      setEditingSession(null);
      client.get('/organizations/me').then(res => {
        const defUrl = res.data?.data?.zoomConfig?.defaultMeetingUrl || '';
        setForm({
          meetingType: 'BATCH',
          batchId: selectedBatch || (batches[0]?.id || batches[0]?._id || ''),
          courseId: selectedCourse || (courses[0]?.id || courses[0]?._id || ''),
          facultyId: '',
          studentId: '',
          sessionNumber: 1,
          title: 'Subject Live Call 1 of 5',
          scheduledDate: new Date().toISOString().split('T')[0],
          scheduledTime: '07:00 PM',
          meetingUrl: defUrl,
          agenda: '',
        });
      }).catch(() => {
        setForm({
          meetingType: 'BATCH',
          batchId: selectedBatch || (batches[0]?.id || batches[0]?._id || ''),
          courseId: selectedCourse || (courses[0]?.id || courses[0]?._id || ''),
          facultyId: '',
          studentId: '',
          sessionNumber: 1,
          title: 'Subject Live Call 1 of 5',
          scheduledDate: new Date().toISOString().split('T')[0],
          scheduledTime: '07:00 PM',
          meetingUrl: '',
          agenda: '',
        });
      });
    }
    setModalOpen(true);
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    if (!form.scheduledDate || !form.scheduledTime) {
      toast.error('Please enter Scheduled Date and Time.');
      return;
    }
    if (form.meetingType === 'SINGLE_STUDENT' && !form.studentId) {
      toast.error('Please select a student for 1-on-1 meeting.');
      return;
    }
    if (form.meetingType === 'BATCH' && !form.batchId && !form.courseId) {
      toast.error('Please select a Cohort / Batch or Course.');
      return;
    }

    setSaving(true);
    try {
      if (editingSession) {
        await liveSessionsApi.update(editingSession.id || editingSession._id, form);
        toast.success('Live call updated successfully');
      } else {
        await liveSessionsApi.create(form);
        toast.success('Live call scheduled successfully by Admin!');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await liveSessionsApi.remove(deleteTarget.id || deleteTarget._id);
      toast.success('Session deleted successfully');
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    }
  };

  const openAttendanceModal = async (session) => {
    setTargetSession(session);
    setAttendanceModalOpen(true);
    setRosterLoading(true);
    setStudentSearch('');

    try {
      const rosterRes = await liveSessionsApi.getBatchRoster(session.batchId, session.courseId).catch(() => []);
      let rosterList = extractArray(rosterRes);

      // If single student session
      if (session.studentId && session.meetingType === 'SINGLE_STUDENT') {
        const singleStu = allStudents.find(s => (s.id || s._id) === session.studentId);
        if (singleStu) {
          rosterList = [{
            id: singleStu.id || singleStu._id,
            fullName: singleStu.fullName,
            email: singleStu.email,
            mobile: singleStu.mobile,
          }];
        }
      }

      setRoster(rosterList);
      const existingAttendees = Array.isArray(session.attendees) ? session.attendees : [];
      const pMap = {};
      rosterList.forEach(st => {
        pMap[st.id] = existingAttendees.includes(st.id);
      });
      setPresentMap(pMap);
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    } finally {
      setRosterLoading(false);
    }
  };

  const toggleStudentAttendance = (studentId) => {
    setPresentMap(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const markAll = (status) => {
    const pMap = {};
    roster.forEach(st => {
      pMap[st.id] = status;
    });
    setPresentMap(pMap);
  };

  const handleSaveAttendance = async () => {
    if (!targetSession) return;
    setSavingAttendance(true);

    const attendeeStudentIds = Object.keys(presentMap || {}).filter(id => presentMap[id]);

    try {
      await liveSessionsApi.markAttendance(targetSession.id || targetSession._id, attendeeStudentIds);
      toast.success(`Attendance saved! ${attendeeStudentIds.length} of ${roster.length} students marked present.`);
      setAttendanceModalOpen(false);
      loadData();
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    } finally {
      setSavingAttendance(false);
    }
  };

  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const filteredSessions = safeSessions.filter(s => {
    if (!s) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    return true;
  });

  const safeRoster = Array.isArray(roster) ? roster : [];
  const filteredRoster = safeRoster.filter(s => {
    if (!s) return false;
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return s.fullName?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.mobile?.includes(q);
  });

  const totalPresentCount = Object.values(presentMap || {}).filter(Boolean).length;
  const attendanceRate = roster.length > 0 ? Math.round((totalPresentCount / roster.length) * 100) : 0;

  return (
    <div className="page stack" style={{ gap: '1.5rem' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="page-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Video size={16} color="var(--accent)" /> Virtual Classroom & Academics
          </span>
          <h1 className="page-title" style={{ margin: '0.2rem 0' }}>Live Sessions & Attendance Hub</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Admin schedules subject video calls (up to 5 calls per course), assigns faculty, and tracks student attendance.
          </p>
        </div>
        <Button icon={Plus} onClick={() => openScheduleModal()}>
          Schedule Live Call
        </Button>
      </div>

      {/* FILTER BAR */}
      <Card style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Filter by Cohort / Batch:
            </label>
            <Select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
              <option value="">All Cohorts / Batches</option>
              {batches.map(b => (
                <option key={b.id || b._id} value={b.id || b._id}>{b.name || `Batch ${b.id}`}</option>
              ))}
            </Select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Filter by Subject / Course:
            </label>
            <Select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
              <option value="">All Subjects / Courses</option>
              {courses.map(c => (
                <option key={c.id || c._id} value={c.id || c._id}>{c.title}</option>
              ))}
            </Select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Status:
            </label>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* SESSIONS LIST */}
      {loading ? (
        <PageLoader />
      ) : filteredSessions.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No Live Sessions Found"
          description="Schedule your first subject call or adjust your filters above."
          action={<Button icon={Plus} onClick={() => openScheduleModal()}>Schedule Call</Button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {filteredSessions.map((session) => {
            const isCompleted = session.status === 'COMPLETED';
            const attCount = session.attendeeCount || (session.attendees ? session.attendees.length : 0);
            const isSingleStudent = session.meetingType === 'SINGLE_STUDENT' || !!session.studentId;

            return (
              <Card 
                key={session.id || session._id} 
                style={{ 
                  padding: '1.5rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  gap: '1rem',
                  borderTop: isCompleted ? '4px solid #10b981' : '4px solid var(--accent, #6366f1)',
                  position: 'relative'
                }}
              >
                <div>
                  {/* Card Top: Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        padding: '4px 10px', 
                        borderRadius: '999px', 
                        background: 'var(--color-primary-50, rgba(99,102,241,0.1))',
                        color: 'var(--accent, #6366f1)',
                      }}>
                        {isSingleStudent ? '1-ON-1 CALL' : `CALL ${session.sessionNumber || 1} OF 5`}
                      </span>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 600, 
                        padding: '3px 8px', 
                        borderRadius: '6px', 
                        background: '#f1f5f9', 
                        color: '#475569' 
                      }}>
                        Hosted by Admin
                      </span>
                    </div>
                    <StatusBadge status={session.status} />
                  </div>

                  {/* Title & Subject */}
                  <h3 style={{ fontSize: '1.15rem', margin: '0 0 0.4rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                    {session.title || `Subject Call ${session.sessionNumber || 1}`}
                  </h3>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                    <BookOpen size={15} color="var(--accent)" /> {session.courseTitle || 'Course'}
                  </div>

                  {/* Faculty & Audience Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                    {session.facultyName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4f46e5', fontWeight: 600 }}>
                        <Users size={14} /> Faculty: {session.facultyName}
                      </div>
                    )}
                    {isSingleStudent ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <User size={14} /> Student: {session.targetStudentName || 'Single Student'}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FolderTree size={14} /> Cohort: {session.batchName || 'All Students'}
                      </div>
                    )}
                  </div>

                  {/* Date & Time Info Box */}
                  <div style={{ 
                    background: 'var(--bg-surface-muted, #f8fafc)', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.88rem'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      <Calendar size={15} color="var(--accent)" />
                      {session.scheduledDate ? new Date(session.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                      <Clock size={15} />
                      {session.scheduledTime || 'TBD'}
                    </span>
                  </div>

                  {/* Attendance Summary */}
                  <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={16} color={attCount > 0 ? '#10b981' : 'var(--text-muted)'} />
                      Attendance:
                    </span>
                    {attCount > 0 ? (
                      <span style={{ fontWeight: 700, color: '#10b981' }}>
                        {attCount} Present ✓
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Pending recording
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle, #e2e8f0)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {session.meetingUrl ? (
                      <a 
                        href={session.meetingUrl.startsWith('http') ? session.meetingUrl : `https://${session.meetingUrl}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ textDecoration: 'none' }}
                      >
                        <Button variant="outline" size="sm" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <ExternalLink size={14} /> Join Meeting
                        </Button>
                      </a>
                    ) : (
                      <Button variant="outline" size="sm" disabled style={{ width: '100%' }}>
                        No Link
                      </Button>
                    )}

                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => openAttendanceModal(session)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        gap: '6px',
                        background: isCompleted ? '#059669' : undefined
                      }}
                    >
                      <UserCheck size={14} /> {isCompleted ? 'Edit Attendance' : 'Mark Attendance'}
                    </Button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      icon={Pencil} 
                      onClick={() => openScheduleModal(session)}
                      title="Edit Call Details"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      icon={Trash2} 
                      onClick={() => setDeleteTarget(session)}
                      title="Delete Call"
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* SCHEDULE / EDIT MODAL */}
      <Modal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editingSession ? "Edit Live Call" : "Admin: Schedule Live Call"}
        width={600}
      >
        <form onSubmit={handleSaveSession} className="stack" style={{ gap: '1.25rem' }}>
          {/* Target Audience Scope */}
          <div style={{ background: 'var(--bg-surface-muted, #f8fafc)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
              Meeting Audience Type:
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                <input 
                  type="radio" 
                  name="meetingType" 
                  value="BATCH" 
                  checked={form.meetingType === 'BATCH'} 
                  onChange={(e) => setForm(f => ({ ...f, meetingType: e.target.value }))}
                />
                👥 Cohort / Batch (All Students)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                <input 
                  type="radio" 
                  name="meetingType" 
                  value="SINGLE_STUDENT" 
                  checked={form.meetingType === 'SINGLE_STUDENT'} 
                  onChange={(e) => setForm(f => ({ ...f, meetingType: e.target.value }))}
                />
                👤 1-on-1 with Single Student
              </label>
            </div>
          </div>

          {/* Conditional Dropdown for Single Student vs Batch */}
          {form.meetingType === 'SINGLE_STUDENT' ? (
            <Field label="Select Student (1-on-1 Target)" required>
              <Select 
                value={form.studentId} 
                onChange={(e) => setForm(f => ({ ...f, studentId: e.target.value }))}
                required
              >
                <option value="">-- Choose Student --</option>
                {allStudents.map(s => (
                  <option key={s.id || s._id} value={s.id || s._id}>
                    {s.fullName} ({s.email})
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Cohort / Batch" required>
              <Select 
                value={form.batchId} 
                onChange={(e) => setForm(f => ({ ...f, batchId: e.target.value }))}
                required
              >
                <option value="">-- Select Cohort / Batch --</option>
                {batches.map(b => (
                  <option key={b.id || b._id} value={b.id || b._id}>{b.name || `Batch ${b.id}`}</option>
                ))}
              </Select>
            </Field>
          )}

          {/* Subject & Optional Faculty */}
          <div className="form-grid">
            <Field label="Subject / Course">
              <Select 
                value={form.courseId} 
                onChange={(e) => setForm(f => ({ ...f, courseId: e.target.value }))}
              >
                <option value="">-- Select Subject / Course (Optional) --</option>
                {courses.map(c => (
                  <option key={c.id || c._id} value={c.id || c._id}>{c.title}</option>
                ))}
              </Select>
            </Field>

            <Field label="Assign Faculty (Optional)">
              <Select 
                value={form.facultyId} 
                onChange={(e) => setForm(f => ({ ...f, facultyId: e.target.value }))}
              >
                <option value="">-- None (Admin Only Host) --</option>
                {faculties.map(fac => (
                  <option key={fac.id || fac._id} value={fac.id || fac._id}>
                    {fac.fullName || fac.email}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: '120px 1fr' }}>
            <Field label="Call Number">
              <Select 
                value={form.sessionNumber} 
                onChange={(e) => {
                  const num = Number(e.target.value);
                  setForm(f => ({ 
                    ...f, 
                    sessionNumber: num,
                    title: f.title.includes('Call') ? `Subject Live Call ${num} of 5` : f.title
                  }));
                }}
              >
                <option value={1}>Call 1 of 5</option>
                <option value={2}>Call 2 of 5</option>
                <option value={3}>Call 3 of 5</option>
                <option value={4}>Call 4 of 5</option>
                <option value={5}>Call 5 of 5</option>
              </Select>
            </Field>

            <Field label="Session Title / Topic" required>
              <Input 
                value={form.title} 
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Q&A and Doctrine Review"
                required
              />
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Scheduled Date" required>
              <Input 
                type="date" 
                value={form.scheduledDate} 
                onChange={(e) => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                required
              />
            </Field>

            <Field label="Scheduled Time" required>
              <Input 
                value={form.scheduledTime} 
                onChange={(e) => setForm(f => ({ ...f, scheduledTime: e.target.value }))}
                placeholder="e.g. 07:00 PM"
                required
              />
            </Field>
          </div>

          <Field label="Meeting URL (Zoom / Virtual Classroom)">
            <Input 
              value={form.meetingUrl} 
              onChange={(e) => setForm(f => ({ ...f, meetingUrl: e.target.value }))}
              placeholder="https://zoom.us/j/1234567890"
            />
          </Field>

          <Field label="Agenda / Topics for Discussion">
            <Textarea 
              rows={3} 
              value={form.agenda} 
              onChange={(e) => setForm(f => ({ ...f, agenda: e.target.value }))}
              placeholder="Key topics, preparation guidelines, or discussion points..."
            />
          </Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editingSession ? "Save Changes" : "Schedule Call"}</Button>
          </div>
        </form>
      </Modal>

      {/* ATTENDANCE SHEET MODAL */}
      <Modal
        open={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        title={`Mark Attendance - ${targetSession?.title || 'Live Session'}`}
        width={720}
      >
        <div className="stack" style={{ gap: '1.25rem' }}>
          <div style={{ 
            background: 'var(--bg-surface-muted, #f8fafc)', 
            padding: '1rem 1.25rem', 
            borderRadius: '10px', 
            border: '1px solid var(--border-subtle, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Session Details</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                {targetSession?.courseTitle} • {targetSession?.meetingType === 'SINGLE_STUDENT' ? `1-on-1: ${targetSession?.targetStudentName || 'Student'}` : targetSession?.batchName}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{roster.length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Students</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{totalPresentCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Present</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>{roster.length - totalPresentCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>Absent</div>
              </div>
              <div style={{ textAlign: 'center', paddingLeft: '0.5rem', borderLeft: '1px solid var(--border-subtle, #e2e8f0)' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent, #6366f1)' }}>{attendanceRate}%</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rate</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
              <Input 
                value={studentSearch} 
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search student by name, email..."
                style={{ paddingLeft: '32px' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button size="sm" variant="outline" onClick={() => markAll(true)} style={{ color: '#10b981', borderColor: '#10b981' }}>
                ✓ Mark All Present
              </Button>
              <Button size="sm" variant="outline" onClick={() => markAll(false)} style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                ✗ Mark All Absent
              </Button>
            </div>
          </div>

          {rosterLoading ? (
            <div style={{ padding: '2rem 0', textAlign: 'center' }}>
              <PageLoader />
            </div>
          ) : filteredRoster.length === 0 ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              No enrolled students found.
            </div>
          ) : (
            <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
              {filteredRoster.map((student, idx) => {
                const isPresent = !!presentMap[student.id];

                return (
                  <div
                    key={student.id}
                    onClick={() => toggleStudentAttendance(student.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: isPresent ? '1.5px solid #10b981' : '1.5px solid var(--border-subtle, #e2e8f0)',
                      background: isPresent ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-surface-muted, #f8fafc)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', minWidth: '20px' }}>
                        {idx + 1}.
                      </span>
                      {student.photo ? (
                        <img 
                          src={student.photo} 
                          alt="" 
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '50%', 
                          background: isPresent ? '#10b981' : 'var(--border-subtle, #cbd5e1)', 
                          color: '#fff', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}>
                          {student.fullName ? student.fullName.charAt(0).toUpperCase() : 'S'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {student.fullName || 'Student'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {student.email} {student.mobile ? `• ${student.mobile}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleStudentAttendance(student.id); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '999px',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          border: 'none',
                          cursor: 'pointer',
                          background: isPresent ? '#10b981' : '#fee2e2',
                          color: isPresent ? '#ffffff' : '#b91c1c',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isPresent ? (
                          <>
                            <Check size={14} strokeWidth={3} /> PRESENT
                          </>
                        ) : (
                          <>
                            <X size={14} strokeWidth={3} /> ABSENT
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle, #e2e8f0)' }}>
            <Button variant="outline" onClick={() => setAttendanceModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveAttendance} loading={savingAttendance}>
              Save Attendance Record ({totalPresentCount} Present)
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Live Session"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? All attendance records for this session will be removed.`}
        confirmLabel="Delete Session"
        danger
      />
    </div>
  );
}

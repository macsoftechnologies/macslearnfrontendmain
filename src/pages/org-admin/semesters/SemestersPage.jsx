import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, GraduationCap, ChevronRight, ArrowLeft, Sparkles, BookPlus, RotateCcw, AlertTriangle, CheckCircle2, XCircle, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import DataTable from '../../../components/ui/DataTable';
import Modal from '../../../components/ui/Modal';
import Input, { Field } from '../../../components/ui/Input';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import * as semestersApi from '../../../api/semesters';
import * as programsApi from '../../../api/programs';
import * as coursesApi from '../../../api/courses';

const SemestersPage = () => {
  const [semesters, setSemesters] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeProgram, setActiveProgram] = useState(null);

  // Modal & edit states
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    programId: '', 
    passingPercentage: 70,
    internalWeightage: 65,
    attendanceWeightage: 5,
    finalExamWeightage: 30,
    totalSubjects: 5,
    requiredInteractions: 25,
  });

  const [bulkSemesters, setBulkSemesters] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Manage Assigned Courses Modal & Confirmation
  const [manageCoursesModal, setManageCoursesModal] = useState({ open: false, semester: null });
  const [rolloverModal, setRolloverModal] = useState({ open: false, semester: null, summary: null, loading: false, executing: false });
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [savingCourses, setSavingCourses] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const fetchSemesters = async () => {
    setLoading(true);
    try {
      const res = await semestersApi.list();
      setSemesters(res.data || []);
    } catch (err) {
      toast.error('Failed to load semesters');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await coursesApi.list({ limit: 100 });
      setCourses(res.data?.data || res.data || []);
    } catch (err) {}
  };

  useEffect(() => {
    fetchSemesters();
    fetchCourses();
    programsApi.list().then(res => setPrograms(res.data || [])).catch(() => {});
  }, []);

  const currentProgramSemesters = activeProgram 
    ? semesters.filter(s => s.programId === activeProgram.id)
    : [];

  const openGenerateModal = (program) => {
    setEditId(null);
    const prog = program || activeProgram;
    if (!prog) return;

    const isDmin = /ministry|dmin/i.test(prog.name);
    const totalSems = prog.totalSemesters || 6;

    const generated = Array.from({ length: totalSems }, (_, i) => ({
      name: 'Semester ' + (i + 1),
      term: 'Semester ' + (i + 1),
      semesterNumber: i + 1,
      programId: prog.id,
      passingPercentage: 70,
      internalWeightage: isDmin ? 55 : 65,
      attendanceWeightage: 5,
      finalExamWeightage: isDmin ? 40 : 30,
      totalSubjects: isDmin ? 4 : 5,
      requiredInteractions: isDmin ? 4 : 25,
    }));

    setBulkSemesters(generated);
    setModalOpen(true);
  };

  const handleBulkChange = (index, field, value) => {
    const updated = [...bulkSemesters];
    updated[index][field] = value;
    setBulkSemesters(updated);
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await semestersApi.update(editId, formData);
        toast.success('Semester updated successfully');
      } else {
        if (bulkSemesters.length === 0) {
          toast.error('No semesters to generate');
          return;
        }
        await semestersApi.createBulk(bulkSemesters);
        toast.success(bulkSemesters.length + ' Semesters created for ' + (activeProgram?.name || 'Program') + '!');
      }
      setModalOpen(false);
      fetchSemesters();
    } catch (err) {
      toast.error('Failed to save semesters');
    }
  };

  const openEdit = (semester) => {
    setEditId(semester.id);
    setFormData({ 
      name: semester.name, 
      programId: semester.programId, 
      passingPercentage: semester.passingPercentage || 70,
      internalWeightage: semester.internalWeightage || 65,
      attendanceWeightage: semester.attendanceWeightage || 5,
      finalExamWeightage: semester.finalExamWeightage || 30,
      totalSubjects: semester.totalSubjects || 5,
      requiredInteractions: semester.requiredInteractions || 25,
    });
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await semestersApi.remove(deleteTarget.id);
      toast.success('Semester deleted');
      setDeleteTarget(null);
      fetchSemesters();
    } catch (err) {
      toast.error('Failed to delete semester');
    }
  };

  
  const openRolloverModal = async (semester) => {
    setRolloverModal({ open: true, semester, summary: null, loading: true, executing: false });
    try {
      const summary = await semestersApi.getSummary(semester.id);
      setRolloverModal(prev => ({ ...prev, summary: summary?.data || summary, loading: false }));
    } catch (err) {
      toast.error('Failed to load semester summary');
      setRolloverModal(prev => ({ ...prev, loading: false }));
    }
  };

  const executeRolloverHandler = async () => {
    if (!rolloverModal.semester) return;
    setRolloverModal(prev => ({ ...prev, executing: true }));
    try {
      const res = await semestersApi.executeRollover(rolloverModal.semester.id);
      toast.success(res?.message || 'Semester rolled over successfully! Students advanced to next term.');
      setRolloverModal({ open: false, semester: null, summary: null, loading: false, executing: false });
      await fetchSemesters();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to execute rollover');
      setRolloverModal(prev => ({ ...prev, executing: false }));
    }
  };

  // Open Course Assignment modal
  const openManageCourses = (semester) => {
    const currentCourseIds = semester.courseIds && semester.courseIds.length > 0
      ? semester.courseIds
      : courses.filter(c => c.semesterId === semester.id).map(c => c.id || c._id);

    setSelectedCourseIds([...currentCourseIds]);
    setManageCoursesModal({ open: true, semester });
  };

  const toggleCourseSelect = (courseId) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const confirmAndSaveCourses = async () => {
    if (!manageCoursesModal.semester || !activeProgram) return;
    setSavingCourses(true);
    const semesterId = manageCoursesModal.semester.id;
    const progId = activeProgram.id;

    try {
      const previouslyAssigned = manageCoursesModal.semester.courseIds || [];

      const toAdd = selectedCourseIds.filter(id => !previouslyAssigned.includes(id));
      const toRemove = previouslyAssigned.filter(id => !selectedCourseIds.includes(id));

      for (const cId of toAdd) {
        await semestersApi.linkCourse(semesterId, cId, progId);
      }
      for (const cId of toRemove) {
        await semestersApi.unlinkCourse(semesterId, cId, progId);
      }

      toast.success('Assigned courses updated successfully');
      setShowSaveConfirm(false);
      setManageCoursesModal({ open: false, semester: null });
      await fetchSemesters();
      await fetchCourses();
    } catch (err) {
      toast.error('Failed to update assigned courses');
    } finally {
      setSavingCourses(false);
    }
  };

  return (
    <div className="page stack" style={{ gap: 'var(--sp-6)' }}>
      {/* HEADER / BREADCRUMB */}
      <div className="page-head">
        <div>
          {activeProgram ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => setActiveProgram(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', fontWeight: 600, padding: 0 }}
              >
                <ArrowLeft size={16} /> All Programs
              </button>
              <span style={{ color: 'var(--text-muted)' }}>/</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{activeProgram.name}</span>
            </div>
          ) : (
            <span className="page-eyebrow">Curriculum Structure</span>
          )}

          <h1 className="page-title">
            {activeProgram ? activeProgram.name + ' — Semesters & Subjects' : 'Program Semesters & Curriculum'}
          </h1>
          <p className="page-subtitle">
            {activeProgram 
              ? 'Assign courses and configure evaluation criteria for each semester term.'
              : 'Select a program below to view and assign courses to its semesters.'}
          </p>
        </div>

        {activeProgram && (
          <Button icon={Plus} onClick={() => openGenerateModal(activeProgram)}>
            Generate Semesters
          </Button>
        )}
      </div>

      {/* LEVEL 1: ALL PROGRAMS CARDS */}
      {!activeProgram ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {programs.map((prog) => {
            const progSems = semesters.filter(s => s.programId === prog.id);
            const isConfigured = progSems.length > 0;
            const isDmin = /ministry|dmin/i.test(prog.name);

            return (
              <div 
                key={prog.id} 
                style={{ 
                  background: 'var(--bg-surface-card)', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: '12px', 
                  padding: '1.5rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ padding: '8px', background: 'var(--bg-surface-muted)', borderRadius: '8px', color: 'var(--primary)' }}>
                      <GraduationCap size={24} />
                    </div>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      background: isConfigured ? '#dcfce7' : '#fef3c7', 
                      color: isConfigured ? '#15803d' : '#b45309' 
                    }}>
                      {isConfigured ? (progSems.length + ' Semesters Configured') : 'Setup Pending'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
                    {prog.name}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
                    {prog.degreeTitle || 'Theological Degree'}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: '8px', fontSize: '0.82rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Duration</span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {prog.maxDurationYears ? `${prog.maxDurationYears} Years` : (prog.totalSemesters ? `${Math.ceil(prog.totalSemesters / 2)} Years` : '3 Years')}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Total Subjects</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{prog.totalSubjects || 30} Courses</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Pass Mark</span>
                      <strong style={{ color: 'var(--success)' }}>70% Required</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Weightage</span>
                      <strong style={{ color: 'var(--text-secondary)' }}>{isDmin ? '55 / 5 / 40' : '65 / 5 / 30'}</strong>
                    </div>
                  </div>
                </div>

                <Button 
                  variant={isConfigured ? 'outline' : 'primary'} 
                  onClick={() => setActiveProgram(prog)} 
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {isConfigured ? 'View & Manage Semesters' : 'Configure Semesters'} <ChevronRight size={16} />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        /* LEVEL 2: PROGRAM SEMESTERS & ASSIGNED COURSES */
        <div className="stack" style={{ gap: '1.25rem' }}>
          <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-surface-muted)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{activeProgram.name}</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                Total Semesters: {activeProgram.totalSemesters} | Total Subjects: {activeProgram.totalSubjects} | Pass Threshold: 70%
              </div>
            </div>
            {currentProgramSemesters.length === 0 && (
              <Button icon={Sparkles} onClick={() => openGenerateModal(activeProgram)}>
                Auto-Generate All {activeProgram.totalSemesters} Semesters
              </Button>
            )}
          </div>

          <DataTable
            loading={loading}
            emptyLabel={'No semesters created yet for ' + activeProgram.name + '. Click "Generate Semesters" to configure.'}
            columns={[
              { 
                key: 'name', 
                header: 'Semester',
                render: (r) => (
                  <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>
                    {r.name}
                  </span>
                )
              },
              { 
                key: 'assignedCourses', 
                header: 'Assigned Courses / Subjects',
                render: (r) => {
                  const assigned = courses.filter(c => {
                    const cId = c.id || c._id;
                    return (r.courseIds && r.courseIds.includes(cId)) || c.semesterId === r.id;
                  });
                  return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{assigned.length} Courses</span>
                        <Button size="xs" variant="ghost" icon={BookPlus} onClick={() => openManageCourses(r)}>
                          Manage
                        </Button>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 360, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {assigned.length > 0 ? assigned.map(c => c.title).join(', ') : 'No courses linked'}
                      </div>
                    </div>
                  );
                }
              },
              { 
                key: 'requiredInteractions', 
                header: 'Live Interactions', 
                render: (r) => (r.requiredInteractions || 25) + ' sessions'
              },
              {
                key: 'passingPercentage',
                header: 'Pass Mark',
                render: (r) => (
                  <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                    {r.passingPercentage || 70}%
                  </span>
                )
              },
              {
                key: 'weightage',
                header: 'Assessment Split',
                render: (r) => (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {r.internalWeightage || 65}% Int + {r.attendanceWeightage || 5}% Att + {r.finalExamWeightage || 30}% Final
                  </span>
                )
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (r) => (
                  <div className="row" style={{ gap: 'var(--sp-2)' }}>
                    <Button size="sm" variant="outline" icon={RotateCcw} onClick={() => openRolloverModal(r)} style={{ color: '#d97706', borderColor: '#fcd34d' }}>Close & Rollover</Button>
                    <Button size="sm" variant="ghost" icon={Edit} onClick={() => openEdit(r)}>Edit</Button>
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDeleteTarget(r)} style={{ color: 'var(--danger)' }}>Delete</Button>
                  </div>
                )
              }
            ]}
            rows={currentProgramSemesters}
          />
        </div>
      )}

      {/* MANAGE COURSES MODAL */}
      <Modal
        open={manageCoursesModal.open}
        onClose={() => setManageCoursesModal({ open: false, semester: null })}
        title={'Assign Courses to ' + (manageCoursesModal.semester?.name || 'Semester')}
        subtitle={'Select the subjects belonging to this term in ' + (activeProgram?.name || '')}
        width={680}
      >
        <div className="stack" style={{ gap: '1.25rem' }}>
          <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
            {(() => {
              const currentSemId = manageCoursesModal.semester?.id;
              
              // Get all course IDs already assigned to OTHER semesters of THIS program
              const otherSemestersCourseIds = new Set();
              currentProgramSemesters.forEach(s => {
                if (s.id !== currentSemId && s.courseIds) {
                  s.courseIds.forEach(id => otherSemestersCourseIds.add(id));
                }
              });

              // Available courses: all courses NOT already in other semesters of THIS program
              const availableCourses = courses.filter(c => {
                const cId = c.id || c._id;
                return !otherSemestersCourseIds.has(cId);
              });

              if (availableCourses.length === 0) {
                return <p className="text-muted" style={{ padding: '1rem', textAlign: 'center' }}>No unassigned courses available in catalog.</p>;
              }

              return availableCourses.map(c => {
                const cId = c.id || c._id;
                const isSelected = selectedCourseIds.includes(cId);
                return (
                  <div 
                    key={cId}
                    onClick={() => toggleCourseSelect(cId)}
                    style={{ 
                      padding: '0.75rem 1rem', 
                      borderRadius: '8px', 
                      border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-subtle)', 
                      background: isSelected ? 'var(--bg-surface-selected, #eff6ff)' : 'var(--bg-surface-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.92rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                        {c.title}
                      </strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Credits: {c.credits || 3} | Fee: INR {c.pricing?.amount || 6000}
                      </div>
                    </div>

                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => {}} 
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </div>
                );
              });
            })()}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary)' }}>
              {selectedCourseIds.length} Courses Selected
            </span>
            <div className="row" style={{ gap: '0.75rem' }}>
              <Button variant="outline" onClick={() => setManageCoursesModal({ open: false, semester: null })}>Cancel</Button>
              <Button variant="primary" onClick={() => setShowSaveConfirm(true)}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* CONFIRMATION POPUP BEFORE SAVING COURSE ASSIGNMENTS */}
      <ConfirmDialog
        open={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={confirmAndSaveCourses}
        title="Confirm Course Assignment"
        description={'Are you sure you want to update the assigned courses for ' + (manageCoursesModal.semester?.name || 'this semester') + ' (' + selectedCourseIds.length + ' courses selected)?'}
      />

      {/* CREATE / EDIT SEMESTER MODAL */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Edit Semester" : "Generate Semesters for " + (activeProgram?.name || 'Program')}
        subtitle={editId ? "Update semester criteria" : "Creates the fixed semester curriculum structure"}
        width={720}
      >
        <div className="stack" style={{ gap: '1.25rem' }}>
          {!editId ? (
            <div className="stack" style={{ gap: '1rem' }}>
              <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-surface-muted)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                <Sparkles size={16} color="var(--primary)" />
                <span>Ready to generate <strong>{bulkSemesters.length} permanent semesters</strong> with 5 subjects each and 70% passing mark.</span>
              </div>

              <div className="stack" style={{ gap: '0.75rem', maxHeight: 320, overflowY: 'auto', paddingRight: '0.25rem' }}>
                {bulkSemesters.map((s, idx) => (
                  <div key={idx} style={{ padding: '0.75rem 1rem', background: 'var(--bg-surface-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '120px 100px 110px 1fr', gap: '0.75rem', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.92rem' }}>{s.name}</strong>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>SUBJECTS</label>
                      <Input 
                        type="number" 
                        value={s.totalSubjects} 
                        onChange={(e) => handleBulkChange(idx, 'totalSubjects', parseInt(e.target.value))} 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>PASS MARK</label>
                      <Input 
                        type="number" 
                        value={s.passingPercentage} 
                        onChange={(e) => handleBulkChange(idx, 'passingPercentage', parseInt(e.target.value))} 
                      />
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {s.internalWeightage}% Int + {s.attendanceWeightage}% Att + {s.finalExamWeightage}% Final
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="stack" style={{ gap: '1rem' }}>
              <Field label="Semester Name" required>
                <Input value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} />
              </Field>

              <div className="form-grid">
                <Field label="Passing Percentage (%)" required>
                  <Input type="number" value={formData.passingPercentage} onChange={(e) => setFormData(f => ({ ...f, passingPercentage: parseInt(e.target.value) }))} />
                </Field>
                <Field label="Total Subjects in Semester">
                  <Input type="number" value={formData.totalSubjects} onChange={(e) => setFormData(f => ({ ...f, totalSubjects: parseInt(e.target.value) }))} />
                </Field>
              </div>

              <Field label="Required Live Interactions (25 per semester)">
                <Input type="number" value={formData.requiredInteractions} onChange={(e) => setFormData(f => ({ ...f, requiredInteractions: parseInt(e.target.value) }))} />
              </Field>

              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <Field label="Internal Weightage (%)">
                  <Input type="number" value={formData.internalWeightage} onChange={(e) => setFormData(f => ({ ...f, internalWeightage: parseInt(e.target.value) }))} />
                </Field>
                <Field label="Attendance Weightage (%)">
                  <Input type="number" value={formData.attendanceWeightage} onChange={(e) => setFormData(f => ({ ...f, attendanceWeightage: parseInt(e.target.value) }))} />
                </Field>
                <Field label="Final Exam Weightage (%)">
                  <Input type="number" value={formData.finalExamWeightage} onChange={(e) => setFormData(f => ({ ...f, finalExamWeightage: parseInt(e.target.value) }))} />
                </Field>
              </div>
            </div>
          )}

          <div className="row" style={{ justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={!editId && bulkSemesters.length === 0}>
              {editId ? 'Save Changes' : 'Create Curriculum Semesters'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Semester"
        description={'Are you sure you want to delete ' + (deleteTarget?.name || '') + '? This action cannot be undone.'}
      />
    
      {/* EVALUATE & CLOSE SEMESTER ROLLOVER MODAL */}
      <Modal
        open={rolloverModal.open}
        onClose={() => !rolloverModal.executing && setRolloverModal({ open: false, semester: null, summary: null, loading: false, executing: false })}
        title="Evaluate & Close Semester (Rollover)"
        subtitle={'Review student pass/fail counts and advance batch for ' + (rolloverModal.semester?.name || 'Semester')}
        width={720}
      >
        {rolloverModal.loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading semester evaluation summary...
          </div>
        ) : (
          <div className="stack" style={{ gap: '1.25rem' }}>
            <div style={{ padding: '1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.85rem', color: '#92400e', lineHeight: 1.5 }}>
                <strong>Important Rollover Action:</strong> Closing this semester will calculate cumulative results for all enrolled students (70% coursework + 30% exam). Students who pass will advance to the next semester. Any failed subjects will be queued into the <strong>Backlog Carousel</strong> to be retaken when the cycle loops back.
              </div>
            </div>

            {rolloverModal.summary && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ padding: '12px', background: 'var(--bg-surface-muted, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-subtle, #e2e8f0)', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enrolled Students</span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 800 }}>{rolloverModal.summary.totalEnrolledStudents || 0}</h3>
                  </div>
                  <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#166534' }}>Passed Subjects</span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 800, color: '#15803d' }}>{rolloverModal.summary.totalPassedSubjects || 0}</h3>
                  </div>
                  <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#991b1b' }}>Queued Backlogs</span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 800, color: '#b91c1c' }}>{rolloverModal.summary.totalBacklogSubjects || 0}</h3>
                  </div>
                </div>

                {rolloverModal.summary.students && rolloverModal.summary.students.length > 0 && (
                  <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-surface-muted, #f8fafc)', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px' }}>Student</th>
                          <th style={{ padding: '8px 12px' }}>Passed Courses</th>
                          <th style={{ padding: '8px 12px' }}>Backlogs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rolloverModal.summary.students.map((s, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{s.studentName}</td>
                            <td style={{ padding: '8px 12px', color: '#16a34a' }}>{s.passedCourses?.length || 0} passed</td>
                            <td style={{ padding: '8px 12px', color: s.backlogs?.length > 0 ? '#dc2626' : '#64748b' }}>
                              {s.backlogs?.length > 0 ? s.backlogs.length + ' queued' : 'None'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            <div className="row" style={{ justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button 
                variant="outline" 
                disabled={rolloverModal.executing}
                onClick={() => setRolloverModal({ open: false, semester: null, summary: null, loading: false, executing: false })}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                icon={RotateCcw} 
                loading={rolloverModal.executing}
                onClick={executeRolloverHandler}
                style={{ background: '#d97706', borderColor: '#b45309' }}
              >
                Confirm & Execute Rollover
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default SemestersPage;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Ban, Check, X, Video, Calendar, Clock, Award, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import usePagination from '../../hooks/usePagination';
import * as studentsApi from '../../api/students';
import * as programsApi from '../../api/programs';
import * as batchesApi from '../../api/academicBatches';
import * as semestersApi from '../../api/semesters';
import client from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import SearchBar from '../../components/ui/SearchBar';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Input, { Field, Select, Textarea } from '../../components/ui/Input';
import StudentDrawer from './StudentDrawer';

export default function Students() {
  const [tab, setTab] = useState('active'); // 'active' | 'pending'
  const [modalOpen, setModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  // Two-Stage Interview State
  const [interviewModalTarget, setInterviewModalTarget] = useState(null);
  const [interviewForm, setInterviewForm] = useState({
    zoomMeetingUrl: '',
    scheduledDate: '',
    scheduledTime: '',
    interviewerNotes: '',
  });

  // Final Approval State
  const [approveModalTarget, setApproveModalTarget] = useState(null);
  const [approvalForm, setApprovalForm] = useState({
    programId: '',
    batchId: '',
    semesterId: '',
    admissionNotes: '',
  });

  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const activeList = usePagination(studentsApi.list, { limit: 10 });
  const pendingList = usePagination(studentsApi.listPending, { limit: 10 });
  const list = tab === 'active' ? activeList : pendingList;
  const filteredBatches = approvalForm.programId
    ? batches.filter(b => b.programId === approvalForm.programId)
    : batches;

  useEffect(() => {
    // Load programs, batches, semesters for admission assignment
    programsApi.list().then(res => setPrograms(res?.data || res || [])).catch(() => {});
    batchesApi.list().then(res => setBatches(res?.data?.data || res?.data || res || [])).catch(() => {});
    semestersApi.list().then(res => setSemesters(res?.data || res || [])).catch(() => {});
    
    // Check default org zoom link
    client.get('/organizations/me').then(res => {
      const defaultUrl = res.data?.data?.zoomConfig?.defaultMeetingUrl || '';
      if (defaultUrl) {
        setInterviewForm(f => ({ ...f, zoomMeetingUrl: defaultUrl }));
      }
    }).catch(() => {});
  }, []);

  const openInterviewModal = (student) => {
    const details = student.interviewDetails || {};
    setInterviewForm({
      zoomMeetingUrl: details.zoomMeetingUrl || '',
      scheduledDate: details.scheduledDate || new Date().toISOString().split('T')[0],
      scheduledTime: details.scheduledTime || '10:00 AM',
      interviewerNotes: details.interviewerNotes || '',
    });
    setInterviewModalTarget(student);
  };

  const doScheduleInterview = async () => {
    if (!interviewForm.zoomMeetingUrl) {
      toast.error('Please enter a Zoom meeting URL');
      return;
    }
    try {
      await studentsApi.scheduleInterview(interviewModalTarget._id || interviewModalTarget.id, interviewForm);
      toast.success('Interview scheduled successfully! Meeting details updated.');
      setInterviewModalTarget(null);
      pendingList.refresh();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to schedule interview');
    }
  };

  
  const computeBatchOptionsForProgram = (prog) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const year = now.getFullYear();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    let primaryAutoBatch = '';
    const configuredOptions = [];

    const rcList = Array.isArray(prog?.regionConfigs) ? prog.regionConfigs : [];
    const matchedRc = rcList.find(c => c.hasFixedBatches && c.batchDateRanges?.length > 0) || rcList[0];

    if (matchedRc?.hasFixedBatches && matchedRc?.batchDateRanges?.length > 0) {
      matchedRc.batchDateRanges.forEach(range => {
        const sM = monthNames.indexOf(range.startMonth);
        const eM = monthNames.indexOf(range.endMonth);
        const bName = `${range.startMonth.slice(0, 3)} - ${range.endMonth.slice(0, 3)} ${year} Batch`;
        configuredOptions.push(bName);

        if (!primaryAutoBatch) {
          if (sM !== -1 && eM !== -1) {
            if (sM <= eM && currentMonth >= sM && currentMonth <= eM) {
              primaryAutoBatch = `${bName} (Auto)`;
            } else if (sM > eM && (currentMonth >= sM || currentMonth <= eM)) {
              primaryAutoBatch = `${bName} (Auto)`;
            }
          }
        }
      });
      if (!primaryAutoBatch && configuredOptions.length > 0) {
        primaryAutoBatch = `${configuredOptions[0]} (Auto)`;
      }
    }

    // Default seminary standard if no custom rules configured
    if (!primaryAutoBatch) {
      if (currentMonth >= 3 && currentMonth <= 7) {
        primaryAutoBatch = `Apr - Aug ${year} Batch (Auto)`;
      } else {
        primaryAutoBatch = `Sep - Mar ${year} Batch (Auto)`;
      }
    }

    return { primaryAutoBatch, configuredOptions };
  };

  const openApproveModal = (student) => {
    const rawProgVal = student.programId || student.customProfile?.interestedCourse || '';
    const prog = programs.find(p => 
      (p.id || p._id) === rawProgVal || 
      p.name?.toLowerCase().trim() === String(rawProgVal).toLowerCase().trim() ||
      p.name?.toLowerCase().trim() === String(student.customProfile?.interestedCourse || '').toLowerCase().trim()
    ) || programs[0] || null;

    const selectedProgId = prog ? (prog.id || prog._id) : '';
    const { primaryAutoBatch } = computeBatchOptionsForProgram(prog);

    setApprovalForm({
      programId: selectedProgId,
      batchId: student.batchId || '',
      semesterId: student.semesterId || '',
      admissionNotes: 'Interview cleared. Application approved.',
      autoBatchName: primaryAutoBatch,
    });
    setApproveModalTarget(student);
  };

  const doFinalApprove = async () => {
    try {
      await studentsApi.approve(approveModalTarget._id || approveModalTarget.id, approvalForm);
      toast.success('Student approved and enrolled successfully!');
      setApproveModalTarget(null);
      pendingList.refresh();
      activeList.refresh();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to approve student');
    }
  };

  const doReject = async () => {
    if (!rejectTarget) return;
    try {
      await studentsApi.reject(rejectTarget._id || rejectTarget.id, rejectReason);
      toast.success('Student application rejected');
      setRejectTarget(null);
      setRejectReason('');
      pendingList.refresh();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reject student');
    }
  };

  const doDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      const nextStatus = deactivateTarget.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
      await studentsApi.update(deactivateTarget._id || deactivateTarget.id, { status: nextStatus });
      toast.success(`Student ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`);
      setDeactivateTarget(null);
      activeList.refresh();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update student');
    }
  };

  return (
    <div className="page stack" style={{ gap: 'var(--sp-6)' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Students & Admissions</h1>
          <p className="page-subtitle">Manage enrolled students, curriculum tracks, and 2-stage admission interviews.</p>
        </div>
        {tab === 'active' && (
          <Button icon={Plus} onClick={() => setModalOpen(true)}>Add Student</Button>
        )}
      </div>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <Button variant={tab === 'active' ? 'primary' : 'ghost'} onClick={() => { setTab('active'); list.setPage(1); }}>
            Active Enrolled ({activeList.meta.totalItems})
          </Button>
          <Button variant={tab === 'pending' ? 'primary' : 'ghost'} onClick={() => { setTab('pending'); list.setPage(1); }}>
            Pending Admissions ({pendingList.meta.totalItems})
          </Button>
        </div>
        <div style={{ minWidth: 260 }}>
          <SearchBar value={list.search} onChange={list.setSearch} placeholder="Search by name, email…" />
        </div>
      </div>

      {tab === 'active' ? (
        <DataTable
          loading={activeList.loading}
          emptyLabel="No active students found."
          columns={[
            { key: 'fullName', header: 'Full Name' },
            { key: 'email', header: 'Email' },
            { 
              key: 'ataStatus', 
              header: 'Track', 
              render: (r) => (
                <span style={{ padding: '3px 8px', borderRadius: '4px', background: r.ataStatus === 'ATA' ? '#e0e7ff' : '#f1f5f9', color: r.ataStatus === 'ATA' ? '#4338ca' : '#475569', fontWeight: 700, fontSize: '11px' }}>
                  {r.ataStatus === 'ATA' ? 'ATA' : 'NON-ATA'}
                </span>
              )
            },
            { key: 'mobile', header: 'Mobile', render: (r) => r.mobile || '—' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'ACTIVE'} /> },
            { key: 'progress', header: 'Progress', render: (r) => r.programProgress ?? r.enrolledCoursesCount ?? r.enrolledCourses ?? 0 },
            { key: 'createdAt', header: 'Joined', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
            {
              key: 'actions', header: 'Actions', render: (r) => (
                <div className="row" style={{ gap: 6 }}>
                  <Link to={`/admin/students/${r._id || r.id}`}><Button size="sm" variant="ghost" icon={Eye}>View</Button></Link>
                  <Button size="sm" variant="outline" icon={Ban} onClick={() => setDeactivateTarget(r)}>
                    {r.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
                  </Button>
                </div>
              ),
            },
          ]}
          rows={activeList.items}
        />
      ) : (
        <DataTable
          loading={pendingList.loading}
          emptyLabel="No pending applications. You're all caught up."
          columns={[
            { key: 'fullName', header: 'Full Name' },
            { key: 'email', header: 'Email' },
            { 
              key: 'ataStatus', 
              header: 'Track', 
              render: (r) => (
                <span style={{ padding: '3px 8px', borderRadius: '4px', background: r.ataStatus === 'ATA' ? '#e0e7ff' : '#f1f5f9', color: r.ataStatus === 'ATA' ? '#4338ca' : '#475569', fontWeight: 700, fontSize: '11px' }}>
                  {r.ataStatus === 'ATA' ? 'ATA' : 'NON-ATA'}
                </span>
              )
            },
            { 
              key: 'interviewStatus', 
              header: 'Interview Stage', 
              render: (r) => {
                const s = r.interviewStatus || 'PENDING';
                let color = '#d97706';
                let bg = '#fef3c7';
                let text = 'Interview: Pending';
                if (s === 'SCHEDULED') {
                  color = '#2563eb';
                  bg = '#dbeafe';
                  text = 'Interview: Scheduled';
                } else if (s === 'COMPLETED') {
                  color = '#16a34a';
                  bg = '#dcfce7';
                  text = 'Interview: Done';
                }
                return (
                  <span style={{ padding: '3px 8px', borderRadius: '4px', background: bg, color: color, fontWeight: 700, fontSize: '11px' }}>
                    {text}
                  </span>
                );
              }
            },
            { key: 'createdAt', header: 'Registered On', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
            {
              key: 'actions', header: 'Actions', render: (r) => {
                const isScheduled = r.interviewStatus === 'SCHEDULED' || r.interviewStatus === 'COMPLETED';
                return (
                  <div className="row" style={{ gap: 6 }}>
                    <Link to={`/admin/students/${r._id || r.id}`}><Button size="sm" variant="ghost" icon={Eye}>View</Button></Link>
                    
                    {/* Stage 1: Schedule Interview */}
                    <Button 
                      size="sm" 
                      variant={isScheduled ? 'outline' : 'primary'} 
                      icon={Video} 
                      onClick={() => openInterviewModal(r)}
                    >
                      {isScheduled ? 'Edit Interview' : 'Schedule Interview'}
                    </Button>

                    {/* Stage 2: Final Approve */}
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      icon={Check} 
                      onClick={() => openApproveModal(r)}
                    >
                      Approve & Enroll
                    </Button>

                    <Button size="sm" variant="danger" icon={X} onClick={() => setRejectTarget(r)}>Reject</Button>
                  </div>
                );
              },
            },
          ]}
          rows={pendingList.items}
        />
      )}

      <Pagination currentPage={list.page} totalPages={list.meta.totalPages} totalItems={list.meta.totalItems} onChange={list.setPage} />

      {/* MODAL 1: STAGE 1 - SCHEDULE ZOOM INTERVIEW */}
      <Modal 
        open={!!interviewModalTarget} 
        onClose={() => setInterviewModalTarget(null)} 
        title="Schedule Admission Interview" 
        subtitle={`Candidate: ${interviewModalTarget?.fullName} (${interviewModalTarget?.email})`} 
        width={560}
      >
        <div className="stack" style={{ gap: '1.25rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            Enter the Zoom meeting link and schedule time. Both candidate and administration can use this link for the admission interview.
          </p>

          <Field label="Zoom Meeting URL" required>
            <Input 
              value={interviewForm.zoomMeetingUrl} 
              onChange={(e) => setInterviewForm(f => ({ ...f, zoomMeetingUrl: e.target.value }))} 
              placeholder="https://zoom.us/j/1234567890" 
            />
          </Field>

          <div className="form-grid">
            <Field label="Scheduled Date" required>
              <Input 
                type="date" 
                value={interviewForm.scheduledDate} 
                onChange={(e) => setInterviewForm(f => ({ ...f, scheduledDate: e.target.value }))} 
              />
            </Field>
            <Field label="Scheduled Time" required>
              <Input 
                type="text" 
                value={interviewForm.scheduledTime} 
                onChange={(e) => setInterviewForm(f => ({ ...f, scheduledTime: e.target.value }))} 
                placeholder="10:30 AM IST" 
              />
            </Field>
          </div>

          <Field label="Interviewer Notes / Panel">
            <Textarea 
              rows={2} 
              value={interviewForm.interviewerNotes} 
              onChange={(e) => setInterviewForm(f => ({ ...f, interviewerNotes: e.target.value }))} 
              placeholder="e.g. Panel: Academic Dean & Faculty" 
            />
          </Field>

          <div className="row" style={{ justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" onClick={() => setInterviewModalTarget(null)}>Cancel</Button>
            <Button variant="primary" icon={Calendar} onClick={doScheduleInterview}>Save & Schedule</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: STAGE 2 - FINAL APPROVAL & ENROLLMENT */}
      <Modal 
        open={!!approveModalTarget} 
        onClose={() => setApproveModalTarget(null)} 
        title="Final Admission Approval" 
        subtitle={`Approve and assign enrollment for: ${approveModalTarget?.fullName}`} 
        width={560}
      >
        <div className="stack" style={{ gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', background: 'var(--bg-surface-muted)', borderRadius: '8px', fontSize: '0.88rem' }}>
            <strong>Track:</strong> {approveModalTarget?.ataStatus === 'ATA' ? 'ATA (Asia Theological Association)' : 'NON-ATA'} | <strong>Interview Status:</strong> {approveModalTarget?.interviewStatus || 'PENDING'}
          </div>

          <div className="form-grid">
            <Field label="Assign Program">
              <Select 
                value={approvalForm.programId} 
                onChange={(e) => {
                  const newProgId = e.target.value;
                  const prog = programs.find(p => (p.id || p._id) === newProgId);
                  const { primaryAutoBatch } = computeBatchOptionsForProgram(prog);
                  setApprovalForm(f => ({ ...f, programId: newProgId, autoBatchName: primaryAutoBatch }));
                }}
              >
                <option value="">-- Select Program --</option>
                {programs.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
              </Select>
            </Field>

            <Field label="Academic Batch">
              <Select 
                value={approvalForm.batchId} 
                onChange={(e) => setApprovalForm(f => ({ ...f, batchId: e.target.value }))}
              >
                <option value="">{approvalForm.autoBatchName || 'Apr - Aug 2026 Batch (Auto)'}</option>
                {(() => {
                  const prog = programs.find(p => (p.id || p._id) === approvalForm.programId);
                  const { configuredOptions } = computeBatchOptionsForProgram(prog);
                  return configuredOptions.map((opt, idx) => (
                    <option key={`cfg-${idx}`} value={`auto:${opt}`}>{opt} (From Cohort Rules)</option>
                  ));
                })()}
                {filteredBatches.map(b => <option key={b.id || b._id} value={b.id || b._id}>{b.name || b.batchCode}</option>)}
              </Select>
            </Field>
          </div>

          <div style={{ padding: '10px 14px', background: 'var(--bg-surface-muted, #f8fafc)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>Starting Semester</span>
            <span style={{ color: '#2563eb', fontWeight: 700, background: '#eff6ff', padding: '2px 10px', borderRadius: '4px' }}>
              Semester 1 (Auto-Assigned Cycle Start)
            </span>
          </div>

          <Field label="Admission / Interview Remarks">
            <Textarea 
              rows={2} 
              value={approvalForm.admissionNotes} 
              onChange={(e) => setApprovalForm(f => ({ ...f, admissionNotes: e.target.value }))} 
              placeholder="e.g. Interview successfully completed. Approved for Batch 1." 
            />
          </Field>

          <div className="row" style={{ justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="outline" onClick={() => setApproveModalTarget(null)}>Cancel</Button>
            <Button variant="secondary" icon={Check} onClick={doFinalApprove}>Confirm & Activate Student</Button>
          </div>
        </div>
      </Modal>

      {/* REJECT MODAL */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Student" subtitle={rejectTarget?.fullName} width={420}>
        <div className="stack">
          <Field label="Reason for rejection" required>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Explain why this application is being rejected…" />
          </Field>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={doReject} disabled={!rejectReason.trim()}>Confirm Reject</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={doDeactivate}
        title={deactivateTarget?.status === 'INACTIVE' ? 'Activate this student?' : 'Deactivate this student?'}
        description={`${deactivateTarget?.fullName} will ${deactivateTarget?.status === 'INACTIVE' ? 'regain' : 'lose'} access to their account.`}
        confirmLabel={deactivateTarget?.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
        danger={deactivateTarget?.status !== 'INACTIVE'}
      />

      <StudentDrawer
        open={!!modalOpen}
        onClose={() => setModalOpen(false)}
        student={typeof modalOpen === 'object' ? modalOpen : null}
        onCreated={() => {
          setModalOpen(false);
          list.refresh();
        }}
      />
    </div>
  );
}

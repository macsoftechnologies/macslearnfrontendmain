import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import DataTable from '../../../components/ui/DataTable';
import Modal from '../../../components/ui/Modal';
import Input, { Field, Select } from '../../../components/ui/Input';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import * as academicBatchesApi from '../../../api/academicBatches';
import * as programsApi from '../../../api/programs';

import client from '../../../api/client';

const BatchesPage = () => {
  const [batches, setBatches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', programId: '', startDate: '', endDate: '', enrollmentOpenDate: '', enrollmentCloseDate: '', status: 'UPCOMING', maxStudents: '' });
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  // View Students state
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [viewingBatch, setViewingBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [batchStudentCounts, setBatchStudentCounts] = useState({});

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const [res, enrollmentsRes] = await Promise.all([
        academicBatchesApi.list(),
        client.get('/enrollments?limit=500').catch(() => null),
      ]);
      const arr = res?.data?.data || res?.data || res;
      setBatches(Array.isArray(arr) ? arr : []);

      if (enrollmentsRes?.data) {
        const enrollments = enrollmentsRes.data?.data || enrollmentsRes.data || [];
        const counts = {};
        const seen = new Set();
        (Array.isArray(enrollments) ? enrollments : []).forEach((e) => {
          const bId = e.batchId || e.batch?.id || e.batch?._id;
          const sId = typeof e.studentId === 'object' 
            ? (e.studentId?._id || e.studentId?.id) 
            : (e.studentId || e.student?.id || e.student?._id);
          
          if (bId && sId) {
            const key = `${bId}_${sId}`;
            if (!seen.has(key)) {
              seen.add(key);
              counts[bId] = (counts[bId] || 0) + 1;
            }
          }
        });
        setBatchStudentCounts(counts);
      }
    } catch (err) {
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await programsApi.list();
      const arr = res?.data?.data || res?.data || res;
      setPrograms(Array.isArray(arr) ? arr : []);
    } catch (err) {}
  };

  useEffect(() => {
    fetchBatches();
    fetchPrograms();
  }, []);

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        degreeName: 'N/A', // Legacy field, safely ignored
        programId: formData.programId,
        totalSemesters: 1, // Legacy field, safely ignored
        courseMappings: {},
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        enrollmentOpenDate: formData.enrollmentOpenDate || null,
        enrollmentCloseDate: formData.enrollmentCloseDate || null,
        status: formData.status || 'UPCOMING',
        maxStudents: parseInt(formData.maxStudents) || null,
      };
      
      if (editId) {
        await academicBatchesApi.update(editId, payload);
        toast.success('Batch updated');
      } else {
        await academicBatchesApi.create(payload);
        toast.success('Batch created');
      }
      setModalOpen(false);
      fetchBatches();
    } catch (err) {
      toast.error('Failed to save batch');
    }
  };

  const openCreate = () => {
    setEditId(null);
    setFormData({ name: '', programId: '', startDate: '', endDate: '', enrollmentOpenDate: '', enrollmentCloseDate: '', status: 'UPCOMING', maxStudents: '' });
    setModalOpen(true);
  };

  const openEdit = (batch) => {
    setEditId(batch.id);
    const matchedProg = programs.find(p => 
      (p.id || p._id) === batch.programId || 
      p.name?.toLowerCase().trim() === String(batch.degreeName || '').toLowerCase().trim()
    );
    const resolvedProgId = matchedProg ? (matchedProg.id || matchedProg._id) : (batch.programId || '');

    setFormData({ 
      name: batch.name, 
      programId: resolvedProgId,
      startDate: batch.startDate ? batch.startDate.substring(0, 10) : '',
      endDate: batch.endDate ? batch.endDate.substring(0, 10) : '',
      enrollmentOpenDate: batch.enrollmentOpenDate ? batch.enrollmentOpenDate.substring(0, 10) : '',
      enrollmentCloseDate: batch.enrollmentCloseDate ? batch.enrollmentCloseDate.substring(0, 10) : '',
      status: batch.status || 'UPCOMING',
      maxStudents: batch.maxStudents || ''
    });
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await academicBatchesApi.remove(deleteTarget.id);
      toast.success('Batch deleted');
      setDeleteTarget(null);
      fetchBatches();
    } catch (err) {
      toast.error('Failed to delete batch');
    }
  };

  const openViewStudents = async (batch) => {
    setViewingBatch(batch);
    setStudentsModalOpen(true);
    setLoadingStudents(true);
    try {
      const res = await client.get(`/enrollments?batchId=${batch.id}`);
      const data = res.data?.data || [];
      // Enrollments can be duplicated per course for the same student, so deduplicate by studentId
      const uniqueStudentsMap = new Map();
      
      const programStatusMap = new Map();
      data.forEach(e => {
         if (!e.courseId && e.studentId) {
             programStatusMap.set(e.studentId, e.status);
         }
      });

      data.forEach(e => {
        if (!e.student) return;
        
        const existing = uniqueStudentsMap.get(e.studentId);
        if (!existing) {
          // If we found a specific program enrollment status, use it. Otherwise, default to ACTIVE
          const actualStatus = programStatusMap.has(e.studentId) ? programStatusMap.get(e.studentId) : 'ACTIVE';
          uniqueStudentsMap.set(e.studentId, { 
            ...e.student, 
            enrollmentStatus: actualStatus, 
            completedCourses: (e.courseId && e.status === 'COMPLETED') ? 1 : 0
          });
        } else {
          if (e.courseId && e.status === 'COMPLETED') {
            existing.completedCourses = (existing.completedCourses || 0) + 1;
          }
        }
      });
      
      setBatchStudents(Array.from(uniqueStudentsMap.values()));
    } catch (err) {
      toast.error('Failed to fetch students for this batch');
      setBatchStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Academic</span>
          <h1 className="page-title">Cohorts / Batches</h1>
          <p className="page-subtitle">Manage student cohorts (e.g., M.Div Fall 2026).</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>Create Batch</Button>
      </div>

      <DataTable
        loading={loading}
        emptyLabel="No batches found."
        columns={[
          { key: 'name', header: 'Batch Name' },
          { key: 'programId', header: 'Program', render: (r) => r.program?.name || programs.find(p => (p.id || p._id) === r.programId)?.name || (r.degreeName && r.degreeName !== 'N/A' && r.degreeName !== 'General Track' ? r.degreeName : 'All Programs (Shared Intake)') },
          { key: 'currentEnrolledCount', header: 'Students', render: (r) => (batchStudentCounts[r.id] ?? r.currentEnrolledCount ?? 0) },
          { key: 'totalSubjects', header: 'Total Subjects', render: (r) => programs.find(p => p.id === r.programId)?.totalSubjects || 30 },
          { key: 'status', header: 'Status', render: (r) => <span className={`badge badge-${r.status === 'ACTIVE' ? 'success' : 'default'}`}>{r.status}</span> },
          { key: 'startDate', header: 'Start Date', render: (r) => r.startDate ? new Date(r.startDate).toLocaleDateString() : 'N/A' },
          { key: 'endDate', header: 'End Date', render: (r) => r.endDate ? new Date(r.endDate).toLocaleDateString() : 'N/A' },
          {
            key: 'actions', header: 'Actions', render: (r) => (
              <div className="row" style={{ gap: 6 }}>
                <Button size="sm" variant="outline" icon={Eye} onClick={() => openViewStudents(r)}>View</Button>
                <Button size="sm" variant="outline" icon={Edit} onClick={() => openEdit(r)}>Edit</Button>
                <Button size="sm" variant="outline" icon={Trash2} onClick={() => setDeleteTarget(r)} danger>Delete</Button>
              </div>
            ),
          },
        ]}
        rows={batches}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Batch" : "Create Batch"} width={500}>
        <div className="stack">
          <div className="row" style={{ gap: '1rem' }}>
            <Field label="Batch Name" required hint="e.g. Fall 2026 Cohort" style={{ flex: 1 }}>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </Field>
            <Field label="Program" required style={{ flex: 1 }}>
              <Select 
                value={formData.programId} 
                onChange={e => {
                  const pId = e.target.value;
                  const p = programs.find(item => (item.id || item._id) === pId);
                  const dur = p?.maxDurationYears || (p?.totalSemesters ? Math.ceil(p.totalSemesters / 2) : 3);
                  
                  let newEnd = formData.endDate;
                  if (formData.startDate && dur) {
                    const s = new Date(formData.startDate);
                    if (!isNaN(s.getTime())) {
                      s.setFullYear(s.getFullYear() + dur);
                      s.setDate(s.getDate() - 1);
                      newEnd = s.toISOString().substring(0, 10);
                    }
                  }
                  setFormData({...formData, programId: pId, endDate: newEnd });
                }}
              >
                <option value="">-- Select Program --</option>
                {programs.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
              </Select>
            </Field>
          </div>

          <div className="row" style={{ gap: '1rem' }}>
            <Field label="Start Date" style={{ flex: 1 }}>
              <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            </Field>
            <Field label="End Date" style={{ flex: 1 }}>
              <Input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
            </Field>
          </div>

          <div className="row" style={{ gap: '1rem' }}>
            <Field label="Enrollment Open Date" style={{ flex: 1 }}>
              <Input type="date" value={formData.enrollmentOpenDate} onChange={e => setFormData({...formData, enrollmentOpenDate: e.target.value})} />
            </Field>
            <Field label="Enrollment Close Date" style={{ flex: 1 }}>
              <Input type="date" value={formData.enrollmentCloseDate} onChange={e => setFormData({...formData, enrollmentCloseDate: e.target.value})} />
            </Field>
          </div>

          <div className="row" style={{ gap: '1rem' }}>
            <Field label="Status" style={{ flex: 1 }}>
              <Select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="UPCOMING">Upcoming</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </Field>
            <Field label="Max Students (Optional)" style={{ flex: 1 }}>
              <Input type="number" value={formData.maxStudents} onChange={e => setFormData({...formData, maxStudents: e.target.value})} placeholder="e.g. 50" />
            </Field>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.programId}>Save Batch</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Batch?"
        description={`Are you sure you want to delete ${deleteTarget?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />

      <Modal open={studentsModalOpen} onClose={() => setStudentsModalOpen(false)} title={`Students in ${viewingBatch?.name || 'Batch'}`} width={700}>
        <DataTable
          loading={loadingStudents}
          emptyLabel="No students found in this batch."
          columns={[
            { key: 'fullName', header: 'Name' },
            { key: 'email', header: 'Email' },
            { key: 'progress', header: 'Progress', render: (r) => `${r.completedCourses || 0} / ${viewingBatch?.totalSubjects || programs.find(p => p.id === viewingBatch?.programId)?.totalSubjects || 30}` },
            { key: 'enrollmentStatus', header: 'Enrollment Status', render: (r) => <span className={`badge badge-${r.enrollmentStatus === 'ACTIVE' ? 'success' : 'default'}`}>{r.enrollmentStatus || 'ACTIVE'}</span> }
          ]}
          rows={batchStudents}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--sp-6)' }}>
          <Button onClick={() => setStudentsModalOpen(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
};

export default BatchesPage;

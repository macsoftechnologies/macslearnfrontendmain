import { useEffect, useState } from 'react';
import { Plus, Ban, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import usePagination from '../../hooks/usePagination';
import * as enrollmentsApi from '../../api/enrollments';
import * as studentsApi from '../../api/students';
import * as coursesApi from '../../api/courses';
import { extractErrorMessages } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Field, Select } from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function Enrollments() {
  const { items, page, setPage, meta, loading, refresh } = usePagination(enrollmentsApi.list, {});
  const [modalOpen, setModalOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [studentMap, setStudentMap] = useState({});
  const [courseMap, setCourseMap] = useState({});
  const [form, setForm] = useState({ studentId: '', courseId: '' });
  const [saving, setSaving] = useState(false);
  const [cancelId, setCancelId] = useState(null);

  // Pre-fetch for name resolution and for enroll modal
  useEffect(() => {
    studentsApi.list({ limit: 200 }).then((res) => {
      const list = res.data?.data || [];
      setStudents(list);
      const map = {};
      list.forEach((s) => { map[s._id || s.id] = s.fullName; });
      setStudentMap(map);
    }).catch(() => {});
    coursesApi.list({ limit: 200 }).then((res) => {
      const list = res.data?.data || [];
      setCourses(list);
      const map = {};
      list.forEach((c) => { map[c._id || c.id] = c.title; });
      setCourseMap(map);
    }).catch(() => {});
  }, []);


  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await enrollmentsApi.adminEnroll(form);
      toast.success('Student enrolled');
      setModalOpen(false);
      setForm({ studentId: '', courseId: '' });
      refresh();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id) => {
    try {
      await enrollmentsApi.cancel(id);
      toast.success('Enrollment cancelled');
      refresh();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  const reactivate = async (id) => {
    try {
      await enrollmentsApi.reactivate(id);
      toast.success('Enrollment reactivated');
      refresh();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Enrollment</span>
          <h1 className="page-title">Enrollments</h1>
          <p className="page-subtitle">Manually enroll students or manage existing enrollments.</p>
        </div>
        <Button icon={Plus} onClick={() => setModalOpen(true)}>Enroll Student</Button>
      </div>

      <DataTable
        loading={loading}
        emptyLabel="No enrollments yet."
        columns={[
          { key: 'student', header: 'Student', render: (r) => r.studentId?.fullName || r.student?.fullName || studentMap[r.studentId] || r.studentId || '\u2014' },
          { key: 'course', header: 'Course / Program', render: (r) => {
              if (r.courseId || r.course) return r.courseId?.title || r.course?.title || courseMap[r.courseId] || r.courseId || '\u2014';
              if (r.programId || r.program) return `Program: ${r.program?.name || r.programId || '\u2014'}`;
              return '\u2014';
          }},
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'progress', header: 'Progress', render: (r) => r.programProgress ? r.programProgress : `${r.progressPercentage ?? 0}%` },
          { key: 'enrolledAt', header: 'Enrolled On', render: (r) => (r.enrolledAt || r.createdAt ? new Date(r.enrolledAt || r.createdAt).toLocaleDateString() : '—') },
          {
            key: 'actions', header: 'Actions', render: (r) => (
              r.status === 'CANCELLED'
                ? <Button size="sm" variant="outline" icon={RotateCcw} onClick={() => reactivate(r._id || r.id)}>Reactivate</Button>
                : <Button size="sm" variant="danger" icon={Ban} onClick={() => setCancelId(r._id || r.id)}>Cancel</Button>
            ),
          },
        ]}
        rows={items}
      />

      <Pagination currentPage={page} totalPages={meta.totalPages} totalItems={meta.totalItems} onChange={setPage} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Enroll a Student" width={440}>
        <form className="stack" id="enroll-form" onSubmit={submit}>
          <Field label="Student" required>
            <Select value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} required>
              <option value="">Select student</option>
              {students.map((s) => <option key={s._id || s.id} value={s._id || s.id}>{s.fullName}</option>)}
            </Select>
          </Field>
          <Field label="Course" required>
            <Select value={form.courseId} onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))} required>
              <option value="">Select course</option>
              {courses.map((c) => <option key={c._id || c.id} value={c._id || c.id}>{c.title}</option>)}
            </Select>
          </Field>
        </form>
        <div className="modal-panel__foot" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
          <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="enroll-form" loading={saving}>Enroll</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={() => {
          cancel(cancelId);
          setCancelId(null);
        }}
        title="Cancel Enrollment"
        description="Are you sure you want to cancel this student's enrollment?"
        confirmLabel="Cancel Enrollment"
        danger={true}
      />
    </div>
  );
}

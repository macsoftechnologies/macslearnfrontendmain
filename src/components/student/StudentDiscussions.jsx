import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as discussionApi from '../../api/discussion';
import { extractErrorMessages } from '../../api/client';
import DataTable from '../ui/DataTable';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input, { Field, Textarea } from '../ui/Input';
import PageLoader from '../ui/PageLoader';
import { Plus, Eye } from 'lucide-react';
import ThreadDetailModal from '../discussion/ThreadDetailModal';

export default function StudentDiscussions({ courseId, lessonId }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const params = lessonId ? { lessonId } : {};
    discussionApi.listThreads(courseId, params)
      .then((res) => setThreads(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [courseId]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (lessonId) payload.lessonId = lessonId;
      await discussionApi.createThread(courseId, payload);
      toast.success('Thread created');
      setModalOpen(false);
      setForm({ title: '', content: '' });
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div style={{ padding: 'var(--sp-6)' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-6)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--fs-lg)' }}>{lessonId ? 'Lesson Q&A' : 'Discussions'}</h2>
          <p className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>{lessonId ? 'Ask questions about this specific lesson.' : 'Ask questions and share knowledge.'}</p>
        </div>
        <Button icon={Plus} size="sm" onClick={() => setModalOpen(true)}>New Thread</Button>
      </div>
      <DataTable
        emptyLabel={lessonId ? "No questions yet for this lesson. Be the first to ask!" : "No discussions yet for this course. Be the first to ask!"}
        columns={[
          { key: 'title', header: 'Title', render: (r) => <div style={{ fontWeight: 600 }}>{r.title}</div> },
          { key: 'author', header: 'Author', render: (r) => r.author?.fullName || '—' },
          { key: 'repliesCount', header: 'Replies', render: (r) => r.repliesCount ?? 0 },
          { key: 'createdAt', header: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
          { key: 'actions', header: 'Actions', render: (r) => (
            <Button size="sm" variant="ghost" onClick={() => setActiveThreadId(r._id || r.id)}>
              View Thread
            </Button>
          )},
        ]}
        rows={threads}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Discussion Thread" width={500}>
        <form className="stack" id="thread-form" onSubmit={submit}>
          <Field label="Title" required><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></Field>
          <Field label="Content" required><Textarea rows={6} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} required /></Field>
        </form>
        <div className="modal-panel__foot" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
          <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="thread-form" loading={saving}>Post Thread</Button>
        </div>
      </Modal>

      <ThreadDetailModal 
        open={!!activeThreadId}
        onClose={() => setActiveThreadId(null)}
        courseId={courseId}
        threadId={activeThreadId}
        onResolved={() => load()}
      />
    </div>
  );
}

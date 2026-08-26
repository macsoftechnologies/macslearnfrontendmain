import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as examsApi from '../../api/exams';
import { extractErrorMessages } from '../../api/client';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Input, { Field, Select, Textarea } from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageLoader from '../../components/ui/PageLoader';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';

export default function ExamBuilder() {
  const { id: courseId, examId } = useParams();
  const location = useLocation();
  const base = location.pathname.startsWith('/faculty') ? '/faculty' : '/admin';
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState({ type: 'MULTIPLE_CHOICE', questionText: '', options: ['', ''], correctAnswer: '', marks: 1 });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([examsApi.getById(examId), examsApi.listQuestions(examId)])
      .then(([eRes, qRes]) => {
        setExam(eRes.data?.data || null);
        setQuestions(qRes.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [examId]);

  const publishExam = async () => {
    if (!window.confirm("Are you sure you want to publish this exam? Students will be able to take it immediately.")) return;
    try {
      await examsApi.publish(examId);
      toast.success('Exam published successfully!');
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setForm({ type: 'MCQ', questionText: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }], correctAnswer: '', marks: 1 });
    setModalOpen(true);
  };

  const openEdit = (q) => {
    setEditing(q);
    setFormError(null);
    setForm({
      type: q.type,
      questionText: q.questionText,
      options: q.options || [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
      correctAnswer: q.correctAnswer || '',
      marks: q.marks || 1,
    });
    setModalOpen(true);
  };

  const submitQuestion = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const currentTotal = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    const oldMarks = editing ? (editing.marks || 0) : 0;
    const newMarks = Number(form.marks);
    const maxAllowed = exam.totalMarks - (currentTotal - oldMarks);

    if (newMarks > maxAllowed) {
      setFormError(`Cannot exceed total exam marks (${exam.totalMarks}). You can only add up to ${maxAllowed} more marks.`);
      setSaving(false);
      return;
    }

    if (form.type === 'MCQ') {
      const validOptions = form.options.filter((o) => o.text.trim() !== '');
      if (validOptions.length < 2) {
        setFormError('Please provide at least two options for multiple choice.');
        setSaving(false);
        return;
      }
      if (!validOptions.some((o) => o.isCorrect)) {
        setFormError('Please select the correct answer for the multiple choice question.');
        setSaving(false);
        return;
      }
    } else if (!form.correctAnswer || form.correctAnswer.trim() === '') {
      setFormError('Please provide the correct answer.');
      setSaving(false);
      return;
    }

    const payload = {
      ...form,
      marks: Number(form.marks),
      options: form.type === 'MCQ' ? form.options.filter((o) => o.text.trim() !== '') : undefined,
    };
    try {
      if (editing) {
        await examsApi.updateQuestion(examId, editing._id || editing.id, payload);
        toast.success('Question updated');
      } else {
        await examsApi.addQuestion(examId, payload);
        toast.success('Question added');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      await examsApi.deleteQuestion(examId, deleteTarget._id || deleteTarget.id);
      toast.success('Question deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  if (loading) return <PageLoader />;
  if (!exam) return <div className="page"><p>Exam not found.</p></div>;

  return (
    <div className="page">
      <Link to={`${base}/courses/${courseId}`} className="row text-muted" style={{ marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to Course
      </Link>
      
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Exam Builder</span>
          <h1 className="page-title">{exam.title}</h1>
          <div className="row text-muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)', gap: '8px', alignItems: 'center' }}>
            <span>Duration: {exam.durationMinutes} min</span>
            <span>•</span>
            <span>Marks: {exam.totalMarks} (Passing: {exam.passingPercentage ? Math.ceil((exam.totalMarks * exam.passingPercentage) / 100) : 'N/A'})</span>
            <span>•</span>
            <StatusBadge status={exam.status || (exam.isPublished ? 'PUBLISHED' : 'DRAFT')} />
          </div>
        </div>
        <div className="row" style={{ gap: '8px' }}>
          {!(exam.isPublished || exam.status === 'PUBLISHED') && (
            <>
              <Button variant="outline" icon={CheckCircle2} onClick={publishExam}>Publish Exam</Button>
              <Button icon={Plus} onClick={openCreate}>Add Question</Button>
            </>
          )}
        </div>
      </div>

      <Card style={{ padding: 'var(--sp-6)' }}>
        <h2 className="section-title">Questions ({questions.length})</h2>
        <DataTable
          emptyLabel="No questions added to this exam yet."
          columns={[
            { key: 'type', header: 'Type', render: (r) => r.type.replace('_', ' ') },
            { key: 'questionText', header: 'Question', render: (r) => <div style={{ maxWidth: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.questionText}</div> },
            { key: 'marks', header: 'Marks' },
            {
              key: 'actions', header: 'Actions', render: (r) => (
                <div className="row" style={{ gap: 6 }}>
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => openEdit(r)}>Edit</Button>
                  {!(exam.isPublished || exam.status === 'PUBLISHED') && (
                    <Button size="sm" variant="outline" icon={Trash2} onClick={() => setDeleteTarget(r)}>Delete</Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={questions}
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Question' : 'Add Question'} width={500}>
        <form className="stack" id="question-form" onSubmit={submitQuestion}>
          {formError && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-sm)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              {formError}
            </div>
          )}
          <Field label="Question Type">
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="MCQ">Multiple Choice</option>
              <option value="TRUE_FALSE">True / False</option>
              {/* <option value="SHORT_ANSWER">Short Answer</option> */}
            </Select>
          </Field>
          <Field label="Question Text" required><Textarea rows={3} value={form.questionText} onChange={(e) => setForm((f) => ({ ...f, questionText: e.target.value }))} required /></Field>
          
          {form.type === 'MCQ' && (
            <div className="stack" style={{ gap: '12px' }}>
              <label className="field-label">Options (Select the correct one)</label>
              {form.options.map((opt, idx) => (
                <div className="row" key={idx} style={{ gap: '8px', alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="correctOption"
                    checked={opt.isCorrect}
                    onChange={() => {
                      const newOpts = form.options.map((o, i) => ({ ...o, isCorrect: i === idx }));
                      setForm((f) => ({ ...f, options: newOpts }));
                    }}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <Input 
                    value={opt.text} 
                    onChange={(e) => {
                      const newOpts = [...form.options];
                      newOpts[idx].text = e.target.value;
                      setForm((f) => ({ ...f, options: newOpts }));
                    }} 
                    placeholder={`Option ${idx + 1}`} 
                  />
                  {idx > 1 && (
                    <Button type="button" size="sm" variant="ghost" icon={Trash2} onClick={() => {
                      const newOpts = form.options.filter((_, i) => i !== idx);
                      setForm((f) => ({ ...f, options: newOpts }));
                    }} />
                  )}
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => setForm((f) => ({ ...f, options: [...f.options, { text: '', isCorrect: false }] }))}>Add Option</Button>
            </div>
          )}

          <div className="form-grid" style={{ marginTop: 'var(--sp-4)' }}>
            {form.type !== 'MCQ' && (
              <Field label="Correct Answer">
                {form.type === 'TRUE_FALSE' ? (
                  <Select value={form.correctAnswer} onChange={(e) => setForm((f) => ({ ...f, correctAnswer: e.target.value }))}>
                    <option value="">Select answer</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </Select>
                ) : (
                  <Input value={form.correctAnswer} onChange={(e) => setForm((f) => ({ ...f, correctAnswer: e.target.value }))} placeholder="Expected keyword/answer" />
                )}
              </Field>
            )}
            <Field label="Marks" required><Input type="number" min={1} value={form.marks} onChange={(e) => setForm((f) => ({ ...f, marks: e.target.value }))} required disabled={exam.isPublished || exam.status === 'PUBLISHED'} /></Field>
          </div>
        </form>
        <div className="modal-panel__foot" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
          <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="question-form" loading={saving}>{editing ? 'Save Changes' : 'Add Question'}</Button>
        </div>
      </Modal>

      <ConfirmDialog 
        open={!!deleteTarget} 
        onClose={() => setDeleteTarget(null)} 
        onConfirm={doDelete} 
        title="Delete Question?" 
        description="This cannot be undone." 
        confirmLabel="Delete" 
        danger 
      />
    </div>
  );
}

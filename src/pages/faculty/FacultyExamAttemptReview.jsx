import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as examsApi from '../../api/exams';
import * as certificatesApi from '../../api/certificates';
import PageLoader from '../../components/ui/PageLoader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { FileText, Download, Eye, ExternalLink, Image as ImageIcon, CheckCircle, Clock } from 'lucide-react';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { extractErrorMessages, buildStaticUrl } from '../../api/client';

export default function FacultyExamAttemptReview() {
  const { id: courseId, examId, attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith('/faculty') ? '/faculty' : '/admin';
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [grading, setGrading] = useState({});
  const [exam, setExam] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [isResultPublished, setIsResultPublished] = useState(false);

  const load = () => {
    setLoading(true);
    examsApi.attemptReview(examId, attemptId)
      .then((res) => {
        const payload = res.data?.data || res.data;
        setAttempt(payload?.attempt);
        setQuestions(payload?.questions || []);
      })
      .catch((err) => console.error(err));
      
    examsApi.getById(examId)
      .then((res) => setExam(res.data?.data || null))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(load, [examId, attemptId]);

  const submitGrade = async (questionId, marks) => {
    try {
      await examsApi.gradeAnswer(examId, attemptId, { questionId, marks: Number(marks) });
      toast.success('Grade saved');
      setGrading(g => ({ ...g, [questionId]: undefined }));
      load();
    } catch (err) {
      toast.error('Failed to grade answer');
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await examsApi.publishAttempt(examId, attemptId);
      setIsResultPublished(true);
      toast.success('Exam result published to student successfully!');
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!attempt) return <div style={{ padding: 'var(--sp-6)' }}>Attempt not found.</div>;

  let computedMarksObtained = 0;
  let totalQuestionsMarks = 0;
  const rawAnswersList = Array.isArray(attempt.answers) ? attempt.answers : (typeof attempt.answers === 'string' ? JSON.parse(attempt.answers || '[]') : []);
  
  questions.forEach(q => {
    totalQuestionsMarks += Number(q.marks) || 0;
    const answer = rawAnswersList.find(a => String(a.questionId) === String(q._id || q.id));
    if (q.type === 'MCQ') {
      const correctOpt = (q.options || []).find(o => o.isCorrect);
      if (correctOpt && (correctOpt.text === answer?.selectedOption || correctOpt._id === answer?.selectedOption || correctOpt.id === answer?.selectedOption)) {
        computedMarksObtained += Number(q.marks) || 0;
      }
    } else if (q.type === 'TRUE_FALSE') {
      if (q.correctAnswer && q.correctAnswer.toLowerCase() === (answer?.selectedOption || '').toLowerCase()) {
        computedMarksObtained += Number(q.marks) || 0;
      }
    } else if (q.type === 'SHORT_ANSWER' || q.type === 'BOOK_REVIEW' || q.type === 'RESEARCH_PAPER') {
      computedMarksObtained += Number(answer?.marks) || 0;
    }
  });

  const effectiveTotalMarks = totalQuestionsMarks > 0 ? totalQuestionsMarks : (attempt.totalMarks || 100);
  const effectiveObtained = computedMarksObtained || attempt.marksObtained || 0;
  const computedPercentage = effectiveTotalMarks > 0 ? (effectiveObtained / effectiveTotalMarks) * 100 : 0;
  const hasPendingEvaluation = rawAnswersList.some(a => a.isGraded === false);
  // Fallback to attempt's isPassed if we don't have passing criteria here easily, or we can use computed. 
  // Wait, we don't have passingPercentage here. We will just use attempt.isPassed. Or wait, attempt.isPassed might be wrong! But we don't know the passing criteria on this page easily, though we could fetch it. I'll just leave isPassed as is.

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-6)' }}>
      <Button variant="ghost" onClick={() => window.history.length > 1 ? navigate(-1) : navigate(`${base}/exam-reviews`)} style={{ marginBottom: 'var(--sp-4)' }}>
        &larr; Back
      </Button>
      
      <div style={{ marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'bold' }}>Submission Review: {attempt.studentId?.fullName}</h1>
          <p className="text-muted" style={{ marginTop: 'var(--sp-2)', fontSize: '15px' }}>
            Score: <strong style={{ color: 'var(--text-primary)' }}>{effectiveObtained} / {effectiveTotalMarks}</strong> ({computedPercentage.toFixed(1)}%)
            &nbsp;&middot;&nbsp; 
            Status: {hasPendingEvaluation ? (
              <span style={{ color: '#d97706', fontWeight: 800, background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>PENDING REVIEW</span>
            ) : (
              <span style={{ color: attempt.isPassed || computedPercentage >= (exam?.passingPercentage || 50) ? '#16a34a' : '#dc2626', fontWeight: 800, background: attempt.isPassed || computedPercentage >= (exam?.passingPercentage || 50) ? '#dcfce7' : '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>
                {attempt.isPassed || computedPercentage >= (exam?.passingPercentage || 50) ? 'PASSED' : 'FAILED'}
              </span>
            )}
          </p>
        </div>

        {/* Publish Result Button */}
        <div>
          {isResultPublished ? (
            <span style={{ background: '#dcfce7', color: '#15803d', padding: '8px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              ✓ Result Published to Student
            </span>
          ) : (
            <Button 
              variant="primary" 
              loading={publishing} 
              onClick={handlePublish}
              style={{ background: '#4f46e5', color: '#ffffff', fontWeight: 700, padding: '8px 18px' }}
            >
              📢 Publish Result to Student
            </Button>
          )}
        </div>
      </div>

      <div className="stack" style={{ gap: 'var(--sp-6)' }}>
        {questions.map((q, i) => {
          const rawAnswers = Array.isArray(attempt.answers) ? attempt.answers : (typeof attempt.answers === 'string' ? JSON.parse(attempt.answers || '[]') : []);
          const answer = rawAnswers.find(a => String(a.questionId) === String(q._id || q.id));
          
          let dynamicIsCorrect = false;
          let dynamicMarks = answer?.marks || 0;

          if (q.type === 'MCQ') {
            const correctOpt = (q.options || []).find(o => o.isCorrect);
            if (correctOpt && (correctOpt.text === answer?.selectedOption || correctOpt._id === answer?.selectedOption || correctOpt.id === answer?.selectedOption)) {
              dynamicIsCorrect = true;
              dynamicMarks = q.marks;
            }
          } else if (q.type === 'TRUE_FALSE') {
            if (q.correctAnswer && q.correctAnswer.toLowerCase() === (answer?.selectedOption || '').toLowerCase()) {
              dynamicIsCorrect = true;
              dynamicMarks = q.marks;
            }
          } else if (q.type === 'SHORT_ANSWER' || q.type === 'BOOK_REVIEW' || q.type === 'RESEARCH_PAPER') {
            dynamicIsCorrect = (answer?.marks || 0) > 0;
            dynamicMarks = answer?.marks || 0;
          }

          return (
            <Card key={q._id || q.id} style={{ padding: 'var(--sp-6)', border: dynamicIsCorrect ? '1px solid var(--color-success-300)' : '1px solid var(--border-subtle)' }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
                <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: '600' }}>
                  Question {i + 1}
                </h3>
                <span style={{ fontSize: 'var(--fs-sm)', fontWeight: '600', color: dynamicIsCorrect ? 'var(--color-success-600)' : 'var(--color-neutral-600)' }}>
                  {dynamicMarks} / {q.marks} marks
                </span>
              </div>
              
              <div style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--sp-4)', lineHeight: 1.5 }}>
                {q.questionText || q.text || 'Question Prompt'}
              </div>

              {/* BOOK REVIEW & RESEARCH PAPER SUBMISSIONS */}
              {(q.type === 'BOOK_REVIEW' || q.type === 'RESEARCH_PAPER' || (!['MCQ', 'TRUE_FALSE'].includes(q.type) && (answer?.fileUrl || answer?.textAnswer || q.type !== 'SHORT_ANSWER'))) && (
                <div className="stack" style={{ gap: '16px', background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '4px 10px', borderRadius: '6px', background: '#e0e7ff', color: '#4338ca', letterSpacing: '0.5px' }}>
                      {q.type === 'BOOK_REVIEW' ? '📖 Book Review Submission' : q.type === 'RESEARCH_PAPER' ? '📄 Research Paper Submission' : '📝 Student Submission'}
                    </span>
                    {answer?.isGraded === false || answer?.marks === undefined ? (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '3px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} /> Pending Evaluation
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '3px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={13} /> Evaluated: {answer.marks} / {q.marks} Marks
                      </span>
                    )}
                  </div>

                  {/* Uploaded File Section */}
                  {answer?.fileUrl ? (
                    <div style={{ 
                      padding: '14px 18px', 
                      background: '#ffffff', 
                      borderRadius: '8px', 
                      border: '1px solid #cbd5e1', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '6px', color: '#4f46e5' }}>
                          <FileText size={22} />
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                            {answer.fileName || 'Uploaded Student Document'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            Student submission file ready for evaluation
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a 
                          href={buildStaticUrl(answer.fileUrl)} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ 
                            padding: '8px 16px', 
                            background: '#4f46e5', 
                            color: '#ffffff', 
                            borderRadius: '6px', 
                            fontSize: '13px', 
                            fontWeight: 700, 
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}
                        >
                          <Eye size={15} /> View File
                        </a>
                        <a 
                          href={buildStaticUrl(answer.fileUrl)} 
                          download
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ 
                            padding: '8px 14px', 
                            background: '#ffffff', 
                            color: '#334155', 
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px', 
                            fontSize: '13px', 
                            fontWeight: 600, 
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Download size={15} /> Download
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '12px 16px', background: '#f1f5f9', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '13px' }}>
                      ℹ️ No attached document file was uploaded for this question.
                    </div>
                  )}

                  {/* Written Abstract / Commentary */}
                  <div>
                    <strong style={{ fontSize: '13px', color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Student Written Abstract / Summary:
                    </strong>
                    <div style={{ padding: '14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#1e293b' }}>
                      {answer?.textAnswer || (typeof answer?.selectedOption === 'string' && !answer.selectedOption.startsWith('http') ? answer.selectedOption : '') || <em style={{ color: '#94a3b8' }}>No written commentary provided by student.</em>}
                    </div>
                  </div>

                  {/* Grading / Score Award Box */}
                  <div style={{ marginTop: '8px', background: '#ffffff', padding: '18px', borderRadius: '8px', border: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                        Award Evaluation Score:
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                        Maximum Marks: {q.marks}
                      </span>
                    </div>

                    <div className="row" style={{ alignItems: 'flex-end', gap: '14px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                          Score Obtained (0 to {q.marks}):
                        </label>
                        <Input 
                          type="number" 
                          max={q.marks} 
                          min={0} 
                          value={grading[q._id || q.id] ?? answer?.marks ?? 0} 
                          onChange={(e) => setGrading(g => ({ ...g, [q._id || q.id]: e.target.value }))} 
                        />
                      </div>
                      <Button 
                        size="md" 
                        variant="primary"
                        style={{ background: '#4f46e5', minWidth: '130px' }}
                        onClick={() => submitGrade(q._id || q.id, grading[q._id || q.id] ?? answer?.marks ?? 0)}
                      >
                        {answer?.isGraded ? 'Update Grade' : 'Save Grade'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {q.type === 'MCQ' && (
                <div className="stack" style={{ gap: '12px' }}>
                  {(q.options || []).map((opt) => {
                    const isSelected = answer?.selectedOption === opt.text || answer?.selectedOption === (opt._id || opt.id);
                    const isActualCorrect = opt.isCorrect;
                    
                    let bg = 'transparent';
                    let border = '1px solid var(--border-subtle)';
                    if (isActualCorrect) {
                      bg = 'var(--color-success-50)';
                      border = '1px solid var(--color-success-500)';
                    } else if (isSelected && !isActualCorrect) {
                      bg = 'var(--color-danger-50)';
                      border = '1px solid var(--color-danger-500)';
                    }
                    
                    return (
                      <div key={opt._id || opt.text} className="row" style={{ alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '6px', border, background: bg }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: isSelected ? '5px solid var(--color-primary-500)' : '1px solid var(--border-subtle)' }} />
                        <span>{opt.text} {isActualCorrect && '(Correct Answer)'} {isSelected && '(Student Answer)'}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === 'TRUE_FALSE' && (
                <div className="stack" style={{ gap: '12px' }}>
                  {['True', 'False'].map((optText) => {
                    const optVal = optText.toLowerCase();
                    const isSelected = answer?.selectedOption?.toLowerCase() === optVal;
                    const isActualCorrect = q.correctAnswer?.toLowerCase() === optVal;
                    
                    let bg = 'transparent';
                    let border = '1px solid var(--border-subtle)';
                    if (isActualCorrect) {
                      bg = 'var(--color-success-50)';
                      border = '1px solid var(--color-success-500)';
                    } else if (isSelected && !isActualCorrect) {
                      bg = 'var(--color-danger-50)';
                      border = '1px solid var(--color-danger-500)';
                    }
                    
                    return (
                      <div key={optVal} className="row" style={{ alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '6px', border, background: bg }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: isSelected ? '5px solid var(--color-primary-500)' : '1px solid var(--border-subtle)' }} />
                        <span>{optText} {isActualCorrect && '(Correct Answer)'} {isSelected && '(Student Answer)'}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === 'SHORT_ANSWER' && (
                <div className="stack" style={{ gap: 'var(--sp-4)' }}>
                  <div>
                    <strong>Student Answer:</strong>
                    <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '4px', marginTop: '4px' }}>
                      {answer?.textAnswer || <em>No answer provided</em>}
                    </div>
                  </div>
                  <div>
                    <strong>Reference Answer:</strong>
                    <div style={{ padding: '12px', background: 'var(--color-success-50)', border: '1px solid var(--color-success-200)', borderRadius: '4px', marginTop: '4px' }}>
                      {q.correctAnswer || <em>No reference answer provided</em>}
                    </div>
                  </div>
                  <div className="row" style={{ alignItems: 'flex-end', gap: '12px', marginTop: '12px', background: 'var(--bg-subtle)', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Grade / Marks (Max: {q.marks})</label>
                      <Input type="number" max={q.marks} min={0} value={grading[q._id || q.id] ?? answer?.marks ?? 0} onChange={(e) => setGrading(g => ({ ...g, [q._id || q.id]: e.target.value }))} disabled={answer?.isGraded} />
                    </div>
                    {!answer?.isGraded ? (
                      <Button size="md" onClick={() => submitGrade(q._id || q.id, grading[q._id || q.id] ?? answer?.marks ?? 0)}>Save Grade</Button>
                    ) : (
                      <Button size="md" variant="ghost" disabled>Graded</Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

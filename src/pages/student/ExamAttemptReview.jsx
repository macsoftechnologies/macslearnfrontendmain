import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as examsApi from '../../api/exams';
import { buildStaticUrl } from '../../api/client';
import PageLoader from '../../components/ui/PageLoader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function ExamAttemptReview() {
  const { id: courseId, examId, attemptId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    examsApi.attemptReview(examId, attemptId)
      .then((res) => {
        const payload = res.data?.data || res.data;
        setAttempt(payload?.attempt);
        setQuestions(payload?.questions || []);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [examId, attemptId]);

  if (loading) return <PageLoader />;
  if (!attempt) return <div style={{ padding: 'var(--sp-6)' }}>Attempt not found or not yet submitted.</div>;

  let computedMarksObtained = 0;
  questions.forEach(q => {
    const answer = attempt.answers.find(a => a.questionId === (q._id || q.id));
    if (q.type === 'MCQ') {
      const correctOpt = (q.options || []).find(o => o.isCorrect);
      if (correctOpt && (correctOpt.text === answer?.selectedOption || correctOpt._id === answer?.selectedOption || correctOpt.id === answer?.selectedOption)) {
        computedMarksObtained += q.marks;
      }
    } else if (q.type === 'TRUE_FALSE') {
      if (q.correctAnswer && q.correctAnswer.toLowerCase() === (answer?.selectedOption || '').toLowerCase()) {
        computedMarksObtained += q.marks;
      }
    } else if (q.type === 'SHORT_ANSWER' || q.type === 'BOOK_REVIEW' || q.type === 'RESEARCH_PAPER') {
      computedMarksObtained += answer?.marks || 0;
    }
  });

  const computedPercentage = attempt.totalMarks > 0 ? (computedMarksObtained / attempt.totalMarks) * 100 : 0;

  return (
    <div className="page" style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-6)' }}>
      <Button variant="ghost" onClick={() => window.history.length > 1 ? navigate(-1) : navigate(`/student/my-courses/${courseId}/learn`)} style={{ marginBottom: 'var(--sp-4)' }}>
        &larr; Back
      </Button>
      
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'bold' }}>Submission Review</h1>
        <p className="text-muted" style={{ marginTop: 'var(--sp-2)' }}>
          Attempt {attempt.attemptNumber}
          &nbsp;&middot;&nbsp; 
          Score: {computedMarksObtained} / {attempt.totalMarks} ({computedPercentage.toFixed(1)}%)
          &nbsp;&middot;&nbsp; 
          Status: {attempt.answers?.some(a => a.isGraded === false) ? <span style={{ color: 'var(--color-amber-600)', fontWeight: 'bold' }}>PENDING REVIEW</span> : <span style={{ color: attempt.isPassed ? 'var(--color-success-600)' : 'var(--color-danger-600)', fontWeight: 'bold' }}>{attempt.isPassed ? 'PASSED' : 'FAILED'}</span>}
        </p>
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
                <span style={{ fontSize: 'var(--fs-sm)', fontWeight: '600', color: dynamicIsCorrect ? 'var(--color-success-600)' : 'var(--color-danger-600)' }}>
                  {dynamicIsCorrect ? 'Correct' : 'Incorrect'} ({dynamicMarks} / {q.marks} marks)
                </span>
              </div>
              
              <div style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--sp-4)', lineHeight: 1.5 }}>{q.questionText || q.text || 'Question Prompt'}</div>

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
                        <span>{opt.text} {isActualCorrect && '(Correct Answer)'} {isSelected && '(Your Answer)'}</span>
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
                        <span>{optText} {isActualCorrect && '(Correct Answer)'} {isSelected && '(Your Answer)'}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {(q.type === 'BOOK_REVIEW' || q.type === 'RESEARCH_PAPER') && (
                <div className="stack" style={{ gap: '14px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '4px 8px', borderRadius: '4px', background: '#e0e7ff', color: '#4338ca' }}>
                      {q.type === 'BOOK_REVIEW' ? '📖 Book Review Submission' : '📄 Research Paper Submission'}
                    </span>
                    {answer?.isGraded === false || answer?.marks === undefined ? (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                        ⏳ Pending Faculty Review
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                        ✓ Evaluated: {answer.marks} / {q.marks} Marks
                      </span>
                    )}
                  </div>

                  {answer?.fileUrl && (
                    <div style={{ 
                      padding: '12px 16px', 
                      background: '#ffffff', 
                      borderRadius: '8px', 
                      border: '1px solid #cbd5e1', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>📎</span>
                        <div>
                          <strong style={{ fontSize: '13px', color: '#0f172a' }}>{answer.fileName || 'Submitted Document'}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Uploaded for examination</div>
                        </div>
                      </div>
                      <a 
                        href={buildStaticUrl(answer.fileUrl)} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ 
                          padding: '6px 14px', 
                          background: '#4f46e5', 
                          color: '#ffffff', 
                          borderRadius: '6px', 
                          fontSize: '12px', 
                          fontWeight: 700, 
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        👁️ View Uploaded File
                      </a>
                    </div>
                  )}

                  <div>
                    <strong style={{ fontSize: '13px', color: '#334155' }}>Your Written Abstract / Summary:</strong>
                    <div style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '6px', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                      {answer?.textAnswer || (typeof answer?.selectedOption === 'string' && !answer.selectedOption.startsWith('http') ? answer.selectedOption : '') || <em>No written commentary provided</em>}
                    </div>
                  </div>

                  {answer?.feedback && (
                    <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1e40af' }}>
                      💬 <strong>Faculty Feedback:</strong> {answer.feedback}
                    </div>
                  )}
                </div>
              )}

              {q.type === 'SHORT_ANSWER' && (
                <div className="stack" style={{ gap: 'var(--sp-4)' }}>
                  <div>
                    <strong>Your Answer:</strong>
                    <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: '4px', marginTop: '4px' }}>
                      {answer?.textAnswer || <em>No answer provided</em>}
                    </div>
                  </div>
                  <div>
                    <strong>Correct Answer:</strong>
                    <div style={{ padding: '12px', background: 'var(--color-success-50)', border: '1px solid var(--color-success-200)', borderRadius: '4px', marginTop: '4px' }}>
                      {q.correctAnswer || <em>No reference answer provided</em>}
                    </div>
                  </div>
                  {!answer?.isGraded && (
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-warning-600)' }}>
                      Note: This answer is pending manual review by an instructor.
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

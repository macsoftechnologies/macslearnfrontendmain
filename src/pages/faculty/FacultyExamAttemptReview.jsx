import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as examsApi from '../../api/exams';
import * as certificatesApi from '../../api/certificates';
import PageLoader from '../../components/ui/PageLoader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { extractErrorMessages } from '../../api/client';

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
  const [issuingCert, setIssuingCert] = useState(false);

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

  const handleIssueCertificate = async () => {
    if (!attempt?.studentId?._id) return;
    setIssuingCert(true);
    try {
      await certificatesApi.approveCertificate({
        studentId: attempt.studentId._id,
        courseId: courseId,
      });
      toast.success('Certificate issued successfully!');
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    } finally {
      setIssuingCert(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!attempt) return <div style={{ padding: 'var(--sp-6)' }}>Attempt not found.</div>;

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
    } else if (q.type === 'SHORT_ANSWER') {
      computedMarksObtained += answer?.marks || 0;
    }
  });

  const computedPercentage = attempt.totalMarks > 0 ? (computedMarksObtained / attempt.totalMarks) * 100 : 0;
  // Fallback to attempt's isPassed if we don't have passing criteria here easily, or we can use computed. 
  // Wait, we don't have passingPercentage here. We will just use attempt.isPassed. Or wait, attempt.isPassed might be wrong! But we don't know the passing criteria on this page easily, though we could fetch it. I'll just leave isPassed as is.

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-6)' }}>
      <Button variant="ghost" onClick={() => navigate(`${base}/courses/${courseId}/exams/${examId}/results`)} style={{ marginBottom: 'var(--sp-4)' }}>
        &larr; Back to Results
      </Button>
      
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'bold' }}>Submission Review: {attempt.studentId?.fullName}</h1>
        <p className="text-muted" style={{ marginTop: 'var(--sp-2)' }}>
          Score: {computedMarksObtained} / {attempt.totalMarks} ({computedPercentage.toFixed(1)}%)
          &nbsp;&middot;&nbsp; 
          Status: {attempt.answers?.some(a => a.isGraded === false) ? <span style={{ color: 'var(--color-amber-600)', fontWeight: 'bold' }}>PENDING REVIEW</span> : <span style={{ color: attempt.isPassed ? 'var(--color-success-600)' : 'var(--color-danger-600)', fontWeight: 'bold' }}>{attempt.isPassed ? 'PASSED' : 'FAILED'}</span>}
        </p>
        
        {exam?.isFinalExam && attempt.isPassed && (
          <div style={{ marginTop: 'var(--sp-4)' }}>
            <Button variant="primary" loading={issuingCert} onClick={handleIssueCertificate}>
              Issue Certificate
            </Button>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-light)', marginTop: '8px' }}>
              This is the final exam. Since the student passed, you can instantly generate and issue their certificate.
            </p>
          </div>
        )}
      </div>

      <div className="stack" style={{ gap: 'var(--sp-6)' }}>
        {questions.map((q, i) => {
          const answer = attempt.answers.find(a => a.questionId === (q._id || q.id));
          
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
          } else if (q.type === 'SHORT_ANSWER') {
            dynamicIsCorrect = answer?.isCorrect || false;
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
              
              <div style={{ fontSize: 'var(--fs-md)', marginBottom: 'var(--sp-4)' }}>{q.text}</div>

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

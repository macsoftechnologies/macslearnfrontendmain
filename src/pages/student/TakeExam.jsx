import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as examsApi from '../../api/exams';
import { extractErrorMessages, buildStaticUrl } from '../../api/client';
import Button from '../../components/ui/Button';
import PageLoader from '../../components/ui/PageLoader';
import { Card } from '../../components/ui/Card';
import Input, { Textarea } from '../../components/ui/Input';
import FileUploader from '../../components/ui/FileUploader';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function TakeExam() {
  const { id: courseId, examId } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionId: selectedOptionId | text }
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const exRes = await examsApi.getById(examId);
        setExam(exRes.data?.data);
        
        // start attempt
        const attRes = await examsApi.start(examId);
        setAttempt(attRes.data?.data);
        
        // fetch questions
        const qRes = await examsApi.listQuestions(examId);
        setQuestions(qRes.data?.data || []);
        
        setLoading(false);
      } catch (err) {
        extractErrorMessages(err).forEach(m => toast.error(m));
        navigate(`/student/my-courses/${courseId}/learn`);
      }
    };
    init();
  }, [examId, courseId, navigate]);

  // Handle timer
  useEffect(() => {
    if (!exam || !attempt) return;
    
    // calculate time left
    const startTime = new Date(attempt.createdAt).getTime();
    const durationMs = exam.durationMinutes * 60 * 1000;
    const endTime = startTime + durationMs;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        toast('Time is up! Auto-submitting exam...', { icon: '⏳' });
        submitExam();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [exam, attempt]);

  const handleSelectOption = (questionId, optionId) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    // Auto-save logic could go here if we wanted
  };
  
  const handleTextAnswer = (questionId, text) => {
    setAnswers(prev => ({ ...prev, [questionId]: text }));
  };

  const submitExam = async () => {
    setSubmitting(true);
    try {
      // 1. save answers
      const answersList = Object.entries(answers).map(([questionId, value]) => {
        const q = questions.find(q => (q._id || q.id) === questionId);
        if (q?.type === 'BOOK_REVIEW' || q?.type === 'RESEARCH_PAPER') {
          return {
            questionId,
            fileUrl: typeof value === 'object' ? value.fileUrl : (typeof value === 'string' && value.startsWith('http') ? value : ''),
            fileName: typeof value === 'object' ? value.fileName : 'Submitted Document',
            textAnswer: typeof value === 'object' ? value.textAnswer : (typeof value === 'string' && !value.startsWith('http') ? value : ''),
          };
        }
        if (q?.type === 'SHORT_ANSWER') {
          return { questionId, textAnswer: typeof value === 'object' ? value.textAnswer : value };
        }
        return { questionId, selectedOption: value };
      });
      
      // submit exam with answers
      await examsApi.submit(examId, { answers: answersList });
      toast.success('Exam submitted successfully!');
      navigate(`/student/my-courses/${courseId}/learn`);
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{ background: 'var(--bg-app)', minHeight: '100vh', padding: 'var(--sp-8)' }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)', background: 'var(--bg-surface-card)', padding: 'var(--sp-6)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-md)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--fs-xl)', margin: 0, color: 'var(--text-primary)' }}>{exam?.title}</h1>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>Answer all questions before submitting.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: timeLeft < 300 ? 'var(--danger)' : 'var(--color-cyan-400)', fontFamily: 'var(--font-mono)' }}>
              {formatTime(timeLeft)}
            </div>
            <div className="text-muted" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Time Remaining</div>
          </div>
        </div>

        <div className="stack" style={{ gap: 'var(--sp-6)' }}>
          {questions.length > 0 && (
            <Card key={questions[currentIndex]._id || questions[currentIndex].id} style={{ padding: 'var(--sp-8)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-6)' }}>
                <h3 style={{ fontSize: 'var(--fs-md)', margin: 0, color: 'var(--text-primary)' }}>
                  <span style={{ fontWeight: 700, marginRight: '8px', color: 'var(--accent)' }}>{currentIndex + 1}.</span> 
                  {questions[currentIndex].questionText}
                  <span className="text-muted" style={{ fontSize: 'var(--fs-xs)', marginLeft: '12px', fontWeight: 'normal', color: 'var(--text-muted)' }}>[{questions[currentIndex].marks} Marks]</span>
                </h3>
                <div className="text-muted" style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  Question {currentIndex + 1} of {questions.length}
                </div>
              </div>
              
                            {questions[currentIndex].type === 'MCQ' ? (
                <div className="stack" style={{ gap: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#4338ca', background: '#e0e7ff', padding: '4px 10px', borderRadius: '4px', display: 'inline-block', width: 'fit-content' }}>
                    MULTIPLE CHOICE QUESTION (Select 1 Option)
                  </div>
                  {(questions[currentIndex].options || []).map((opt) => {
                    const qId = questions[currentIndex]._id || questions[currentIndex].id;
                    const optId = opt._id || opt.text;
                    const isSelected = answers[qId] === optId;
                    
                    return (
                      <label key={optId} className="row" style={{ alignItems: 'center', gap: '14px', cursor: 'pointer', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: isSelected ? '2px solid #4f46e5' : '1px solid var(--border-subtle)', background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)', color: isSelected ? '#4338ca' : 'var(--text-primary)', transition: 'all var(--transition-fast)' }}>
                        <input 
                          type="radio" 
                          name={qId} 
                          checked={isSelected}
                          onChange={() => handleSelectOption(qId, optId)}
                          style={{ width: '18px', height: '18px', accentColor: '#4f46e5' }}
                        />
                        <span style={{ fontWeight: isSelected ? 600 : 400 }}>{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              ) : questions[currentIndex].type === 'TRUE_FALSE' ? (
                <div className="stack" style={{ gap: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '4px 10px', borderRadius: '4px', display: 'inline-block', width: 'fit-content' }}>
                    TRUE OR FALSE (Select True or False)
                  </div>
                  {['True', 'False'].map((optText) => {
                    const qId = questions[currentIndex]._id || questions[currentIndex].id;
                    const optId = optText.toLowerCase();
                    const isSelected = answers[qId] === optId;
                    
                    return (
                      <label key={optId} className="row" style={{ alignItems: 'center', gap: '14px', cursor: 'pointer', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: isSelected ? '2px solid #0284c7' : '1px solid var(--border-subtle)', background: isSelected ? 'rgba(2, 132, 199, 0.08)' : 'rgba(255, 255, 255, 0.02)', color: isSelected ? '#0369a1' : 'var(--text-primary)', transition: 'all var(--transition-fast)' }}>
                        <input 
                          type="radio" 
                          name={qId} 
                          checked={isSelected}
                          onChange={() => handleSelectOption(qId, optId)}
                          style={{ width: '18px', height: '18px', accentColor: '#0284c7' }}
                        />
                        <span style={{ fontWeight: isSelected ? 600 : 400 }}>{optText}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (questions[currentIndex].type === 'BOOK_REVIEW' || questions[currentIndex].type === 'RESEARCH_PAPER') ? (
                <div className="stack" style={{ gap: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '4px 10px', borderRadius: '4px', display: 'inline-block', width: 'fit-content' }}>
                    {questions[currentIndex].type === 'BOOK_REVIEW' ? '📖 BOOK REVIEW SUBMISSION (Upload File & Summary)' : '📄 RESEARCH PAPER SUBMISSION (Upload File & Abstract)'}
                  </div>
                  
                  {questions[currentIndex].attachmentUrl && (
                    <div style={{ padding: '10px 14px', background: 'var(--bg-surface-muted)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={18} color="#4f46e5" />
                      <span style={{ fontSize: '13px' }}>Reference Material / Guidelines: </span>
                      <a href={questions[currentIndex].attachmentUrl} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', fontWeight: 600, fontSize: '13px' }}>Download File</a>
                    </div>
                  )}

                  <div className="stack" style={{ gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Upload File (PDF, Word DOC/DOCX, TXT)</label>
                    <FileUploader 
                      folder="exams"
                      maxSizeMB={25}
                      accept={{
                        'application/pdf': ['.pdf'],
                        'application/msword': ['.doc'],
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                        'text/plain': ['.txt'],
                        'image/*': ['.jpg', '.jpeg', '.png']
                      }}
                      preview={answers[questions[currentIndex]._id || questions[currentIndex].id]?.fileUrl}
                      onUploaded={(url, file) => {
                        const qId = questions[currentIndex]._id || questions[currentIndex].id;
                        setAnswers(prev => ({
                          ...prev,
                          [qId]: {
                            ...(typeof prev[qId] === 'object' ? prev[qId] : {}),
                            fileUrl: url,
                            fileName: file?.name || 'Uploaded Document'
                          }
                        }));
                        toast.success('Document attached to question');
                      }}
                    />
                    {answers[questions[currentIndex]._id || questions[currentIndex].id]?.fileUrl && (
                      <div style={{ 
                        marginTop: '8px', 
                        padding: '12px 16px', 
                        background: '#f0fdf4', 
                        borderRadius: '8px', 
                        border: '1px solid #bbf7d0', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>📎</span>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                              {answers[questions[currentIndex]._id || questions[currentIndex].id]?.fileName || 'Uploaded Document'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#15803d' }}>Ready for submission</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <a 
                            href={buildStaticUrl(answers[questions[currentIndex]._id || questions[currentIndex].id]?.fileUrl)} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ 
                              padding: '6px 12px', 
                              background: '#4f46e5', 
                              color: '#ffffff', 
                              borderRadius: '6px', 
                              fontSize: '12px', 
                              fontWeight: 600, 
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            👁️ View / Open File
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              const qId = questions[currentIndex]._id || questions[currentIndex].id;
                              setAnswers(prev => ({
                                ...prev,
                                [qId]: {
                                  ...(typeof prev[qId] === 'object' ? prev[qId] : {}),
                                  fileUrl: '',
                                  fileName: ''
                                }
                              }));
                            }}
                            style={{
                              padding: '6px 10px',
                              background: '#fee2e2',
                              color: '#991b1b',
                              border: '1px solid #fca5a5',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            ✕ Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="stack" style={{ gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Written Summary / Abstract / Comments (Optional)</label>
                    <Textarea 
                      rows={4}
                      placeholder="Enter abstract, commentary, or review notes here..."
                      value={answers[questions[currentIndex]._id || questions[currentIndex].id]?.textAnswer || (typeof answers[questions[currentIndex]._id || questions[currentIndex].id] === 'string' ? answers[questions[currentIndex]._id || questions[currentIndex].id] : '')}
                      onChange={(e) => {
                        const qId = questions[currentIndex]._id || questions[currentIndex].id;
                        setAnswers(prev => ({
                          ...prev,
                          [qId]: {
                            ...(typeof prev[qId] === 'object' ? prev[qId] : {}),
                            textAnswer: e.target.value
                          }
                        }));
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="stack" style={{ gap: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '4px 10px', borderRadius: '4px', display: 'inline-block', width: 'fit-content' }}>
                    WRITTEN ANSWER
                  </div>
                  <Textarea 
                    rows={4}
                    placeholder="Type your answer here..."
                    value={answers[questions[currentIndex]._id || questions[currentIndex].id] || ''}
                    onChange={(e) => handleTextAnswer(questions[currentIndex]._id || questions[currentIndex].id, e.target.value)}
                  />
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="row" style={{ justifyContent: 'space-between', marginTop: 'var(--sp-8)' }}>
          <Button 
            variant="outline" 
            onClick={() => setCurrentIndex(c => Math.max(0, c - 1))} 
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          
          {currentIndex < questions.length - 1 ? (
            <Button onClick={() => setCurrentIndex(c => Math.min(questions.length - 1, c + 1))}>
              Next
            </Button>
          ) : (
            <Button size="lg" loading={submitting} onClick={() => setConfirmSubmit(true)}>Submit Exam</Button>
          )}
        </div>

        <ConfirmDialog
          open={confirmSubmit}
          onClose={() => setConfirmSubmit(false)}
          onConfirm={() => {
            setConfirmSubmit(false);
            submitExam();
          }}
          title="Submit Exam"
          description="Are you sure you want to submit? You cannot change your answers after this."
          confirmLabel="Yes, Submit"
        />
        
      </div>
    </div>
  );
}


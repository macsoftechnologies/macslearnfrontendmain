import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as examsApi from '../../api/exams';
import { extractErrorMessages } from '../../api/client';
import Button from '../../components/ui/Button';
import PageLoader from '../../components/ui/PageLoader';
import { Card } from '../../components/ui/Card';
import Input, { Textarea } from '../../components/ui/Input';
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
        const q = questions.find(q => q._id === questionId || q.id === questionId);
        if (q?.type === 'SHORT_ANSWER') {
          return { questionId, textAnswer: value };
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
                  {(questions[currentIndex].options || []).map((opt) => {
                    const qId = questions[currentIndex]._id || questions[currentIndex].id;
                    const optId = opt._id || opt.text;
                    const isSelected = answers[qId] === optId;
                    
                    return (
                      <label key={optId} className="row" style={{ alignItems: 'center', gap: '14px', cursor: 'pointer', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-subtle)', background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)', color: isSelected ? 'var(--brand, #4f46e5)' : 'var(--text-primary)', transition: 'all var(--transition-fast)' }}>
                        <input 
                          type="radio" 
                          name={qId} 
                          checked={isSelected}
                          onChange={() => handleSelectOption(qId, optId)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                        />
                        <span>{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              ) : questions[currentIndex].type === 'TRUE_FALSE' ? (
                <div className="stack" style={{ gap: '14px' }}>
                  {['True', 'False'].map((optText) => {
                    const qId = questions[currentIndex]._id || questions[currentIndex].id;
                    const optId = optText.toLowerCase();
                    const isSelected = answers[qId] === optId;
                    
                    return (
                      <label key={optId} className="row" style={{ alignItems: 'center', gap: '14px', cursor: 'pointer', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-subtle)', background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)', color: isSelected ? 'var(--brand, #4f46e5)' : 'var(--text-primary)', transition: 'all var(--transition-fast)' }}>
                        <input 
                          type="radio" 
                          name={qId} 
                          checked={isSelected}
                          onChange={() => handleSelectOption(qId, optId)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                        />
                        <span>{optText}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <Textarea 
                  rows={4}
                  placeholder="Type your answer here..."
                  value={answers[questions[currentIndex]._id || questions[currentIndex].id] || ''}
                  onChange={(e) => handleTextAnswer(questions[currentIndex]._id || questions[currentIndex].id, e.target.value)}
                />
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


import React, { useState, useEffect } from 'react';
import { Sparkles, BrainCircuit, BookOpen, Zap, ListChecks, X, CheckCircle, AlertCircle, ArrowLeft, ArrowRight, RotateCcw, Copy, Check, Search, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AIAssistantPanel({
  activeLesson,
  showAI,
  isThinking,
  thinkingPhase,
  aiPanelOpen,
  aiData,
  onOpen,
  onClose,
}) {
  const [activeView, setActiveView] = useState(null); // 'summary' | 'quiz' | 'simplify' | 'revision' | null
  const [copied, setCopied] = useState(false);

  // Quiz state
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);

  // Simplify topics search
  const [searchTerm, setSearchTerm] = useState('');

  // Revision checklist
  const [checkedTakeaways, setCheckedTakeaways] = useState({});

  useEffect(() => {
    if (!aiPanelOpen) {
      setActiveView(null);
      resetQuiz();
    }
  }, [aiPanelOpen]);

  const summary = aiData?.summary || activeLesson?.description || 'No summary available for this lecture.';
  const quizPool = Array.isArray(aiData?.quiz_pool) ? aiData.quiz_pool : [];
  const backstory = Array.isArray(aiData?.backstory) ? aiData.backstory : [];
  const keyTakeaways = Array.isArray(aiData?.key_takeaways) ? aiData.key_takeaways : [];

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const resetQuiz = () => {
    setCurrentQuizIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setQuizScore(0);
    setQuizCompleted(false);
    setUserAnswers([]);
  };

  const handleSelectOption = (idx) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const currentQ = quizPool[currentQuizIndex];
    const isCorrect = idx === currentQ.correct_index;
    if (isCorrect) {
      setQuizScore(s => s + 1);
    }
    setUserAnswers(prev => [...prev, { qId: currentQ.id || currentQuizIndex, selected: idx, isCorrect }]);
  };

  const handleNextQuestion = () => {
    if (currentQuizIndex < quizPool.length - 1) {
      setCurrentQuizIndex(i => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const toggleTakeaway = (idx) => {
    setCheckedTakeaways(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const filteredBackstory = backstory.filter(b => 
    b.topic?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.explanation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!aiPanelOpen) return null;

  return (
    <div className="ai-overlay" style={{ zIndex: 9999 }}>
      <div className="ai-panel" style={{ width: '90vw', maxWidth: '850px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="ai-panel__header" style={{ borderBottom: '1px solid var(--border-subtle, #e2e8f0)', padding: '16px 24px' }}>
          <div className="ai-panel__header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {activeView ? (
              <button 
                onClick={() => setActiveView(null)} 
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Back to AI Hub"
              >
                <ArrowLeft size={18} color="#475569" />
              </button>
            ) : (
              <div className="ai-panel__icon-wrap">
                <Sparkles size={18} />
              </div>
            )}
            <div>
              <h3 className="ai-panel__title" style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                {activeView === 'summary' && '📖 Lesson Summary'}
                {activeView === 'quiz' && '🎯 Auto-Generated Interactive Quiz'}
                {activeView === 'simplify' && '⚡ Simplify Topics & Terminology'}
                {activeView === 'revision' && '✨ Quick Revision Points'}
                {!activeView && 'AI Study Assistant'}
              </h3>
              <p className="ai-panel__subtitle" style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                {activeLesson?.title || 'Lesson Analysis'}
              </p>
            </div>
          </div>
          <button className="ai-panel__close" onClick={onClose} style={{ cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="ai-panel__body" style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
          {isThinking ? (
            <div className="ai-thinking">
              <div className="ai-thinking__brain-ring">
                <div className="ai-thinking__brain-core">
                  <BrainCircuit size={40} />
                </div>
                <svg className="ai-thinking__ring-svg" viewBox="0 0 120 120">
                  <circle className="ai-thinking__ring-track" cx="60" cy="60" r="54" />
                  <circle className="ai-thinking__ring-progress" cx="60" cy="60" r="54" />
                </svg>
              </div>

              <div className="ai-thinking__phases">
                <p className={`ai-thinking__phase ${thinkingPhase >= 0 ? 'ai-thinking__phase--active' : ''} ${thinkingPhase > 0 ? 'ai-thinking__phase--done' : ''}`}>
                  <span className="ai-thinking__phase-dot" />
                  <BrainCircuit size={14} /> Scanning lecture audio & visual patterns...
                </p>
                <p className={`ai-thinking__phase ${thinkingPhase >= 1 ? 'ai-thinking__phase--active' : ''} ${thinkingPhase > 1 ? 'ai-thinking__phase--done' : ''}`}>
                  <span className="ai-thinking__phase-dot" />
                  <BookOpen size={14} /> Extracting core topics & theology transcript...
                </p>
                <p className={`ai-thinking__phase ${thinkingPhase >= 2 ? 'ai-thinking__phase--active' : ''} ${thinkingPhase > 2 ? 'ai-thinking__phase--done' : ''}`}>
                  <span className="ai-thinking__phase-dot" />
                  <Zap size={14} /> Formulating interactive quizzes & simplified analogies...
                </p>
                <p className={`ai-thinking__phase ${thinkingPhase >= 3 ? 'ai-thinking__phase--active' : ''}`}>
                  <span className="ai-thinking__phase-dot" />
                  <ListChecks size={14} /> Compiling comprehensive study package...
                </p>
              </div>
            </div>
          ) : showAI && !activeView ? (
            /* ---- 4 MAIN CARDS HUB ---- */
            <div className="ai-results">
              <div className="ai-results__grid">
                {/* Card 1: Summary */}
                <div 
                  className="ai-card ai-card--1" 
                  onClick={() => setActiveView('summary')}
                  style={{ animationDelay: '0s', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="ai-card__icon" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                      <BookOpen size={20} color="#fff" />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#f3e8ff', color: '#7c3aed' }}>
                      Complete Breakdown
                    </span>
                  </div>
                  <div className="ai-card__content">
                    <h4 className="ai-card__title">Lesson Summary</h4>
                    <p className="ai-card__desc">
                      {summary.slice(0, 130)}...
                    </p>
                    <button className="ai-card__action" style={{ color: '#7c3aed', marginTop: '8px', fontWeight: 700 }}>
                      View Summary →
                    </button>
                  </div>
                </div>

                {/* Card 2: Quizzes */}
                <div 
                  className="ai-card ai-card--2" 
                  onClick={() => { resetQuiz(); setActiveView('quiz'); }}
                  style={{ animationDelay: '0.15s', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="ai-card__icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #60a5fa)' }}>
                      <ListChecks size={20} color="#fff" />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb' }}>
                      {quizPool.length} Questions
                    </span>
                  </div>
                  <div className="ai-card__content">
                    <h4 className="ai-card__title">Auto-Generated Quiz</h4>
                    <p className="ai-card__desc">
                      Interactive test pool generated directly from this video's lecture with instant feedback and explanations.
                    </p>
                    <button className="ai-card__action" style={{ color: '#3b82f6', marginTop: '8px', fontWeight: 700 }}>
                      Take Quiz ({quizPool.length} Qs) →
                    </button>
                  </div>
                </div>

                {/* Card 3: Simplify Topics */}
                <div 
                  className="ai-card ai-card--3" 
                  onClick={() => setActiveView('simplify')}
                  style={{ animationDelay: '0.3s', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="ai-card__icon" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                      <Zap size={20} color="#fff" />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#ecfdf5', color: '#059669' }}>
                      {backstory.length} Core Concepts
                    </span>
                  </div>
                  <div className="ai-card__content">
                    <h4 className="ai-card__title">Simplify Topics</h4>
                    <p className="ai-card__desc">
                      Complex theological terms, historical people, and Greek origins explained with plain language and analogies.
                    </p>
                    <button className="ai-card__action" style={{ color: '#10b981', marginTop: '8px', fontWeight: 700 }}>
                      Simplify ({backstory.length} Topics) →
                    </button>
                  </div>
                </div>

                {/* Card 4: Revision */}
                <div 
                  className="ai-card ai-card--4" 
                  onClick={() => setActiveView('revision')}
                  style={{ animationDelay: '0.45s', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="ai-card__icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
                      <Sparkles size={20} color="#fff" />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#fffbeb', color: '#d97706' }}>
                      {keyTakeaways.length} Key Points
                    </span>
                  </div>
                  <div className="ai-card__content">
                    <h4 className="ai-card__title">Quick Revision</h4>
                    <p className="ai-card__desc">
                      High-yield revision checklist and memory anchors ready to save or review before assessments.
                    </p>
                    <button className="ai-card__action" style={{ color: '#f59e0b', marginTop: '8px', fontWeight: 700 }}>
                      View Points ({keyTakeaways.length} Points) →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeView === 'summary' ? (
            /* ---- VIEW 1: SUMMARY ---- */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  Complete AI Narrative & Synthesis
                </span>
                <button 
                  onClick={() => handleCopy(summary)} 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#6366f1', background: '#eef2ff', border: '1px solid #c7d2fe', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy Summary'}
                </button>
              </div>

              <div style={{ fontSize: '15px', lineHeight: 1.8, color: '#334155', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', whiteSpace: 'pre-line' }}>
                {summary}
              </div>
            </div>
          ) : activeView === 'quiz' ? (
            /* ---- VIEW 2: INTERACTIVE QUIZ ---- */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {quizPool.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <HelpCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <p>No quiz questions generated for this video yet.</p>
                </div>
              ) : quizCompleted ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle size={36} />
                  </div>
                  <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Quiz Completed!</h3>
                  <p style={{ fontSize: '15px', color: '#64748b', margin: '0 0 20px' }}>
                    You scored <strong style={{ color: '#16a34a', fontSize: '18px' }}>{quizScore}</strong> out of <strong style={{ fontSize: '18px' }}>{quizPool.length}</strong> ({Math.round((quizScore / quizPool.length) * 100)}%)
                  </p>
                  <button 
                    onClick={resetQuiz} 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <RotateCcw size={16} /> Retake Quiz
                  </button>
                </div>
              ) : (
                (() => {
                  const q = quizPool[currentQuizIndex];
                  const progressPct = ((currentQuizIndex + 1) / quizPool.length) * 100;

                  return (
                    <div>
                      {/* Quiz Progress Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5' }}>
                          Question {currentQuizIndex + 1} of {quizPool.length}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                          Score: {quizScore}
                        </span>
                      </div>
                      <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden', marginBottom: '20px' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: '#4f46e5', transition: 'width 0.3s ease' }} />
                      </div>

                      {/* Question Box */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0, lineHeight: 1.5 }}>
                          {q.question}
                        </h4>
                      </div>

                      {/* Options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {q.options?.map((opt, oIdx) => {
                          const isSelected = selectedOption === oIdx;
                          const isCorrect = oIdx === q.correct_index;
                          
                          let bg = '#ffffff';
                          let border = '#e2e8f0';
                          let color = '#334155';
                          let icon = null;

                          if (isAnswered) {
                            if (isCorrect) {
                              bg = '#f0fdf4';
                              border = '#86efac';
                              color = '#15803d';
                              icon = <CheckCircle size={18} color="#16a34a" />;
                            } else if (isSelected) {
                              bg = '#fef2f2';
                              border = '#fca5a5';
                              color = '#b91c1c';
                              icon = <AlertCircle size={18} color="#dc2626" />;
                            }
                          } else if (isSelected) {
                            bg = '#eef2ff';
                            border = '#818cf8';
                            color = '#4338ca';
                          }

                          return (
                            <button
                              key={oIdx}
                              onClick={() => handleSelectOption(oIdx)}
                              disabled={isAnswered}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '14px 18px',
                                borderRadius: '10px',
                                background: bg,
                                border: `1.5px solid ${border}`,
                                color: color,
                                fontSize: '14px',
                                fontWeight: isSelected || (isAnswered && isCorrect) ? 700 : 500,
                                textAlign: 'left',
                                cursor: isAnswered ? 'default' : 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: isSelected || (isAnswered && isCorrect) ? 'currentColor' : '#f1f5f9', color: isSelected || (isAnswered && isCorrect) ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span>{opt}</span>
                              </div>
                              {icon}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation & Next */}
                      {isAnswered && (
                        <div style={{ marginTop: '16px', animation: 'ai-card-in 0.3s ease' }}>
                          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                            <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                              💡 Explanation:
                            </strong>
                            <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                              {q.explanation || 'Based directly on the lecture discussion.'}
                            </p>
                          </div>

                          <button
                            onClick={handleNextQuestion}
                            style={{
                              width: '100%',
                              padding: '12px',
                              background: '#4f46e5',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              cursor: 'pointer'
                            }}
                          >
                            {currentQuizIndex < quizPool.length - 1 ? 'Next Question →' : 'Finish Quiz & View Score 🎉'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          ) : activeView === 'simplify' ? (
            /* ---- VIEW 3: SIMPLIFY TOPICS (BACKSTORY) ---- */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="Search topics (e.g. Historia, Clement, Reformation)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              {filteredBackstory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  No matching topics found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredBackstory.map((item, idx) => (
                    <div 
                      key={idx}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                        <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          {item.topic}
                        </h4>
                      </div>
                      <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                        {item.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeView === 'revision' ? (
            /* ---- VIEW 4: QUICK REVISION (KEY TAKEAWAYS) ---- */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbeb', padding: '12px 16px', borderRadius: '10px', border: '1px solid #fde68a' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#b45309' }}>
                  🎯 Memory Anchors for Exam Prep ({Object.values(checkedTakeaways).filter(Boolean).length}/{keyTakeaways.length} Revised)
                </span>
                <button 
                  onClick={() => handleCopy(keyTakeaways.map((t, i) => `${i+1}. ${t}`).join('\n'))} 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#d97706', background: '#fff', border: '1px solid #fcd34d', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy All Points'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {keyTakeaways.map((point, idx) => {
                  const isChecked = !!checkedTakeaways[idx];
                  return (
                    <div 
                      key={idx}
                      onClick={() => toggleTakeaway(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '14px 16px',
                        background: isChecked ? '#f8fafc' : '#ffffff',
                        border: `1px solid ${isChecked ? '#cbd5e1' : '#e2e8f0'}`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => {}} 
                        style={{ marginTop: '3px', cursor: 'pointer', width: '16px', height: '16px', accentColor: '#d97706' }} 
                      />
                      <span style={{ fontSize: '14px', color: isChecked ? '#94a3b8' : '#1e293b', textDecoration: isChecked ? 'line-through' : 'none', lineHeight: 1.5 }}>
                        {point}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AIFab({ activeTab, activeLesson, showAI, isThinking, onOpen }) {
  if (activeTab !== 'lessons' || !activeLesson || showAI || isThinking) return null;

  return (
    <button 
      className="ai-fab-onetouch" 
      onClick={onOpen}
      title="One Touch Sacred AI Assistant"
    >
      <span className="ai-fab-onetouch__halo" />
      <div className="ai-fab-onetouch__icon-wrap">
        <Sparkles size={20} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', lineHeight: 1.1 }}>
        <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#fbbf24' }}>
          One Touch
        </span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
          AI Assistant
        </span>
      </div>
    </button>
  );
}

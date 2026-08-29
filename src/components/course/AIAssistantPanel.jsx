import React, { useState, useEffect } from 'react';
import { 
  Sparkles, BrainCircuit, BookOpen, Zap, ListChecks, X, CheckCircle, 
  AlertCircle, ArrowLeft, RotateCcw, Copy, Check, Search, HelpCircle, 
  Award, Trophy, Volume2, VolumeX, Flame, Star, Loader2, Sparkle
} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';

export default function AIAssistantPanel({
  courseId,
  activeLesson,
  showAI,
  isThinking,
  thinkingPhase,
  aiPanelOpen,
  aiData,
  onOpen,
  onClose,
  onRefreshAiData,
}) {
  const [activeView, setActiveView] = useState(null); // 'summary' | 'quiz' | 'simplify' | 'revision' | null
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Mini-thinking transition state when clicking cards
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchTarget, setSwitchTarget] = useState('');

  // Quiz state
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [streak, setStreak] = useState(0);

  // Simplify topics search
  const [searchTerm, setSearchTerm] = useState('');

  // Revision checklist
  const [checkedTakeaways, setCheckedTakeaways] = useState({});

  useEffect(() => {
    if (!aiPanelOpen) {
      setActiveView(null);
      setIsSwitching(false);
      resetQuiz();
      stopSpeech();
    }
  }, [aiPanelOpen]);

  const payload = aiData?.data || aiData || {};
  const summary = payload?.summary || activeLesson?.description || 'No summary available for this lecture.';
  const quizPool = Array.isArray(payload?.quiz_pool) ? payload.quiz_pool : [];
  const totalPoolCount = payload?.total_pool_count || quizPool.length || 35;
  const backstory = Array.isArray(payload?.backstory) ? payload.backstory : [];
  const keyTakeaways = Array.isArray(payload?.key_takeaways) ? payload.key_takeaways : [];
  const latestAttempt = payload?.latest_attempt || null;

  // Seamless holographic transition when opening cards
  const handleOpenSection = (sectionKey) => {
    setIsSwitching(true);
    setSwitchTarget(sectionKey);
    if (sectionKey === 'quiz') {
      resetQuiz();
    }
    setTimeout(() => {
      setActiveView(sectionKey);
      setIsSwitching(false);
    }, 750);
  };

  // Text-To-Speech
  const toggleSpeech = (text) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech not supported on this browser.');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

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
    setStreak(0);
  };

  const handleRetakeWithNewQuestions = () => {
    setIsSwitching(true);
    setSwitchTarget('quiz');
    resetQuiz();
    if (onRefreshAiData) {
      onRefreshAiData();
    }
    setTimeout(() => {
      setIsSwitching(false);
    }, 800);
  };

  const handleSelectOption = (idx) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const currentQ = quizPool[currentQuizIndex];
    const isCorrect = idx === currentQ.correct_index;
    if (isCorrect) {
      setQuizScore(s => s + 1);
      setStreak(st => st + 1);
    } else {
      setStreak(0);
    }

    setUserAnswers(prev => [
      ...prev, 
      { 
        questionId: currentQ.id || `q_${currentQuizIndex}`, 
        selectedIndex: idx, 
        questionText: currentQ.question 
      }
    ]);
  };

  const handleNextQuestion = async () => {
    if (currentQuizIndex < quizPool.length - 1) {
      setCurrentQuizIndex(i => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setQuizCompleted(true);
      const lessonId = activeLesson?.id || activeLesson?._id;
      if (courseId && lessonId) {
        try {
          await client.post(`/courses/${courseId}/content/lessons/${lessonId}/ai-quiz/submit`, {
            answers: userAnswers
          });
        } catch (err) {
          console.warn('Could not save quiz attempt', err);
        }
      }
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
    <div className="ai-overlay-cinematic" style={{ zIndex: 9999 }}>
      <div className="ai-panel-cinematic">
        {/* Header */}
        <div className="ai-header-cinematic">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {activeView && !isSwitching ? (
              <button 
                onClick={() => { setActiveView(null); stopSpeech(); }} 
                className="ai-back-btn"
                title="Back to AI Hub"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <div className="ai-icon-sparkle">
                <Sparkles size={20} color="#fff" />
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  {activeView === 'summary' && '📖 Lesson Narrative Synthesis'}
                  {activeView === 'quiz' && '🎯 Knowledge Challenge (5 Random Qs)'}
                  {activeView === 'simplify' && '⚡ Concept & Terminology Simplified'}
                  {activeView === 'revision' && '✨ Quick Revision Anchors'}
                  {!activeView && 'Sacred AI Study Companion'}
                </h3>
                <span className="ai-live-badge">Live AI</span>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>
                {activeLesson?.title || 'Academic Video Intelligence'}
              </p>
            </div>
          </div>
          <button className="ai-close-btn" onClick={() => { stopSpeech(); onClose(); }}>
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div className="ai-body-cinematic">
          {isThinking ? (
            /* ---- INITIAL FULL NEURAL SYNTHESIS ANIMATION ---- */
            <div className="ai-synthesis-box">
              <div className="ai-neural-ring">
                <div className="ai-neural-core">
                  <BrainCircuit size={48} className="ai-pulse-icon" />
                </div>
                <div className="ai-ring-orbit" />
                <div className="ai-ring-orbit ai-ring-orbit--2" />
              </div>

              <div className="ai-synthesis-text-wrap">
                <h3 className="ai-synthesis-title">Neural Engine Synthesizing Lecture...</h3>
                <p className="ai-synthesis-sub">Scanning video audio tracks, theological transcripts & generating study package</p>
              </div>

              <div className="ai-phases-stream">
                <div className={`ai-stream-row ${thinkingPhase >= 0 ? 'ai-stream-row--active' : ''} ${thinkingPhase > 0 ? 'ai-stream-row--done' : ''}`}>
                  <div className="ai-stream-dot" />
                  <BrainCircuit size={15} />
                  <span>Scanning lecture video & audio waveform patterns</span>
                  {thinkingPhase > 0 && <Check size={14} className="ai-check-green" />}
                </div>
                <div className={`ai-stream-row ${thinkingPhase >= 1 ? 'ai-stream-row--active' : ''} ${thinkingPhase > 1 ? 'ai-stream-row--done' : ''}`}>
                  <div className="ai-stream-dot" />
                  <BookOpen size={15} />
                  <span>Synthesizing comprehensive theological narrative</span>
                  {thinkingPhase > 1 && <Check size={14} className="ai-check-green" />}
                </div>
                <div className={`ai-stream-row ${thinkingPhase >= 2 ? 'ai-stream-row--active' : ''} ${thinkingPhase > 2 ? 'ai-stream-row--done' : ''}`}>
                  <div className="ai-stream-dot" />
                  <Zap size={15} />
                  <span>Sampling 5 randomized questions from {totalPoolCount}-question bank</span>
                  {thinkingPhase > 2 && <Check size={14} className="ai-check-green" />}
                </div>
                <div className={`ai-stream-row ${thinkingPhase >= 3 ? 'ai-stream-row--active' : ''}`}>
                  <div className="ai-stream-dot" />
                  <ListChecks size={15} />
                  <span>Formulating memory anchors & plain-language analogies</span>
                </div>
              </div>
            </div>
          ) : isSwitching ? (
            /* ---- SWIRLING HOLOGRAPHIC TRANSITION WHEN CLICKING ANY CARD ---- */
            <div className="ai-mini-swirl-box">
              <div className="ai-swirl-loader">
                <div className="ai-swirl-core">
                  <Sparkles size={32} className="ai-swirl-sparkle" />
                </div>
                <div className="ai-swirl-vortex" />
                <div className="ai-swirl-vortex ai-swirl-vortex--outer" />
              </div>
              <h4 className="ai-swirl-title">
                {switchTarget === 'summary' && 'Synthesizing Narrative & Audio Streams...'}
                {switchTarget === 'quiz' && 'Compiling 5 Randomized Challenge Questions...'}
                {switchTarget === 'simplify' && 'Unpacking Theological Concepts & Analogies...'}
                {switchTarget === 'revision' && 'Constructing High-Yield Revision Anchors...'}
              </h4>
              <p className="ai-swirl-sub">One-Touch AI formatting intelligence for this lecture</p>
            </div>
          ) : showAI && !activeView ? (
            /* ---- 4 MAIN INTERACTIVE CARDS HUB ---- */
            <div className="ai-hub-container">
              {latestAttempt && (
                <div className="ai-attempt-banner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="ai-trophy-badge">
                      <Trophy size={18} color="#15803d" />
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#15803d' }}>
                        Your Previous Quiz Score:
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 900, color: '#166534', marginLeft: '6px' }}>
                        {latestAttempt.score} / {latestAttempt.totalQuestions} ({latestAttempt.percentage}%)
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Saved on {new Date(latestAttempt.completedAt).toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="ai-hub-grid">
                {/* Card 1: Summary */}
                <div className="ai-hub-card ai-hub-card--purple" onClick={() => handleOpenSection('summary')}>
                  <div className="ai-card-top">
                    <div className="ai-card-iconwrap ai-card-iconwrap--purple">
                      <BookOpen size={22} color="#fff" />
                    </div>
                    <span className="ai-card-pill ai-card-pill--purple">Full Synthesis</span>
                  </div>
                  <h4 className="ai-card-heading">Lesson Summary</h4>
                  <p className="ai-card-snippet">{summary.slice(0, 120)}...</p>
                  <button className="ai-card-btn ai-card-btn--purple">
                    View Summary & Listen →
                  </button>
                </div>

                {/* Card 2: 5-Q Quiz */}
                <div className="ai-hub-card ai-hub-card--blue" onClick={() => handleOpenSection('quiz')}>
                  <div className="ai-card-top">
                    <div className="ai-card-iconwrap ai-card-iconwrap--blue">
                      <ListChecks size={22} color="#fff" />
                    </div>
                    <span className="ai-card-pill ai-card-pill--blue">5 Random Qs</span>
                  </div>
                  <h4 className="ai-card-heading">Knowledge Challenge</h4>
                  <p className="ai-card-snippet">5 questions randomly sampled from the {totalPoolCount}-question bank. Live scoring & explanations.</p>
                  <button className="ai-card-btn ai-card-btn--blue">
                    Take 5-Q Challenge →
                  </button>
                </div>

                {/* Card 3: Simplify Topics */}
                <div className="ai-hub-card ai-hub-card--emerald" onClick={() => handleOpenSection('simplify')}>
                  <div className="ai-card-top">
                    <div className="ai-card-iconwrap ai-card-iconwrap--emerald">
                      <Zap size={22} color="#fff" />
                    </div>
                    <span className="ai-card-pill ai-card-pill--emerald">{backstory.length} Concepts</span>
                  </div>
                  <h4 className="ai-card-heading">Simplify Topics</h4>
                  <p className="ai-card-snippet">Complex theological terms and Greek roots explained with plain-language analogies.</p>
                  <button className="ai-card-btn ai-card-btn--emerald">
                    Explore Concepts →
                  </button>
                </div>

                {/* Card 4: Quick Revision */}
                <div className="ai-hub-card ai-hub-card--amber" onClick={() => handleOpenSection('revision')}>
                  <div className="ai-card-top">
                    <div className="ai-card-iconwrap ai-card-iconwrap--amber">
                      <Sparkles size={22} color="#fff" />
                    </div>
                    <span className="ai-card-pill ai-card-pill--amber">{keyTakeaways.length} Key Points</span>
                  </div>
                  <h4 className="ai-card-heading">Quick Revision</h4>
                  <p className="ai-card-snippet">High-yield revision checklist and memory anchors to tick off before exams.</p>
                  <button className="ai-card-btn ai-card-btn--amber">
                    Open Checklist →
                  </button>
                </div>
              </div>
            </div>
          ) : activeView === 'summary' ? (
            /* ---- VIEW 1: SUMMARY WITH TTS & COPY ---- */
            <div className="ai-view-container ai-fade-in-up">
              <div className="ai-toolbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    onClick={() => toggleSpeech(summary)} 
                    className={`ai-tool-btn ${isSpeaking ? 'ai-tool-btn--active' : ''}`}
                  >
                    {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    {isSpeaking ? 'Pause Audio' : 'Listen with Audio'}
                  </button>
                </div>
                <button onClick={() => handleCopy(summary)} className="ai-tool-btn">
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'Copied' : 'Copy Summary'}
                </button>
              </div>

              <div className="ai-narrative-card">
                <div className="ai-narrative-content">
                  {summary}
                </div>
              </div>
            </div>
          ) : activeView === 'quiz' ? (
            /* ---- VIEW 2: 5-QUESTION GAMIFIED QUIZ ARENA ---- */
            <div className="ai-view-container ai-fade-in-up">
              {quizPool.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                  <HelpCircle size={44} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <p>No quiz questions available for this lecture.</p>
                </div>
              ) : quizCompleted ? (
                <div className="ai-quiz-finish-card">
                  <div className="ai-celebration-trophy">
                    <Award size={48} color="#16a34a" />
                  </div>
                  <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
                    Challenge Complete!
                  </h3>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', margin: '0 0 16px' }}>
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={22} 
                        fill={i < quizScore ? '#f59e0b' : '#e2e8f0'} 
                        color={i < quizScore ? '#f59e0b' : '#cbd5e1'} 
                      />
                    ))}
                  </div>
                  <p style={{ fontSize: '16px', color: '#475569', margin: '0 0 12px' }}>
                    Score: <strong style={{ color: '#16a34a', fontSize: '20px' }}>{quizScore}</strong> out of <strong style={{ fontSize: '20px' }}>{quizPool.length}</strong> ({Math.round((quizScore / quizPool.length) * 100)}%)
                  </p>
                  <div className="ai-db-saved-tag">
                    <CheckCircle size={15} /> Saved to student academic records in database
                  </div>

                  <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
                    <button onClick={handleRetakeWithNewQuestions} className="ai-primary-btn">
                      <RotateCcw size={16} /> Challenge 5 New Questions
                    </button>
                    <button onClick={() => setActiveView(null)} className="ai-secondary-btn">
                      Back to AI Hub
                    </button>
                  </div>
                </div>
              ) : (
                (() => {
                  const q = quizPool[currentQuizIndex];
                  const progressPct = ((currentQuizIndex + 1) / quizPool.length) * 100;

                  return (
                    <div>
                      {/* Progress HUD */}
                      <div className="ai-quiz-hud">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="ai-hud-step">Question {currentQuizIndex + 1} of {quizPool.length}</span>
                          {streak >= 2 && (
                            <span className="ai-streak-pill">
                              <Flame size={13} fill="#f59e0b" color="#f59e0b" /> {streak} Streak!
                            </span>
                          )}
                        </div>
                        <div className="ai-hud-score">
                          Score: <strong style={{ color: '#4f46e5' }}>{quizScore}</strong>
                        </div>
                      </div>
                      <div className="ai-quiz-progressbar">
                        <div className="ai-quiz-progressbar-fill" style={{ width: `${progressPct}%` }} />
                      </div>

                      {/* Question Text Box */}
                      <div className="ai-question-card">
                        <h4 className="ai-question-title">{q.question}</h4>
                      </div>

                      {/* Option Cards */}
                      <div className="ai-options-grid">
                        {q.options?.map((opt, oIdx) => {
                          const isSelected = selectedOption === oIdx;
                          const isCorrect = oIdx === q.correct_index;

                          let stateClass = '';
                          if (isAnswered) {
                            if (isCorrect) stateClass = 'ai-opt--correct';
                            else if (isSelected) stateClass = 'ai-opt--wrong';
                          } else if (isSelected) {
                            stateClass = 'ai-opt--selected';
                          }

                          return (
                            <button
                              key={oIdx}
                              onClick={() => handleSelectOption(oIdx)}
                              disabled={isAnswered}
                              className={`ai-opt-btn ${stateClass}`}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="ai-opt-letter">{String.fromCharCode(65 + oIdx)}</span>
                                <span style={{ fontSize: '14px', lineHeight: 1.4 }}>{opt}</span>
                              </div>
                              {isAnswered && isCorrect && <CheckCircle size={18} color="#16a34a" />}
                              {isAnswered && isSelected && !isCorrect && <AlertCircle size={18} color="#dc2626" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Unfolding */}
                      {isAnswered && (
                        <div className="ai-explanation-box">
                          <div className="ai-explanation-header">
                            <Sparkles size={16} color="#4f46e5" />
                            <strong>AI Theological Explanation:</strong>
                          </div>
                          <p className="ai-explanation-text">
                            {q.explanation || 'Verified with lecture syllabus.'}
                          </p>

                          <button onClick={handleNextQuestion} className="ai-next-btn">
                            {currentQuizIndex < quizPool.length - 1 ? 'Next Question →' : 'Complete Challenge & Save 🎉'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          ) : activeView === 'simplify' ? (
            /* ---- VIEW 3: SIMPLIFY TOPICS DECK ---- */
            <div className="ai-view-container ai-fade-in-up">
              <div className="ai-search-bar">
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="Search concepts & terms (e.g. Historia, Clement, Pastoral Care)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="ai-search-input"
                />
              </div>

              {filteredBackstory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No matching terms found.
                </div>
              ) : (
                <div className="ai-concepts-grid">
                  {filteredBackstory.map((item, idx) => (
                    <div key={idx} className="ai-concept-card">
                      <div className="ai-concept-badge">
                        <span className="ai-concept-dot" />
                        <h4 className="ai-concept-title">{item.topic}</h4>
                      </div>
                      <p className="ai-concept-explanation">{item.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeView === 'revision' ? (
            /* ---- VIEW 4: QUICK REVISION CHECKLIST ---- */
            <div className="ai-view-container ai-fade-in-up">
              <div className="ai-toolbar ai-toolbar--amber">
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#b45309' }}>
                  🎯 Memory Progress: {Object.values(checkedTakeaways).filter(Boolean).length} / {keyTakeaways.length} Revised
                </span>
                <button 
                  onClick={() => handleCopy(keyTakeaways.map((t, i) => `${i+1}. ${t}`).join('\n'))} 
                  className="ai-tool-btn ai-tool-btn--amber"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy All Points'}
                </button>
              </div>

              <div className="ai-takeaways-list">
                {keyTakeaways.map((point, idx) => {
                  const isChecked = !!checkedTakeaways[idx];
                  return (
                    <div 
                      key={idx}
                      onClick={() => toggleTakeaway(idx)}
                      className={`ai-takeaway-item ${isChecked ? 'ai-takeaway-item--checked' : ''}`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => {}} 
                        className="ai-checkbox-amber"
                      />
                      <span className="ai-takeaway-text">{point}</span>
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

export function AIFab({ activeTab, activeLesson, showAI, isThinking, onOpen, hasAiData }) {
  if (activeTab !== 'lessons' || !activeLesson || showAI || isThinking || !hasAiData) return null;

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
        <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#fbbf24' }}>
          One Touch
        </span>
        <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
          AI Assistant
        </span>
      </div>
    </button>
  );
}

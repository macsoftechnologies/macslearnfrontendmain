import React from 'react';
import { Sparkles, BrainCircuit, BookOpen, Zap, ListChecks, X } from 'lucide-react';

export default function AIAssistantPanel({
  activeLesson,
  showAI,
  isThinking,
  thinkingPhase,
  aiPanelOpen,
  onOpen,
  onClose,
}) {
  if (!aiPanelOpen) return null;

  return (
    <div className="ai-overlay">
      <div className="ai-panel">
        {/* Header */}
        <div className="ai-panel__header">
          <div className="ai-panel__header-left">
            <div className="ai-panel__icon-wrap">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="ai-panel__title">AI Study Assistant</h3>
              <p className="ai-panel__subtitle">{activeLesson?.title || 'Lesson Analysis'}</p>
            </div>
          </div>
          <button className="ai-panel__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="ai-panel__body">
          {isThinking ? (
            <div className="ai-thinking">
              {/* Animated brain */}
              <div className="ai-thinking__brain-ring">
                <div className="ai-thinking__brain-core">
                  <BrainCircuit size={40} />
                </div>
                <svg className="ai-thinking__ring-svg" viewBox="0 0 120 120">
                  <circle className="ai-thinking__ring-track" cx="60" cy="60" r="54" />
                  <circle className="ai-thinking__ring-progress" cx="60" cy="60" r="54" />
                </svg>
              </div>

              {/* Phase text */}
              <div className="ai-thinking__phases">
                <p className={`ai-thinking__phase ${thinkingPhase >= 0 ? 'ai-thinking__phase--active' : ''} ${thinkingPhase > 0 ? 'ai-thinking__phase--done' : ''}`}>
                  <span className="ai-thinking__phase-dot" />
                  <BrainCircuit size={14} /> Scanning neural patterns...
                </p>
                <p className={`ai-thinking__phase ${thinkingPhase >= 1 ? 'ai-thinking__phase--active' : ''} ${thinkingPhase > 1 ? 'ai-thinking__phase--done' : ''}`}>
                  <span className="ai-thinking__phase-dot" />
                  <BookOpen size={14} /> Reading lesson transcript...
                </p>
                <p className={`ai-thinking__phase ${thinkingPhase >= 2 ? 'ai-thinking__phase--active' : ''} ${thinkingPhase > 2 ? 'ai-thinking__phase--done' : ''}`}>
                  <span className="ai-thinking__phase-dot" />
                  <Zap size={14} /> Generating insights...
                </p>
                <p className={`ai-thinking__phase ${thinkingPhase >= 3 ? 'ai-thinking__phase--active' : ''}`}>
                  <span className="ai-thinking__phase-dot" />
                  <ListChecks size={14} /> Compiling results...
                </p>
              </div>

              {/* Shimmer loading cards */}
              <div className="ai-thinking__shimmer-grid">
                <div className="ai-shimmer-card"><div className="ai-shimmer" /></div>
                <div className="ai-shimmer-card"><div className="ai-shimmer" /></div>
                <div className="ai-shimmer-card"><div className="ai-shimmer" /></div>
                <div className="ai-shimmer-card"><div className="ai-shimmer" /></div>
              </div>
            </div>
          ) : showAI ? (
            <div className="ai-results">
              <div className="ai-results__grid">
                {/* Card 1: Summary */}
                <div className="ai-card ai-card--1" style={{ animationDelay: '0s' }}>
                  <div className="ai-card__icon" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                    <BookOpen size={20} color="#fff" />
                  </div>
                  <div className="ai-card__content">
                    <h4 className="ai-card__title">Lesson Summary</h4>
                    <p className="ai-card__desc">A concise AI-generated summary of the entire lesson, breaking down core concepts taught in the video for quick review.</p>
                    <button className="ai-card__action" style={{ color: '#7c3aed' }}>View Summary →</button>
                  </div>
                </div>

                {/* Card 2: Quizzes */}
                <div className="ai-card ai-card--2" style={{ animationDelay: '0.15s' }}>
                  <div className="ai-card__icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #60a5fa)' }}>
                    <ListChecks size={20} color="#fff" />
                  </div>
                  <div className="ai-card__content">
                    <h4 className="ai-card__title">Auto-Generated Quiz</h4>
                    <p className="ai-card__desc">Interactive quizzes automatically created from the video's content to test your understanding immediately.</p>
                    <button className="ai-card__action" style={{ color: '#3b82f6' }}>Take Quiz →</button>
                  </div>
                </div>

                {/* Card 3: Simplify */}
                <div className="ai-card ai-card--3" style={{ animationDelay: '0.3s' }}>
                  <div className="ai-card__icon" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                    <Zap size={20} color="#fff" />
                  </div>
                  <div className="ai-card__content">
                    <h4 className="ai-card__title">Simplify Topics</h4>
                    <p className="ai-card__desc">Explain difficult topics from the video in simpler terms with real-world examples anyone can understand.</p>
                    <button className="ai-card__action" style={{ color: '#10b981' }}>Simplify →</button>
                  </div>
                </div>

                {/* Card 4: Revision */}
                <div className="ai-card ai-card--4" style={{ animationDelay: '0.45s' }}>
                  <div className="ai-card__icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
                    <Sparkles size={20} color="#fff" />
                  </div>
                  <div className="ai-card__content">
                    <h4 className="ai-card__title">Quick Revision</h4>
                    <p className="ai-card__desc">Key takeaways and revision points you can save for quick review before exams.</p>
                    <button className="ai-card__action" style={{ color: '#f59e0b' }}>View Points →</button>
                  </div>
                </div>
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
    <button onClick={onOpen} title="Ask AI Assistant" className="ai-fab">
      <Sparkles size={22} />
    </button>
  );
}

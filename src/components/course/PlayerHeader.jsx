import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Loader2, MessageSquare } from 'lucide-react';

export default function PlayerHeader({
  courseId,
  activeTab,
  setActiveTab,
  prevLesson,
  nextLesson,
  goToLesson,
  currentIsCompleted,
  completing,
  completeAndContinue,
  activeLesson,
  setDiscussionSidebarOpen,
}) {
  return (
    <div className="player-header">
      <div className="player-header__left">
        <Link to="/student/my-courses" className="player-header__back">
          <ArrowLeft size={14} />
          <span>Back</span>
        </Link>
        <div style={{ marginLeft: '16px', display: 'flex', gap: '8px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}>
          {['lessons', 'exams', 'assignments'].map((tab) => (
            <button
              key={tab}
              className="player-header__nav-btn"
              style={{
                background: activeTab === tab ? 'var(--bg-surface-hover)' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                border: activeTab === tab ? '1px solid var(--border-subtle)' : '1px solid transparent',
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          <Link
            to={`/student/courses/${courseId}`}
            className="player-header__nav-btn"
            style={{ textDecoration: 'none', background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' }}
          >
            Course Overview
          </Link>
        </div>
        {prevLesson && (
          <button className="player-header__nav-btn player-header__nav-btn--prev" onClick={() => goToLesson(prevLesson)}>
            <ChevronLeft size={14} />
            <span className="nav-label">Previous Lesson</span>
          </button>
        )}
      </div>

      <div className="player-header__right">
        
        {!!activeLesson?.videoUrl && !currentIsCompleted ? (
          <button
            className="player-header__nav-btn player-header__nav-btn--next"
            onClick={() => goToLesson(nextLesson)}
            disabled={!nextLesson}
          >
            <span className="nav-label">Next Lesson</span>
            {nextLesson && <ChevronRight size={14} />}
          </button>
        ) : (
          <button
            className={`player-header__nav-btn ${currentIsCompleted ? 'player-header__nav-btn--completed' : 'player-header__nav-btn--next'}`}
            onClick={completeAndContinue}
            disabled={completing || (!nextLesson && currentIsCompleted)}
          >
            {completing ? (
              <Loader2 size={14} className="spinner" />
            ) : currentIsCompleted ? (
              <CheckCircle2 size={14} />
            ) : null}
            <span className="nav-label">{currentIsCompleted ? (nextLesson ? 'Continue' : 'Completed') : 'Complete and Continue'}</span>
            {nextLesson && <ChevronRight size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

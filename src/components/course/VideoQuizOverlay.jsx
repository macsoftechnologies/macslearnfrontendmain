import React from 'react';
import Button from '../ui/Button';

export default function VideoQuizOverlay({
  activeQuiz,
  selectedOption,
  setSelectedOption,
  theoryAnswer,
  setTheoryAnswer,
  handleQuizAnswer,
}) {
  if (!activeQuiz) return null;

  return (
    <div className="player__quiz-overlay">
      <div className="player__quiz-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span className="player__quiz-type-badge">
            {activeQuiz.type === 'THEORY' ? 'Short Answer' : activeQuiz.type === 'TRUE_FALSE' ? 'True or False' : 'Quick Knowledge Check'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Interactive Video Check</span>
        </div>
        <p className="player__quiz-question">{activeQuiz.questionText}</p>
        <div className="stack" style={{ gap: '6px' }}>
          {activeQuiz.type === 'THEORY' ? (
            <>
              <textarea
                value={theoryAnswer}
                onChange={e => setTheoryAnswer(e.target.value)}
                placeholder="Type your answer here..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px', fontFamily: 'inherit', fontSize: '13px', lineHeight: 1.4 }}
              />
              <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="sm" onClick={() => handleQuizAnswer(theoryAnswer, true)} disabled={!theoryAnswer.trim()}>
                  Submit Answer
                </Button>
              </div>
            </>
          ) : (
            <>
              {activeQuiz.options?.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedOption(opt)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    border: selectedOption?.text === opt.text ? '1.5px solid var(--brand, #7c3aed)' : '1px solid var(--border-subtle, #cbd5e1)',
                    color: selectedOption?.text === opt.text ? '#fff' : 'var(--text-primary, #1e293b)',
                    background: selectedOption?.text === opt.text ? 'var(--brand, #7c3aed)' : '#ffffff',
                    fontWeight: selectedOption?.text === opt.text ? 700 : 500
                  }}
                >
                  <span style={{ 
                    width: 20, 
                    height: 20, 
                    borderRadius: '50%', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginRight: '8px', 
                    fontSize: '11px',
                    fontWeight: 700,
                    background: selectedOption?.text === opt.text ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: selectedOption?.text === opt.text ? '#fff' : '#475569'
                  }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt.text}</span>
                </button>
              ))}
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="sm" onClick={() => handleQuizAnswer(selectedOption)} disabled={!selectedOption}>
                  Submit Answer →
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

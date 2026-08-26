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
        <span className="player__quiz-type-badge">
          {activeQuiz.type === 'THEORY' ? 'Short Answer' : activeQuiz.type === 'TRUE_FALSE' ? 'True or False' : 'Quick Knowledge Check'}
        </span>
        <p className="player__quiz-question">{activeQuiz.questionText}</p>
        <div className="stack" style={{ gap: '12px' }}>
          {activeQuiz.type === 'THEORY' ? (
            <>
              <textarea
                value={theoryAnswer}
                onChange={e => setTheoryAnswer(e.target.value)}
                placeholder="Type your answer here..."
                style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '120px', fontFamily: 'inherit', fontSize: '15px' }}
              />
              <Button onClick={() => handleQuizAnswer(theoryAnswer, true)} disabled={!theoryAnswer.trim()}>
                Submit Answer
              </Button>
            </>
          ) : (
            <>
              {activeQuiz.options?.map((opt, i) => (
                <Button
                  key={i}
                  variant={selectedOption?.text === opt.text ? "primary" : "outline"}
                  onClick={() => setSelectedOption(opt)}
                  style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '14px 20px', fontSize: '15px', borderColor: selectedOption?.text === opt.text ? 'transparent' : 'var(--border-subtle, #cbd5e1)', color: selectedOption?.text === opt.text ? '#fff' : 'var(--text-primary, #334155)', background: selectedOption?.text === opt.text ? 'var(--brand, #7c3aed)' : 'var(--bg-surface, #f8fafc)' }}
                >
                  {opt.text}
                </Button>
              ))}
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={() => handleQuizAnswer(selectedOption)} disabled={!selectedOption}>
                  Submit Answer
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';

export default function QuizResults({ myAnswers }) {
  if (!myAnswers || myAnswers.length === 0) return null;

  return (
    <div className="player__quiz-results">
      <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--sp-4)' }}>Your Quiz Results</h2>
      <div className="stack" style={{ gap: 'var(--sp-4)' }}>
        {myAnswers.map((ans, i) => (
          <div key={ans._id || ans.id} style={{ background: '#fff', padding: 'var(--sp-4)', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Question {i + 1}</span>
              {ans.isGraded ? (
                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', background: ans.isCorrect ? '#dcfce7' : '#f1f5f9', color: ans.isCorrect ? '#166534' : '#475569' }}>
                  {ans.marks} / {ans.quizId?.maxMarks} Marks
                </span>
              ) : (
                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', background: '#fef08a', color: '#854d0e' }}>
                  Pending Review
                </span>
              )}
            </div>
            <p style={{ fontSize: '15px', marginBottom: '12px', color: '#334155' }}>{ans.quizId?.questionText}</p>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '14px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: 600, color: '#64748b', marginRight: '8px' }}>Your Answer:</span>
              {ans.selectedOption || ans.textAnswer}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

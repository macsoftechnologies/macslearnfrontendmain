import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Video, FileText } from 'lucide-react';
import Button from '../ui/Button';

const formatDuration = (minutes) => {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:00`;
  return `${m}:00`;
};

export default function PlayerSidebar({
  selectedAttachmentIndex,
  setSelectedAttachmentIndex,
  course,
  progress,
  modules,
  lessonsByModule,
  activeLesson,
  handleLessonChange,
  isCompleted,
  certificateStatus,
  finalExam,
  courseId,
  requestingCert,
  requestCertificate,
  setIframeLoading,
  setPreviewContentUrl,
}) {
  return (
    <aside className="player__sidebar">
      <div className="player__sidebar-header">
        <div className="player__course-title">{course?.title || 'Course'}</div>
      </div>

      <div className="player__progress">
        <div className="player__progress-bar-track">
          <div className="player__progress-bar-fill" style={{ width: `${progress?.progressPercentage || 0}%` }} />
        </div>
        <span className="player__progress-label">{progress?.progressPercentage || 0}% complete</span>
      </div>

      {/* Certificate / Exam CTA */}
      {progress?.progressPercentage === 100 && course?.certificateTemplateId && (
        <div className="player__cta-card">
          {certificateStatus ? (
            <a href={certificateStatus.certificateUrl} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
              <Button variant="primary" style={{ width: '100%', fontSize: '13px' }}>View Certificate</Button>
            </a>
          ) : finalExam ? (
            <Link to={`/student/my-courses/${courseId}/exams/${finalExam._id || finalExam.id}/take`} style={{ display: 'block' }}>
              <Button variant="primary" style={{ width: '100%', fontSize: '13px' }}>Attend Final Exam</Button>
            </Link>
          ) : (
            <Button variant="primary" style={{ width: '100%', fontSize: '13px' }} loading={requestingCert} onClick={requestCertificate}>
              Request Certificate
            </Button>
          )}
        </div>
      )}

      {/* Lessons List */}
      <div className="player__modules-list">
        {modules.map((mod) => (
          <div key={mod._id || mod.id} className="player__module">
            <p className="player__module-title">{mod.title}</p>
            {(lessonsByModule[mod._id || mod.id] || []).map((lesson) => {
              const lId = lesson._id || lesson.id;
              const isActive = (activeLesson?._id || activeLesson?.id) === lId;
              const completed = isCompleted(lId);
              const inProgress = !completed && progress?.completedLessons?.find(l => (l.lessonId?._id || l.lessonId || l.id) === lId)?.watchedSeconds > 0;

              return (
                <React.Fragment key={lId}>
                  <button
                    className={`player__lesson ${isActive ? 'player__lesson--active' : ''}`}
                    onClick={() => handleLessonChange(lesson, mod._id || mod.id)}
                  >
                    <span className="player__lesson-status">
                      {completed ? (
                        <CheckCircle2 size={16} color="var(--success)" />
                      ) : inProgress ? (
                        <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--color-amber-500)', borderTopColor: 'transparent', display: 'inline-block' }} />
                      ) : (
                        <Circle size={16} color="var(--color-slate-400)" />
                      )}
                    </span>
                    <span className="player__lesson-icon">
                      {lesson.type === 'VIDEO' ? <Video size={14} /> : <FileText size={14} />}
                    </span>
                    <span className="player__lesson-info">
                      <span className="player__lesson-name">{lesson.title}</span>
                      {lesson.durationMinutes > 0 && (
                        <span className="player__lesson-duration">{formatDuration(lesson.durationMinutes)}</span>
                      )}
                    </span>
                  </button>
                  {isActive && (lesson.attachments?.length > 0 || lesson.contentUrl) && (
                    <div style={{ padding: '8px 12px 12px 36px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Attachments</div>
                      {lesson.attachments?.length > 0 ? lesson.attachments.map((att, i) => (
                        <button
                          key={i}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s' }}
                          onClick={(e) => { 
    e.stopPropagation(); 
    if (setSelectedAttachmentIndex) setSelectedAttachmentIndex(i);
    else setPreviewContentUrl(att.url);
  }}
                          onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--brand)'}
                          onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                        >
                          <FileText size={14} color="var(--brand)" />
                          <span style={{ fontSize: '12px', flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name || 'Document'}</span>
                        </button>
                      )) : lesson.contentUrl ? (
                        <button
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s' }}
                          onClick={(e) => { e.stopPropagation(); setIframeLoading(true); setPreviewContentUrl(lesson.contentUrl); }}
                          onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--brand)'}
                          onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                        >
                          <FileText size={14} color="var(--brand)" />
                          <span style={{ fontSize: '12px', flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Supplemental Document</span>
                        </button>
                      ) : null}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}

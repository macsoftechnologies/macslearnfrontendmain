import React, { useState, useEffect } from 'react';
import { Video, Calendar, Clock, BookOpen, ExternalLink, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as liveSessionsApi from '../../api/liveSessions';
import { extractErrorMessages } from '../../api/client';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import PageLoader from '../../components/ui/PageLoader';
import EmptyState from '../../components/ui/EmptyState';

export default function StudentLiveSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    liveSessionsApi.getUpcomingForStudent()
      .then((res) => {
        const extractArray = (r) => {
          if (!r) return [];
          if (Array.isArray(r)) return r;
          if (Array.isArray(r?.data?.data)) return r.data.data;
          if (Array.isArray(r?.data)) return r.data;
          return [];
        };
        setSessions(extractArray(res));
      })
      .catch((err) => {
        extractErrorMessages(err).forEach(m => toast.error(m));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page stack" style={{ gap: '1.5rem', maxWidth: 900 }}>
      <div>
        <span className="page-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Video size={16} color="var(--accent)" /> Virtual Classroom
        </span>
        <h1 className="page-title" style={{ margin: '0.2rem 0' }}>Live Subject Sessions</h1>
        <p className="page-subtitle" style={{ margin: 0 }}>
          View scheduled faculty calls (5 calls per subject), join virtual classrooms, and review your attendance record.
        </p>
      </div>

      {loading ? (
        <PageLoader />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No Live Sessions Scheduled"
          description="Your instructors have not scheduled any upcoming live video calls yet. Check back soon!"
        />
      ) : (
        <div className="stack" style={{ gap: '1.25rem' }}>
          {sessions.map((session) => {
            const isCompleted = session.status === 'COMPLETED';
            const hasAttended = !!session.hasAttended;

            return (
              <Card 
                key={session.id || session._id}
                style={{ 
                  padding: '1.5rem', 
                  borderLeft: isCompleted 
                    ? (hasAttended ? '4px solid #10b981' : '4px solid #ef4444') 
                    : '4px solid var(--accent, #6366f1)' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        padding: '3px 8px', 
                        borderRadius: '999px', 
                        background: 'var(--color-primary-50, rgba(99,102,241,0.1))',
                        color: 'var(--accent, #6366f1)'
                      }}>
                        CALL {session.sessionNumber || 1} OF 5
                      </span>
                      <StatusBadge status={session.status} />
                    </div>

                    <h3 style={{ fontSize: '1.15rem', margin: '0 0 0.3rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                      {session.title || `Subject Call ${session.sessionNumber || 1}`}
                    </h3>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.6rem' }}>
                      <BookOpen size={15} color="var(--accent)" /> {session.courseTitle || 'Course'}
                    </div>

                    {session.agenda && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.8rem', lineHeight: 1.5 }}>
                        {session.agenda}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color="var(--accent)" />
                        {session.scheduledDate ? new Date(session.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} />
                        {session.scheduledTime || 'TBD'}
                      </span>
                    </div>
                  </div>

                  {/* Attendance & Join Button */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                    {isCompleted ? (
                      <div style={{ 
                        padding: '6px 14px', 
                        borderRadius: '999px', 
                        fontWeight: 700, 
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: hasAttended ? '#d1fae5' : '#fee2e2',
                        color: hasAttended ? '#065f46' : '#991b1b'
                      }}>
                        {hasAttended ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        {hasAttended ? 'ATTENDANCE: PRESENT' : 'ATTENDANCE: ABSENT'}
                      </div>
                    ) : session.meetingUrl ? (
                      <a 
                        href={session.meetingUrl.startsWith('http') ? session.meetingUrl : `https://${session.meetingUrl}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        <Button variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Video size={16} /> Join Virtual Classroom
                        </Button>
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Meeting link will appear here</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, User, Send, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import * as discussionApi from '../../api/discussion';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Textarea } from '../ui/Input';
import PageLoader from '../ui/PageLoader';

export default function ThreadDetailModal({ open, onClose, courseId, threadId, onResolved }) {
  const { user } = useAuth();
  const [thread, setThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open && threadId && courseId) {
      setLoading(true);
      Promise.all([
        discussionApi.getThread(courseId, threadId),
        discussionApi.listReplies(threadId)
      ])
        .then(([tRes, rRes]) => {
          setThread(tRes.data?.data);
          setReplies(rRes.data?.data || []);
        })
        .catch(() => toast.error('Failed to load thread'))
        .finally(() => setLoading(false));
    }
  }, [open, threadId, courseId]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await discussionApi.reply(threadId, { content: replyText });
      setReplies([...replies, res.data?.data]);
      setReplyText('');
    } catch {
      toast.error('Failed to post reply');
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (replyId) => {
    try {
      await discussionApi.acceptReply(threadId, replyId);
      setReplies((prev) =>
        prev.map((r) => (r._id === replyId || r.id === replyId ? { ...r, isAcceptedAnswer: true } : r))
      );
      setThread((prev) => ({ ...prev, isResolved: true }));
      toast.success('Answer accepted');
      if (onResolved) onResolved(threadId);
    } catch {
      toast.error('Failed to accept answer');
    }
  };

  if (!open) return null;

  const canAccept = thread && !thread.isResolved && (user?.userId === thread.authorId?._id || user?.userType === 'FACULTY' || user?.userType === 'ORG_USER');

  return (
    <Modal open={open} onClose={onClose} title="Discussion Thread" width={700}>
      {loading ? (
        <PageLoader />
      ) : thread ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '300px' }}>
          {/* Original Post */}
          <div style={{ background: 'var(--color-paper-50)', padding: 'var(--sp-4)', borderRadius: 'var(--rad-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <h3 style={{ fontSize: 'var(--fs-lg)', margin: 0 }}>{thread.title}</h3>
              {thread.isResolved && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--fs-xs)', color: 'var(--color-success-600)', background: 'var(--color-success-50)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  <CheckCircle2 size={12} /> Resolved
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
              <User size={14} />
              <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{thread.authorId?.fullName}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}</span>
            </div>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0, color: 'var(--text-main)' }}>
              {thread.content}
            </p>
          </div>

          {/* Replies */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {replies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--sp-6) 0', color: 'var(--text-muted)' }}>
                No replies yet. Be the first to answer!
              </div>
            ) : (
              replies.map((r) => {
                const isFaculty = r.authorId?.userType === 'FACULTY' || r.authorId?.userType === 'ORG_USER';
                const isAccepted = r.isAcceptedAnswer;
                
                return (
                  <div key={r._id || r.id} style={{
                    padding: 'var(--sp-4)',
                    borderRadius: 'var(--rad-md)',
                    background: isAccepted ? 'var(--color-success-50)' : 'var(--color-surface)',
                    border: isAccepted ? '1px solid var(--color-success-300)' : '1px solid var(--border-subtle)',
                    marginLeft: isAccepted || isFaculty ? '0' : '24px' // Indent normal replies
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.authorId?.fullName}</span>
                        {isFaculty && (
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', background: 'var(--color-primary-100)', color: 'var(--color-primary-700)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            Instructor
                          </span>
                        )}
                        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                          {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      
                      {isAccepted && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--fs-xs)', color: 'var(--color-success-700)', fontWeight: 600 }}>
                          <Check size={14} /> Accepted Answer
                        </span>
                      )}
                      
                      {canAccept && !isAccepted && (
                        <Button size="sm" variant="ghost" onClick={() => handleAccept(r._id || r.id)}>
                          Mark as Answer
                        </Button>
                      )}
                    </div>
                    
                    <p style={{ whiteSpace: 'pre-wrap', margin: 0, color: 'var(--text-main)' }}>
                      {r.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply Form */}
          {!thread.isResolved ? (
            <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
              <form onSubmit={handleReply} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Textarea 
                  placeholder="Type your reply here..." 
                  rows={3} 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={sending}
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="submit" loading={sending} icon={Send}>Post Reply</Button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ marginTop: 'auto', paddingTop: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              This thread has been marked as resolved. No further replies can be added.
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>Thread not found</div>
      )}
    </Modal>
  );
}

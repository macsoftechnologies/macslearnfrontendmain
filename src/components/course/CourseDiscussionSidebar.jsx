import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { X, MessageSquare, ChevronLeft, Send, CheckCircle2, Plus, User, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import * as discussionApi from '../../api/discussion';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import { Textarea } from '../ui/Input';
import Input from '../ui/Input';
import PageLoader from '../ui/PageLoader';
import './CourseDiscussionSidebar.css';

export default function CourseDiscussionSidebar({ isOpen, onClose, courseId }) {
  const { user } = useAuth();
  const [view, setView] = useState('channels'); // 'channels' | 'chat' | 'new_thread'
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Chat View State
  const [activeThread, setActiveThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const chatScrollRef = useRef(null);

  // Read States
  const getReadStates = () => {
    try { return JSON.parse(localStorage.getItem(`lms_read_${courseId}`)) || {}; }
    catch { return {}; }
  };
  const [readStates, setReadStates] = useState(getReadStates());

  const markThreadRead = (threadId, count) => {
    const states = getReadStates();
    states[threadId] = count;
    localStorage.setItem(`lms_read_${courseId}`, JSON.stringify(states));
    setReadStates(states);
  };

  // New Thread State
  const [newThreadForm, setNewThreadForm] = useState({ title: '', content: '' });

  useEffect(() => {
    if (isOpen && view === 'channels') {
      loadThreads();
    }
  }, [isOpen, view, courseId]);

  const loadThreads = () => {
    setLoading(true);
    discussionApi.listThreads(courseId)
      .then((res) => setThreads(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // Poll for channels every 5 seconds
  useEffect(() => {
    if (isOpen && view === 'channels') {
      const interval = setInterval(() => {
        discussionApi.listThreads(courseId).then((res) => setThreads(res.data?.data || [])).catch(() => {});
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, view, courseId]);

  const openThread = (thread) => {
    setActiveThread(thread);
    setView('chat');
    setLoading(true);
    
    const tId = thread._id || thread.id;
    const count = thread.replyCount || thread.thread_replyCount || 0;
    markThreadRead(tId, count);
    
    Promise.all([
      discussionApi.getThread(courseId, thread._id || thread.id),
      discussionApi.listReplies(thread._id || thread.id)
    ])
      .then(([tRes, rRes]) => {
        setActiveThread(tRes.data?.data);
        setReplies(rRes.data?.data || []);
      })
      .catch(() => toast.error('Failed to load thread'))
      .finally(() => setLoading(false));
  };

  // Poll for replies every 5 seconds
  useEffect(() => {
    if (isOpen && view === 'chat' && activeThread) {
      const interval = setInterval(() => {
        discussionApi.listReplies(activeThread._id || activeThread.id)
          .then(rRes => {
            if (rRes.data?.data) {
              setReplies(prev => {
                if (prev.length !== rRes.data.data.length) return rRes.data.data;
                return prev;
              });
            }
          }).catch(() => {});
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, view, activeThread]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [replies, loading]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const tId = activeThread._id || activeThread.id;
      const res = await discussionApi.reply(tId, { content: replyText });
      setReplies([...replies, res.data?.data]);
      setReplyText('');
      markThreadRead(tId, replies.length + 1);
    } catch {
      toast.error('Failed to post reply');
    } finally {
      setSending(false);
    }
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await discussionApi.createThread(courseId, newThreadForm);
      toast.success('Channel created');
      setNewThreadForm({ title: '', content: '' });
      setView('channels');
      loadThreads();
    } catch (err) {
      toast.error('Failed to create channel');
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (replyId) => {
    try {
      await discussionApi.acceptReply(activeThread._id || activeThread.id, replyId);
      setReplies((prev) =>
        prev.map((r) => (r._id === replyId || r.id === replyId ? { ...r, isAcceptedAnswer: true } : r))
      );
      setActiveThread((prev) => ({ ...prev, isResolved: true }));
      toast.success('Answer accepted');
    } catch {
      toast.error('Failed to accept answer');
    }
  };

  const canAccept = activeThread && !activeThread.isResolved && (user?.userId === activeThread.authorId?._id || user?.userType === 'FACULTY' || user?.userType === 'ORG_USER');
  const canCreateChannel = user?.userType === 'FACULTY' || user?.userType === 'ORG_USER' || user?.userType === 'SUPER_ADMIN';

  return (
    <div className={`discussion-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="discussion-sidebar__header">
        {view === 'chat' || view === 'new_thread' ? (
          <button className="icon-btn" onClick={() => setView('channels')} title="Back to Channels">
            <ChevronLeft size={20} />
          </button>
        ) : (
          <MessageSquare size={20} />
        )}
        
        <h3 className="discussion-sidebar__title">
          {view === 'channels' && 'Course Channels'}
          {view === 'new_thread' && 'New Channel'}
          {view === 'chat' && activeThread && `# ${activeThread.title}`}
        </h3>
        
        <button className="icon-btn close-btn" onClick={onClose} title="Close Sidebar">
          <X size={20} />
        </button>
      </div>

      <div className="discussion-sidebar__content">
        {loading ? (
          <div className="discussion-sidebar__loader">
            <PageLoader />
          </div>
        ) : (
          <>
            {/* View: Channels */}
            {view === 'channels' && (
              <div className="channels-view">
                {canCreateChannel && (
                  <div className="channels-actions">
                    <Button size="sm" icon={Plus} style={{ width: '100%' }} onClick={() => setView('new_thread')}>
                      Create Channel
                    </Button>
                  </div>
                )}
                
                {threads.length === 0 ? (
                  <div className="empty-state">No channels yet. Create one to start discussing!</div>
                ) : (
                  <div className="channels-list">
                    {threads.map(t => {
                      const isAnnouncement = t.title.toLowerCase().includes('announcement');
                      const msgCount = Number(t.actualReplyCount) || Number(t.actualreplycount) || t.replyCount || t.thread_replyCount || t.thread_replycount || t.replycount || 0;
                      const unreadCount = Math.max(0, msgCount - (readStates[t._id || t.id] || 0));
                      return (
                        <button key={t._id || t.id} className="channel-item" onClick={() => openThread(t)}>
                          <div className="channel-item__icon">{isAnnouncement ? <span style={{fontSize: '16px'}}>📢</span> : <Hash size={16} />}</div>
                          <div className="channel-item__info">
                            <span className="channel-item__title">{t.title || t.thread_title}</span>
                            <span className="channel-item__meta">{msgCount} messages</span>
                          </div>
                          {unreadCount > 0 && (
                            <span className="unread-badge">{unreadCount} New</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* View: New Thread */}
            {view === 'new_thread' && (
              <form onSubmit={handleCreateThread} className="new-thread-view">
                <div className="form-group">
                  <label>Channel Topic</label>
                  <Input 
                    value={newThreadForm.title} 
                    onChange={e => setNewThreadForm(f => ({...f, title: e.target.value}))}
                    placeholder="e.g. Help with Assignment 1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Initial Message</label>
                  <Textarea 
                    rows={4}
                    value={newThreadForm.content} 
                    onChange={e => setNewThreadForm(f => ({...f, content: e.target.value}))}
                    placeholder="What do you want to discuss?"
                    required
                  />
                </div>
                <Button type="submit" loading={sending} style={{ marginTop: 'auto' }}>Create Channel</Button>
              </form>
            )}

            {/* View: Chat */}
            {view === 'chat' && activeThread && (
              <div className="chat-view">
                <div className="chat-messages" ref={chatScrollRef}>
                  
                  {/* Original Thread Post as First Message */}
                  <div className="chat-message first-message">
                    <div className="chat-message__avatar">
                      {activeThread.authorId?.fullName ? activeThread.authorId.fullName.charAt(0).toUpperCase() : <User size={20} />}
                    </div>
                    <div className="chat-message__content">
                      <div className="chat-message__header">
                        <span className="author">{activeThread.authorId?.fullName || 'Anonymous'}</span>
                        {(activeThread.authorId?.userType === 'FACULTY') && <span className="badge role-faculty">Instructor</span>}
                        {(activeThread.authorId?.userType === 'ORG_USER' || activeThread.authorId?.userType === 'SUPER_ADMIN') && <span className="badge role-admin">Admin</span>}
                        <span className="time">{formatDistanceToNow(new Date(activeThread.createdAt), { addSuffix: true })}</span>
                      </div>
                      <p className="text">{activeThread.content}</p>
                    </div>
                  </div>
                  
                  <div className="chat-divider">
                    <span>Replies</span>
                  </div>

                  {replies.map(r => {
                    const isFaculty = r.authorId?.userType === 'FACULTY';
                    const isAdmin = r.authorId?.userType === 'ORG_USER' || r.authorId?.userType === 'SUPER_ADMIN';
                    const isAccepted = r.isAcceptedAnswer;
                    const isMentioned = user?.fullName && r.content.includes(`@${user.fullName}`);
                    
                    return (
                      <div key={r._id || r.id} className={`chat-message ${isAccepted ? 'accepted' : ''} ${isMentioned ? 'mentioned-message' : ''}`}>
                        <div className="chat-message__avatar">
                          {r.authorId?.fullName ? r.authorId.fullName.charAt(0).toUpperCase() : <User size={20} />}
                        </div>
                        <div className="chat-message__content">
                          <div className="chat-message__header">
                            <span className="author">{r.authorId?.fullName || 'Anonymous'}</span>
                            {isFaculty && <span className="badge role-faculty">Instructor</span>}
                            {isAdmin && <span className="badge role-admin">Admin</span>}
                            <span className="time">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
                          </div>
                          
                          <p className="text">{r.content}</p>
                          
                          {!!isAccepted && (
                            <div className="accepted-badge"><CheckCircle2 size={12}/> Accepted Answer</div>
                          )}
                          
                          {!!canAccept && !isAccepted && (
                            <button className="accept-btn" onClick={() => handleAccept(r._id || r.id)}>
                              Mark as Answer
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="chat-input-area">
                  {(() => {
                    if (activeThread.isResolved) {
                      return <div className="resolved-notice">This channel is resolved.</div>;
                    }
                    if (activeThread.title.toLowerCase().includes('announcement') && user?.userType === 'STUDENT') {
                      return <div className="resolved-notice">Only instructors can post in this channel.</div>;
                    }
                    return (
                      <form onSubmit={handleReply} className="chat-input-wrapper">
                        <Textarea 
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder={`Message #${activeThread.title}`}
                          disabled={sending}
                          required
                          rows={1}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleReply(e);
                            }
                          }}
                        />
                        <button type="submit" className="send-btn" disabled={!replyText.trim() || sending}>
                          <Send size={18} />
                        </button>
                      </form>
                    );
                  })()}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

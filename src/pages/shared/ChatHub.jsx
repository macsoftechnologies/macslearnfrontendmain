import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Users, User, Shield, Search, Plus, 
  Circle, CheckCheck, BookOpen, Clock, Smile, ChevronLeft,
  Sparkles, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as discussionApi from '../../api/discussion';
import { useAuth } from '../../contexts/AuthContext';
import { extractErrorMessages } from '../../api/client';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Input, { Textarea } from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';

export default function ChatHub() {
  const { user } = useAuth();
  const [inbox, setInbox] = useState({ directChats: [], batchGroups: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'GROUPS' | 'DIRECT' | 'STAFF'
  const [searchQuery, setSearchQuery] = useState('');

  // Active Chat State
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);

  // New Chat Modal
  const [newChatModal, setNewChatModal] = useState(false);
  const [contacts, setContacts] = useState({ adminsAndFaculty: [], classmates: [] });
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  const messagesEndRef = useRef(null);
  const chatScrollRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadInbox = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await discussionApi.getInbox();
      const data = res.data?.data || res.data || { directChats: [], batchGroups: [] };
      setInbox({
        directChats: Array.isArray(data.directChats) ? data.directChats : [],
        batchGroups: Array.isArray(data.batchGroups) ? data.batchGroups : []
      });
    } catch (err) {
      if (!silent) extractErrorMessages(err).forEach(m => toast.error(m));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  // Poll Inbox & Active Messages every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadInbox(true);
      if (activeThread?.id) {
        discussionApi.getThreadMessages(activeThread.id)
          .then(res => {
            const data = res.data?.data || res.data || {};
            const newMsgs = data.messages || [];
            setMessages(prev => {
              if (prev.length !== newMsgs.length) {
                setTimeout(scrollToBottom, 50);
                return newMsgs;
              }
              return prev;
            });
          })
          .catch(() => {});
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [activeThread?.id]);

  const selectThread = async (thread) => {
    setActiveThread(thread);
    setLoadingMessages(true);
    try {
      const res = await discussionApi.getThreadMessages(thread.id);
      const data = res.data?.data || res.data || {};
      setMessages(data.messages || []);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !activeThread?.id || sending) return;

    const content = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      const res = await discussionApi.sendMessage(activeThread.id, content);
      const newMsg = res.data?.data || res.data;
      if (newMsg) {
        setMessages(prev => [...prev, newMsg]);
        setTimeout(scrollToBottom, 50);
      }
      loadInbox(true);
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
      setInputMessage(content); // restore on error
    } finally {
      setSending(false);
    }
  };

  const openNewChat = async () => {
    setNewChatModal(true);
    setLoadingContacts(true);
    setContactSearch('');
    try {
      const res = await discussionApi.getContacts();
      const data = res.data?.data || res.data || { adminsAndFaculty: [], classmates: [] };
      setContacts({
        adminsAndFaculty: Array.isArray(data.adminsAndFaculty) ? data.adminsAndFaculty : [],
        classmates: Array.isArray(data.classmates) ? data.classmates : []
      });
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    } finally {
      setLoadingContacts(false);
    }
  };

  const startDirectChatWith = async (targetUser) => {
    setNewChatModal(false);
    try {
      const res = await discussionApi.startDirectThread(targetUser.id);
      const thread = res.data?.data || res.data;
      await loadInbox(true);
      selectThread({
        id: thread.id,
        threadType: 'DIRECT_MESSAGE',
        title: targetUser.fullName,
        partner: targetUser,
      });
      toast.success(`Started conversation with ${targetUser.fullName}`);
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    }
  };

  // Filter Conversations
  const allConversations = [
    ...inbox.batchGroups.map(g => ({ ...g, isGroup: true })),
    ...inbox.directChats.map(d => ({ ...d, isGroup: false }))
  ];

  const filteredConversations = allConversations.filter(c => {
    if (activeTab === 'GROUPS' && !c.isGroup) return false;
    if (activeTab === 'DIRECT' && (c.isGroup || c.partner?.userType === 'ORG_USER' || c.partner?.userType === 'FACULTY')) return false;
    if (activeTab === 'STAFF' && (c.isGroup || c.partner?.userType === 'STUDENT')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = c.title?.toLowerCase().includes(q);
      const lastMsgMatch = c.lastMessage?.toLowerCase().includes(q);
      return titleMatch || lastMsgMatch;
    }
    return true;
  });

  const getRolePill = (userType) => {
    if (userType === 'ORG_USER' || userType === 'SUPER_ADMIN') {
      return <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '999px', background: '#7c3aed', color: '#fff', fontWeight: 700 }}>ADMIN</span>;
    }
    if (userType === 'FACULTY') {
      return <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '999px', background: '#2563eb', color: '#fff', fontWeight: 700 }}>FACULTY</span>;
    }
    return <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '999px', background: '#10b981', color: '#fff', fontWeight: 700 }}>STUDENT</span>;
  };

  return (
    <div className="page stack" style={{ height: 'calc(100vh - 120px)', minHeight: '620px', paddingBottom: 0 }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="page-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={16} color="var(--accent)" /> Real-Time Communications
          </span>
          <h1 className="page-title" style={{ margin: '0.2rem 0', fontSize: '1.5rem' }}>Messages & Discussions</h1>
        </div>
        <Button icon={Plus} onClick={openNewChat}>
          New Direct Message
        </Button>
      </div>

      {/* WHATSAPP / SLACK STYLE CHAT INTERFACE */}
      <Card style={{ 
        flex: 1, 
        padding: 0, 
        overflow: 'hidden', 
        display: 'grid', 
        gridTemplateColumns: '320px 1fr', 
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        border: '1px solid var(--border-subtle, #e2e8f0)'
      }}>
        {/* LEFT COLUMN: CHAT SIDEBAR */}
        <div style={{ 
          borderRight: '1px solid var(--border-subtle, #e2e8f0)', 
          background: 'var(--bg-surface-muted, #f8fafc)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          {/* Search Bar */}
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle, #e2e8f0)' }}>
            <div style={{ position: 'relative' }}>
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                style={{ paddingLeft: '32px', fontSize: '0.88rem' }}
              />
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '0.6rem', overflowX: 'auto', paddingBottom: '2px' }}>
              <button 
                onClick={() => setActiveTab('ALL')}
                style={{ 
                  padding: '4px 10px', 
                  borderRadius: '999px', 
                  fontSize: '0.75rem', 
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'ALL' ? 'var(--accent, #6366f1)' : '#e2e8f0',
                  color: activeTab === 'ALL' ? '#fff' : '#475569'
                }}
              >
                All
              </button>
              <button 
                onClick={() => setActiveTab('GROUPS')}
                style={{ 
                  padding: '4px 10px', 
                  borderRadius: '999px', 
                  fontSize: '0.75rem', 
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'GROUPS' ? 'var(--accent, #6366f1)' : '#e2e8f0',
                  color: activeTab === 'GROUPS' ? '#fff' : '#475569'
                }}
              >
                👥 Groups
              </button>
              <button 
                onClick={() => setActiveTab('DIRECT')}
                style={{ 
                  padding: '4px 10px', 
                  borderRadius: '999px', 
                  fontSize: '0.75rem', 
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'DIRECT' ? 'var(--accent, #6366f1)' : '#e2e8f0',
                  color: activeTab === 'DIRECT' ? '#fff' : '#475569'
                }}
              >
                👤 Peers
              </button>
              <button 
                onClick={() => setActiveTab('STAFF')}
                style={{ 
                  padding: '4px 10px', 
                  borderRadius: '999px', 
                  fontSize: '0.75rem', 
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'STAFF' ? 'var(--accent, #6366f1)' : '#e2e8f0',
                  color: activeTab === 'STAFF' ? '#fff' : '#475569'
                }}
              >
                🛡️ Admins
              </button>
            </div>
          </div>

          {/* Conversations Scroll List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {loading ? (
              <div style={{ padding: '2rem 0', textAlign: 'center' }}>
                <PageLoader />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No conversations found. Click "+ New Direct Message" to connect!
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeThread?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => selectThread(conv)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 0.85rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--accent, #6366f1)' : '3px solid transparent',
                      marginBottom: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Avatar */}
                    {conv.isGroup ? (
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Users size={18} />
                      </div>
                    ) : conv.partner?.photo ? (
                      <img src={conv.partner.photo} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                        {conv.title?.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {conv.title}
                        </span>
                        {conv.partner && getRolePill(conv.partner.userType)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.lastMessage || 'No messages yet'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CHAT PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff' }}>
          {activeThread ? (
            <>
              {/* Active Header */}
              <div style={{ 
                padding: '0.85rem 1.25rem', 
                borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-surface-muted, #f8fafc)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {activeThread.threadType === 'BATCH_GROUP' ? (
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={18} />
                    </div>
                  ) : (
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                      {activeThread.title?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{activeThread.title}</strong>
                      {activeThread.partner && getRolePill(activeThread.partner.userType)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {activeThread.threadType === 'BATCH_GROUP' ? 'All Cohort Students & Instructors' : (activeThread.partner?.email || 'Direct Conversation')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div 
                ref={chatScrollRef}
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  background: 'var(--bg-surface-muted, #f8fafc)'
                }}
              >
                {loadingMessages ? (
                  <div style={{ margin: 'auto' }}><PageLoader /></div>
                ) : messages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Sparkles size={28} color="var(--accent)" style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>No messages yet in this conversation.</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>Say hello to start the discussion!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.authorId === (user?.id || user?.userId || user?._id);

                    return (
                      <div 
                        key={msg.id || idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          alignSelf: isMe ? 'flex-end' : 'flex-start'
                        }}
                      >
                        {/* Sender Label (on incoming) */}
                        {!isMe && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', paddingLeft: '4px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {msg.author?.fullName || 'User'}
                            </span>
                            {getRolePill(msg.author?.userType)}
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div style={{
                          padding: '0.75rem 1rem',
                          borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          background: isMe ? 'var(--accent, #6366f1)' : '#ffffff',
                          color: isMe ? '#ffffff' : 'var(--text-primary)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          fontSize: '0.92rem',
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                          border: isMe ? 'none' : '1px solid var(--border-subtle, #e2e8f0)'
                        }}>
                          {msg.content}
                        </div>

                        {/* Timestamp */}
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', paddingRight: isMe ? '4px' : 0, paddingLeft: !isMe ? '4px' : 0 }}>
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <form 
                onSubmit={handleSendMessage}
                style={{ 
                  padding: '0.85rem 1.25rem', 
                  borderTop: '1px solid var(--border-subtle, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: '#ffffff'
                }}
              >
                <input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type a message... (Press Enter to send)"
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    borderRadius: '999px',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    background: 'var(--bg-surface-muted, #f8fafc)'
                  }}
                />
                <Button 
                  type="submit" 
                  loading={sending} 
                  disabled={!inputMessage.trim()}
                  style={{ borderRadius: '999px', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Send size={15} /> Send
                </Button>
              </form>
            </>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <MessageSquare size={32} />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>Your Conversations</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '360px' }}>
                Select a conversation from the sidebar or click <strong>"+ New Direct Message"</strong> to chat with an Admin, Instructor, or Classmate.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* NEW CHAT / CONTACT PICKER MODAL */}
      <Modal
        open={newChatModal}
        onClose={() => setNewChatModal(false)}
        title="Start a Direct Conversation"
        width={560}
      >
        <div className="stack" style={{ gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Input 
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder="Search faculty, admins, or classmates..."
              style={{ paddingLeft: '32px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          {loadingContacts ? (
            <div style={{ padding: '2rem 0', textAlign: 'center' }}><PageLoader /></div>
          ) : (
            <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Admins & Faculty Section */}
              {contacts.adminsAndFaculty?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                    🛡️ Instructors & Administration
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {contacts.adminsAndFaculty
                      .filter(u => !contactSearch || u.fullName?.toLowerCase().includes(contactSearch.toLowerCase()) || u.email?.toLowerCase().includes(contactSearch.toLowerCase()))
                      .map(u => (
                        <div
                          key={u.id}
                          onClick={() => startDirectChatWith(u)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.6rem 0.85rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background: 'var(--bg-surface-muted, #f8fafc)',
                            border: '1px solid var(--border-subtle, #e2e8f0)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                              {u.fullName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{u.fullName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                            </div>
                          </div>
                          {getRolePill(u.userType)}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Classmates Section */}
              {contacts.classmates?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                    👥 Classmates & Peers
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {contacts.classmates
                      .filter(u => !contactSearch || u.fullName?.toLowerCase().includes(contactSearch.toLowerCase()) || u.email?.toLowerCase().includes(contactSearch.toLowerCase()))
                      .map(u => (
                        <div
                          key={u.id}
                          onClick={() => startDirectChatWith(u)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.6rem 0.85rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background: 'var(--bg-surface-muted, #f8fafc)',
                            border: '1px solid var(--border-subtle, #e2e8f0)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                              {u.fullName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{u.fullName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                            </div>
                          </div>
                          {getRolePill(u.userType)}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

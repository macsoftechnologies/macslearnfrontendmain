import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Users, User, Shield, Search, Plus, 
  Circle, CheckCheck, BookOpen, Clock, Smile, ChevronLeft,
  Sparkles, RefreshCw, Paperclip, MessageCircle
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
import './ChatHub.css';

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
  const [readMap, setReadMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`chat_last_read_${user?.id || user?.userId || user?._id}`) || '{}');
    } catch { return {}; }
  });

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

  const markThreadAsRead = (threadId) => {
    if (!threadId) return;
    setReadMap(prev => {
      const updated = { ...prev, [threadId]: new Date().toISOString() };
      try {
        localStorage.setItem(`chat_last_read_${user?.id || user?.userId || user?._id}`, JSON.stringify(updated));
        window.dispatchEvent(new Event('refresh-chat-unread-count'));
      } catch {}
      return updated;
    });
  };

  // Auto-read on viewing
  useEffect(() => {
    if (activeThread?.id) {
      markThreadAsRead(activeThread.id);
    }
  }, [activeThread?.id, messages.length]);

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
                markThreadAsRead(activeThread.id);
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
    markThreadAsRead(thread.id);
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
        markThreadAsRead(activeThread.id);
      }
      loadInbox(true);
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
      setInputMessage(content);
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
      return <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '999px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', fontWeight: 800 }}>ADMIN</span>;
    }
    if (userType === 'FACULTY') {
      return <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '999px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontWeight: 800 }}>FACULTY</span>;
    }
    return <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '999px', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', fontWeight: 800 }}>STUDENT</span>;
  };

  const formatMsgTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chathub-wrapper">
      {/* PAGE HEADER */}
      <div className="chathub-header">
        <div>
          <span className="chathub-eyebrow">
            <MessageCircle size={14} /> LIVE MESSAGING & DISCUSSIONS
          </span>
          <h1 className="chathub-title">
            Messages & Discussions
          </h1>
        </div>
        <Button 
          icon={Plus} 
          onClick={openNewChat}
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 700, boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)' }}
        >
          New Direct Message
        </Button>
      </div>

      {/* THEATER CONTAINER */}
      <div className="chathub-container">
        {/* LEFT COLUMN: DIRECTORY */}
        <div className="chathub-sidebar">
          {/* Search Box */}
          <div className="chathub-search-box">
            <div style={{ position: 'relative' }}>
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                style={{ paddingLeft: '34px', fontSize: '0.88rem' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '5px', marginTop: '0.75rem', overflowX: 'auto', paddingBottom: '2px' }}>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'GROUPS', label: '👥 Groups' },
                { id: 'DIRECT', label: '👤 Peers' },
                { id: 'STAFF', label: '🛡️ Admins' },
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{ 
                    padding: '5px 12px', 
                    borderRadius: '999px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeTab === tab.id ? 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' : 'var(--accent-light, #e2e8f0)',
                    color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                    boxShadow: activeTab === tab.id ? '0 2px 8px rgba(79, 70, 229, 0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scroll List */}
          <div className="chathub-conv-list">
            {loading ? (
              <div style={{ padding: '2.5rem 0', textAlign: 'center' }}>
                <PageLoader />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: '3rem 1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                <MessageCircle size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No conversations yet</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Click "+ New Direct Message" to connect!</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeThread?.id === conv.id;
                const lastRead = readMap[conv.id];
                const msgTime = conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() : 0;
                const isUnread = !isSelected && msgTime > 0 && (!lastRead || msgTime > new Date(lastRead).getTime());

                return (
                  <div
                    key={conv.id}
                    onClick={() => selectThread(conv)}
                    className={`chathub-conv-item ${isSelected ? 'chathub-conv-item--active' : ''}`}
                  >
                    {/* Avatar */}
                    {conv.isGroup ? (
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 3px 8px rgba(79, 70, 229, 0.25)' }}>
                        <Users size={20} />
                      </div>
                    ) : conv.partner?.photo ? (
                      <img src={conv.partner.photo} alt="" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px', flexShrink: 0, boxShadow: '0 3px 8px rgba(99, 102, 241, 0.25)' }}>
                        {conv.title?.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span className="chathub-conv-title">
                          {conv.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {conv.partner && getRolePill(conv.partner.userType)}
                          {isUnread && (
                            <span style={{ 
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                              color: '#ffffff', 
                              fontSize: '10px', 
                              fontWeight: 900, 
                              padding: '2px 7px', 
                              borderRadius: '12px',
                              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                            }}>
                              NEW
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="chathub-conv-preview">
                        {conv.lastMessage || 'No messages yet'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: STAGE */}
        <div className="chathub-stage">
          {activeThread ? (
            <>
              {/* Header */}
              <div className="chathub-stage-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  {activeThread.threadType === 'BATCH_GROUP' ? (
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 8px rgba(79, 70, 229, 0.25)' }}>
                      <Users size={20} />
                    </div>
                  ) : (
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px', boxShadow: '0 3px 8px rgba(99, 102, 241, 0.25)' }}>
                      {activeThread.title?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 800 }}>{activeThread.title}</strong>
                      {activeThread.partner && getRolePill(activeThread.partner.userType)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, marginTop: '2px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                      {activeThread.threadType === 'BATCH_GROUP' ? 'Cohort Live Discussion Group' : 'Online · Real-Time Direct Chat'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Feed Canvas */}
              <div 
                ref={chatScrollRef}
                className="chathub-canvas-feed"
              >
                {loadingMessages ? (
                  <div style={{ margin: 'auto' }}><PageLoader /></div>
                ) : messages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Sparkles size={28} />
                    </div>
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>No messages yet in this conversation</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>Say hello to start the discussion!</p>
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
                        {/* Sender Label */}
                        {!isMe && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', paddingLeft: '4px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                              {msg.author?.fullName || 'User'}
                            </span>
                            {getRolePill(msg.author?.userType)}
                          </div>
                        )}

                        {/* Bubble */}
                        <div className={`chathub-msg-bubble ${isMe ? 'chathub-msg-bubble--me' : 'chathub-msg-bubble--partner'}`}>
                          {msg.content}
                        </div>

                        {/* Timestamp */}
                        <span style={{ 
                          fontSize: '0.70rem', 
                          color: 'var(--text-muted)', 
                          marginTop: '4px',
                          padding: '0 4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600
                        }}>
                          {formatMsgTime(msg.createdAt)}
                          {isMe && <CheckCheck size={14} color="#818cf8" />}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="chathub-input-bar">
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <Input 
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type a message... (Press Enter to send)"
                    disabled={sending}
                    style={{ 
                      flex: 1, 
                      borderRadius: '999px', 
                      padding: '0.75rem 1.25rem', 
                      fontSize: '0.92rem'
                    }}
                  />
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={!inputMessage.trim() || sending} 
                    style={{ 
                      padding: '0 1.5rem', 
                      height: '46px',
                      borderRadius: '999px',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', 
                      color: '#fff', 
                      fontWeight: 800, 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)' 
                    }}
                  >
                    <Send size={16} /> Send
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', padding: '3rem 1.5rem' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 8px 24px rgba(79, 70, 229, 0.2)' }}>
                <MessageSquare size={36} />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Your Communications Hub
              </h2>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                Select an active discussion from the left or click "+ New Direct Message" to start a new chat with instructors or peers.
              </p>
              <Button onClick={openNewChat} style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: '#fff', fontWeight: 700 }}>
                Start a New Conversation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* NEW DIRECT MESSAGE MODAL */}
      <Modal
        open={newChatModal}
        onClose={() => setNewChatModal(false)}
        title="Start a New Direct Conversation"
      >
        <div className="stack" style={{ gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Input 
              placeholder="Search faculty, admins, or classmates by name..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              style={{ paddingLeft: '32px' }}
            />
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {loadingContacts ? (
              <div style={{ padding: '2rem 0', textAlign: 'center' }}><PageLoader /></div>
            ) : (
              <>
                {/* Admins and Faculty */}
                {contacts.adminsAndFaculty.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Admins & Instructors
                    </div>
                    {contacts.adminsAndFaculty
                      .filter(c => c.fullName?.toLowerCase().includes(contactSearch.toLowerCase()) || c.email?.toLowerCase().includes(contactSearch.toLowerCase()))
                      .map(contact => (
                        <div 
                          key={contact.id}
                          onClick={() => startDirectChatWith(contact)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', background: 'transparent', transition: 'background 0.15s' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover, rgba(255,255,255,0.06))'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                              {contact.fullName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{contact.fullName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contact.email}</div>
                            </div>
                          </div>
                          {getRolePill(contact.userType)}
                        </div>
                      ))}
                  </div>
                )}

                {/* Classmates */}
                {contacts.classmates.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Cohort Classmates
                    </div>
                    {contacts.classmates
                      .filter(c => c.fullName?.toLowerCase().includes(contactSearch.toLowerCase()) || c.email?.toLowerCase().includes(contactSearch.toLowerCase()))
                      .map(contact => (
                        <div 
                          key={contact.id}
                          onClick={() => startDirectChatWith(contact)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', background: 'transparent', transition: 'background 0.15s' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover, rgba(255,255,255,0.06))'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                              {contact.fullName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{contact.fullName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contact.email}</div>
                            </div>
                          </div>
                          {getRolePill(contact.userType)}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

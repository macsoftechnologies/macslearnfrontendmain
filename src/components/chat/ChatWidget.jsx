import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, ChevronLeft, Search, Users, Maximize2, Loader2, Plus, Info, AtSign, Shield, GraduationCap, CheckCheck } from 'lucide-react';
import * as discussionApi from '../../api/discussion';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './ChatWidget.css';

const ROLE_PATH = { SUPER_ADMIN: 'super-admin', ORG_USER: 'admin', FACULTY: 'faculty', STUDENT: 'student', FINANCE: 'finance' };

export default function ChatWidget() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id || user?.userId || user?._id || localStorage.getItem('authUserId') || 'global_user';

  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState({ directChats: [], batchGroups: [], courseGroups: [] });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Thread state
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Group Members Drawer
  const [showMembers, setShowMembers] = useState(false);
  const [membersData, setMembersData] = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Inline @Mention Autocomplete State
  const [mentionQuery, setMentionQuery] = useState(null); // null = closed, string = search term

  // New Message Contact Picker Drawer
  const [showNewChat, setShowNewChat] = useState(false);
  const [contacts, setContacts] = useState({ adminsAndFaculty: [], classmates: [] });
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  const scrollRef = useRef(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);

  // Read tracking
  const [readMap, setReadMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('chat_last_read_' + userId) || '{}');
    } catch { return {}; }
  });

  // Fetch inbox
  const fetchInbox = async () => {
    try {
      const res = await discussionApi.getInbox();
      const data = res.data?.data || res.data || { directChats: [], batchGroups: [], courseGroups: [] };
      setInbox({
        directChats: Array.isArray(data.directChats) ? data.directChats : [],
        batchGroups: Array.isArray(data.batchGroups) ? data.batchGroups : [],
        courseGroups: Array.isArray(data.courseGroups) ? data.courseGroups : [],
      });

      // Calculate unread
      let rMap = {};
      try { rMap = JSON.parse(localStorage.getItem('chat_last_read_' + userId) || '{}'); } catch {}
      const allConvs = [
        ...(Array.isArray(data.directChats) ? data.directChats : []),
        ...(Array.isArray(data.batchGroups) ? data.batchGroups : []),
        ...(Array.isArray(data.courseGroups) ? data.courseGroups : []),
      ];
      let count = 0;
      allConvs.forEach(conv => {
        const lastRead = rMap[conv.id];
        const msgTime = conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() : 0;
        if (msgTime > 0 && (!lastRead || msgTime > new Date(lastRead).getTime())) {
          count += 1;
        }
      });
      setUnreadCount(count);
    } catch {}
  };

  useEffect(() => {
    fetchInbox();
    const interval = setInterval(fetchInbox, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  // Mark as read
  const markAsRead = (threadId) => {
    const updated = { ...readMap, [threadId]: new Date().toISOString() };
    setReadMap(updated);
    try {
      localStorage.setItem('chat_last_read_' + userId, JSON.stringify(updated));
      window.dispatchEvent(new Event('refresh-chat-unread-count'));
    } catch {}
  };

  
  // Mark all conversations as read
  const markAllAsRead = () => {
    const now = new Date().toISOString();
    const allConvs = [
      ...(inbox.directChats || []),
      ...(inbox.batchGroups || []),
      ...(inbox.courseGroups || []),
    ];
    const updated = { ...readMap };
    allConvs.forEach(c => {
      updated[c.id] = now;
    });
    setReadMap(updated);
    setUnreadCount(0);
    try {
      localStorage.setItem('chat_last_read_' + userId, JSON.stringify(updated));
      window.dispatchEvent(new Event('refresh-chat-unread-count'));
    } catch {}
  };

  // Helper to extract messages from API response
  const extractMessages = (res) => {
    const data = res.data?.data || res.data || {};
    if (Array.isArray(data.messages)) return data.messages;
    if (Array.isArray(data)) return data;
    return [];
  };

  // Open a thread
  const openThread = async (thread) => {
    setActiveThread(thread);
    setShowMembers(false);
    setShowNewChat(false);
    setMentionQuery(null);
    setLoadingMessages(true);
    markAsRead(thread.id);

    // Pre-fetch group members in background for instantaneous @mention lookup
    if (thread.isGroup) {
      discussionApi.getThreadMembers(thread.id)
        .then(res => setMembersData(res.data?.data || res.data || null))
        .catch(() => {});
    } else {
      setMembersData(null);
    }

    try {
      const res = await discussionApi.getThreadMessages(thread.id);
      setMessages(extractMessages(res));
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }

    // Start polling for this thread
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await discussionApi.getThreadMessages(thread.id);
        const msgs = extractMessages(res);
        setMessages(prev => {
          if (prev.length !== msgs.length) return msgs;
          return prev;
        });
      } catch {}
    }, 4000);
  };

  // Close thread
  const closeThread = () => {
    setActiveThread(null);
    setShowMembers(false);
    setMentionQuery(null);
    setMessages([]);
    if (pollRef.current) clearInterval(pollRef.current);
    fetchInbox();
  };

  // Fetch Group Members for Drawer
  const toggleGroupMembers = async () => {
    if (showMembers) {
      setShowMembers(false);
      return;
    }
    if (!activeThread?.id) return;
    setShowMembers(true);
    if (!membersData) {
      setLoadingMembers(true);
      try {
        const res = await discussionApi.getThreadMembers(activeThread.id);
        setMembersData(res.data?.data || res.data || null);
      } catch {
        setMembersData(null);
      } finally {
        setLoadingMembers(false);
      }
    }
  };

  // Tag / Mention Member directly
  const tagMember = (memberName) => {
    const clean = (memberName || '').trim();
    if (!clean) return;

    if (mentionQuery !== null) {
      // Replace the current @query at cursor
      const lastAt = inputMessage.lastIndexOf('@');
      if (lastAt !== -1) {
        const prefix = inputMessage.substring(0, lastAt);
        setInputMessage(`${prefix}@${clean} `);
      } else {
        setInputMessage(prev => `${prev}@${clean} `);
      }
    } else {
      setInputMessage(prev => prev ? `${prev} @${clean} ` : `@${clean} `);
    }

    setMentionQuery(null);
    setShowMembers(false);
    if (inputRef.current) inputRef.current.focus();
  };

  // Handle Input Change & Detect @
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputMessage(val);

    if (activeThread?.isGroup) {
      const match = val.match(/@([a-zA-Z0-9_ ]*)$/);
      if (match) {
        setMentionQuery(match[1].toLowerCase());
      } else {
        setMentionQuery(null);
      }
    } else {
      setMentionQuery(null);
    }
  };

  // Compute all available members for mention suggestions
  const allGroupMembers = [
    ...(membersData?.staff || []),
    ...(membersData?.students || [])
  ];

  const mentionSuggestions = allGroupMembers.filter(m => {
    if (mentionQuery === null) return false;
    const name = (m.fullName || m.name || '').toLowerCase();
    return name.includes(mentionQuery);
  }).slice(0, 5); // Limit to top 5 suggestions

  // Open New Message / Contact Picker
  const openNewMessagePicker = async () => {
    setShowNewChat(true);
    setLoadingContacts(true);
    try {
      const res = await discussionApi.getContacts();
      const data = res.data?.data || res.data || { adminsAndFaculty: [], classmates: [] };
      setContacts({
        adminsAndFaculty: Array.isArray(data.adminsAndFaculty) ? data.adminsAndFaculty : [],
        classmates: Array.isArray(data.classmates) ? data.classmates : [],
      });
    } catch {
      setContacts({ adminsAndFaculty: [], classmates: [] });
    } finally {
      setLoadingContacts(false);
    }
  };

  // Start Direct Chat with Contact
  const startDirectChatWith = async (contact) => {
    try {
      const res = await discussionApi.startDirectThread(contact.id);
      const thread = res.data?.data || res.data;
      if (thread) {
        setShowNewChat(false);
        openThread({
          ...thread,
          isGroup: false,
          otherParticipantName: contact.fullName || contact.name,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Send message
  const handleSend = async () => {
    if (!inputMessage.trim() || !activeThread || sending) return;
    const content = inputMessage.trim();
    setInputMessage('');
    setMentionQuery(null);
    setSending(true);

    try {
      const res = await discussionApi.sendMessage(activeThread.id, content);
      const newMsg = res.data?.data || res.data;
      if (newMsg && newMsg.id) {
        setMessages(prev => [...prev, newMsg]);
      } else {
        const fetchRes = await discussionApi.getThreadMessages(activeThread.id);
        setMessages(extractMessages(fetchRes));
      }
      markAsRead(activeThread.id);
      fetchInbox();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Build conversation list
  const allConversations = [
    ...inbox.courseGroups.map(g => ({ ...g, isGroup: true, groupType: 'COURSE' })),
    ...inbox.batchGroups.map(g => ({ ...g, isGroup: true, groupType: 'BATCH' })),
    ...inbox.directChats.map(d => ({ ...d, isGroup: false })),
  ].filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (c.title || c.name || c.otherParticipantName || '').toLowerCase();
    return name.includes(q);
  });

  const getConvName = (conv) => {
    if (conv.isGroup) return conv.title || conv.name || 'Group Chat';
    return conv.otherParticipantName || conv.title || 'Direct Message';
  };

  const getInitials = (name) => {
    return (name || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isUnread = (conv) => {
    const lastRead = readMap[conv.id];
    const msgTime = conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() : 0;
    return msgTime > 0 && (!lastRead || msgTime > new Date(lastRead).getTime());
  };

  // Filter Contacts
  const filteredStaff = contacts.adminsAndFaculty.filter(c => 
    !contactSearch.trim() || (c.fullName || c.name || '').toLowerCase().includes(contactSearch.toLowerCase())
  );
  const filteredStudents = contacts.classmates.filter(c => 
    !contactSearch.trim() || (c.fullName || c.name || '').toLowerCase().includes(contactSearch.toLowerCase())
  );

  
  // Visual Mention Renderer
  const renderFormattedMessage = (text, isMe) => {
    if (!text) return '';
    const myName = (user?.fullName || user?.name || '').toLowerCase();
    const parts = text.split(/(@[a-zA-Z0-9_]+(?: [a-zA-Z0-9_]+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const taggedName = part.substring(1).toLowerCase();
        const isMyMention = myName && (myName.includes(taggedName) || taggedName.includes(myName));
        return (
          <span
            key={i}
            className={'chat-mention-pill ' + (isMyMention ? 'chat-mention-pill--highlight' : (isMe ? 'chat-mention-pill--me' : 'chat-mention-pill--other'))}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // If panel is closed, show just the FAB
  if (!open) {
    return (
      <button className="chat-widget-fab" onClick={() => { setOpen(true); fetchInbox(); }} title="Messages">
        <MessageSquare size={22} />
        {unreadCount > 0 && (
          <span className="chat-widget-fab__badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="chat-widget-panel">
      {/* Panel Header */}
      <div className="chat-widget-panel__header">
        <div>
          <div className="chat-widget-panel__header-title">Messages</div>
          <div className="chat-widget-panel__header-sub">
            {allConversations.length} conversation{allConversations.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="chat-widget-panel__header-actions">
          {!activeThread && !showNewChat && (
            <>
              <button
                className="chat-widget-panel__header-btn"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck size={16} />
              </button>
              <button
                className="chat-widget-panel__header-btn"
                onClick={openNewMessagePicker}
                title="New Message"
              >
                <Plus size={16} />
              </button>
            </>
          )}
          <button
            className="chat-widget-panel__header-btn"
            onClick={() => { setOpen(false); navigate('/' + ROLE_PATH[role] + '/chat'); }}
            title="Open Full Chat"
          >
            <Maximize2 size={14} />
          </button>
          <button
            className="chat-widget-panel__header-btn"
            onClick={() => setOpen(false)}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Panel Body */}
      <div className="chat-widget-panel__body">
        {/* NEW MESSAGE CONTACT PICKER DRAWER */}
        {showNewChat && (
          <div className="chat-widget-contacts-drawer">
            <div className="chat-widget-contacts-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="chat-widget-thread__back" onClick={() => setShowNewChat(false)}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>New Direct Message</span>
              </div>
            </div>

            <div className="chat-widget-search" style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', top: '50%', left: '20px', transform: 'translateY(-50%)', color: 'var(--text-muted, #94a3b8)' }} />
              <input
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search teachers & classmates..."
                autoFocus
              />
            </div>

            <div className="chat-widget-members-list">
              {loadingContacts ? (
                <div className="chat-widget-empty">
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <p>Loading directory...</p>
                </div>
              ) : (
                <>
                  {filteredStaff.length > 0 && (
                    <>
                      <div className="chat-widget-section-label">Faculty & Admins ({filteredStaff.length})</div>
                      {filteredStaff.map(contact => (
                        <div key={contact.id} className="chat-widget-inbox__item" onClick={() => startDirectChatWith(contact)}>
                          <div className="chat-widget-inbox__avatar">{getInitials(contact.fullName || contact.name)}</div>
                          <div className="chat-widget-inbox__meta">
                            <div className="chat-widget-inbox__name">{contact.fullName || contact.name}</div>
                            <div className="chat-widget-inbox__preview">{contact.email}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {filteredStudents.length > 0 && (
                    <>
                      <div className="chat-widget-section-label" style={{ marginTop: '12px' }}>Classmates ({filteredStudents.length})</div>
                      {filteredStudents.map(contact => (
                        <div key={contact.id} className="chat-widget-inbox__item" onClick={() => startDirectChatWith(contact)}>
                          <div className="chat-widget-inbox__avatar" style={{ background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)' }}>
                            {getInitials(contact.fullName || contact.name)}
                          </div>
                          <div className="chat-widget-inbox__meta">
                            <div className="chat-widget-inbox__name">{contact.fullName || contact.name}</div>
                            <div className="chat-widget-inbox__preview">{contact.email}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {filteredStaff.length === 0 && filteredStudents.length === 0 && (
                    <div className="chat-widget-empty">
                      <p>No contacts found</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* INBOX VIEW */}
        {!activeThread && !showNewChat && (
          <>
            {/* Search */}
            <div className="chat-widget-search" style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', top: '50%', left: '20px', transform: 'translateY(-50%)', color: 'var(--text-muted, #94a3b8)' }} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
              />
            </div>

            {/* Conversation List */}
            <div className="chat-widget-inbox">
              {allConversations.length === 0 ? (
                <div className="chat-widget-empty">
                  <MessageSquare size={36} />
                  <p>No conversations yet</p>
                  <button 
                    onClick={openNewMessagePicker}
                    style={{ marginTop: '8px', padding: '6px 14px', borderRadius: '6px', background: 'var(--accent, #6366f1)', color: '#fff', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Start a Message
                  </button>
                </div>
              ) : (
                allConversations.map((conv) => {
                  const name = getConvName(conv);
                  const unread = isUnread(conv);
                  return (
                    <div
                      key={conv.id}
                      className={'chat-widget-inbox__item ' + (unread ? 'chat-widget-inbox__item--unread' : '')}
                      onClick={() => openThread(conv)}
                    >
                      <div className={'chat-widget-inbox__avatar ' + (conv.isGroup ? 'chat-widget-inbox__avatar--group' : '')}>
                        {conv.isGroup ? <Users size={16} /> : getInitials(name)}
                      </div>
                      <div className="chat-widget-inbox__meta">
                        <div className="chat-widget-inbox__name">{name}</div>
                        <div className="chat-widget-inbox__preview">
                          {conv.lastMessagePreview || conv.lastMessage || (conv.isGroup ? 'Group discussion' : 'Start chatting...')}
                        </div>
                      </div>
                      {conv.lastMessageAt && (
                        <span className="chat-widget-inbox__time">{formatTime(conv.lastMessageAt)}</span>
                      )}
                      {unread && <span className="chat-widget-inbox__unread-dot" />}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* THREAD VIEW */}
        {activeThread && (
          <div className="chat-widget-thread">
            <div className="chat-widget-thread__header">
              <div className="chat-widget-thread__left">
                <button className="chat-widget-thread__back" onClick={closeThread}>
                  <ChevronLeft size={16} />
                </button>
                <span className="chat-widget-thread__title">{getConvName(activeThread)}</span>
              </div>
              <div className="chat-widget-thread__actions">
                {activeThread.isGroup && (
                  <button className="chat-widget-thread__btn" onClick={toggleGroupMembers} title="View Members & Tag">
                    <Users size={12} />
                    <span>Members</span>
                  </button>
                )}
              </div>
            </div>

            {/* MEMBERS DRAWER OVERLAY */}
            {showMembers && (
              <div className="chat-widget-members-drawer">
                <div className="chat-widget-members-header">
                  <span>Group Directory ({membersData ? (membersData.staff?.length || 0) + (membersData.students?.length || 0) : 0})</span>
                  <button 
                    onClick={() => setShowMembers(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="chat-widget-members-list">
                  {loadingMembers ? (
                    <div className="chat-widget-empty">
                      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                      <p>Loading members...</p>
                    </div>
                  ) : membersData ? (
                    <>
                      {/* Staff */}
                      {Array.isArray(membersData.staff) && membersData.staff.length > 0 && (
                        <>
                          <div className="chat-widget-section-label">Faculty & Instructors ({membersData.staff.length})</div>
                          {membersData.staff.map(m => (
                            <div key={m.id} className="chat-widget-member-item">
                              <div className="chat-widget-member-info">
                                <Shield size={12} color="#6366f1" />
                                <span className="chat-widget-member-name">{m.fullName || m.name}</span>
                                <span className="chat-widget-member-role chat-widget-member-role--staff">Faculty</span>
                              </div>
                              <button className="chat-widget-mention-btn" onClick={() => tagMember(m.fullName || m.name)}>
                                <AtSign size={10} style={{ display: 'inline', marginRight: 2 }} /> Tag
                              </button>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Students */}
                      {Array.isArray(membersData.students) && membersData.students.length > 0 && (
                        <>
                          <div className="chat-widget-section-label" style={{ marginTop: '10px' }}>Enrolled Students ({membersData.students.length})</div>
                          {membersData.students.map(m => (
                            <div key={m.id} className="chat-widget-member-item">
                              <div className="chat-widget-member-info">
                                <GraduationCap size={12} color="#10b981" />
                                <span className="chat-widget-member-name">{m.fullName || m.name}</span>
                                <span className="chat-widget-member-role chat-widget-member-role--student">Student</span>
                              </div>
                              <button className="chat-widget-mention-btn" onClick={() => tagMember(m.fullName || m.name)}>
                                <AtSign size={10} style={{ display: 'inline', marginRight: 2 }} /> Tag
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="chat-widget-empty">
                      <p>No member data available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages Feed */}
            <div className="chat-widget-thread__messages" ref={scrollRef}>
              {loadingMessages ? (
                <div className="chat-widget-empty">
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <p>Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="chat-widget-empty">
                  <MessageSquare size={28} />
                  <p>No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const senderId = msg.senderId?._id || msg.senderId?.id || msg.senderId || msg.authorId;
                  const isMe = senderId === userId;
                  const senderName = msg.senderId?.fullName || msg.senderId?.name || msg.author?.fullName || msg.senderName || 'User';
                  return (
                    <div key={msg._id || msg.id} className={'chat-widget-msg ' + (isMe ? 'chat-widget-msg--me' : 'chat-widget-msg--partner')}>
                      {!isMe && activeThread.isGroup && (
                        <div className="chat-widget-msg__sender">{senderName}</div>
                      )}
                      <div>{renderFormattedMessage(msg.content || msg.message || msg.text, isMe)}</div>
                      <div className="chat-widget-msg__time">{formatTime(msg.createdAt || msg.sentAt)}</div>
                    </div>
                  );
                })
              )}
            </div>

            {/* INLINE @MENTION AUTOCOMPLETE POPUP */}
            {mentionSuggestions.length > 0 && (
              <div className="chat-widget-mention-popup">
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '2px 8px 4px', textTransform: 'uppercase' }}>
                  Mention Member
                </div>
                {mentionSuggestions.map((m) => (
                  <div
                    key={m.id}
                    className="chat-widget-mention-item"
                    onClick={() => tagMember(m.fullName || m.name)}
                  >
                    <div className="chat-widget-mention-avatar">
                      {getInitials(m.fullName || m.name)}
                    </div>
                    <span className="chat-widget-mention-name">{m.fullName || m.name}</span>
                    <span className={'chat-widget-member-role ' + (m.userType === 'STUDENT' ? 'chat-widget-member-role--student' : 'chat-widget-member-role--staff')}>
                      {m.userType === 'STUDENT' ? 'Student' : 'Faculty'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="chat-widget-input">
              <input
                ref={inputRef}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    if (mentionSuggestions.length > 0) {
                      e.preventDefault();
                      tagMember(mentionSuggestions[0].fullName || mentionSuggestions[0].name);
                      return;
                    }
                    e.preventDefault();
                    handleSend();
                  } else if (e.key === 'Escape') {
                    setMentionQuery(null);
                  }
                }}
                placeholder={activeThread?.isGroup ? "Type a message or @ to mention..." : "Type a message..."}
                disabled={sending}
              />
              <button
                className="chat-widget-input__send"
                onClick={handleSend}
                disabled={!inputMessage.trim() || sending}
                title="Send"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

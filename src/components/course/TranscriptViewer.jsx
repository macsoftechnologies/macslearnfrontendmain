import React, { useState, useMemo } from 'react';
import { FileText, Search, Copy, Check, Clock, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';

export default function TranscriptViewer({ videoUrl, onSeek, currentSeconds = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcriptData, setTranscriptData] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchTranscript = async () => {
    if (!videoUrl) {
      toast.error('No video available for this lesson');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await client.get('/vimeo/transcript', {
        params: { videoUrl },
      });
      const data = res.data?.data || res.data;
      setTranscriptData(data);
      if (!data.available) {
        setError(data.message || 'No captions or transcript track available for this video yet.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch transcript';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState && !transcriptData && !loading) {
      fetchTranscript();
    }
  };

  const handleCopy = () => {
    if (!transcriptData?.fullText) return;
    navigator.clipboard.writeText(transcriptData.fullText);
    setCopied(true);
    toast.success('Full transcript copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const items = transcriptData?.sentences?.length ? transcriptData.sentences : (transcriptData?.cues || []);

  const filteredCues = useMemo(() => {
    if (!items.length) return [];
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(c => c.text.toLowerCase().includes(q));
  }, [items, searchQuery]);

  return (
    <div style={{
      marginTop: '16px',
      marginBottom: '24px',
      border: '1px solid var(--border-subtle, #e2e8f0)',
      borderRadius: '12px',
      background: 'var(--color-surface, #ffffff)',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Header Button */}
      <button
        type="button"
        onClick={handleToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: isOpen ? 'var(--color-surface-hover, #f8fafc)' : '#ffffff',
          border: 'none',
          cursor: 'pointer',
          borderBottom: isOpen ? '1px solid var(--border-subtle, #e2e8f0)' : 'none',
          transition: 'background 0.2s',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            padding: '8px 10px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #EFB35C 0%, #E29A38 100%)',
            color: '#16223F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700
          }}>
            <FileText size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px', color: '#1e293b' }}>
              Video Transcription & Timestamps
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {isOpen ? 'Click any timestamp below to jump video' : 'Click to load and view the complete video transcript'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
          {transcriptData?.totalCues ? (
            <span style={{
              fontSize: '12px',
              padding: '3px 10px',
              borderRadius: '12px',
              background: '#f1f5f9',
              fontWeight: 600,
              color: '#334155'
            }}>
              {transcriptData.totalSentences || transcriptData.totalCues} sentences
            </span>
          ) : null}
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div style={{ padding: '16px 18px', background: '#ffffff' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '32px 0', color: '#64748b' }}>
              <Loader2 size={22} className="animate-spin" />
              <span>Fetching transcript from Vimeo...</span>
            </div>
          )}

          {error && !loading && (
            <div style={{
              padding: '14px 16px',
              borderRadius: '8px',
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              color: '#92400e',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '13px'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Notice:</strong> {error}
                <div style={{ marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={fetchTranscript}
                    style={{
                      background: '#d97706',
                      color: '#fff',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {transcriptData && transcriptData.available && !loading && (
            <div>
              {/* Toolbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '14px',
                flexWrap: 'wrap'
              }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search in transcript..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 32px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'transparent',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#334155',
                      cursor: 'pointer'
                    }}
                  >
                    {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy All Text'}</span>
                  </button>
                </div>
              </div>

              {/* Cue List */}
              <div style={{
                maxHeight: '340px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: '#f8fafc',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                {filteredCues.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    No matching sentences found for "{searchQuery}".
                  </div>
                ) : (
                  filteredCues.map((cue) => {
                    const isCurrent = currentSeconds >= cue.startSeconds && currentSeconds <= cue.endSeconds;
                    return (
                      <div
                        key={cue.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: isCurrent ? '#eff6ff' : '#ffffff',
                          border: isCurrent ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Clickable Timestamp */}
                        <button
                          type="button"
                          onClick={() => onSeek && onSeek(cue.startSeconds)}
                          title={`Jump video to ${cue.displayTime}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: isCurrent ? '#2563eb' : '#f1f5f9',
                            color: isCurrent ? '#ffffff' : '#3b82f6',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            flexShrink: 0,
                            fontFamily: 'monospace'
                          }}
                        >
                          <Clock size={11} />
                          {cue.displayTime}
                        </button>

                        {/* Text */}
                        <div style={{
                          fontSize: '13px',
                          lineHeight: '1.5',
                          color: isCurrent ? '#1e3a8a' : '#334155',
                          fontWeight: isCurrent ? 500 : 400
                        }}>
                          {cue.text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

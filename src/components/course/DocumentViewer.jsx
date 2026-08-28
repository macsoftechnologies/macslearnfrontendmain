import React, { useState, useRef, useEffect } from 'react';
import { FileText, Download, Eye, Maximize, Minimize, ExternalLink, RefreshCw } from 'lucide-react';
import { buildStaticUrl } from '../../api/client';
import Button from '../ui/Button';

export default function DocumentViewer({ url, title, fileName, size, height = '760px' }) {
  const [engine, setEngine] = useState('google'); // 'google' | 'office' | 'native'
  const [loading, setLoading] = useState(true);
  const [isDocFullscreen, setIsDocFullscreen] = useState(false);
  const docContainerRef = useRef(null);

  useEffect(() => {
    setLoading(true);
  }, [url, engine]);

  if (!url) return null;

  const strUrl = typeof url === 'string' ? url : (url?.url || '');
  if (!strUrl || typeof strUrl !== 'string') return null;

  const rawUrl = buildStaticUrl(strUrl);
  let fullPublicUrl = typeof rawUrl === 'string' ? rawUrl : '';
  if (fullPublicUrl.startsWith('/')) {
    fullPublicUrl = window.location.origin + fullPublicUrl;
  }

  const ext = (typeof fullPublicUrl === 'string' ? fullPublicUrl.split('.').pop() || '' : '').toLowerCase().split('?')[0];

  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  const isPdf = ext === 'pdf';
  const isOffice = ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'].includes(ext);

  // Office and Google Docs online viewer URLs
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullPublicUrl)}`;
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fullPublicUrl)}&embedded=true`;

  const getActiveViewerUrl = () => {
    if (isImage) return fullPublicUrl;
    if (isPdf) {
      if (engine === 'google') return googleViewerUrl;
      return `${fullPublicUrl}#toolbar=1&navpanes=0`;
    }
    if (isOffice) {
      if (engine === 'office') return officeViewerUrl;
      if (engine === 'native') return fullPublicUrl;
      return googleViewerUrl;
    }
    return googleViewerUrl;
  };

  const getFormatBadge = () => {
    if (['ppt', 'pptx'].includes(ext)) return { label: 'POWERPOINT SLIDES', bg: 'linear-gradient(135deg, #ea580c, #c2410c)' };
    if (['doc', 'docx'].includes(ext)) return { label: 'WORD DOCUMENT', bg: 'linear-gradient(135deg, #2563eb, #1d4ed8)' };
    if (isPdf) return { label: 'PDF DOCUMENT', bg: 'linear-gradient(135deg, #dc2626, #b91c1c)' };
    if (['xls', 'xlsx', 'csv'].includes(ext)) return { label: 'EXCEL SPREADSHEET', bg: 'linear-gradient(135deg, #059669, #047857)' };
    if (isImage) return { label: 'IMAGE', bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' };
    return { label: 'DOCUMENT', bg: 'linear-gradient(135deg, #475569, #334155)' };
  };

  const badge = getFormatBadge();

  const toggleDocFullscreen = () => {
    if (!docContainerRef.current) return;
    if (!document.fullscreenElement) {
      docContainerRef.current.requestFullscreen().catch(() => {});
      setIsDocFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsDocFullscreen(false);
    }
  };

  const activeViewerUrl = getActiveViewerUrl();

  return (
    <div
      ref={docContainerRef}
      style={{
        width: '100%',
        borderRadius: isDocFullscreen ? 0 : '14px',
        border: '1px solid var(--border-subtle, #e2e8f0)',
        background: '#fff',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        marginBottom: isDocFullscreen ? 0 : 'var(--sp-6)',
        height: isDocFullscreen ? '100vh' : height,
      }}
    >
      {/* Top Document Toolbar */}
      <div
        style={{
          padding: '10px 16px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '6px',
              background: badge.bg,
              color: '#fff',
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}
          >
            {badge.label}
          </span>
          <span
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#1e293b',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={fileName || title || 'Document Preview'}
          >
            {fileName || title || 'Document Preview'}
          </span>
        </div>

        {/* Engine Switchers & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isOffice && (
            <div style={{ display: 'flex', background: '#e2e8f0', padding: '2px', borderRadius: '6px', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setEngine('google')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: engine === 'google' ? 700 : 500,
                  background: engine === 'google' ? '#fff' : 'transparent',
                  color: engine === 'google' ? '#1e293b' : '#64748b',
                  cursor: 'pointer',
                  boxShadow: engine === 'google' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Google Engine
              </button>
              <button
                type="button"
                onClick={() => setEngine('office')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: engine === 'office' ? 700 : 500,
                  background: engine === 'office' ? '#fff' : 'transparent',
                  color: engine === 'office' ? '#1e293b' : '#64748b',
                  cursor: 'pointer',
                  boxShadow: engine === 'office' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Office Engine
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={toggleDocFullscreen}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
            }}
          >
            {isDocFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            <span>{isDocFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>

          <a
            href={fullPublicUrl}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <button
              type="button"
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
              }}
            >
              <ExternalLink size={14} />
              <span>Open Tab</span>
            </button>
          </a>

          <a
            href={fullPublicUrl}
            download={fileName || 'document'}
            style={{ textDecoration: 'none' }}
          >
            <button
              type="button"
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                background: '#2563eb',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '12px',
                fontWeight: 700,
                color: '#fff',
              }}
            >
              <Download size={14} />
              <span>Download</span>
            </button>
          </a>
        </div>
      </div>

      {/* Main View Area */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', background: '#f8fafc' }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f8fafc',
              zIndex: 10,
              gap: 12,
            }}
          >
            <div style={{ width: 32, height: 32, border: '3px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Loading document viewer...</span>
            <style>{'@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }'}</style>
          </div>
        )}

        {isImage ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <img
              src={fullPublicUrl}
              alt={title || 'Document Image'}
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
        ) : (
          <iframe
            key={activeViewerUrl}
            src={activeViewerUrl}
            title={title || 'Document Viewer'}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              background: '#f8fafc',
            }}
          />
        )}
      </div>
    </div>
  );
}

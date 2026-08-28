import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Eye, Paperclip, Video, BookOpen, Sparkles, Play, RotateCcw, X, Maximize, Minimize } from 'lucide-react';
import { buildStaticUrl } from '../../api/client';
import * as contentApi from '../../api/content';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import PageLoader from '../../components/ui/PageLoader';
import ReactPlayer from 'react-player';
const Player = ReactPlayer.default ? ReactPlayer.default : ReactPlayer;

// --- Animated Video Overlay Component ---
function AnimatedVideoOverlay({ overlay, onDismiss }) {
  if (!overlay || overlay.enabled === false || !overlay.imageUrl) return null;

  const imageUrl = overlay.imageUrl.startsWith('http') 
    ? overlay.imageUrl 
    : buildStaticUrl(overlay.imageUrl);

  const position = overlay.position || 'center';

  const getPositionStyle = () => {
    switch (position) {
      case 'top-right':
        return { top: '30px', right: '30px', transform: 'none' };
      case 'bottom-right':
        return { bottom: '75px', right: '30px', transform: 'none' };
      case 'top-left':
        return { top: '30px', left: '30px', transform: 'none' };
      case 'bottom-left':
        return { bottom: '75px', left: '30px', transform: 'none' };
      case 'center':
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  return (
    <>
      <style>{`
        @keyframes overlayPopZoom {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.3) rotate(-6deg);
            filter: blur(8px) brightness(1.8);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.06) rotate(1deg);
            filter: blur(0px) brightness(1.2);
          }
          75% {
            transform: translate(-50%, -50%) scale(0.97) rotate(-0.5deg);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
            filter: blur(0px) brightness(1);
          }
        }

        @keyframes overlayFloatGlow {
          0%, 100% {
            box-shadow: 0 0 45px rgba(59, 130, 246, 0.6), 0 25px 50px rgba(0,0,0,0.75), inset 0 0 20px rgba(255,255,255,0.25);
            transform: translate(-50%, -50%) translateY(0px);
          }
          50% {
            box-shadow: 0 0 75px rgba(139, 92, 246, 0.85), 0 30px 60px rgba(0,0,0,0.9), inset 0 0 30px rgba(255,255,255,0.45);
            transform: translate(-50%, -50%) translateY(-8px);
          }
        }

        @keyframes shimmerSweep {
          0% {
            transform: translateX(-150%) skewX(-25deg);
          }
          100% {
            transform: translateX(250%) skewX(-25deg);
          }
        }

        @keyframes pulseRings {
          0% {
            transform: scale(0.85);
            opacity: 0.95;
          }
          100% {
            transform: scale(1.45);
            opacity: 0;
          }
        }
      `}</style>

      <div
        className="animated-video-overlay"
        style={{
          position: 'absolute',
          ...getPositionStyle(),
          zIndex: 9999,
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          animation: position === 'center' 
            ? 'overlayPopZoom 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards, overlayFloatGlow 3s ease-in-out infinite 0.8s' 
            : 'overlayPopZoom 0.6s ease forwards',
        }}
      >
        {/* Ambient Pulsing Halo */}
        <div
          style={{
            position: 'absolute',
            inset: -16,
            borderRadius: '32px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, rgba(59,130,246,0.2) 50%, transparent 70%)',
            animation: 'pulseRings 2.5s cubic-bezier(0.25, 1, 0.5, 1) infinite',
            pointerEvents: 'none',
          }}
        />

        {/* Glassmorphic Container (Bigger & High-Impact) */}
        <div
          style={{
            position: 'relative',
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '24px',
            padding: position === 'center' ? '24px 36px' : '14px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            maxWidth: position === 'center' ? '460px' : '220px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,255,255,0.4)',
          }}
        >
          {/* Shimmer Light Sweep */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '60%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              animation: 'shimmerSweep 3s infinite 0.5s',
              pointerEvents: 'none',
            }}
          />

          {/* Dismiss Button */}
          {onDismiss && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                borderRadius: '50%',
                width: 24,
                height: 24,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
                zIndex: 10
              }}
              title="Close overlay"
            >
              <X size={14} />
            </button>
          )}

          <img
            src={imageUrl}
            alt="Institution Logo"
            style={{
              maxHeight: position === 'center' ? '220px' : '110px',
              maxWidth: '100%',
              objectFit: 'contain',
              display: 'block',
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))',
            }}
          />

          {overlay.customText && (
            <span
              style={{
                fontSize: position === 'center' ? '1.1rem' : '0.8rem',
                fontWeight: 700,
                color: '#fff',
                textAlign: 'center',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                letterSpacing: '0.02em',
              }}
            >
              {overlay.customText}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

// --- Interactive In-Browser Document & Presentation Viewer ---
export function DocumentViewer({ url, title, fileName, size, height = '700px' }) {
  const [engine, setEngine] = useState('office'); // 'office' | 'google' | 'native'
  const [loading, setLoading] = useState(true);
  const [isDocFullscreen, setIsDocFullscreen] = useState(false);
  const docContainerRef = useRef(null);

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
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}`;
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`;

  const getActiveViewerUrl = () => {
    if (isImage) return rawUrl;
    if (isPdf) {
      if (engine === 'google') return googleViewerUrl;
      return rawUrl;
    }
    if (isOffice) {
      if (engine === 'google') return googleViewerUrl;
      if (engine === 'native') return rawUrl;
      return officeViewerUrl;
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

  return (
    <div
      ref={docContainerRef}
      style={{
        width: '100%',
        borderRadius: isDocFullscreen ? 0 : '14px',
        border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
        background: 'var(--bg-surface, #1e293b)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
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
          padding: '12px 18px',
          background: 'var(--bg-surface-card, #0f172a)',
          borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
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
              fontSize: '10px',
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
              fontWeight: 600,
              color: 'var(--text-primary, #fff)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={title || fileName || 'Document Preview'}
          >
            {title || fileName || 'Document Preview'}
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Switch Viewer Engine for Office/PDF */}
          {!isImage && (
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                type="button"
                onClick={() => { setLoading(true); setEngine('office'); }}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: engine === 'office' ? 'var(--primary, #3b82f6)' : 'transparent',
                  color: engine === 'office' ? '#fff' : 'var(--text-secondary, #94a3b8)',
                  transition: 'all 0.15s',
                }}
                title="Microsoft Office Online Viewer"
              >
                Office
              </button>
              <button
                type="button"
                onClick={() => { setLoading(true); setEngine('google'); }}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: engine === 'google' ? 'var(--primary, #3b82f6)' : 'transparent',
                  color: engine === 'google' ? '#fff' : 'var(--text-secondary, #94a3b8)',
                  transition: 'all 0.15s',
                }}
                title="Google Docs Viewer"
              >
                Google
              </button>
              {isPdf && (
                <button
                  type="button"
                  onClick={() => { setLoading(true); setEngine('native'); }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: engine === 'native' ? 'var(--primary, #3b82f6)' : 'transparent',
                    color: engine === 'native' ? '#fff' : 'var(--text-secondary, #94a3b8)',
                    transition: 'all 0.15s',
                  }}
                  title="Direct PDF Embed"
                >
                  Direct
                </button>
              )}
            </div>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleDocFullscreen}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--text-primary, #fff)',
              border: '1px solid rgba(255,255,255,0.12)',
              cursor: 'pointer',
            }}
            title={isDocFullscreen ? 'Exit Fullscreen' : 'Fullscreen Presentation'}
          >
            {isDocFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
          </button>

          {/* Download Button */}
          <a
            href={rawUrl}
            download={fileName || title || 'document'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              background: 'var(--primary, #3b82f6)',
              color: '#fff',
              textDecoration: 'none',
              transition: 'background 0.2s',
            }}
          >
            <Download size={13} />
            <span>Download</span>
            {size && <span style={{ opacity: 0.8, fontSize: '10px' }}>({Math.round(size / 1024)} KB)</span>}
          </a>
        </div>
      </div>

      {/* Main Presentation / Document View Area */}
      <div style={{ position: 'relative', flex: 1, width: '100%', height: '100%', background: '#fff', overflow: 'hidden' }}>
        {loading && !isImage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15, 23, 42, 0.92)',
              color: '#fff',
              zIndex: 10,
              gap: 12,
            }}
          >
            <div className="spinner" style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--primary, #3b82f6)', borderRadius: '50%' }} />
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Loading document presentation...</span>
          </div>
        )}

        {isImage ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 20 }}>
            <img src={rawUrl} alt={title || 'Document Preview'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
          </div>
        ) : (
          <iframe
            src={getActiveViewerUrl()}
            title={title || 'Document Viewer'}
            onLoad={() => setLoading(false)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        )}
      </div>
    </div>
  );
}

const getPlayerUrl = (url) => {
  if (!url) return '';
  let trimmed = url.trim();
  if (trimmed.includes('youtube.com/embed/')) {
    const videoId = trimmed.split('youtube.com/embed/')[1].split(/[?#]/)[0];
    trimmed = `https://www.youtube.com/watch?v=${videoId}`;
  } else if (trimmed.includes('player.vimeo.com/video/')) {
    const vimeoPath = trimmed.split('player.vimeo.com/video/')[1].split(/[?#]/)[0];
    trimmed = `https://vimeo.com/${vimeoPath}`;
  }
  if (trimmed.startsWith('www.')) trimmed = 'https://' + trimmed;
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || trimmed.includes('vimeo.com')) {
    if (!trimmed.startsWith('http')) trimmed = 'https://' + trimmed;
  }
  if (trimmed.startsWith('http')) return trimmed;
  return buildStaticUrl(trimmed);
};

export default function LessonPreview() {
  const { id: courseId, lessonId } = useParams();
  const location = useLocation();
  const playerRef = useRef(null);
  const videoContainerRef = useRef(null);

  const [lesson, setLesson] = useState(location.state?.lesson || null);
  const [loading, setLoading] = useState(!location.state?.lesson);
  const [selectedAttachmentIdx, setSelectedAttachmentIdx] = useState(0);
  const [previewModalDoc, setPreviewModalDoc] = useState(null);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [forceOverlay, setForceOverlay] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const base = location.pathname.startsWith('/faculty') ? '/faculty' : '/admin';

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const onFullChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    document.addEventListener('fullscreenchange', onFullChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFullChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Load fresh lesson data from API
  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const modsRes = await contentApi.listModules(courseId);
        const mods = modsRes.data?.data || [];
        for (const m of mods) {
          const mId = m._id || m.id;
          const lessonsRes = await contentApi.listLessons(courseId, mId);
          const lessons = lessonsRes.data?.data || [];
          const found = lessons.find(l => (l._id || l.id) === lessonId);
          if (found) {
            setLesson(found);
            break;
          }
        }
      } catch (e) {
        console.error('Failed to load lesson preview', e);
      } finally {
        setLoading(false);
      }
    };
    fetchLesson();
  }, [courseId, lessonId]);

  if (loading) return <PageLoader />;

  if (!lesson) {
    return (
      <div className="page" style={{ padding: 'var(--sp-6)' }}>
        <p>Lesson details not found.</p>
        <Link to={`${base}/courses/${courseId}`}><Button variant="outline">Back to Course</Button></Link>
      </div>
    );
  }

  const videoUrl = lesson.videoUrl ? getPlayerUrl(lesson.videoUrl) : '';
  const attachments = lesson.attachments?.length > 0 
    ? lesson.attachments 
    : (lesson.contentUrl || lesson.documentUrl ? [{ name: lesson.title || 'Lesson Document', url: lesson.contentUrl || lesson.documentUrl }] : []);
  const hasAttachments = attachments.length > 0;
  const activeAttachment = attachments[selectedAttachmentIdx] || attachments[0] || null;

  const overlay = lesson.overlayConfig;
  const overlayStart = overlay?.startSecond ?? 29;
  const overlayDuration = overlay?.durationSeconds ?? 5;
  const isOverlayActive = forceOverlay || (
    overlay && 
    overlay.enabled !== false && 
    overlay.imageUrl && 
    currentSeconds >= overlayStart && 
    currentSeconds < (overlayStart + overlayDuration)
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: 'var(--bg-app)', overflow: 'hidden' }}>
      
      {/* ---- Left Sidebar: Attachments & Info ---- */}
      <aside style={{
        width: hasAttachments ? 320 : 0,
        flexShrink: 0,
        background: 'var(--glass-heavy, var(--bg-surface))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: hasAttachments ? '1px solid var(--border-subtle)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.3s ease',
      }}>
        {hasAttachments && (
          <>
            {/* Sidebar Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'rgba(0,0,0,0.08)',
            }}>
              <Link to={`${base}/courses/${courseId}`} className="row text-muted" style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, marginBottom: '12px', gap: '4px', textDecoration: 'none', color: 'var(--text-muted)' }}>
                <ArrowLeft size={14} /> Back to Course
              </Link>
              <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {lesson.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                Lesson Preview
              </div>
            </div>

            {/* Lesson Info */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                {videoUrl ? <Video size={14} /> : <BookOpen size={14} />}
                <span style={{ textTransform: 'capitalize' }}>{lesson.type?.toLowerCase() || 'Lesson'}</span>
                {lesson.durationMinutes > 0 && (
                  <span style={{ marginLeft: 'auto' }}>{lesson.durationMinutes} min</span>
                )}
              </div>
            </div>

            {/* Attachments Section */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <Paperclip size={12} />
                Study Materials & Slides ({attachments.length})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {attachments.map((att, idx) => {
                  const isSelected = selectedAttachmentIdx === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedAttachmentIdx(idx);
                        if (videoUrl) {
                          setPreviewModalDoc(att);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-surface)',
                        border: isSelected ? '1.5px solid var(--primary, #3b82f6)' : '1px solid var(--border-subtle)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        transition: 'all 0.2s ease',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(59,130,246,0.1))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <FileText size={16} color="var(--brand, #7c3aed)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.name || 'Document'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {isSelected && !videoUrl ? 'Currently Viewing' : 'Click to view presentation'}
                        </div>
                      </div>
                      <Eye size={14} color={isSelected ? 'var(--primary, #3b82f6)' : 'var(--text-muted)'} />
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* ---- Main Content Area ---- */}
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-surface)', minWidth: 0 }}>
        {/* Top bar if no sidebar */}
        {!hasAttachments && (
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
            <Link to={`${base}/courses/${courseId}`} className="row text-muted" style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, gap: '4px', textDecoration: 'none', color: 'var(--text-muted)' }}>
              <ArrowLeft size={14} /> Back to Course
            </Link>
          </div>
        )}

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 32px' }}>
          {/* Title Header */}
          <div style={{ marginBottom: '20px' }}>
            <span style={{
              display: 'inline-block',
              padding: '3px 10px',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(59,130,246,0.12))',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--brand, #7c3aed)',
              marginBottom: '8px',
            }}>Lesson Preview</span>
            <h1 style={{ fontSize: 'var(--fs-2xl, 28px)', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>{lesson.title}</h1>
          </div>

          {/* Quick Overlay Test Bar (if overlay is configured and video exists) */}
          {videoUrl && overlay?.imageUrl && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.08))',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '10px',
              padding: '10px 16px',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-xs)' }}>
                <Sparkles size={16} color="var(--primary, #3b82f6)" />
                <span>
                  <strong>Timed Overlay Configured:</strong> Starts at <strong>{overlayStart}s</strong> (duration {overlayDuration}s). Current: <strong>{currentSeconds}s</strong>
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    if (playerRef.current) {
                      playerRef.current.seekTo(Math.max(0, overlayStart - 1), 'seconds');
                      setPlaying(true);
                    }
                  }}
                  style={{
                    background: 'var(--primary, #3b82f6)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Play size={12} /> Seek to {overlayStart}s
                </button>

                <button
                  onClick={() => {
                    setForceOverlay(true);
                    setTimeout(() => setForceOverlay(false), (overlayDuration || 5) * 1000);
                  }}
                  style={{
                    background: 'rgba(59,130,246,0.15)',
                    color: 'var(--primary, #3b82f6)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Sparkles size={12} /> Test Animation Now
                </button>
              </div>
            </div>
          )}

          {/* ---- STAGE 1: Video Player (If video exists) ---- */}
          {videoUrl && (
            <div 
              ref={videoContainerRef}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: isFullscreen ? 'auto' : '16/9',
                height: isFullscreen ? '100vh' : 'auto',
                background: '#000',
                marginBottom: isFullscreen ? 0 : 'var(--sp-6)',
                borderRadius: isFullscreen ? 0 : '12px',
                overflow: 'hidden',
                boxShadow: isFullscreen ? 'none' : '0 12px 32px rgba(0,0,0,0.15)'
              }}
            >
              <Player
                ref={playerRef}
                url={videoUrl}
                controls={true}
                playing={playing}
                onProgress={(state) => setCurrentSeconds(Math.floor(state.playedSeconds))}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                width="100%"
                height="100%"
                style={{ position: 'absolute', top: 0, left: 0 }}
                config={{
                  youtube: { playerVars: { rel: 0, showinfo: 0 } },
                  vimeo: { playerOptions: { dnt: true, title: false, byline: false, portrait: false, background: false } }
                }}
              />

              {/* Fullscreen Button Overlay */}
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (with Logo Overlay)'}
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  background: 'rgba(15, 23, 42, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  zIndex: 80,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  transition: 'all 0.2s',
                }}
              >
                {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
              </button>

              {/* Animated Timed Logo Overlay */}
              {isOverlayActive && (
                <AnimatedVideoOverlay
                  overlay={overlay}
                  onDismiss={() => setForceOverlay(false)}
                />
              )}
            </div>
          )}

          {/* ---- STAGE 2: Interactive Document / PPT Viewer (If NO video, or multiple documents) ---- */}
          {!videoUrl && hasAttachments && (
            <div style={{ marginBottom: 'var(--sp-6)' }}>
              {/* Document Tabs if more than 1 attachment */}
              {attachments.length > 1 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
                  {attachments.map((att, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedAttachmentIdx(idx)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: selectedAttachmentIdx === idx ? '1px solid var(--primary, #3b82f6)' : '1px solid var(--border-subtle)',
                        background: selectedAttachmentIdx === idx ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface)',
                        color: selectedAttachmentIdx === idx ? 'var(--primary, #3b82f6)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <FileText size={13} />
                      {att.name || `Document ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Render Active Document/PPT in Interactive Viewer */}
              {activeAttachment && (
                <DocumentViewer
                  url={activeAttachment.url}
                  title={activeAttachment.name || lesson.title}
                  fileName={activeAttachment.name}
                  size={activeAttachment.size}
                  height="760px"
                />
              )}
            </div>
          )}

          {/* Description */}
          {lesson.description && (
            <div style={{ marginBottom: 'var(--sp-6)' }}>
              <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--sp-2)' }}>Description</h2>
              <div style={{ color: 'var(--color-text-light)', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: lesson.description }} />
            </div>
          )}

          {/* Text Content */}
          {lesson.type === 'TEXT' && lesson.content && (
            <div style={{ marginBottom: 'var(--sp-6)', padding: 'var(--sp-4)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <p>{lesson.content}</p>
            </div>
          )}

          {/* Empty state when no video & no attachments */}
          {!videoUrl && !hasAttachments && (
            <div style={{ marginBottom: 'var(--sp-6)', padding: 'var(--sp-6)', background: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)' }}>
              No video or study materials found for this lesson yet.
            </div>
          )}
        </div>
      </main>

      {/* Attachment Preview Modal (when clicking an attachment while video is playing) */}
      <Modal open={!!previewModalDoc} onClose={() => setPreviewModalDoc(null)} title={previewModalDoc?.name || "View Document"} width={1200}>
        {previewModalDoc && (
          <DocumentViewer
            url={previewModalDoc.url}
            title={previewModalDoc.name}
            fileName={previewModalDoc.name}
            size={previewModalDoc.size}
            height="76vh"
          />
        )}
      </Modal>
    </div>
  );
}

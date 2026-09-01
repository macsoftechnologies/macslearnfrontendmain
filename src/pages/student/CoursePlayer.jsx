import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, PlayCircle, ChevronRight, Loader2, Sparkles, X, Maximize, Minimize, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import * as contentApi from '../../api/content';
import * as progressApi from '../../api/progress';
import * as coursesApi from '../../api/courses';
import * as certificatesApi from '../../api/certificates';
import * as examsApi from '../../api/exams';
import { useAuth } from '../../contexts/AuthContext';
import client, { extractErrorMessages, buildStaticUrl } from '../../api/client';
import Button from '../../components/ui/Button';
import PageLoader from '../../components/ui/PageLoader';
import StudentExams from '../../components/student/StudentExams';
import StudentAssignments from '../../components/student/StudentAssignments';
import CourseDiscussionSidebar from '../../components/course/CourseDiscussionSidebar';
import PlayerHeader from '../../components/course/PlayerHeader';
import PlayerSidebar from '../../components/course/PlayerSidebar';
import VideoQuizOverlay from '../../components/course/VideoQuizOverlay';
import QuizResults from '../../components/course/QuizResults';
import AIAssistantPanel, { AIFab, AIStudyModulesRow } from '../../components/course/AIAssistantPanel';
import AttachmentPreviewModal from '../../components/course/AttachmentPreviewModal';
import ReactPlayer from 'react-player';
const Player = ReactPlayer.default ? ReactPlayer.default : ReactPlayer;
import DocumentViewer from '../../components/course/DocumentViewer';
import './CoursePlayer.css';

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
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 255, 255, 0.35)',
            borderRadius: '24px',
            padding: position === 'center' ? '20px 28px' : '14px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            maxWidth: position === 'center' ? 'min(90vw, 760px)' : '320px',
            maxHeight: position === 'center' ? 'min(84vh, 560px)' : 'auto',
            overflow: 'hidden',
            boxShadow: '0 30px 60px rgba(0,0,0,0.85), inset 0 1px 2px rgba(255,255,255,0.4)',
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
                width: 28,
                height: 28,
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
              <X size={16} />
            </button>
          )}

          {/* Centered Image / Overlay (Bigger & High-Res) */}
          <img
            src={imageUrl}
            alt="Video Overlay"
            style={{
              maxHeight: position === 'center' ? 'min(68vh, 460px)' : '160px',
              maxWidth: '100%',
              objectFit: 'contain',
              borderRadius: '8px',
              filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.7))',
            }}
          />

          {/* Optional Tagline */}
          {overlay.customText && (
            <div
              style={{
                color: '#fff',
                fontSize: position === 'center' ? '0.95rem' : '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textAlign: 'center',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Sparkles size={14} color="var(--primary, #3b82f6)" />
              {overlay.customText}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// --- Utility helpers ---

const getPlayerUrl = (url) => {
  if (!url) return { url: '' };
  const strUrl = typeof url === 'string' ? url : (url?.url || '');
  if (!strUrl || typeof strUrl !== 'string') return { url: '' };
  let trimmed = strUrl.trim();
  if (trimmed.toLowerCase().startsWith('<iframe')) {
    const match = trimmed.match(/src=["'](.*?)["']/);
    if (match && match[1]) trimmed = match[1];
  }
  
  let hash = undefined;

  if (trimmed.includes('youtube.com/embed/')) {
    const videoId = trimmed.split('youtube.com/embed/')[1].split(/[?#]/)[0];
    trimmed = `https://www.youtube.com/watch?v=${videoId}`;
  } else if (trimmed.includes('player.vimeo.com/video/')) {
    const vimeoPath = trimmed.split('player.vimeo.com/video/')[1].split(/[?#]/)[0];
    const parts = vimeoPath.split('/');
    if (parts.length === 2) {
      trimmed = `https://vimeo.com/${parts[0]}`;
      hash = parts[1];
    } else {
      trimmed = `https://vimeo.com/${parts[0]}`;
    }
  } else if (trimmed.includes('vimeo.com/') && !trimmed.includes('player.vimeo.com')) {
    const match = trimmed.match(/vimeo\.com\/(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (match) {
      trimmed = `https://vimeo.com/${match[1]}${match[2] ? '/' + match[2] : ''}`;
      hash = match[2];
    }
  } else if (trimmed.includes('youtube.com/watch')) {
    try {
      const videoId = new URL(trimmed.startsWith('http') ? trimmed : 'https://' + trimmed).searchParams.get('v');
      if (videoId) trimmed = `https://www.youtube.com/watch?v=${videoId}`;
    } catch (e) {}
  } else if (trimmed.includes('youtu.be/')) {
    const videoId = trimmed.split('youtu.be/')[1].split(/[?#]/)[0];
    trimmed = `https://www.youtube.com/watch?v=${videoId}`;
  }

  if (trimmed.startsWith('www.')) trimmed = 'https://' + trimmed;
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || trimmed.includes('vimeo.com')) {
    if (!trimmed.startsWith('http')) trimmed = 'https://' + trimmed;
  }
  if (trimmed.startsWith('http')) return { url: trimmed, hash };
  return { url: buildStaticUrl(trimmed), hash };
};

// --- Floating Dynamic Anti-Piracy Watermark Component ---

function DynamicStudentWatermark({ user }) {
  const [positionIdx, setPositionIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPositionIdx((prev) => (prev + 1) % 4);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const positions = [
    { top: 16, left: 16 },
    { bottom: 50, right: 16 },
    { top: 16, right: 120 },
    { bottom: 50, left: 16 },
  ];

  const currentPos = positions[positionIdx] || positions[0];
  const userTag = user.fullName || user.email || 'Student';
  const idTag = user.id || user._id ? String(user.id || user._id).slice(-6) : '';

  return (
    <div
      style={{
        position: 'absolute',
        ...currentPos,
        pointerEvents: 'none',
        zIndex: 75,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 8px',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(3px)',
        borderRadius: '4px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: 'rgba(255, 255, 255, 0.55)',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.4px',
        fontFamily: 'monospace',
        transition: 'all 1.2s ease-in-out',
      }}
    >
      <span>🔒 {userTag} {idTag ? `(${idTag})` : ''}</span>
    </div>
  );
}

// --- Main Component ---

export default function CoursePlayer() {
  const { id: courseId } = useParams();
  const { user } = useAuth();

  // Core data
  const [modules, setModules] = useState([]);
  const [lessonsByModule, setLessonsByModule] = useState({});
  const [activeLesson, setActiveLesson] = useState(null);
  const [progress, setProgress] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('lessons');
  const [completing, setCompleting] = useState(false);
  const [discussionSidebarOpen, setDiscussionSidebarOpen] = useState(false);
  const [previewContentUrl, setPreviewContentUrl] = useState(null);
  const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [currentPlaybackSeconds, setCurrentPlaybackSeconds] = useState(0);
  const [dismissedOverlayLessonId, setDismissedOverlayLessonId] = useState(null);

  // Video quiz state
  const [videoQuizzes, setVideoQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [playing, setPlaying] = useState(true);
  const [answeredQuizzes, setAnsweredQuizzes] = useState(new Set());
  const [theoryAnswer, setTheoryAnswer] = useState('');
  const [myAnswers, setMyAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  // Certificate & exam
  const [certificateStatus, setCertificateStatus] = useState(null);
  const [requestingCert, setRequestingCert] = useState(false);
  const [finalExam, setFinalExam] = useState(null);

  // AI assistant
  const [showAI, setShowAI] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingPhase, setThinkingPhase] = useState(0);
  const [aiData, setAiData] = useState(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [hasAiData, setHasAiData] = useState(false);
  const [aiInitialView, setAiInitialView] = useState(null);

  useEffect(() => {
    const lessonId = activeLesson?.id || activeLesson?._id;
    const isVideo = activeLesson && (activeLesson.type === 'VIDEO' || !!activeLesson.videoUrl);
    if (!isVideo || !courseId || !lessonId) {
      setHasAiData(false);
      setAiData(null);
      return;
    }
    client.get(`/courses/${courseId}/content/lessons/${lessonId}/ai-data`)
      .then((res) => {
        const isFound = res.data?.found === true && res.data?.hasAiData !== false;
        const payload = res.data?.data?.data || res.data?.data;
        const hasValidContent = isFound && !!payload && (
          (typeof payload.summary === 'string' && payload.summary.trim().length > 0) ||
          (Array.isArray(payload.quiz_pool) && payload.quiz_pool.length > 0) ||
          (Array.isArray(payload.key_takeaways) && payload.key_takeaways.length > 0)
        );
        setHasAiData(hasValidContent);
        if (hasValidContent) setAiData(payload);
        else setAiData(null);
      })
      .catch(() => {
        setHasAiData(false);
        setAiData(null);
      });
  }, [activeLesson, courseId]);

  // Refs
  const lastSavedTimeRef = useRef(0);
  const lastPlayedSecondsRef = useRef(0);
  const maxWatchedSecondsRef = useRef(0);
  const isSeekingRef = useRef(false);
  const hasResumedLessonRef = useRef(null);
  const playerRef = useRef(null);
  const videoContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const getSavedWatchPosition = (lessonId) => {
    if (!lessonId) return 0;
    let localSec = 0;
    try {
      const val = localStorage.getItem(`watch_pos_${courseId}_${lessonId}`);
      if (val) localSec = Number(val) || 0;
    } catch (e) {}
    const lessonProg = progress?.completedLessons?.find(
      (l) => (l.lessonId?._id || l.lessonId || l.id) === lessonId
    );
    const serverSec = Number(lessonProg?.watchedSeconds || 0);
    return Math.max(localSec, serverSec);
  };

  const saveWatchPosition = (lessonId, modId, seconds) => {
    if (!lessonId || !courseId || seconds <= 0) return;
    try {
      localStorage.setItem(`watch_pos_${courseId}_${lessonId}`, String(seconds));
    } catch (e) {}
    progressApi.updateWatchTime(lessonId, courseId, modId || '', seconds)
      .catch(() => {});
  };

  const performResume = (force = false) => {
    if (!activeLesson) return;
    const activeLessonId = activeLesson._id || activeLesson.id;
    if (!force && hasResumedLessonRef.current === activeLessonId) return;

    const saved = getSavedWatchPosition(activeLessonId);
    if (saved > 0) {
      maxWatchedSecondsRef.current = Math.max(maxWatchedSecondsRef.current, saved);
      lastPlayedSecondsRef.current = saved;
      lastSavedTimeRef.current = saved;
      hasResumedLessonRef.current = activeLessonId;

      const attemptSeek = (retries = 8) => {
        if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
          isSeekingRef.current = true;
          playerRef.current.seekTo(saved, 'seconds');
          setTimeout(() => {
            isSeekingRef.current = false;
          }, 1500);
        } else if (retries > 0) {
          setTimeout(() => attemptSeek(retries - 1), 250);
        }
      };
      attemptSeek();
    } else {
      hasResumedLessonRef.current = activeLessonId;
    }
  };

  // Resume playback effect: whenever activeLesson or progress changes, resume to saved position
  useEffect(() => {
    performResume();
  }, [progress, activeLesson]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeLesson && lastPlayedSecondsRef.current > 0) {
        saveWatchPosition(activeLesson._id || activeLesson.id, activeLesson.moduleId, lastPlayedSecondsRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeLesson, courseId]);


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

  // --- Derived data ---

  const allLessons = useMemo(() => {
    const flat = [];
    for (const mod of modules) {
      const mId = mod._id || mod.id;
      const lessons = lessonsByModule[mId] || [];
      for (const lesson of lessons) {
        flat.push({ ...lesson, moduleId: mId });
      }
    }
    return flat;
  }, [modules, lessonsByModule]);

  const activeIndex = useMemo(() => {
    if (!activeLesson) return -1;
    const aId = activeLesson._id || activeLesson.id;
    return allLessons.findIndex(l => (l._id || l.id) === aId);
  }, [allLessons, activeLesson]);

  const prevLesson = activeIndex > 0 ? allLessons[activeIndex - 1] : null;
  const nextLesson = activeIndex < allLessons.length - 1 ? allLessons[activeIndex + 1] : null;

  // --- Data loading ---

  useEffect(() => {
    (async () => {
      const [modsRes, progRes, courseRes, examsRes] = await Promise.allSettled([
        contentApi.listModules(courseId),
        progressApi.getCourseProgress(courseId),
        coursesApi.getById(courseId),
        examsApi.list(courseId)
      ]);

      const isExpError = [modsRes, progRes, courseRes, examsRes].some(r => {
        if (r.status === 'rejected') {
          const rawMsg = extractErrorMessages(r.reason);
          const msg = Array.isArray(rawMsg) ? rawMsg.join(' ').toLowerCase() : String(rawMsg || '').toLowerCase();
          return msg.includes('expired');
        }
        return false;
      });

      if (isExpError) {
        setIsExpired(true);
        setLoading(false);
        return;
      }

      const mods = modsRes.status === 'fulfilled' ? modsRes.value.data?.data || [] : [];
      setModules(mods);
      if (progRes.status === 'fulfilled') setProgress(progRes.value.data?.data || null);
      if (courseRes.status === 'fulfilled') setCourse(courseRes.value.data?.data || null);
      if (examsRes.status === 'fulfilled') {
        const allExams = examsRes.value.data?.data || [];
        const fExam = allExams.find(e => e.isFinalExam && e.status === 'PUBLISHED');
        setFinalExam(fExam);
      }

      try {
        const certsRes = await certificatesApi.myCertificates();
        const myCerts = certsRes.data?.data || [];
        const thisCourseCert = myCerts.find(c => (c.courseId?._id || c.courseId) === courseId);
        if (thisCourseCert) setCertificateStatus(thisCourseCert);
      } catch (err) {}

      const lessonMap = {};
      for (const mod of mods) {
        const mId = mod._id || mod.id;
        const res = await contentApi.listLessons(courseId, mId).catch((err) => {
          const rawErr = extractErrorMessages(err);
          const errStr = Array.isArray(rawErr) ? rawErr.join(' ').toLowerCase() : String(rawErr || '').toLowerCase();
          if (errStr.includes('expired')) {
            setIsExpired(true);
          }
          return null;
        });
        lessonMap[mId] = res?.data?.data || [];
      }
      setLessonsByModule(lessonMap);
      const firstModule = mods[0];
      if (firstModule) {
        const fmId = firstModule._id || firstModule.id;
        if (lessonMap[fmId]?.length) {
          const l = lessonMap[fmId][0];
          setActiveLesson({ ...l, moduleId: fmId });
          loadQuizzes(fmId, l._id || l.id);
        }
      }
      setLoading(false);
    })();
  }, [courseId]);

  // --- Quiz handlers ---

  const loadQuizzes = async (mId, lId) => {
    try {
      const [res, ansRes] = await Promise.all([
        client.get(`/courses/${courseId}/content/modules/${mId}/lessons/${lId}/video-quizzes`),
        contentApi.getMyVideoQuizAnswers(courseId, mId, lId)
      ]);
      setVideoQuizzes(res.data?.data || []);
      const answersList = ansRes.data?.data || [];
      setMyAnswers(answersList);
      const answeredSet = new Set(answersList.map(a => a.quizId?._id || a.quizId?.id));
      setAnsweredQuizzes(answeredSet);
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuizAnswer = async (optionOrText, isTheory = false) => {
    try {
      const payload = isTheory ? { textAnswer: optionOrText } : { selectedOption: optionOrText.text };
      await client.post(
        `/courses/${courseId}/content/modules/${activeLesson.moduleId}/lessons/${activeLesson._id || activeLesson.id}/video-quizzes/${activeQuiz._id || activeQuiz.id}/answers`,
        payload
      );
      if (!isTheory) {
        if (optionOrText.isCorrect) toast.success('Correct!');
        else toast.error('Incorrect! You can review this again later.');
      } else {
        toast.success('Answer submitted for review!');
      }
      setAnsweredQuizzes(new Set([...answeredQuizzes, activeQuiz._id || activeQuiz.id]));
      setActiveQuiz(null);
      setPlaying(true);
      loadQuizzes(activeLesson.moduleId, activeLesson._id || activeLesson.id);
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    }
  };

  // --- Navigation handlers ---

  const handleLessonChange = (lesson, modId) => {
    setActiveLesson({ ...lesson, moduleId: modId });
    setActiveTab('lessons');
    hasResumedLessonRef.current = null;
    maxWatchedSecondsRef.current = 0;
    lastPlayedSecondsRef.current = 0;
    lastSavedTimeRef.current = 0;
    loadQuizzes(modId, lesson._id || lesson.id);
  };

  const goToLesson = (lesson) => {
    if (lesson) handleLessonChange(lesson, lesson.moduleId);
  };

  const handlePause = () => {
    setPlaying(false);
    if (activeLesson && lastPlayedSecondsRef.current > 0) {
      lastSavedTimeRef.current = lastPlayedSecondsRef.current;
      progressApi.updateWatchTime(
        activeLesson._id || activeLesson.id,
        courseId,
        activeLesson.moduleId,
        lastPlayedSecondsRef.current
      ).catch(() => {});
    }
  };

  // --- Video progress handlers ---

  // NOTE: Set to true for demo presentation to enable dragging/scrubbing forward freely
  const ALLOW_DEMO_SEEKING = true;

  const handleProgress = (state) => {
    const currentSeconds = Math.floor(state.playedSeconds);
    const lastSeconds = lastPlayedSecondsRef.current;

    // Sync playback seconds state for timed image overlays
    setCurrentPlaybackSeconds(currentSeconds);

    // 1. Anti-Skipping / Forward Seeking Lock (Bypassed when ALLOW_DEMO_SEEKING is true)
    if (!ALLOW_DEMO_SEEKING && currentSeconds > maxWatchedSecondsRef.current + 3 && !isSeekingRef.current) {
      playerRef.current?.seekTo(maxWatchedSecondsRef.current, 'seconds');
      toast('Forward skipping is locked. Please watch the lecture in full.', { id: 'no-skip-toast', icon: '🔒' });
      return;
    }

    // Update furthest watched second
    if (currentSeconds > maxWatchedSecondsRef.current) {
      maxWatchedSecondsRef.current = currentSeconds;
    }

    // 2. Video Quiz skip / trigger check
    if (currentSeconds > lastSeconds + 2) {
      const skippedQuiz = videoQuizzes
        .sort((a, b) => a.timestampSeconds - b.timestampSeconds)
        .find(q => {
          const ts = Math.floor(q.timestampSeconds);
          return ts > lastSeconds && ts <= currentSeconds && !answeredQuizzes.has(q._id || q.id);
        });
      if (skippedQuiz) {
        playerRef.current?.seekTo(skippedQuiz.timestampSeconds, 'seconds');
        setPlaying(false);
        // keep fullscreen active so question appears in fullscreen
        setActiveQuiz(skippedQuiz);
        setSelectedOption(null);
        setTheoryAnswer('');
        return;
      }
    }

    lastPlayedSecondsRef.current = currentSeconds;
    const quiz = videoQuizzes.find(q => Math.floor(q.timestampSeconds) === currentSeconds);
    if (quiz && !answeredQuizzes.has(quiz._id || quiz.id)) {
      setPlaying(false);
      // keep fullscreen active so question appears in fullscreen
      setActiveQuiz(quiz);
      setSelectedOption(null);
      setTheoryAnswer('');
    }

    if (state.played >= 0.9 && activeLesson && !isCompleted(activeLesson._id || activeLesson.id) && !completing) {
      markComplete(activeLesson._id || activeLesson.id);
    }

    if (activeLesson && Math.abs(currentSeconds - lastSavedTimeRef.current) >= 5 && !isSeekingRef.current) {
      lastSavedTimeRef.current = currentSeconds;
      saveWatchPosition(activeLesson._id || activeLesson.id, activeLesson.moduleId, currentSeconds);
    }
  };

  const handleReady = () => {
    performResume(true);
  };

  const handleStart = () => {
    performResume(true);
  };

  const handlePlay = () => {
    setPlaying(true);
    if (lastPlayedSecondsRef.current === 0) {
      performResume();
    }
  };


  // --- Completion handlers ---

  const isCompleted = (lessonId) => progress?.completedLessonIds?.includes(lessonId) || progress?.completedLessons?.some?.((l) => l.id === lessonId);

  const markComplete = async (lessonIdToComplete) => {
    const idToUse = lessonIdToComplete || (activeLesson?._id || activeLesson?.id);
    if (!idToUse) return;
    setCompleting(true);
    try {
      await progressApi.completeLesson(idToUse, courseId, activeLesson?.moduleId);
      toast.success('Lesson complete!');
      const res = await progressApi.getCourseProgress(courseId);
      setProgress(res.data?.data || null);
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setCompleting(false);
    }
  };

  const completeAndContinue = async () => {
    const currentId = activeLesson?._id || activeLesson?.id;
    if (currentId && !isCompleted(currentId)) await markComplete(currentId);
    if (nextLesson) goToLesson(nextLesson);
  };

  const requestCertificate = async () => {
    setRequestingCert(true);
    try {
      const res = await certificatesApi.requestCertificate({ courseId });
      toast.success('Certificate requested successfully!');
      setCertificateStatus(res.data?.data || {});
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setRequestingCert(false);
    }
  };

  // --- AI assistant handler ---

  const openAI = async () => {
    setAiPanelOpen(true);
    setIsThinking(true);
    setThinkingPhase(0);
    setAiData(null);

    const t1 = setTimeout(() => setThinkingPhase(1), 800);
    const t2 = setTimeout(() => setThinkingPhase(2), 1600);
    const t3 = setTimeout(() => setThinkingPhase(3), 2400);

    try {
      const lessonId = activeLesson?.id || activeLesson?._id;
      if (courseId && lessonId) {
        const res = await client.get(`/courses/${courseId}/content/lessons/${lessonId}/ai-data`);
        const payload = res.data?.data?.data || res.data?.data || res.data;
        if (payload) {
          setAiData(payload);
        }
      }
    } catch (err) {
      console.warn('Could not load AI data for lesson', err);
    } finally {
      setTimeout(() => {
        setIsThinking(false);
        setShowAI(true);
      }, 3000);
    }
  };

  const closeAI = () => {
    setAiPanelOpen(false);
    setShowAI(false);
    setIsThinking(false);
  };

  // --- Render ---

  if (loading) return <PageLoader />;

  if (isExpired) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid #fca5a5', padding: '40px', borderRadius: '16px', maxWidth: '540px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#991b1b', marginBottom: '12px' }}>Course Access Expired</h2>
          <p style={{ color: '#4b5563', fontSize: '15px', lineHeight: 1.6, marginBottom: '28px' }}>
            Your access period for this course is completed. You need to buy the course again to re-enroll and regain access to the lessons and exams.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/student/my-courses"><Button variant="outline">My Courses</Button></Link>
            <Link to={`/student/courses/${courseId}`}><Button variant="primary">Buy Course Again</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const currentIsCompleted = activeLesson ? isCompleted(activeLesson._id || activeLesson.id) : false;

  return (
    <div className={`player-container ${discussionSidebarOpen ? 'sidebar-open' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative', overflow: 'hidden' }}>

      <PlayerHeader
        courseId={courseId}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        prevLesson={prevLesson}
        nextLesson={nextLesson}
        goToLesson={goToLesson}
        currentIsCompleted={currentIsCompleted}
        completing={completing}
        completeAndContinue={completeAndContinue}
        activeLesson={activeLesson}
        setDiscussionSidebarOpen={setDiscussionSidebarOpen}
      />

      <div className="player">
        <PlayerSidebar
          course={course}
          selectedAttachmentIndex={selectedAttachmentIndex}
          setSelectedAttachmentIndex={setSelectedAttachmentIndex}
          progress={progress}
          modules={modules}
          lessonsByModule={lessonsByModule}
          activeLesson={activeLesson}
          handleLessonChange={handleLessonChange}
          isCompleted={isCompleted}
          certificateStatus={certificateStatus}
          finalExam={finalExam}
          courseId={courseId}
          requestingCert={requestingCert}
          requestCertificate={requestCertificate}
          setIframeLoading={setIframeLoading}
          setPreviewContentUrl={setPreviewContentUrl}
        />

        <main className="player__content">
          {activeTab === 'lessons' ? (
            <>
              {!activeLesson ? (
                <div style={{ padding: 'var(--sp-10)', textAlign: 'center' }} className="text-muted">
                  This course doesn't have any content yet.
                </div>
              ) : (
                <div className="player__lesson-view">
                  <h1 className="player__lesson-title">{activeLesson.title}</h1>

                  {/* Video Player & AI Assistant Card (Side by Side in same panel) */}
                  <div className="player__media-grid" style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: 'var(--sp-6)' }}>
                    <div style={{ flex: '1 1 0%', minWidth: 0 }}>
                      {/* Video Player */}
                  {activeLesson.videoUrl && (() => {
                    const playerInfo = getPlayerUrl(activeLesson.videoUrl);
                    const overlayData = activeLesson.overlayConfig;
                    const overlayList = Array.isArray(overlayData) 
                      ? overlayData 
                      : (overlayData && typeof overlayData === 'object' && overlayData.imageUrl ? [overlayData] : []);
                    
                    const activeLId = activeLesson._id || activeLesson.id;
                    const activeOverlay = dismissedOverlayLessonId !== activeLId 
                      ? overlayList.find(ov => {
                          if (!ov || ov.enabled === false || !ov.imageUrl) return false;
                          const start = ov.startSecond ?? 29;
                          const dur = ov.durationSeconds ?? 5;
                          return currentPlaybackSeconds >= start && currentPlaybackSeconds < (start + dur);
                        })
                      : null;
                    const isOverlayActive = !!activeOverlay;

                    return (
                      <div 
                        ref={videoContainerRef} 
                        className="player__video-wrapper"
                        onContextMenu={(e) => e.preventDefault()}
                        style={{
                          position: 'relative',
                          aspectRatio: isFullscreen ? 'auto' : '16/9',
                          height: isFullscreen ? '100vh' : 'auto',
                          background: '#000',
                          borderRadius: isFullscreen ? 0 : '12px',
                          overflow: 'hidden',
                          userSelect: 'none',
                          WebkitUserSelect: 'none'
                        }}
                      >
                        <Player
                          ref={playerRef}
                          url={playerInfo.url}
                          controls={!activeQuiz}
                          playing={playing}
                          onProgress={handleProgress}
                          onReady={handleReady}
                          onStart={handleStart}
                          onPlay={handlePlay}
                          onPause={handlePause}
                          width="100%"
                          height="100%"
                          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: activeQuiz ? 'none' : 'auto' }}
                          config={{
                            file: {
                              attributes: {
                                controlsList: 'nodownload noplaybackrate',
                                disablePictureInPicture: true,
                                onContextMenu: (e) => e.preventDefault(),
                              }
                            },
                            youtube: { playerVars: { rel: 0, showinfo: 0, modestbranding: 1 } },
                            vimeo: { playerOptions: { dnt: true, title: false, byline: false, portrait: false, background: false } }
                          }}
                        />

                        {/* Anti-Piracy Dynamic Watermark */}
                        <DynamicStudentWatermark user={user} />

                        {/* Fullscreen Button Overlay (Guarantees logo overlay stays visible in Fullscreen) */}
                        {!activeQuiz && (
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
                        )}

                        {/* Animated Timed Logo Overlay */}
                        {isOverlayActive && (
                          <AnimatedVideoOverlay
                            overlay={activeOverlay}
                            onDismiss={() => setDismissedOverlayLessonId(activeLId)}
                          />
                        )}

                        <VideoQuizOverlay
                          activeQuiz={activeQuiz}
                          selectedOption={selectedOption}
                          setSelectedOption={setSelectedOption}
                          theoryAnswer={theoryAnswer}
                          setTheoryAnswer={setTheoryAnswer}
                          handleQuizAnswer={handleQuizAnswer}
                        />
                      </div>
                    );
                  })()}
                    </div>

                    {/* Right-aligned AI Card inside the video panel */}
                    <div className="player__ai-card-wrapper" style={{ flex: '0 0 176px', width: '176px', flexShrink: 0 }}>
                      <AIFab
                        activeTab={activeTab}
                        activeLesson={activeLesson}
                        showAI={showAI}
                        isThinking={isThinking}
                        onOpen={openAI}
                        hasAiData={hasAiData}
                      />
                    </div>
                  </div>

                  {/* 4 Interactive AI Learning Modules Row */}
                  <AIStudyModulesRow onOpenView={openAI} hasAiData={hasAiData} />

                  {/* Description */}
                  {activeLesson.description && (
                    <div style={{ marginBottom: 'var(--sp-6)' }}>
                      <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--sp-2)' }}>Description</h2>
                      <div style={{ color: 'var(--color-text-light)', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: activeLesson.description }} />
                    </div>
                  )}

                  {/* Quiz Results */}
                  <QuizResults myAnswers={myAnswers} />

                  {/* Interactive Document / PPT / PDF / Presentation (for both document lessons and video lessons with attachments) */}
                  {(activeLesson.documentUrl || activeLesson.contentUrl || activeLesson.attachments?.length > 0) && (() => {
                    const currentAtt = (activeLesson.attachments && activeLesson.attachments[selectedAttachmentIndex])
                      ? activeLesson.attachments[selectedAttachmentIndex]
                      : (activeLesson.attachments?.[0] || null);

                    const activeDocUrl = currentAtt?.url || activeLesson.documentUrl || activeLesson.contentUrl;
                    const activeDocName = currentAtt?.name || activeLesson.title;
                    const activeDocSize = currentAtt?.size;

                    return (
                      <div style={{ marginTop: activeLesson.videoUrl ? 'var(--sp-6)' : 0, marginBottom: 'var(--sp-6)' }}>
                        {activeLesson.attachments?.length > 1 && (
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Attachments:</span>
                            {activeLesson.attachments.map((att, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedAttachmentIndex(idx)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 14px',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  fontWeight: selectedAttachmentIndex === idx ? 700 : 500,
                                  border: selectedAttachmentIndex === idx ? '2px solid var(--brand, #2563eb)' : '1px solid var(--border-subtle, #cbd5e1)',
                                  background: selectedAttachmentIndex === idx ? 'var(--brand-surface, #eff6ff)' : '#fff',
                                  color: selectedAttachmentIndex === idx ? 'var(--brand, #2563eb)' : '#334155',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                              >
                                <FileText size={14} color={selectedAttachmentIndex === idx ? 'var(--brand, #2563eb)' : '#64748b'} />
                                <span>{att.name || `Document ${idx + 1}`}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        <DocumentViewer
                          url={activeDocUrl}
                          title={activeDocName}
                          fileName={activeDocName}
                          size={activeDocSize}
                          height="760px"
                        />
                      </div>
                    );
                  })()}

                  {/* Text content */}
                  {activeLesson.content && (
                    <div className="player__text" style={{ marginBottom: 'var(--sp-6)' }}>{activeLesson.content}</div>
                  )}

                  {/* Empty state */}
                  {!activeLesson.videoUrl && !activeLesson.documentUrl && !activeLesson.content && !activeLesson.description && !activeLesson.attachments?.length && (
                    <div className="player__placeholder">
                      <PlayCircle size={36} />
                      <p>Content for this lesson will be available soon.</p>
                    </div>
                  )}

                  {/* Bottom Complete and Continue */}
                  <div className="player__bottom-cta">
                    {!!activeLesson?.videoUrl && !currentIsCompleted ? (
                      <button
                        className="player__complete-btn player__complete-btn--primary"
                        onClick={() => goToLesson(nextLesson)}
                        disabled={!nextLesson}
                      >
                        Next Lesson
                        {nextLesson && <ChevronRight size={16} />}
                      </button>
                    ) : (
                      <button
                        className={`player__complete-btn ${currentIsCompleted ? 'player__complete-btn--done' : 'player__complete-btn--primary'}`}
                        onClick={completeAndContinue}
                        disabled={completing || (currentIsCompleted && !nextLesson)}
                      >
                        {completing ? (
                          <Loader2 size={16} className="spinner" />
                        ) : currentIsCompleted ? (
                          <CheckCircle2 size={16} />
                        ) : null}
                        {currentIsCompleted
                          ? (nextLesson ? 'Continue to Next Lesson' : '✓ Course Completed')
                          : 'Complete and Continue'}
                        {(nextLesson && !completing) && <ChevronRight size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ overflowY: 'auto', background: 'var(--color-paper-50)', padding: 'var(--sp-8)' }}>
              {activeTab === 'assignments' && <StudentAssignments courseId={courseId} />}
              {activeTab === 'exams' && <StudentExams courseId={courseId} />}
            </div>
          )}
        </main>

        

        <AIAssistantPanel
          courseId={courseId}
          activeLesson={activeLesson}
          showAI={showAI}
          isThinking={isThinking}
          thinkingPhase={thinkingPhase}
          aiPanelOpen={aiPanelOpen}
          aiData={aiData}
          onOpen={openAI}
          onClose={closeAI}
          onRefreshAiData={openAI}
        />
      </div>

      <CourseDiscussionSidebar
        isOpen={discussionSidebarOpen}
        onClose={() => setDiscussionSidebarOpen(false)}
        courseId={courseId}
      />

      <AttachmentPreviewModal
        previewContentUrl={previewContentUrl}
        setPreviewContentUrl={setPreviewContentUrl}
        iframeLoading={iframeLoading}
        setIframeLoading={setIframeLoading}
      />
    </div>
  );
}

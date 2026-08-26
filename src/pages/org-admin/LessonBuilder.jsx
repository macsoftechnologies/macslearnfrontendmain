import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, FileText, Video, Paperclip, X, Loader2, Trash2, CheckCircle2, Plus, UploadCloud, Layers, ArrowUp, ArrowDown, Sparkles, Image, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Input, { Field, Textarea } from '../../components/ui/Input';
import VimeoUploader from '../../components/ui/VimeoUploader';
import { Card } from '../../components/ui/Card';
import { uploadFile } from '../../api/upload';
import * as contentApi from '../../api/content';
import * as coursesApi from '../../api/courses';
import { extractErrorMessages, buildStaticUrl } from '../../api/client';
import { useDropzone } from 'react-dropzone';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import Breadcrumb from '../../components/ui/Breadcrumb';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

function cleanFileNameToTitle(filename) {
  if (!filename) return '';
  const lastDotIndex = filename.lastIndexOf('.');
  const nameWithoutExt = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
  return nameWithoutExt
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || filename;
}

// --- Bulk Video Upload Progress Modal Component ---
function BulkUploadProgressModal({
  open,
  onClose,
  items = [],
  onAllCompleted
}) {
  const [countdown, setCountdown] = useState(3);

  const totalCount = items.length;
  const completedCount = items.filter(i => i.status === 'success' || (i.videoUrl && i.videoUrl.length > 5)).length;
  const totalBytesAll = items.reduce((acc, i) => acc + (i.totalBytes || i.size || (i.autoFile?.size) || 0), 0);
  const uploadedBytesAll = items.reduce((acc, i) => {
    if (i.status === 'success' || (i.videoUrl && i.videoUrl.length > 5)) {
      return acc + (i.totalBytes || i.size || (i.autoFile?.size) || 0);
    }
    return acc + (i.uploadedBytes || 0);
  }, 0);

  const overallPercentage = totalBytesAll > 0 
    ? Math.min(100, Math.round((uploadedBytesAll / totalBytesAll) * 100))
    : (totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0);

  const isAllDone = totalCount > 0 && (completedCount === totalCount);

  // Auto close timer when 100% completed
  useEffect(() => {
    let timer = null;
    let interval = null;
    if (isAllDone && open) {
      setCountdown(3);
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timer = setTimeout(() => {
        if (onClose) onClose();
        if (onAllCompleted) onAllCompleted();
      }, 2800);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [isAllDone, open, onClose, onAllCompleted]);

  if (!open || totalCount === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'modalFadeIn 0.25s ease-out'
      }}
    >
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmerGlow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes pulseCloud {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(59,130,246,0.6)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 25px rgba(139,92,246,0.9)); }
        }
      `}</style>

      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--bg-surface, #1e293b)',
          color: 'var(--text-primary, #fff)',
          borderRadius: '20px',
          border: isAllDone ? '1.5px solid var(--success, #22c55e)' : '1.5px solid rgba(255, 255, 255, 0.15)',
          boxShadow: isAllDone 
            ? '0 25px 50px -12px rgba(34, 197, 94, 0.35), 0 0 40px rgba(34, 197, 94, 0.2)' 
            : '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 35px rgba(59, 130, 246, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Header Banner */}
        <div
          style={{
            padding: '24px 28px 20px',
            background: isAllDone
              ? 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(16,185,129,0.1))'
              : 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(139,92,246,0.14))',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '18px'
          }}
        >
          {/* Animated Icon Avatar */}
          <div
            style={{
              position: 'relative',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: isAllDone
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: isAllDone
                ? '0 10px 20px rgba(16, 185, 129, 0.4)'
                : '0 10px 20px rgba(59, 130, 246, 0.4)',
              animation: isAllDone ? 'none' : 'pulseCloud 2.5s ease-in-out infinite',
            }}
          >
            {isAllDone ? (
              <CheckCircle2 size={30} color="#fff" />
            ) : (
              <UploadCloud size={28} color="#fff" />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                {isAllDone ? 'All Videos Uploaded Successfully! 🎉' : 'Uploading Lectures to Vimeo'}
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.4 }}>
              {isAllDone
                ? `All ${totalCount} lecture videos are safely uploaded and linked to your lessons.`
                : `Transferred ${completedCount} of ${totalCount} videos. Please keep this tab open.`}
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main Progress Bar & Metrics */}
          <div
            style={{
              background: 'rgba(0,0,0,0.25)',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: isAllDone ? 'var(--success, #22c55e)' : 'var(--primary, #3b82f6)' }}>
                  {overallPercentage}%
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>
                  {isAllDone ? 'Completed' : 'Overall Progress'}
                </span>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)' }}>
                {(uploadedBytesAll / (1024 * 1024)).toFixed(1)} / {(totalBytesAll / (1024 * 1024)).toFixed(1)} MB
              </span>
            </div>

            {/* Glowing Shimmer Bar */}
            <div
              style={{
                width: '100%',
                height: '10px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '6px',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <div
                style={{
                  width: `${overallPercentage}%`,
                  height: '100%',
                  background: isAllDone
                    ? 'linear-gradient(90deg, #10b981, #22c55e)'
                    : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  borderRadius: '6px',
                  transition: 'width 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {!isAllDone && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '60%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                      animation: 'shimmerGlow 1.8s infinite',
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Individual Files Progress List */}
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted, #94a3b8)',
                marginBottom: '10px'
              }}
            >
              Files Queue ({completedCount}/{totalCount} Completed)
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '220px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}
            >
              {items.map((item, idx) => {
                const itemDone = item.status === 'success' || (item.videoUrl && item.videoUrl.length > 5);
                const itemUploading = item.status === 'uploading';
                const itemError = item.status === 'error';
                const itemProg = itemDone ? 100 : (item.progress || 0);

                return (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      background: itemDone
                        ? 'rgba(34, 197, 94, 0.08)'
                        : itemUploading
                        ? 'rgba(59, 130, 246, 0.08)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: itemDone
                        ? '1px solid rgba(34, 197, 94, 0.25)'
                        : itemUploading
                        ? '1px solid rgba(59, 130, 246, 0.3)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '10px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: itemDone
                          ? 'rgba(34,197,94,0.2)'
                          : itemUploading
                          ? 'rgba(59,130,246,0.2)'
                          : 'rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {itemDone ? (
                        <CheckCircle2 size={16} color="var(--success, #22c55e)" />
                      ) : itemUploading ? (
                        <Loader2 size={16} color="var(--primary, #3b82f6)" className="spinner" />
                      ) : itemError ? (
                        <Trash2 size={16} color="var(--danger, #ef4444)" />
                      ) : (
                        <Video size={16} color="var(--text-muted, #94a3b8)" />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '240px'
                          }}
                        >
                          {item.title || item.fileName || `Lecture ${idx + 1}`}
                        </span>

                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: itemDone
                              ? 'var(--success, #22c55e)'
                              : itemUploading
                              ? 'var(--primary, #3b82f6)'
                              : 'var(--text-muted, #94a3b8)'
                          }}
                        >
                          {itemDone ? 'Uploaded ✓' : itemUploading ? `${itemProg}%` : itemError ? 'Error' : 'Queued'}
                        </span>
                      </div>

                      {/* Mini Progress bar */}
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${itemProg}%`,
                            height: '100%',
                            background: itemDone ? 'var(--success, #22c55e)' : 'var(--primary, #3b82f6)',
                            transition: 'width 0.2s'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 28px',
            background: 'rgba(0,0,0,0.3)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {isAllDone ? (
            <>
              <span style={{ fontSize: '0.85rem', color: 'var(--success, #22c55e)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} /> Auto-closing in {countdown}s...
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (onClose) onClose();
                  if (onAllCompleted) onAllCompleted();
                }}
              >
                Close & Review Lessons
              </Button>
            </>
          ) : (
            <>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={14} className="spinner" />
                Upload in progress • Actions locked to prevent interruptions
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
              >
                Uploading...
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LessonBuilder() {
  const { courseId, moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!lessonId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState(null);
  const [currentModule, setCurrentModule] = useState(null);
  const [outlineLessons, setOutlineLessons] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Multi-lesson list for batch creation
  const [batchUploadTrigger, setBatchUploadTrigger] = useState(0);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [uploadProgressMap, setUploadProgressMap] = useState({});
  const [lessonsList, setLessonsList] = useState([
    {
      id: 'temp_1',
      title: '',
      description: '',
      videoUrl: '',
      attachments: [],
      type: 'MIXED',
      uploadingAttachment: false,
      attachmentProgress: 0,
      uploadingFileSize: 0,
      overlayConfig: {
        enabled: true,
        imageUrl: '',
        startSecond: 29,
        durationSeconds: 5,
        position: 'center',
        animation: 'fade-zoom',
        customText: ''
      }
    }
  ]);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [courseRes, modsRes, lessonsRes] = await Promise.all([
          coursesApi.getById(courseId).catch(() => null),
          contentApi.listModules(courseId).catch(() => null),
          contentApi.listLessons(courseId, moduleId).catch(() => null)
        ]);

        setCourse(courseRes?.data?.data || null);
        const mods = modsRes?.data?.data || [];
        const mod = mods.find(m => (m._id || m.id) === moduleId);
        setCurrentModule(mod || null);

        const lessons = lessonsRes?.data?.data || [];
        setOutlineLessons(lessons);

        if (isEdit) {
          const lesson = lessons.find(l => l.id === lessonId || l._id === lessonId);
          if (lesson) {
            setLessonsList([
              {
                id: lesson.id || lesson._id,
                title: lesson.title || '',
                description: lesson.description || '',
                videoUrl: lesson.videoUrl || '',
                attachments: lesson.attachments || [],
                type: lesson.type || 'MIXED',
                uploadingAttachment: false,
                attachmentProgress: 0,
                uploadingFileSize: 0,
                overlayConfig: lesson.overlayConfig || {
                  enabled: true,
                  imageUrl: '',
                  startSecond: 29,
                  durationSeconds: 5,
                  position: 'center',
                  animation: 'fade-zoom',
                  customText: ''
                }
              }
            ]);
          } else {
            toast.error('Lesson not found');
            navigate(`/admin/courses/${courseId}`);
          }
        }
      } catch (err) {
        toast.error('Failed to load lesson builder data');
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [isEdit, courseId, moduleId, lessonId, navigate]);

  // Batch Video Dropzone: Dropping multiple videos creates multiple lesson rows automatically
  const onDropBatchVideos = (acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    // Natural numerical sort: 01, 02, 03... 10, 11
    const sortedFiles = [...acceptedFiles].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    const newItems = sortedFiles.map((file, idx) => {
      const title = cleanFileNameToTitle(file.name);
      return {
        id: `temp_${Date.now()}_${idx}`,
        title: title || `Lecture ${idx + 1}`,
        description: '',
        videoUrl: '',
        attachments: [],
        type: 'MIXED',
        autoFile: file,
        uploadingAttachment: false,
        attachmentProgress: 0,
        uploadingFileSize: 0
      };
    });

    // Replace first empty item if list only has 1 empty item
    if (lessonsList.length === 1 && !lessonsList[0].title && !lessonsList[0].videoUrl) {
      setLessonsList(newItems);
    } else {
      setLessonsList(prev => [...prev, ...newItems]);
    }

    toast.success(`Loaded ${newItems.length} video lectures in sequential order!`);
  };

  const { getRootProps: getBatchRootProps, getInputProps: getBatchInputProps, isDragActive: isBatchDragActive } = useDropzone({
    onDrop: onDropBatchVideos,
    accept: {
      'video/*': ['.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v']
    }
  });

  const addEmptyLessonRow = () => {
    setLessonsList(prev => [
      ...prev,
      {
        id: `temp_${Date.now()}`,
        title: '',
        description: '',
        videoUrl: '',
        attachments: [],
        type: 'MIXED',
        uploadingAttachment: false,
        attachmentProgress: 0,
        uploadingFileSize: 0
      }
    ]);
  };

  const removeLessonRow = (index) => {
    if (lessonsList.length <= 1) {
      toast.error('At least one lesson is required');
      return;
    }
    setLessonsList(prev => prev.filter((_, idx) => idx !== index));
  };

  const moveLesson = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= lessonsList.length) return;
    setLessonsList(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const updateLessonField = (index, field, value) => {
    setLessonsList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Upload attachment for a specific lesson row
  const handleAttachmentUpload = async (lessonIndex, file) => {
    if (!file) return;

    updateLessonField(lessonIndex, 'uploadingAttachment', true);
    updateLessonField(lessonIndex, 'uploadingFileSize', file.size);
    updateLessonField(lessonIndex, 'attachmentProgress', 0);

    try {
      const { data } = await uploadFile(file, (progress) => {
        updateLessonField(lessonIndex, 'attachmentProgress', progress);
      });
      const url = data?.data?.url || data?.data?.path || data?.url;

      setLessonsList(prev => {
        const updated = [...prev];
        const currentAtts = updated[lessonIndex].attachments || [];
        updated[lessonIndex] = {
          ...updated[lessonIndex],
          attachments: [...currentAtts, { name: file.name, url, size: file.size, type: file.type }],
          uploadingAttachment: false,
          attachmentProgress: 0,
          uploadingFileSize: 0
        };
        return updated;
      });
      toast.success(`Attached "${file.name}"`);
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
      updateLessonField(lessonIndex, 'uploadingAttachment', false);
      updateLessonField(lessonIndex, 'attachmentProgress', 0);
    }
  };

  const removeAttachment = (lessonIndex, attIndex) => {
    setLessonsList(prev => {
      const updated = [...prev];
      const newAtts = [...(updated[lessonIndex].attachments || [])];
      newAtts.splice(attIndex, 1);
      updated[lessonIndex] = { ...updated[lessonIndex], attachments: newAtts };
      return updated;
    });
  };

  const handleOverlayImageUpload = async (lessonIndex, file) => {
    if (!file) return;
    try {
      toast.loading('Uploading logo / overlay image...', { id: 'overlay-upload' });
      const { data } = await uploadFile(file);
      const url = data?.data?.url || data?.url;
      if (url) {
        setLessonsList(prev => {
          const updated = [...prev];
          const curr = updated[lessonIndex];
          const overlay = curr.overlayConfig || { startSecond: 29, durationSeconds: 5, position: 'center', animation: 'fade-zoom' };
          updated[lessonIndex] = {
            ...curr,
            overlayConfig: { ...overlay, imageUrl: url, enabled: true },
          };
          return updated;
        });
        toast.success('Overlay image uploaded!', { id: 'overlay-upload' });
      }
    } catch (err) {
      toast.error('Failed to upload overlay image', { id: 'overlay-upload' });
    }
  };

  const updateOverlayField = (lessonIndex, field, value) => {
    setLessonsList(prev => {
      const updated = [...prev];
      const curr = updated[lessonIndex];
      const overlay = curr.overlayConfig || { startSecond: 29, durationSeconds: 5, position: 'center', animation: 'fade-zoom' };
      updated[lessonIndex] = {
        ...curr,
        overlayConfig: { ...overlay, [field]: value }
      };
      return updated;
    });
  };

  const handleSaveAll = async () => {
    // Validate titles
    const emptyTitleIndex = lessonsList.findIndex(l => !l.title.trim());
    if (emptyTitleIndex !== -1) {
      toast.error(`Lesson #${emptyTitleIndex + 1} needs a title`);
      return;
    }

    setSaving(true);
    let createdCount = 0;

    try {
      if (isEdit) {
        // Single update
        const item = lessonsList[0];
        const payload = {
          title: item.title,
          description: item.description,
          videoUrl: item.videoUrl,
          attachments: item.attachments,
          overlayConfig: item.overlayConfig,
          type: item.videoUrl ? 'VIDEO' : (item.attachments?.length ? 'DOCUMENT' : 'MIXED')
        };
        await contentApi.updateLesson(courseId, moduleId, lessonId, payload);
        toast.success('Lesson updated successfully!');
      } else {
        // Batch creation with explicit sequence orderIndex
        const baseOrder = outlineLessons.length;
        for (let i = 0; i < lessonsList.length; i++) {
          const item = lessonsList[i];
          const payload = {
            title: item.title,
            description: item.description,
            videoUrl: item.videoUrl,
            attachments: item.attachments,
            overlayConfig: item.overlayConfig,
            orderIndex: baseOrder + i + 1,
            type: item.videoUrl ? 'VIDEO' : (item.attachments?.length ? 'DOCUMENT' : 'MIXED')
          };
          await contentApi.createLesson(courseId, moduleId, payload);
          createdCount++;
        }
        toast.success(`Saved ${createdCount} lesson${createdCount > 1 ? 's' : ''} to curriculum in order!`);
      }
      navigate(`/admin/courses/${courseId}`);
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSingle = async () => {
    try {
      await contentApi.deleteLesson(courseId, moduleId, lessonId);
      toast.success('Lesson deleted');
      navigate(`/admin/courses/${courseId}`);
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  const handleStartBulkUpload = () => {
    const count = lessonsList.filter(l => l.autoFile && !l.videoUrl).length;
    setBatchUploadTrigger(prev => prev + 1);
    setIsBulkUploadModalOpen(true);
    toast.success(`Starting Vimeo upload for ${count} video(s)...`);
  };

  const uploadItems = lessonsList
    .filter(l => l.autoFile || l.videoUrl || uploadProgressMap[l.id])
    .map((l, idx) => {
      const live = uploadProgressMap[l.id] || {};
      const isUploaded = !!l.videoUrl || live.status === 'success';
      return {
        id: l.id,
        title: l.title || `Lecture ${idx + 1}`,
        fileName: l.autoFile?.name || live.fileName || '',
        size: l.autoFile?.size || live.totalBytes || 0,
        uploadedBytes: isUploaded ? (l.autoFile?.size || live.totalBytes || 0) : (live.uploadedBytes || 0),
        totalBytes: l.autoFile?.size || live.totalBytes || 0,
        progress: isUploaded ? 100 : (live.progress || 0),
        status: isUploaded ? 'success' : (live.status || 'idle'),
        videoUrl: l.videoUrl || live.link || '',
        error: live.error
      };
    });

  if (loading) {
    return (
      <div className="page stack" style={{ minHeight: 300, justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 className="spinner" size={24} />
      </div>
    );
  }

  return (
    <div className="page stack" style={{ maxWidth: 1280, margin: '0 auto', gap: 'var(--sp-4)' }}>
      {/* Breadcrumbs */}
      <Breadcrumb items={[
        { label: 'Courses', to: '/admin/courses' },
        { label: course?.title || 'Course', to: `/admin/courses/${courseId}` },
        { label: isEdit ? (lessonsList[0]?.title || 'Edit Lesson') : 'Batch Add Lessons' }
      ]} />

      {/* Header */}
      <div className="page-head" style={{ marginBottom: 'var(--sp-4)' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'var(--fs-xl)' }}>
            {isEdit ? 'Edit Lesson' : 'Add Course Lectures'}
          </h1>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
            Module: <strong>{currentModule?.title || 'Module 1'}</strong> • Upload multiple videos and study notes in one go.
          </p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {isEdit && (
            <Button size="sm" variant="outline" icon={Trash2} onClick={() => setDeleteConfirm(true)} style={{ color: 'var(--danger)' }}>
              Delete
            </Button>
          )}

          {!isEdit && lessonsList.some(l => l.autoFile && !l.videoUrl) && (
            <Button
              variant="outline"
              icon={UploadCloud}
              onClick={handleStartBulkUpload}
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 600 }}
            >
              Upload {lessonsList.filter(l => l.autoFile && !l.videoUrl).length} Video{lessonsList.filter(l => l.autoFile && !l.videoUrl).length > 1 ? 's' : ''} to Vimeo
            </Button>
          )}

          <Button icon={Save} onClick={handleSaveAll} loading={saving}>
            {isEdit ? 'Save Changes' : `Save ${lessonsList.length} Lesson${lessonsList.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--sp-5)', alignItems: 'start' }}>
        
        {/* ---- Left Panel: Lessons Form ---- */}
        <div className="stack" style={{ gap: 'var(--sp-5)' }}>
          
          {/* BATCH DROPZONE (Only in Create Mode) */}
          {!isEdit && (
            <div
              {...getBatchRootProps()}
              style={{
                border: `2px dashed ${isBatchDragActive ? 'var(--primary)' : 'var(--border-strong)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: isBatchDragActive ? 'var(--color-sky-050, #f0f9ff)' : 'var(--bg-surface-card)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <input {...getBatchInputProps()} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-sky-100, #e0f2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UploadCloud size={24} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, margin: 0 }}>
                    {isBatchDragActive ? 'Drop video files here...' : 'Batch Drop Video Files Here (01, 02, 03...)'}
                  </h3>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                    Drag & drop multiple lectures. Cards will be arranged sequentially.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cards List */}
          {lessonsList.map((lesson, index) => (
            <Card key={lesson.id} style={{ position: 'relative', border: '1px solid var(--border-subtle)' }}>
              
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
                <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: 'var(--color-sky-100, #e0f2fe)', color: 'var(--primary)' }}>
                    #{index + 1}
                  </span>
                  <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700 }}>
                    {lesson.title || `Lecture ${index + 1}`}
                  </span>
                </div>

                <div className="row" style={{ gap: 4 }}>
                  {!isEdit && lessonsList.length > 1 && (
                    <>
                      <Button
                        size="xs"
                        variant="ghost"
                        icon={ArrowUp}
                        disabled={index === 0}
                        onClick={() => moveLesson(index, -1)}
                        title="Move Up"
                      />
                      <Button
                        size="xs"
                        variant="ghost"
                        icon={ArrowDown}
                        disabled={index === lessonsList.length - 1}
                        onClick={() => moveLesson(index, 1)}
                        title="Move Down"
                      />
                    </>
                  )}
                  {!isEdit && (
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={Trash2}
                      onClick={() => removeLessonRow(index)}
                      style={{ color: 'var(--danger)' }}
                      title="Remove this card"
                    />
                  )}
                </div>
              </div>

              {/* Title & Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
                <Field label="Lecture Title *" required>
                  <Input
                    size="sm"
                    value={lesson.title}
                    onChange={(e) => updateLessonField(index, 'title', e.target.value)}
                    placeholder="e.g. 01. Historical Background"
                  />
                </Field>

                <Field label="Lesson Type">
                  <select
                    className="select select--sm"
                    value={lesson.type}
                    onChange={(e) => updateLessonField(index, 'type', e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="MIXED">Video + Material</option>
                    <option value="VIDEO">Video Only</option>
                    <option value="DOCUMENT">Document / PDF</option>
                    <option value="TEXT">Article / Text Only</option>
                  </select>
                </Field>
              </div>

              {/* Video + Attachments Side-by-Side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
                
                {/* Video Box */}
                <div style={{ padding: 'var(--sp-3)', background: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                    <Video size={14} color="var(--info)" /> Video Lecture
                  </h4>

                  {lesson.videoUrl ? (
                    <div style={{ background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', flex: 1, minWidth: 0 }}>
                        <Video size={14} className="text-muted" style={{ flexShrink: 0 }} />
                        <a href={lesson.videoUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--info)', textDecoration: 'none', fontWeight: 500, fontSize: 'var(--fs-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lesson.videoUrl}
                        </a>
                      </div>
                      <Button size="xs" variant="ghost" icon={X} onClick={() => updateLessonField(index, 'videoUrl', '')} />
                    </div>
                  ) : (
                    <VimeoUploader
                      videoName={lesson.title || `Lecture ${index + 1}`}
                      autoUploadFile={lesson.autoFile}
                      triggerUploadCount={batchUploadTrigger}
                      onProgressUpdate={(info) => {
                        setUploadProgressMap(prev => ({
                          ...prev,
                          [lesson.id]: {
                            id: lesson.id,
                            title: lesson.title || `Lecture ${index + 1}`,
                            fileName: lesson.autoFile?.name || info.fileName,
                            size: lesson.autoFile?.size || info.totalBytes,
                            ...info
                          }
                        }));
                        if (info.status === 'uploading') {
                          setIsBulkUploadModalOpen(true);
                        }
                      }}
                      onUploaded={(url) => {
                        updateLessonField(index, 'videoUrl', url);
                        setUploadProgressMap(prev => ({
                          ...prev,
                          [lesson.id]: {
                            ...(prev[lesson.id] || {}),
                            id: lesson.id,
                            title: lesson.title || `Lecture ${index + 1}`,
                            status: 'success',
                            progress: 100,
                            videoUrl: url
                          }
                        }));
                      }}
                      label="Upload Video"
                    />
                  )}

                  <div style={{ marginTop: 8 }}>
                    <Input
                      size="sm"
                      value={lesson.videoUrl}
                      onChange={(e) => updateLessonField(index, 'videoUrl', e.target.value)}
                      placeholder="Or paste Vimeo link..."
                      style={{ fontSize: 'var(--fs-xs)' }}
                    />
                  </div>
                </div>

                {/* Attachments Box */}
                <div style={{ padding: 'var(--sp-3)', background: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                    <Paperclip size={14} color="var(--success)" /> Study Material (PDF / PPT / Docs)
                  </h4>

                  {lesson.attachments?.length > 0 && (
                    <div className="stack" style={{ gap: 4, marginBottom: 8 }}>
                      {lesson.attachments.map((att, attIdx) => (
                        <div key={attIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', flex: 1, minWidth: 0 }}>
                            <FileText size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                            <a href={buildStaticUrl(att.url)} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontWeight: 500, fontSize: 'var(--fs-xs)' }}>
                              {att.name || 'Document'}
                            </a>
                            {att.size && <span style={{ fontSize: '10px', color: 'var(--text-secondary)', flexShrink: 0 }}>({Math.round(att.size / 1024)} KB)</span>}
                          </div>
                          <button type="button" onClick={() => removeAttachment(index, attIdx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 2, display: 'flex' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label style={{ display: 'block', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', textAlign: 'center', background: 'var(--bg-surface)', cursor: lesson.uploadingAttachment ? 'not-allowed' : 'pointer' }}>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
                      style={{ display: 'none' }}
                      disabled={lesson.uploadingAttachment}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleAttachmentUpload(index, e.target.files[0]);
                        }
                      }}
                    />
                    {lesson.uploadingAttachment ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Loader2 className="spinner" size={14} color="var(--primary)" />
                        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
                          Uploading ({lesson.attachmentProgress}%) • {(lesson.uploadingFileSize / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
                        + Add Study Material (PDF, PPT, Doc)
                      </span>
                    )}
                  </label>
                </div>

              </div>

              {/* TIMED VIDEO LOGO & ANIMATED OVERLAY */}
              <div style={{
                padding: 'var(--sp-4)',
                background: 'var(--bg-app)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                marginTop: 'var(--sp-3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                        Timed Video Logo & Overlay
                      </h4>
                      <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', margin: 0 }}>
                        Display your institution logo or custom graphic at a specific timestamp (e.g. at 29s).
                      </p>
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={lesson.overlayConfig?.enabled !== false}
                      onChange={(e) => updateOverlayField(index, 'enabled', e.target.checked)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Enable Overlay
                  </label>
                </div>

                {lesson.overlayConfig?.enabled !== false && (
                  <div className="stack" style={{ gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="form-grid">
                      {/* Logo Image Upload / Preview */}
                      <div>
                        <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                          Logo / Overlay Image
                        </label>
                        {lesson.overlayConfig?.imageUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                            <img
                              src={lesson.overlayConfig.imageUrl.startsWith('http') ? lesson.overlayConfig.imageUrl : buildStaticUrl(lesson.overlayConfig.imageUrl)}
                              alt="Overlay Logo"
                              style={{ width: 44, height: 44, objectFit: 'contain', background: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: 2 }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Logo Image Attached
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ready for video playback</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateOverlayField(index, 'imageUrl', '')}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}
                              title="Remove logo"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '10px', background: 'var(--bg-surface)', cursor: 'pointer', textAlign: 'center' }}>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleOverlayImageUpload(index, e.target.files[0]);
                              }}
                            />
                            <Image size={15} color="var(--primary)" />
                            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              Upload Logo / Watermark Image
                            </span>
                          </label>
                        )}
                      </div>

                      {/* Custom Tagline / Text (Optional) */}
                      <div>
                        <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                          Subtitle / Tagline (Optional)
                        </label>
                        <Input
                          value={lesson.overlayConfig?.customText || ''}
                          onChange={(e) => updateOverlayField(index, 'customText', e.target.value)}
                          placeholder="e.g. Church on the Rock Seminary"
                        />
                      </div>
                    </div>

                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                          Start Time (Seconds)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={lesson.overlayConfig?.startSecond ?? 29}
                          onChange={(e) => updateOverlayField(index, 'startSecond', Number(e.target.value))}
                          placeholder="e.g. 29"
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                          Duration (Seconds)
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="60"
                          value={lesson.overlayConfig?.durationSeconds ?? 5}
                          onChange={(e) => updateOverlayField(index, 'durationSeconds', Number(e.target.value))}
                          placeholder="e.g. 5"
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                          Position
                        </label>
                        <select
                          value={lesson.overlayConfig?.position || 'center'}
                          onChange={(e) => updateOverlayField(index, 'position', e.target.value)}
                          style={{
                            width: '100%',
                            height: '38px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-strong)',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            padding: '0 8px',
                            fontSize: 'var(--fs-xs)'
                          }}
                        >
                          <option value="center">Center of Video (Highlight)</option>
                          <option value="top-right">Top Right (Watermark)</option>
                          <option value="bottom-right">Bottom Right</option>
                          <option value="top-left">Top Left</option>
                          <option value="bottom-left">Bottom Left</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                          Animation Style
                        </label>
                        <select
                          value={lesson.overlayConfig?.animation || 'fade-zoom'}
                          onChange={(e) => updateOverlayField(index, 'animation', e.target.value)}
                          style={{
                            width: '100%',
                            height: '38px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-strong)',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            padding: '0 8px',
                            fontSize: 'var(--fs-xs)'
                          }}
                        >
                          <option value="fade-zoom">Smooth Pop & Elastic Zoom</option>
                          <option value="pulse-glow">Cinematic Glow & Float</option>
                          <option value="slide-up">Smooth Slide Up</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Description */}
              <div>
                <Field label="Description / Notes (Optional)">
                  <ReactQuill
                    theme="snow"
                    value={lesson.description}
                    onChange={(val) => updateLessonField(index, 'description', val)}
                    placeholder="Optional lecture summary..."
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, false] }],
                        ['bold', 'italic', 'underline'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['link'],
                        ['clean']
                      ]
                    }}
                    style={{ backgroundColor: 'var(--bg-app)', color: 'inherit' }}
                  />
                </Field>
              </div>
            </Card>
          ))}

          {/* "+ Add Another Lesson" Button (in Create Mode) */}
          {!isEdit && (
            <Button
              type="button"
              variant="outline"
              icon={Plus}
              onClick={addEmptyLessonRow}
              style={{ width: '100%', padding: '0.85rem', borderStyle: 'dashed' }}
            >
              Add Another Lecture Card
            </Button>
          )}

          {/* Bottom Save Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <Button variant="outline" onClick={() => navigate(`/admin/courses/${courseId}`)}>
              Cancel
            </Button>

            {!isEdit && lessonsList.some(l => l.autoFile && !l.videoUrl) && (
              <Button
                variant="outline"
                icon={UploadCloud}
                onClick={handleStartBulkUpload}
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 600 }}
              >
                Upload {lessonsList.filter(l => l.autoFile && !l.videoUrl).length} Video{lessonsList.filter(l => l.autoFile && !l.videoUrl).length > 1 ? 's' : ''} to Vimeo
              </Button>
            )}

            <Button icon={Save} onClick={handleSaveAll} loading={saving}>
              {isEdit ? 'Save Changes' : `Save ${lessonsList.length} Lesson${lessonsList.length > 1 ? 's' : ''}`}
            </Button>
          </div>

        </div>

        {/* ---- Right Panel: Outline ---- */}
        <div style={{ position: 'sticky', top: 'var(--sp-4)' }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 'var(--sp-3) var(--sp-4)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-sm)', margin: 0, fontWeight: 700 }}>
                Curriculum Outline
              </h3>
              <Link
                to={`/admin/courses/${courseId}`}
                style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', textDecoration: 'underline', fontWeight: 600 }}
              >
                Back
              </Link>
            </div>

            {currentModule && (
              <div style={{ padding: '6px var(--sp-4)', background: 'var(--color-paper-50)', borderBottom: '1px solid var(--border-subtle)', fontSize: 'var(--fs-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
                {currentModule.title}
              </div>
            )}

            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {outlineLessons.map((l, lIdx) => {
                const lId = l._id || l.id;
                const isActive = lId === lessonId;
                return (
                  <Link
                    key={lId}
                    to={`/admin/courses/${courseId}/modules/${moduleId}/lessons/${lId}/edit`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px var(--sp-4)',
                      borderBottom: '1px solid var(--color-paper-100)',
                      fontSize: 'var(--fs-xs)',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'var(--color-amber-600)' : 'var(--text-primary)',
                      background: isActive ? 'var(--color-amber-050)' : 'transparent',
                      textDecoration: 'none',
                      transition: 'background var(--transition-fast)'
                    }}
                  >
                    <span style={{ flexShrink: 0, color: (l.videoUrl || l.type === 'VIDEO') ? 'var(--info, #3b82f6)' : 'var(--text-secondary)' }}>
                      {(l.videoUrl || l.type === 'VIDEO') ? <Video size={13} /> : <FileText size={13} />}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.title}
                    </span>
                  </Link>
                );
              })}
              {outlineLessons.length === 0 && (
                <div style={{ padding: 'var(--sp-4)', textAlign: 'center', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
                  No published lessons yet in this module.
                </div>
              )}
            </div>
          </Card>
        </div>

      </div>

      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteSingle}
        title="Delete this lesson?"
        description="This action cannot be undone."
        confirmLabel="Delete Lesson"
      />

      {/* Bulk Upload Live Progress Popup Modal */}
      <BulkUploadProgressModal
        open={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        items={uploadItems}
        onAllCompleted={() => {
          toast.success('All videos uploaded and ready to save!');
        }}
      />
    </div>
  );
}

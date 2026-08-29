import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, ChevronDown, ChevronRight, Pencil, Trash2, FileText, Video, HelpCircle, Users, ClipboardList, FileCheck2, MessagesSquare, CheckCircle2, Award, Send, XCircle, BookOpen, LayoutDashboard, DollarSign, Info, Settings, Eye, Image, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import * as coursesApi from '../../api/courses';
import * as contentApi from '../../api/content';
import * as usersApi from '../../api/users';
import * as regionsApi from '../../api/regions';
import * as assignmentsApi from '../../api/assignments';
import * as examsApi from '../../api/exams';
import { extractErrorMessages, buildStaticUrl } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import CertificatesTab from '../../components/course/CertificatesTab';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Input, { Field, Textarea, Select } from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageLoader from '../../components/ui/PageLoader';
import FileUploader from '../../components/ui/FileUploader';
import VimeoUploader from '../../components/ui/VimeoUploader';
import CourseDiscussionSidebar from '../../components/course/CourseDiscussionSidebar';
import './CourseDetail.css';

const basePathFor = (pathname) => (pathname.startsWith('/faculty') ? '/faculty' : '/admin');

export default function CourseDetail() {
  const { id } = useParams();
  const location = useLocation();
  const base = basePathFor(location.pathname);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('setup');
  const [viewPricing, setViewPricing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [facultyMap, setFacultyMap] = useState({});
  const [regionMap, setRegionMap] = useState({});
  const { user } = useAuth();
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // For setup guide: preview modules/lessons
  const [modules, setModules] = useState([]);
  const [lessonsByModule, setLessonsByModule] = useState({});


  const load = () => {
    coursesApi.getById(id).then((res) => setCourse(res.data?.data || null)).finally(() => setLoading(false));
    
    usersApi.list({ limit: 500 }).then((res) => {
      const map = {};
      (res.data?.data || res.data || []).forEach(u => { map[u._id || u.id] = u.fullName || u.email; });
      setFacultyMap(map);
    }).catch(() => {});
    
    regionsApi.list().then((res) => {
      const map = {};
      (res.data?.data || res.data || []).forEach(r => { map[r._id || r.id] = r.name; });
      setRegionMap(map);
    }).catch(() => {});

    // Load modules/lessons for setup guide preview
    contentApi.listModules(id).then(async (res) => {
      const mods = res.data?.data || [];
      setModules(mods);
      const lessonMap = {};
      for (const mod of mods) {
        const mId = mod._id || mod.id;
        const lRes = await contentApi.listLessons(id, mId).catch(() => null);
        lessonMap[mId] = lRes?.data?.data || [];
      }
      setLessonsByModule(lessonMap);
    }).catch(() => {});
  };

  useEffect(load, [id]);

  const publishCourse = async () => {
    if (!window.confirm('Are you sure you want to publish this course? It will become visible to students.')) return;
    try {
      await coursesApi.updateStatus(id, 'PUBLISHED');
      toast.success('Course published successfully!');
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  const unpublishCourse = async () => {
    if (!window.confirm('Are you sure you want to unpublish this course? Students will no longer see it.')) return;
    try {
      await coursesApi.updateStatus(id, 'DRAFT');
      toast.success('Course unpublished.');
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  const submitForReview = async () => {
    try {
      await coursesApi.updateStatus(id, 'IN_REVIEW');
      toast.success('Course submitted for review!');
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  const rejectCourse = async () => {
    try {
      await coursesApi.updateStatus(id, 'DRAFT', rejectReason);
      toast.success('Course rejected and sent back to Draft.');
      setRejectModal(false);
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  const canManageContent = user?.userType === 'ORG_USER' && (user?.modulePermissions?.includes('ALL') || user?.modulePermissions?.includes('MANAGE_CONTENT') || !user?.modulePermissions);
  const isFaculty = user?.userType === 'FACULTY';

  if (loading) return <PageLoader />;
  if (!course) return <div className="page"><p>Course not found.</p></div>;

  const totalLessons = Object.values(lessonsByModule).reduce((sum, arr) => sum + arr.length, 0);

  const navItems = [
    { key: 'setup', label: 'Setup guide', icon: LayoutDashboard },
    { key: 'content', label: 'Curriculum', icon: BookOpen },
    { key: 'certificates', label: 'Certificates', icon: Award },
    { key: 'pricing', label: 'Pricing', icon: DollarSign },
    { separator: true },
    { key: 'students', label: 'Students', icon: Users },
    // { key: 'assignments', label: 'Assignments', icon: ClipboardList },
    { key: 'exams', label: 'Exams', icon: FileCheck2 },
  ];

  const statusClass = course.status === 'PUBLISHED' ? 'published' : course.status === 'IN_REVIEW' ? 'in-review' : 'draft';

  return (
    <div className="course-detail page">
      {/* ---- Premium Hero Section ---- */}
      <div className="course-detail__hero">
        {course.thumbnailUrl ? (
          <img src={buildStaticUrl(course.thumbnailUrl)} alt={course.title} className="course-detail__cover" />
        ) : (
          <div className="course-detail__cover" style={{ background: 'var(--color-ink-800)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={64} style={{ opacity: 0.1 }} />
          </div>
        )}
        <div className="course-detail__hero-overlay" />
        
        <div className="course-detail__hero-content">
          <div className="course-detail__hero-text">
            <div className="course-detail__breadcrumb">
              <Link to={`${base}/courses`}>Courses</Link>
              <ChevronRight size={14} />
              <span>{course.title}</span>
            </div>
            <h1 className="course-detail__title">{course.title}</h1>
            <div className="row" style={{ gap: '12px' }}>
              <StatusBadge status={course.status} />
              {course.credits > 0 && (
                <span style={{ fontSize: 'var(--fs-sm)', color: 'rgba(255,255,255,0.8)' }}>
                  {course.credits} Credits
                </span>
              )}
            </div>
          </div>
          
          <div className="course-detail__hero-actions">
            {course.status === 'DRAFT' && isFaculty && (
              <Button variant="primary" icon={Send} onClick={submitForReview}>Submit for Review</Button>
            )}
            {course.status === 'IN_REVIEW' && canManageContent && (
              <>
                <Button variant="outline" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', background: 'var(--glass-light)' }} icon={XCircle} onClick={() => setRejectModal(true)}>Reject</Button>
                <Button variant="primary" icon={CheckCircle2} onClick={publishCourse}>Approve & Publish</Button>
              </>
            )}
            {course.status === 'PUBLISHED' && canManageContent && (
              <Button variant="outline" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: 'var(--glass-light)' }} onClick={unpublishCourse}>Unpublish</Button>
            )}
            {course.status === 'DRAFT' && canManageContent && (
              <Button variant="primary" icon={CheckCircle2} onClick={publishCourse}>Publish Course</Button>
            )}
            <Button variant="outline" style={{ background: 'var(--glass-light)', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }} icon={MessagesSquare} onClick={() => setSidebarOpen(true)}>Chat</Button>
          </div>
        </div>
      </div>

      {/* ---- Navigation Tabs ---- */}
      <nav className="course-nav">
        {navItems.map((item, i) => {
          if (item.separator) return <div key={`sep-${i}`} className="course-nav__separator" />;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              className={`course-nav__item ${activeView === item.key ? 'course-nav__item--active' : ''}`}
              onClick={() => setActiveView(item.key)}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* ---- Main Content Wrapper ---- */}
      <main className="course-detail__main">
        {activeView === 'setup' && (
          <SetupGuideView 
            course={course} 
            modules={modules} 
            lessonsByModule={lessonsByModule} 
            totalLessons={totalLessons} 
            base={base} 
            id={id}
            regionMap={regionMap}
            facultyMap={facultyMap}
            onViewPricing={() => setViewPricing(true)}
          />
        )}
        {activeView === 'content' && <ContentTab courseId={id} base={base} canManageContent={canManageContent} />}
        {activeView === 'students' && <StudentsTab courseId={id} />}
        {activeView === 'assignments' && <AssignmentsTab courseId={id} base={base} />}
        {activeView === 'exams' && <ExamsTab courseId={id} base={base} canManageContent={canManageContent} />}
        {activeView === 'certificates' && <CertificatesTab courseId={id} />}
        {activeView === 'pricing' && (
          <PricingView course={course} regionMap={regionMap} base={base} id={id} />
        )}

        {/* Modals */}
        <Modal open={viewPricing} onClose={() => setViewPricing(false)} title="Regional Pricing" width={400}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>{course?.title}</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '8px 4px', fontSize: 'var(--fs-sm)' }}>Region</th>
                <th style={{ padding: '8px 4px', fontSize: 'var(--fs-sm)', textAlign: 'right' }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {(course?.regionalPrices || []).map((rp, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 4px', fontSize: 'var(--fs-sm)' }}>{rp.regionId?.name || regionMap[rp.regionId] || 'Unknown'}</td>
                  <td style={{ padding: '8px 4px', fontSize: 'var(--fs-sm)', textAlign: 'right' }}>{rp.currency || 'USD'} {rp.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="modal-panel__foot" style={{ margin: '24px -24px -24px', padding: '16px 24px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setViewPricing(false)}>Close</Button>
          </div>
        </Modal>

        <Modal open={rejectModal} onClose={() => setRejectModal(false)} title="Reject Course">
          <div style={{ padding: '24px 0' }}>
            <p style={{ marginBottom: '16px', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
              Please provide a reason for rejecting this course. The faculty member will see this feedback.
            </p>
            <Field label="Rejection Reason">
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Video 2 has no audio..." rows={4} />
            </Field>
          </div>
          <div className="modal-panel__foot" style={{ margin: '0 -24px -24px', padding: '16px 24px', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="outline" onClick={() => setRejectModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={rejectCourse} disabled={!rejectReason.trim()}>Reject & Send Back</Button>
          </div>
        </Modal>

        <CourseDiscussionSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} courseId={id} />
      </main>
    </div>
  );
}

/* ============================ Setup Guide View ============================ */

function SetupGuideView({ course, modules, lessonsByModule, totalLessons, base, id, regionMap, facultyMap, onViewPricing }) {
  return (
    <div className="setup-guide">
      {/* Left Column */}
      <div className="stack" style={{ gap: 'var(--sp-6)' }}>
        {/* Create your curriculum */}
        <div className="setup-card">
          <div className="setup-card__header">
            <div className="setup-card__header-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <BookOpen size={16} />
            </div>
            Create your curriculum
          </div>
          <div className="setup-card__body">
            <div className="curriculum-preview">
              <div className="curriculum-preview__header">
                <span>Curriculum Preview</span>
                <div className="row" style={{ gap: '8px' }}>
                  <Link to={`${base}/courses/${id}`} onClick={(e) => { e.preventDefault(); }} style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
                    <Eye size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Preview curriculum
                  </Link>
                </div>
              </div>
              <div className="curriculum-preview__list">
                {modules.length === 0 && (
                  <div style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)' }}>
                    No modules yet. Add your first module to get started.
                  </div>
                )}
                {modules.map((mod) => {
                  const mId = mod._id || mod.id;
                  const lessons = lessonsByModule[mId] || [];
                  return (
                    <div key={mId}>
                      <div className="curriculum-preview__item" style={{ background: 'var(--color-paper-50)', fontWeight: 600 }}>
                        {mod.title}
                      </div>
                      {lessons.map((lesson) => (
                        <div key={lesson._id || lesson.id} className="curriculum-preview__item" style={{ paddingLeft: 'var(--sp-8)' }}>
                          <span style={{ flexShrink: 0, color: (lesson.videoUrl || lesson.type === 'VIDEO') ? 'var(--info, #3b82f6)' : 'var(--text-secondary)' }}>
                            {(lesson.videoUrl || lesson.type === 'VIDEO') ? <Video size={14} /> : <FileText size={14} />}
                          </span>
                          <div>
                            <div>{lesson.title}</div>
                            <div className="curriculum-preview__item-meta">
                              {(() => {
                                const parts = [];
                                if (lesson.videoUrl || lesson.type === 'VIDEO') {
                                  parts.push(lesson.durationMinutes ? `${lesson.durationMinutes} min Video` : 'Video');
                                }
                                if (lesson.attachments && lesson.attachments.length > 0) {
                                  parts.push(`${lesson.attachments.length} Document${lesson.attachments.length > 1 ? 's' : ''}`);
                                } else if (lesson.documentUrl || lesson.contentUrl || lesson.type === 'DOCUMENT' || lesson.type === 'PDF') {
                                  parts.push('1 Document');
                                }
                                return parts.length > 0 ? parts.join(' • ') : 'Lesson';
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Price your course */}
        <div className="setup-card">
          <div className="setup-card__header">
            <div className="setup-card__header-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
              <DollarSign size={16} />
            </div>
            Price your course
          </div>
          <div className="setup-card__body">
            <div className="pricing-plan-card">
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-3)' }}>
                {course.regionalPrices?.length > 0 
                  ? `${course.regionalPrices.length} regional price(s) configured.`
                  : 'No pricing configured. This course is currently free.'}
              </p>
              {course.regionalPrices?.length > 0 && (
                <Button variant="outline" size="sm" onClick={onViewPricing}>View Pricing</Button>
              )}
              <div style={{ marginTop: 'var(--sp-3)' }}>
                <Link to={`${base}/courses/${id}/edit`}>
                  <Button variant="outline" size="sm">Edit Pricing</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="stack" style={{ gap: 'var(--sp-6)' }}>
        {/* Customize your course */}
        <div className="setup-card">
          <div className="setup-card__header">
            <div className="setup-card__header-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <Settings size={16} />
            </div>
            Customize your course
          </div>
          
          {/* Title */}
          <div className="customize-field">
            <div>
              <div className="customize-field__label">Course title</div>
              <div className="customize-field__value">{course.title}</div>
            </div>
            <Link to={`${base}/courses/${id}/edit`} className="customize-field__edit">
              <Pencil size={12} /> Edit title
            </Link>
          </div>

          {/* Description */}
          <div className="customize-field">
            <div>
              <div className="customize-field__label">Course description</div>
              <div className="customize-field__value">
                {course.description 
                  ? <span dangerouslySetInnerHTML={{ __html: course.description.substring(0, 120) + (course.description.length > 120 ? '...' : '') }} />
                  : <span style={{ color: 'var(--text-secondary)' }}>No description added</span>
                }
              </div>
            </div>
            <Link to={`${base}/courses/${id}/edit`} className="customize-field__edit">
              <Pencil size={12} /> Edit description
            </Link>
          </div>

          {/* Thumbnail */}
          <div className="customize-field" style={{ flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div className="customize-field__label">Thumbnail</div>
              <Link to={`${base}/courses/${id}/edit`} className="customize-field__edit">
                <Image size={12} /> Edit image
              </Link>
            </div>
            {course.thumbnailUrl ? (
              <img src={buildStaticUrl(course.thumbnailUrl)} alt="Course thumbnail" className="customize-field__thumbnail" />
            ) : (
              <div style={{ width: '100%', height: 120, background: 'var(--color-paper-100)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', marginTop: 'var(--sp-2)' }}>
                <Image size={28} />
              </div>
            )}
          </div>

          {/* Instructor */}
          <div className="customize-field">
            <div>
              <div className="customize-field__label">Instructor(s)</div>
              <div className="customize-field__value">
                {course.instructorIds?.length > 0 
                  ? course.instructorIds.map(i => typeof i === 'object' ? (i.fullName || i.email || 'Unknown') : (facultyMap[i] || i)).join(', ')
                  : <span style={{ color: 'var(--text-secondary)' }}>No instructor assigned</span>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="setup-card">
          <div style={{ padding: 'var(--sp-4) var(--sp-5)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink-900)' }}>{modules.length}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>Modules</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink-900)' }}>{totalLessons}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>Lessons</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink-900)' }}>{course.enrolledCount ?? 0}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>Enrolled</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink-900)' }}>{course.credits || 0}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>Credits</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ Pricing View ============================ */

function PricingView({ course, regionMap, base, id }) {
  return (
    <div className="stack" style={{ maxWidth: 700 }}>
      <div className="setup-card">
        <div className="setup-card__header">
          <div className="setup-card__header-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
            <DollarSign size={16} />
          </div>
          Course Pricing
        </div>
        <div className="setup-card__body">
          {course.regionalPrices?.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 4px', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>Region</th>
                  <th style={{ padding: '10px 4px', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>Currency</th>
                  <th style={{ padding: '10px 4px', fontSize: 'var(--fs-sm)', fontWeight: 600, textAlign: 'right' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {course.regionalPrices.map((rp, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 4px', fontSize: 'var(--fs-sm)' }}>{rp.regionId?.name || regionMap[rp.regionId] || 'Unknown'}</td>
                    <td style={{ padding: '10px 4px', fontSize: 'var(--fs-sm)' }}>{rp.currency || 'USD'}</td>
                    <td style={{ padding: '10px 4px', fontSize: 'var(--fs-sm)', textAlign: 'right', fontWeight: 600 }}>{rp.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)' }}>
              No pricing configured. This course is currently free.
            </div>
          )}
          <div style={{ marginTop: 'var(--sp-4)' }}>
            <Link to={`${base}/courses/${id}/edit`}>
              <Button variant="outline" size="sm" icon={Pencil}>Edit Pricing</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Content Tab ---------------------------- */

function ContentTab({ courseId, base, canManageContent }) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [lessonsByModule, setLessonsByModule] = useState({});
  const [moduleModal, setModuleModal] = useState(false);
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' });
  const [lessonModal, setLessonModal] = useState(null); // moduleId
  const [lessonForm, setLessonForm] = useState({ title: '', description: '', type: 'VIDEO', videoUrl: '', content: '', contentUrl: '', durationMinutes: '' });
  const [deleteModuleTarget, setDeleteModuleTarget] = useState(null);
  const [deleteLessonTarget, setDeleteLessonTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [rejectModalTarget, setRejectModalTarget] = useState(null); // { type: 'module'|'lesson', id: string, moduleId?: string }
  const [rejectReason, setRejectReason] = useState('');

  // Drag and Drop State
  const [dragState, setDragState] = useState({ moduleId: null, fromIndex: null, overIndex: null });

  const loadModules = () => {
    setLoading(true);
    contentApi.listModules(courseId).then((res) => setModules(res.data?.data || [])).finally(() => setLoading(false));
  };
  useEffect(loadModules, [courseId]);

  const toggleExpand = async (moduleId) => {
    setExpanded((e) => ({ ...e, [moduleId]: !e[moduleId] }));
    if (!lessonsByModule[moduleId]) {
      const res = await contentApi.listLessons(courseId, moduleId).catch(() => null);
      setLessonsByModule((prev) => ({ ...prev, [moduleId]: res?.data?.data || [] }));
    }
  };

  const submitModule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await contentApi.createModule(courseId, moduleForm);
      toast.success('Module added');
      setModuleModal(false);
      setModuleForm({ title: '', description: '' });
      loadModules();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  const submitLesson = async (e) => {
    e.preventDefault();
    setSaving(true);
    const modId = lessonModal?.moduleId;
    const lesId = lessonModal?.lessonId;
    try {
      const payload = {
        ...lessonForm,
        durationMinutes: lessonForm.durationMinutes ? Number(lessonForm.durationMinutes) : undefined,
      };
      if (lesId) {
        await contentApi.updateLesson(courseId, modId, lesId, payload);
        toast.success('Lesson updated');
      } else {
        await contentApi.createLesson(courseId, modId, payload);
        toast.success('Lesson added');
      }
      const res = await contentApi.listLessons(courseId, modId);
      setLessonsByModule((prev) => ({ ...prev, [modId]: res.data?.data || [] }));
      setLessonModal(null);
      setLessonForm({ title: '', description: '', type: 'VIDEO', videoUrl: '', content: '', contentUrl: '', durationMinutes: '' });
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  const doDeleteModule = async () => {
    try {
      await contentApi.deleteModule(courseId, deleteModuleTarget._id || deleteModuleTarget.id);
      toast.success('Module deleted');
      setDeleteModuleTarget(null);
      loadModules();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  const doDeleteLesson = async () => {
    try {
      await contentApi.deleteLesson(courseId, deleteLessonTarget.moduleId, deleteLessonTarget._id || deleteLessonTarget.id);
      toast.success('Lesson deleted');
      const res = await contentApi.listLessons(courseId, deleteLessonTarget.moduleId);
      setLessonsByModule((prev) => ({ ...prev, [deleteLessonTarget.moduleId]: res.data?.data || [] }));
      setDeleteLessonTarget(null);
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  const handleApprove = async (e, type, modId, lesId) => {
    e.stopPropagation();
    try {
      if (type === 'module') {
        await contentApi.approveModule(courseId, modId);
        toast.success('Module approved');
      } else {
        await contentApi.approveLesson(courseId, modId, lesId);
        toast.success('Lesson approved');
        const res = await contentApi.listLessons(courseId, modId);
        setLessonsByModule((prev) => ({ ...prev, [modId]: res.data?.data || [] }));
      }
      loadModules();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  const doReject = async () => {
    try {
      if (rejectModalTarget.type === 'module') {
        await contentApi.rejectModule(courseId, rejectModalTarget.id, rejectReason);
        toast.success('Module rejected');
      } else {
        await contentApi.rejectLesson(courseId, rejectModalTarget.moduleId, rejectModalTarget.id, rejectReason);
        toast.success('Lesson rejected');
        const res = await contentApi.listLessons(courseId, rejectModalTarget.moduleId);
        setLessonsByModule((prev) => ({ ...prev, [rejectModalTarget.moduleId]: res.data?.data || [] }));
      }
      setRejectModalTarget(null);
      setRejectReason('');
      loadModules();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  // 1-Click Arrow Reordering
  const handleMoveLesson = async (moduleId, lIdx, direction) => {
    const list = [...(lessonsByModule[moduleId] || [])];
    const targetIdx = lIdx + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const currentLesson = list[lIdx];
    const targetLesson = list[targetIdx];

    // Swap in UI immediately
    list[lIdx] = targetLesson;
    list[targetIdx] = currentLesson;
    setLessonsByModule((prev) => ({ ...prev, [moduleId]: list }));

    try {
      await Promise.all([
        contentApi.updateLesson(courseId, moduleId, currentLesson._id || currentLesson.id, { orderIndex: targetIdx + 1 }),
        contentApi.updateLesson(courseId, moduleId, targetLesson._id || targetLesson.id, { orderIndex: lIdx + 1 }),
      ]);
      toast.success('Curriculum order updated');
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
      const res = await contentApi.listLessons(courseId, moduleId).catch(() => null);
      setLessonsByModule((prev) => ({ ...prev, [moduleId]: res?.data?.data || [] }));
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, moduleId, index) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ moduleId, index }));
    e.dataTransfer.effectAllowed = 'move';
    setDragState({ moduleId, fromIndex: index, overIndex: null });
  };

  const handleDragOver = (e, moduleId, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragState.moduleId === moduleId && dragState.overIndex !== index) {
      setDragState((prev) => ({ ...prev, overIndex: index }));
    }
  };

  const handleDragEnd = () => {
    setDragState({ moduleId: null, fromIndex: null, overIndex: null });
  };

  const handleDrop = async (e, targetModuleId, targetIndex) => {
    e.preventDefault();
    setDragState({ moduleId: null, fromIndex: null, overIndex: null });

    let data;
    try {
      data = JSON.parse(e.dataTransfer.getData('text/plain'));
    } catch {
      return;
    }

    if (!data || data.moduleId !== targetModuleId) return;
    const { index: sourceIndex } = data;
    if (sourceIndex === targetIndex || sourceIndex === undefined || targetIndex === undefined) return;

    const list = [...(lessonsByModule[targetModuleId] || [])];
    const [movedLesson] = list.splice(sourceIndex, 1);
    list.splice(targetIndex, 0, movedLesson);

    // Instant optimistic update
    setLessonsByModule((prev) => ({ ...prev, [targetModuleId]: list }));

    try {
      const updatePromises = list.map((lesson, idx) => {
        const lId = lesson._id || lesson.id;
        return contentApi.updateLesson(courseId, targetModuleId, lId, { orderIndex: idx + 1 });
      });
      await Promise.all(updatePromises);
      toast.success('Curriculum order updated');
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
      const res = await contentApi.listLessons(courseId, targetModuleId).catch(() => null);
      setLessonsByModule((prev) => ({ ...prev, [targetModuleId]: res?.data?.data || [] }));
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="text-muted" style={{ fontSize: 'var(--fs-sm)', margin: 0 }}>
          Drag lessons using the grip icon ⠿ or use the arrow buttons to reorder them within any module.
        </p>
        <Button icon={Plus} size="sm" onClick={() => setModuleModal(true)}>Add Module</Button>
      </div>

      {modules.length === 0 ? (
        <EmptyState icon={FileText} title="No modules yet" description="Break your course into modules, then add lessons to each." />
      ) : (
        modules.map((mod) => {
          const mId = mod._id || mod.id;
          const lessonsList = lessonsByModule[mId] || [];
          return (
            <Card key={mId} style={{ padding: 0, overflow: 'hidden' }}>
              <div
                className="row"
                style={{ width: '100%', justifyContent: 'space-between', padding: 'var(--sp-4) var(--sp-5)', background: 'var(--color-paper-50)', border: 'none', borderBottom: expanded[mId] ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer' }}
                onClick={() => toggleExpand(mId)}
              >
                <span className="row" style={{ fontWeight: 600, alignItems: 'center', gap: '8px' }}>
                  {expanded[mId] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  {mod.title}
                  <span className="text-muted" style={{ fontSize: 'var(--fs-xs)', fontWeight: 400 }}>
                    ({lessonsList.length} lesson{lessonsList.length !== 1 ? 's' : ''})
                  </span>
                  {mod.contentStatus === 'IN_REVIEW' && (
                    <span style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--color-warning)', color: '#fff', borderRadius: '4px', marginLeft: 8 }}>IN REVIEW</span>
                  )}
                  {mod.reviewNotes && mod.contentStatus === 'IN_REVIEW' && (
                    <span style={{ fontSize: '10px', color: 'var(--color-danger)', marginLeft: 8 }}>Rejected</span>
                  )}
                </span>
                <span className="row">
                  {canManageContent && mod.contentStatus === 'IN_REVIEW' && (
                    <>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setRejectModalTarget({ type: 'module', id: mId }); }}>Reject</Button>
                      <Button size="sm" variant="primary" onClick={(e) => handleApprove(e, 'module', mId)}>Approve</Button>
                    </>
                  )}
                  <Link to={`${base}/courses/${courseId}/modules/${mId}/lessons/new`} style={{textDecoration: 'none'}}>
                    <Button size="sm" variant="ghost" icon={Plus} onClick={(e) => { e.stopPropagation(); }}>Add Lesson</Button>
                  </Link>
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={(e) => { e.stopPropagation(); setDeleteModuleTarget(mod); }} />
                </span>
              </div>
              {expanded[mId] && (
                <div style={{ padding: 'var(--sp-2) var(--sp-5) var(--sp-4)' }}>
                  {lessonsList.length === 0 && (
                    <p className="text-muted" style={{ fontSize: 'var(--fs-sm)', padding: 'var(--sp-3) 0' }}>No lessons in this module yet.</p>
                  )}
                  {lessonsList.map((lesson, lIdx) => {
                    const isDraggingThis = dragState.moduleId === mId && dragState.fromIndex === lIdx;
                    const isDragOverThis = dragState.moduleId === mId && dragState.overIndex === lIdx;

                    return (
                      <div
                        key={lesson._id || lesson.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, mId, lIdx)}
                        onDragOver={(e) => handleDragOver(e, mId, lIdx)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, mId, lIdx)}
                        className="row"
                        style={{
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          transition: 'all 0.15s ease',
                          cursor: 'grab',
                          background: isDragOverThis
                            ? 'var(--color-primary-50, rgba(99, 102, 241, 0.08))'
                            : 'transparent',
                          borderLeft: isDragOverThis
                            ? '3px solid var(--accent, #6366f1)'
                            : '3px solid transparent',
                          opacity: isDraggingThis ? 0.45 : 1,
                        }}
                      >
                        <span className="row" style={{ fontSize: 'var(--fs-sm)', alignItems: 'center', gap: '10px' }}>
                          <span title="Drag to reorder" style={{ cursor: 'grab', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                            <GripVertical size={16} />
                          </span>
                          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600, minWidth: '20px' }}>
                            {lIdx + 1}.
                          </span>
                          {(lesson.type === 'VIDEO' || lesson.videoUrl) ? <Video size={15} color="var(--info, #3b82f6)" /> : lesson.type === 'QUIZ' ? <HelpCircle size={15} /> : <FileText size={15} />}
                          <span style={{ fontWeight: 500 }}>{lesson.title}</span>
                          <span className="text-muted" style={{ fontSize: 'var(--fs-2xs)' }}>{lesson.durationMinutes ? `${lesson.durationMinutes} min` : ''}</span>
                          {lesson.contentStatus === 'IN_REVIEW' && (
                            <span style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--color-warning)', color: '#fff', borderRadius: '4px', marginLeft: 8 }}>IN REVIEW</span>
                          )}
                          {lesson.reviewNotes && lesson.contentStatus === 'IN_REVIEW' && (
                            <span style={{ fontSize: '10px', color: 'var(--color-danger)', marginLeft: 8 }}>Rejected</span>
                          )}
                        </span>
                        <span className="row" style={{ gap: '8px', alignItems: 'center' }}>
                          <Link to={`${base}/courses/${courseId}/lessons/${lesson._id || lesson.id}/preview`} state={{ lesson }} style={{ fontSize: 'var(--fs-xs)', textDecoration: 'underline', color: 'var(--color-primary-600)', marginRight: '4px' }}>
                            Preview Lesson
                          </Link>
                          {lesson.videoUrl && (
                            <Link to={`${base}/courses/${courseId}/lessons/${lesson._id || lesson.id}/video-quizzes`} state={{ lesson }} style={{ fontSize: 'var(--fs-xs)', textDecoration: 'underline', color: 'var(--color-primary-600)', marginRight: '4px' }}>
                              Manage Quizzes
                            </Link>
                          )}
                          {canManageContent && lesson.contentStatus === 'IN_REVIEW' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setRejectModalTarget({ type: 'lesson', id: lesson._id || lesson.id, moduleId: mId })}>Reject</Button>
                              <Button size="sm" variant="primary" onClick={(e) => handleApprove(e, 'lesson', mId, lesson._id || lesson.id)}>Approve</Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={ArrowUp}
                            disabled={lIdx === 0}
                            onClick={() => handleMoveLesson(mId, lIdx, -1)}
                            title="Move Lesson Up"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={ArrowDown}
                            disabled={lIdx === lessonsList.length - 1}
                            onClick={() => handleMoveLesson(mId, lIdx, 1)}
                            title="Move Lesson Down"
                          />
                          <Link to={`${base}/courses/${courseId}/modules/${mId}/lessons/${lesson._id || lesson.id}/edit`} style={{textDecoration: 'none'}}>
                            <Button size="sm" variant="ghost" icon={Pencil} title="Edit Lesson" />
                          </Link>
                          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDeleteLessonTarget({ ...lesson, moduleId: mId })} title="Delete Lesson" />
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })
      )}

      <Modal open={moduleModal} onClose={() => setModuleModal(false)} title="Add Module" width={420}>
        <form className="stack" id="module-form" onSubmit={submitModule}>
          <Field label="Module Title" required><Input value={moduleForm.title} onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))} required /></Field>
          <Field label="Description"><Textarea rows={3} value={moduleForm.description} onChange={(e) => setModuleForm((f) => ({ ...f, description: e.target.value }))} /></Field>
        </form>
        <div className="modal-panel__foot" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
          <Button variant="outline" type="button" onClick={() => setModuleModal(false)}>Cancel</Button>
          <Button type="submit" form="module-form" loading={saving}>Add Module</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteModuleTarget}
        onClose={() => setDeleteModuleTarget(null)}
        onConfirm={doDeleteModule}
        title="Delete Module"
        description={`Are you sure you want to delete module "${deleteModuleTarget?.title}"? All lessons inside will be deleted.`}
        confirmLabel="Delete"
        danger
      />

      <ConfirmDialog
        open={!!deleteLessonTarget}
        onClose={() => setDeleteLessonTarget(null)}
        onConfirm={doDeleteLesson}
        title="Delete Lesson"
        description={`Are you sure you want to delete lesson "${deleteLessonTarget?.title}"?`}
        confirmLabel="Delete"
        danger
      />

      <Modal open={!!rejectModalTarget} onClose={() => setRejectModalTarget(null)} title={`Reject ${rejectModalTarget?.type === 'module' ? 'Module' : 'Lesson'}`}>
        <div style={{ padding: '24px 0' }}>
          <p style={{ marginBottom: '16px', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
            Provide a reason for rejection. This will notify the faculty to make corrections.
          </p>
          <Field label="Rejection Reason">
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Video 2 has audio issues..." rows={4} />
          </Field>
        </div>
        <div className="modal-panel__foot" style={{ margin: '0 -24px -24px', padding: '16px 24px', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="outline" onClick={() => setRejectModalTarget(null)}>Cancel</Button>
          <Button variant="primary" onClick={doReject} disabled={!rejectReason.trim()}>Reject Content</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------------------- Students Tab ---------------------------- */

function StudentsTab({ courseId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    coursesApi.getStudents(courseId).then((res) => setStudents(res.data?.data || [])).finally(() => setLoading(false));
  }, [courseId]);

  return (
    <DataTable
      loading={loading}
      emptyLabel="No students enrolled in this course yet."
      columns={[
        { key: 'fullName', header: 'Name', render: (r) => r.studentId?.fullName || r.student?.fullName || r.fullName || '—' },
        { key: 'email', header: 'Email', render: (r) => r.studentId?.email || r.student?.email || r.email || '—' },
        { 
          key: 'progress', 
          header: 'Progress', 
          render: (r) => (
            <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1, height: '6px', width: '60px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, r.progressPercentage || 0)}%`, height: '100%', background: (r.progressPercentage || 0) >= 100 ? 'var(--color-emerald-500)' : 'var(--accent)' }}></div>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{r.progressPercentage ?? 0}%</span>
            </div>
          ) 
        },
        { 
          key: 'status', 
          header: 'Status', 
          render: (r) => {
            const isCompleted = r.status === 'COMPLETED' || (r.progressPercentage || 0) >= 100;
            if (isCompleted) {
              return <StatusBadge status="COMPLETED" label="COMPLETED" tone="success" />;
            }
            return <StatusBadge status={r.status || 'ACTIVE'} label={r.status || 'ACTIVE'} tone="info" />;
          } 
        },
        { key: 'enrolledAt', header: 'Enrolled On', render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—' },
      ]}
      rows={students}
    />
  );
}

/* ---------------------------- Assignments Tab ---------------------------- */

function AssignmentsTab({ courseId, base }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', totalMarks: 100 });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    assignmentsApi.list(courseId).then((res) => setAssignments(res.data?.data || [])).finally(() => setLoading(false));
  };
  useEffect(load, [courseId]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await assignmentsApi.create(courseId, { ...form, totalMarks: Number(form.totalMarks) });
      toast.success('Assignment created');
      setModalOpen(false);
      setForm({ title: '', description: '', dueDate: '', totalMarks: 100 });
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button icon={Plus} size="sm" onClick={() => setModalOpen(true)}>New Assignment</Button>
      </div>
      <DataTable
        loading={loading}
        emptyLabel="No assignments created for this course yet."
        columns={[
          { key: 'title', header: 'Title' },
          { key: 'dueDate', header: 'Due Date', render: (r) => (r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—') },
          { key: 'totalMarks', header: 'Max Score', render: (r) => r.totalMarks },
          { key: 'submissionsCount', header: 'Submissions', render: (r) => r.submissionsCount ?? 0 },
          {
            key: 'actions', header: 'Actions', render: (r) => (
              <Link to={`${base}/courses/${courseId}/assignments/${r._id || r.id}/submissions`}>
                <Button size="sm" variant="outline">View Submissions</Button>
              </Link>
            ),
          },
        ]}
        rows={assignments}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Assignment" width={460}>
        <form className="stack" id="assignment-form" onSubmit={submit}>
          <Field label="Title" required><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></Field>
          <Field label="Description"><Textarea rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field>
          <div className="form-grid">
            <Field label="Due Date"><Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} /></Field>
            <Field label="Max Score"><Input type="number" value={form.totalMarks} onChange={(e) => setForm((f) => ({ ...f, totalMarks: e.target.value }))} /></Field>
          </div>
        </form>
        <div className="modal-panel__foot" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
          <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="assignment-form" loading={saving}>Create Assignment</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------------------- Exams Tab ---------------------------- */

function ExamsTab({ courseId, base, canManageContent }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [addExam, setAddExam] = useState({ title: '', durationMinutes: 60, totalMarks: 100, passingPercentage: 70, maxAttempts: 1, isFinalExam: false });
  const [saving, setSaving] = useState(false);
  const [rejectModalTarget, setRejectModalTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = () => {
    setLoading(true);
    examsApi.list(courseId).then((res) => setExams(res.data?.data || [])).finally(() => setLoading(false));
  };
  useEffect(load, [courseId]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await examsApi.create(courseId, {
        ...addExam,
        durationMinutes: Number(addExam.durationMinutes),
        totalMarks: Number(addExam.totalMarks),
        passingPercentage: Number(addExam.passingPercentage),
        maxAttempts: 1,
        isFinalExam: addExam.isFinalExam,
      });
      toast.success('Exam created');
      setModalOpen(false);
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (examId) => {
    try {
      await examsApi.approve(examId);
      toast.success('Exam approved');
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  const doReject = async () => {
    try {
      await examsApi.reject(rejectModalTarget, rejectReason);
      toast.success('Exam rejected');
      setRejectModalTarget(null);
      setRejectReason('');
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button icon={Plus} size="sm" onClick={() => setModalOpen(true)}>New Exam</Button>
      </div>
      <DataTable
        loading={loading}
        emptyLabel="No exams created for this course yet."
        columns={[
          { key: 'title', header: 'Title' },
          { key: 'durationMinutes', header: 'Duration', render: (r) => `${r.durationMinutes} min` },
          { key: 'totalMarks', header: 'Total Marks' },
          { key: 'type', header: 'Type', render: (r) => r.isFinalExam ? <StatusBadge status="FINAL EXAM" /> : <span className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>Standard</span> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || (r.isPublished ? 'PUBLISHED' : 'DRAFT')} /> },
          {
            key: 'actions', header: 'Actions', render: (r) => (
              <div className="row" style={{ gap: '8px' }}>
                {canManageContent && r.status === 'IN_REVIEW' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setRejectModalTarget(r._id || r.id)}>Reject</Button>
                    <Button size="sm" variant="primary" onClick={() => handleApprove(r._id || r.id)}>Approve</Button>
                  </>
                )}
                <Link to={`${base}/courses/${courseId}/exams/${r._id || r.id}`}>
                  <Button size="sm" variant="outline">Manage</Button>
                </Link>
                <Link to={`${base}/courses/${courseId}/exams/${r._id || r.id}/results`}>
                  <Button size="sm" variant="ghost">View Results</Button>
                </Link>
              </div>
            ),
          },
        ]}
        rows={exams}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Exam" width={440}>
        <form className="stack" id="exam-form" onSubmit={submit}>
          <Field label="Title" required><Input value={addExam.title} onChange={(e) => setAddExam((f) => ({ ...f, title: e.target.value }))} required /></Field>
          <div className="form-grid">
            <Field label="Duration (min)"><Input type="number" value={addExam.durationMinutes} onChange={(e) => setAddExam((f) => ({ ...f, durationMinutes: e.target.value }))} /></Field>
            <Field label="Total Marks"><Input type="number" value={addExam.totalMarks} onChange={(e) => setAddExam((f) => ({ ...f, totalMarks: e.target.value }))} /></Field>
          </div>
          <div className="form-grid">
            <Field label="Passing Percentage (%)"><Input type="number" min="1" max="100" value={addExam.passingPercentage} onChange={(e) => setAddExam((f) => ({ ...f, passingPercentage: e.target.value }))} /></Field>
            <Field label="Exam Attempt Policy">
              <div style={{ padding: '8px 12px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px', fontSize: '13px', color: '#4338ca', fontWeight: 700, display: 'flex', alignItems: 'center', minHeight: '38px' }}>
                🔒 1 Attempt / Semester Cycle
              </div>
            </Field>
          </div>
          <div className="row" style={{ alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--color-primary-50)', borderRadius: '8px', border: '1px solid var(--color-primary-100)' }}>
            <input 
              type="checkbox" 
              id="isFinalExam" 
              checked={addExam.isFinalExam} 
              onChange={(e) => setAddExam((f) => ({ ...f, isFinalExam: e.target.checked }))} 
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="isFinalExam" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-primary-700)', cursor: 'pointer', flex: 1 }}>
              Mark as Final Exam
              <div style={{ fontSize: '12px', fontWeight: 400, color: 'var(--color-text-light)', marginTop: '2px' }}>
                Students must pass this exam to be eligible for a course certificate.
              </div>
            </label>
          </div>
        </form>
        <div className="modal-panel__foot" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
          <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="exam-form" loading={saving}>Create Exam</Button>
        </div>
      </Modal>

      <Modal open={!!rejectModalTarget} onClose={() => setRejectModalTarget(null)} title="Reject Exam">
        <div style={{ padding: '24px 0' }}>
          <p style={{ marginBottom: '16px', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
            Provide a reason for rejection. This returns the exam to DRAFT mode.
          </p>
          <Field label="Rejection Reason">
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4} />
          </Field>
        </div>
        <div className="modal-panel__foot" style={{ margin: '0 -24px -24px', padding: '16px 24px', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="outline" onClick={() => setRejectModalTarget(null)}>Cancel</Button>
          <Button variant="primary" onClick={doReject} disabled={!rejectReason.trim()}>Reject Exam</Button>
        </div>
      </Modal>
    </div>
  );
}

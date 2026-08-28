import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as programsApi from '../../api/programs';
import * as coursesApi from '../../api/courses';
import * as studentsApi from '../../api/students';
import * as semestersApi from '../../api/semesters';
import client, { buildStaticUrl } from '../../api/client';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import PageLoader from '../../components/ui/PageLoader';
import { GraduationCap, Lock, Unlock, PlayCircle, Video, Users, CheckCircle2, Calendar } from 'lucide-react';
import './CourseGrid.css';

export default function ProgramDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [program, setProgram] = useState(null);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('all');
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(null);
  const [orgZoomUrl, setOrgZoomUrl] = useState('');

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (!userId) return;

    Promise.all([
      programsApi.getById(id),
      coursesApi.list({ programId: id }),
      semestersApi.list({ programId: id }),
      studentsApi.getEnrollments(userId),
      client.get('/organizations/me').catch(() => null)
    ]).then(([progRes, courseRes, semRes, enrollRes, orgRes]) => {
      if (orgRes?.data?.data?.zoomConfig?.defaultMeetingUrl || orgRes?.data?.zoomConfig?.defaultMeetingUrl) {
        setOrgZoomUrl(orgRes.data?.data?.zoomConfig?.defaultMeetingUrl || orgRes.data?.zoomConfig?.defaultMeetingUrl);
      }
      setProgram(progRes.data || progRes);
      
      const cArr = courseRes?.data?.data || courseRes?.data || courseRes;
      setCourses(Array.isArray(cArr) ? cArr : []);
      
      const sArr = semRes?.data?.data || semRes?.data || semRes;
      setSemesters(Array.isArray(sArr) ? sArr : []);

      const eArr = enrollRes?.data?.data || enrollRes?.data || enrollRes;
      setEnrollments(Array.isArray(eArr) ? eArr : []);
      if (arguments[0] && arguments[0][4]) {
        const orgData = arguments[0][4]?.data?.data || arguments[0][4]?.data;
        if (orgData?.zoomConfig?.defaultMeetingUrl) {
          setOrgZoomUrl(orgData.zoomConfig.defaultMeetingUrl);
        }
      }
      
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load program dashboard');
      setLoading(false);
    });
  }, [id, user]);

  const handleUnlockCourse = async (courseId, price) => {
    setEnrolling(courseId);
    try {
      await client.post('/enrollments/student/enroll', {
        courseId,
        regionId: user?.regionId
      });
      toast.success('Course unlocked successfully!');
      
      const userId = user?.id || user?._id;
      const res = await studentsApi.getEnrollments(userId);
      setEnrollments(res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlock course');
    } finally {
      setEnrolling(null);
    }
  };

  if (loading) return <PageLoader />;
  if (!program) return <div>Program not found</div>;

  const programEnrollments = enrollments.filter(e => e.programId === id || e.program?.id === id || e.courseId?.programId === id);
  const completedCount = programEnrollments.filter(e => (e.progressPercentage ?? 0) >= 100).length;
  const batchEnrollment = programEnrollments.find(e => e.batch);
  const batch = batchEnrollment?.batch;

  const getDisplayDuration = () => {
    if (user?.region?.name && Array.isArray(program?.regionConfigs)) {
      const config = program.regionConfigs.find(c => c.regionName === user.region.name);
      if (config && config.customDurationYears) {
        return config.customDurationYears;
      }
    }
    return program?.maxDurationYears;
  };
  const displayDuration = getDisplayDuration();

  return (
    <div className="page" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ backgroundColor: 'var(--brand-surface)', padding: 'var(--sp-8)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="page-eyebrow">Program Dashboard</span>
          <h1 className="page-title" style={{ margin: 'var(--sp-2) 0' }}>{program.name}</h1>
          <p className="text-muted" style={{ margin: 0 }}>
            {completedCount} / {program.totalSubjects} Courses Completed
            {displayDuration && ` • Max Duration: ${displayDuration} Years`}
          </p>
          {batch && (
            <div style={{ marginTop: 'var(--sp-4)', display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-4)', background: 'var(--brand-surface-hover)', padding: 'var(--sp-2) var(--sp-4)', borderRadius: 'var(--radius-md)' }}>
              <strong>Batch: {batch.name}</strong>
              {batch.startDate && <span>• Starts: {new Date(batch.startDate).toLocaleDateString()}</span>}
              {batch.endDate && <span>• Ends: {new Date(batch.endDate).toLocaleDateString()}</span>}
            </div>
          )}
        </div>
        <GraduationCap size={48} color="var(--brand)" />
      </div>

      
      {/* LIVE VIDEO SESSIONS & ATTENDANCE BANNER */}
      <div style={{ background: '#f8faff', border: '1.5px solid #c7d2fe', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-6)', marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ width: 50, height: 50, borderRadius: '12px', background: '#4338ca', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Video size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e1b4b' }}>Live Interactive Sessions & Attendance</h3>
              <span style={{ padding: '2px 8px', background: '#dcfce7', color: '#15803d', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>25 Sessions Required</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Attend scheduled webinars, group interactions, and faculty reviews to fulfill mandatory attendance requirements.
            </p>
          </div>
        </div>
        {orgZoomUrl ? (
          <a href={orgZoomUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <Button size="md" variant="primary" icon={Video} style={{ background: '#2563eb', borderColor: '#1d4ed8' }}>
              Join Live Classroom
            </Button>
          </a>
        ) : (
          <div style={{ fontSize: '13px', color: '#64748b', background: '#fff', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            Live link will activate during class hours
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: 'var(--sp-8)', alignItems: 'flex-start' }}>
        
        {/* Removed Semester Sidebar - Now Global View Only */}
        
        {/* Courses Grid */}
        <div style={{ flex: 1 }}>
          <h2 style={{ marginBottom: 'var(--sp-4)' }}>
            All Courses in Program
          </h2>
          <div className="course-grid">
            {courses.map(course => {
              const courseId = course.id || course._id;
              const enrollment = enrollments.find(e => {
                const eid = e.courseId?.id || e.courseId?._id || e.courseId;
                return eid === courseId;
              });
              
              const isUnlocked = !!enrollment;
              const progress = enrollment?.progressPercentage || 0;
              const isCompleted = progress >= 100;

              let displayPrice = 0;
              if (course.pricing && course.pricing.isPaid) {
                displayPrice = parseFloat(course.pricing.amount) || 0;
                if (user?.regionId && course.regionalPrices?.length) {
                  let parsedPrices = course.regionalPrices;
                  if (typeof parsedPrices === 'string') {
                    try { parsedPrices = JSON.parse(parsedPrices); } catch (e) {}
                  }
                  if (Array.isArray(parsedPrices)) {
                    const rp = parsedPrices.find(p => p.regionId === user.regionId || (p.regionId && (p.regionId._id === user.regionId || p.regionId.id === user.regionId)));
                    if (rp) displayPrice = parseFloat(rp.price) || 0;
                  }
                }
              }

              return (
                <div key={courseId} className="course-card" style={{ opacity: isUnlocked ? 1 : 0.85, cursor: 'default' }}>
                  <div className="course-card__thumb" style={{ backgroundImage: course.thumbnailUrl ? `url('${buildStaticUrl(course.thumbnailUrl)}')` : undefined }}>
                    {!course.thumbnailUrl && <GraduationCap size={28} />}
                    
                    {isUnlocked ? (
                      <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--color-success-500)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Unlock size={14} /> Unlocked
                      </div>
                    ) : (
                      <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', backdropFilter: 'blur(4px)' }}>
                        <Lock size={14} /> Locked
                      </div>
                    )}
                  </div>
                  
                  <div className="course-card__body">
                    <h3 style={{ margin: '0 0 8px 0' }}>{course.title}</h3>
                    
                    {isUnlocked ? (
                      <div className="course-card__progress" style={{ marginTop: 'auto' }}>
                        <div className="course-card__progress-bar"><span style={{ width: `${progress}%` }} /></div>
                        <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-2xs)', color: 'var(--text-muted)' }}>
                          <span>{progress}% complete</span>
                          {isCompleted && <span style={{ color: 'var(--color-success-600)', fontWeight: 600 }}>Completed</span>}
                        </div>
                        <Link to={`/student/my-courses/${courseId}/learn`} style={{ width: '100%', marginTop: '12px' }}>
                          <Button style={{ width: '100%' }} variant={isCompleted ? 'outline' : 'primary'} size="sm" icon={PlayCircle}>
                            {isCompleted ? 'Review Course' : (progress > 0 ? 'Resume Course' : 'Start Course')}
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                        <Button 
                          style={{ width: '100%' }} 
                          variant="primary" 
                          size="sm" 
                          icon={Unlock}
                          onClick={() => handleUnlockCourse(courseId, displayPrice)}
                          loading={enrolling === courseId}
                        >
                          Unlock for {displayPrice > 0 ? `$${displayPrice.toFixed(2)}` : 'Free'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

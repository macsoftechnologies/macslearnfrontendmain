import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, AlertTriangle, AlertOctagon, GraduationCap, 
  BookOpen, CheckCircle2, ArrowRight, User, Filter, RefreshCw, FileDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import client from '../../api/client';
import * as studentsApi from '../../api/students';
import * as programsApi from '../../api/programs';
import * as enrollmentsApi from '../../api/enrollments';
import { StatCard } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import SearchBar from '../../components/ui/SearchBar';
import PageLoader from '../../components/ui/PageLoader';
import EmptyState from '../../components/ui/EmptyState';

export default function ProgramExpiryReport({ userRole = 'ORG_USER' }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('nearing'); // 'nearing' | 'expired'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nearingStudents, setNearingStudents] = useState([]);
  const [expiredStudents, setExpiredStudents] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('ALL');
  const [programsList, setProgramsList] = useState([]);

  const isFaculty = userRole === 'FACULTY' || user?.role === 'FACULTY' || user?.userType === 'FACULTY';
  const profileBasePath = isFaculty ? '/faculty/students' : '/admin/students';

  const fetchData = async () => {
    try {
      // 1. Fetch programs list for filter dropdown
      const progRes = await programsApi.list({ limit: 100 }).catch(() => ({ data: [] }));
      const progs = Array.isArray(progRes.data) ? progRes.data : (progRes.data?.data || []);
      setProgramsList(progs);

      const progsMap = {};
      progs.forEach(p => {
        progsMap[p.id || p._id] = p;
      });

      // 2. Fetch all enrollments
      const enrollRes = await enrollmentsApi.list({ limit: 500 }).catch(() => ({ data: { data: [] } }));
      const allEnrollments = Array.isArray(enrollRes.data?.data) ? enrollRes.data.data : (Array.isArray(enrollRes.data) ? enrollRes.data : []);

      // 3. Fetch all students for metadata
      const studRes = await studentsApi.list({ limit: 500 }).catch(() => ({ data: { data: [] } }));
      const allStudents = Array.isArray(studRes.data?.data) ? studRes.data.data : (Array.isArray(studRes.data) ? studRes.data : []);
      const studentsMap = {};
      allStudents.forEach(s => {
        studentsMap[s.id || s._id] = s;
      });

      // Group enrollments by student + program
      // Separate program umbrella enrollments vs course enrollments
      const programEnrollments = allEnrollments.filter(e => e.programId && !e.courseId);
      const courseEnrollments = allEnrollments.filter(e => e.programId && e.courseId);

      const now = new Date();
      const nearingList = [];
      const expiredList = [];

      // Process each program enrollment
      programEnrollments.forEach(pe => {
        const studentId = pe.studentId?._id || pe.studentId?.id || pe.studentId || pe.student?.id || pe.student?._id;
        const student = (typeof pe.student === 'object' && pe.student?.fullName) 
          ? pe.student 
          : ((typeof pe.studentId === 'object' && pe.studentId?.fullName) 
              ? pe.studentId 
              : (studentsMap[studentId] || {}));
        const program = pe.program || progsMap[pe.programId] || { name: 'Degree Program', totalSubjects: 30 };
        const totalSubjects = program.totalSubjects || 30;

        // Calculate completed courses for this student in this program
        const studentCourseEnrollments = courseEnrollments.filter(ce => {
          const ceStudentId = ce.studentId?._id || ce.studentId?.id || ce.studentId || ce.student?.id || ce.student?._id;
          return ceStudentId === studentId && (ce.programId === pe.programId || ce.program?.id === pe.programId);
        });

        const completedCourses = studentCourseEnrollments.filter(ce => ce.status === 'COMPLETED' || (ce.progressPercentage || 0) >= 100).length;
        const remainingCourses = Math.max(0, totalSubjects - completedCourses);
        const progressPercentage = totalSubjects > 0 ? Math.round((completedCourses / totalSubjects) * 100) : 0;

        // Determine expiration date
        const expDateRaw = pe.expectedGraduationDate || pe.program?.expectedGraduationDate || pe.batch?.endDate || pe.expiresAt;
        if (!expDateRaw) return;

        const expDate = new Date(expDateRaw);
        const diffMs = expDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        const item = {
          id: pe.id || pe._id,
          studentId: studentId,
          studentName: student.fullName || 'Student',
          email: student.email || '—',
          mobile: student.mobile || '—',
          programId: pe.programId,
          programName: program.name || 'Program',
          degreeTitle: program.degreeTitle || 'Degree',
          batchName: pe.batch?.name || pe.batchName || 'Rolling Admission',
          expectedGraduationDate: expDate,
          daysRemaining: daysRemaining,
          completedCourses: completedCourses,
          remainingCourses: remainingCourses,
          totalSubjects: totalSubjects,
          progressPercentage: progressPercentage,
          status: pe.status || (daysRemaining < 0 ? 'EXPIRED' : 'ACTIVE'),
        };

        // Don't flag students who already completed 100% of the program!
        if (completedCourses >= totalSubjects) {
          return;
        }

        if (daysRemaining < 0 || pe.status === 'EXPIRED') {
          expiredList.push(item);
        } else if (daysRemaining <= 10) {
          nearingList.push(item);
        }
      });

      // Sort: nearing by least days remaining first, expired by most recently expired first
      nearingList.sort((a, b) => a.daysRemaining - b.daysRemaining);
      expiredList.sort((a, b) => b.daysRemaining - a.daysRemaining);

      setNearingStudents(nearingList);
      setExpiredStudents(expiredList);
    } catch (err) {
      console.error('Failed to load program expiry report:', err);
      toast.error('Failed to load expiry report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-sync when switching back to Program Expiry tab
    const handleFocus = () => {
      fetchData();
    };
    window.addEventListener('focus', handleFocus);

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [userRole]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Filtered by Search & Program
  const activeList = tab === 'nearing' ? nearingStudents : expiredStudents;

  const filteredList = useMemo(() => {
    return activeList.filter(item => {
      const matchSearch = !search || 
        item.studentName.toLowerCase().includes(search.toLowerCase()) ||
        item.email.toLowerCase().includes(search.toLowerCase()) ||
        item.programName.toLowerCase().includes(search.toLowerCase()) ||
        item.batchName.toLowerCase().includes(search.toLowerCase());

      const matchProgram = selectedProgram === 'ALL' || item.programId === selectedProgram;

      return matchSearch && matchProgram;
    });
  }, [activeList, search, selectedProgram]);

  const exportToCsv = () => {
    if (filteredList.length === 0) {
      toast.error('No records available to export');
      return;
    }
    
    const headers = [
      'Student Name', 'Email', 'Mobile', 'Program Name', 'Degree Title', 
      'Batch Name', 'Completed Courses', 'Remaining Courses', 'Total Subjects', 
      'Progress %', 'Deadline Date', tab === 'nearing' ? 'Days Remaining' : 'Days Overdue', 'Status'
    ];
    
    const csvRows = [
      headers.join(','),
      ...filteredList.map(item => [
        `"${(item.studentName || '').replace(/"/g, '""')}"`,
        `"${(item.email || '').replace(/"/g, '""')}"`,
        `"${(item.mobile || '').replace(/"/g, '""')}"`,
        `"${(item.programName || '').replace(/"/g, '""')}"`,
        `"${(item.degreeTitle || '').replace(/"/g, '""')}"`,
        `"${(item.batchName || '').replace(/"/g, '""')}"`,
        item.completedCourses,
        item.remainingCourses,
        item.totalSubjects,
        `"${item.progressPercentage}%"`,
        `"${item.expectedGraduationDate.toLocaleDateString()}"`,
        tab === 'nearing' ? item.daysRemaining : Math.abs(item.daysRemaining),
        `"${item.status}"`
      ].join(','))
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `program_expiry_${tab}_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported to CSV!');
  };

  if (loading) return <PageLoader />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Academics & Compliance</span>
          <h1 className="page-title">Program Expiration Management</h1>
          <p className="page-subtitle">
            Track students approaching their program duration deadline or whose access has expired.
          </p>
        </div>
        <div className="row" style={{ gap: 'var(--sp-3)' }}>
          <Button 
            variant="outline" 
            size="sm" 
            icon={FileDown} 
            onClick={exportToCsv}
          >
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            icon={RefreshCw} 
            loading={refreshing} 
            onClick={handleRefresh}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid-stats">
        <StatCard 
          label="Nearing Expiry (≤ 10 Days)" 
          value={nearingStudents.length} 
          icon={Clock} 
          tone={nearingStudents.length > 0 ? "amber" : "sage"} 
        />
        <StatCard 
          label="Critical (≤ 3 Days Left)" 
          value={nearingStudents.filter(s => s.daysRemaining <= 3 && s.daysRemaining >= 0).length} 
          icon={AlertTriangle} 
          tone={nearingStudents.some(s => s.daysRemaining <= 3 && s.daysRemaining >= 0) ? "crimson" : "sky"} 
        />
        <StatCard 
          label="Expired Programs" 
          value={expiredStudents.length} 
          icon={AlertOctagon} 
          tone={expiredStudents.length > 0 ? "crimson" : "sage"} 
        />
        <StatCard 
          label="Avg. Completion (Nearing)" 
          value={
            nearingStudents.length > 0 
              ? `${Math.round(nearingStudents.reduce((acc, s) => acc + s.progressPercentage, 0) / nearingStudents.length)}%` 
              : '100%'
          } 
          icon={GraduationCap} 
          tone="ink" 
        />
      </div>

      {/* TABS */}
      <Tabs
        tabs={[
          { 
            key: 'nearing', 
            label: 'Nearing Expiration (≤ 10 Days)', 
            count: nearingStudents.length > 0 ? nearingStudents.length : undefined 
          },
          { 
            key: 'expired', 
            label: 'Expired Programs', 
            count: expiredStudents.length > 0 ? expiredStudents.length : undefined 
          },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* SEARCH AND FILTERS */}
      <div className="row" style={{ marginBottom: 'var(--sp-4)', gap: 'var(--sp-4)', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <SearchBar 
            value={search} 
            onChange={setSearch} 
            placeholder="Search by student name, email, program, or batch..." 
          />
        </div>
        {programsList.length > 0 && (
          <div style={{ minWidth: 220 }}>
            <select 
              value={selectedProgram} 
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="input-select"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                fontSize: 'var(--fs-sm)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="ALL">All Programs</option>
              {programsList.map(p => (
                <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* DATA TABLE */}
      {tab === 'nearing' ? (
        <DataTable
          columns={[
            {
              key: 'student',
              header: 'Student',
              render: (r) => (
                <div>
                  <Link 
                    to={`${profileBasePath}/${r.studentId}`} 
                    style={{ fontWeight: 600, color: 'var(--brand)', textDecoration: 'none' }}
                  >
                    {r.studentName}
                  </Link>
                  <div className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>{r.email}</div>
                </div>
              )
            },
            {
              key: 'program',
              header: 'Program & Cohort',
              render: (r) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{r.programName}</div>
                  <div className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>Batch: {r.batchName}</div>
                </div>
              )
            },
            {
              key: 'coursesStatus',
              header: 'Course Completion Status',
              render: (r) => (
                <div style={{ minWidth: 160 }}>
                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-xs)', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {r.completedCourses} / {r.totalSubjects} Done
                    </span>
                    <span style={{ color: 'var(--color-danger-600)', fontWeight: 600 }}>
                      {r.remainingCourses} Left
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${r.progressPercentage}%`, 
                        height: '100%', 
                        background: r.progressPercentage > 75 ? '#22c55e' : r.progressPercentage > 40 ? '#f59e0b' : '#ef4444' 
                      }} 
                    />
                  </div>
                </div>
              )
            },
            {
              key: 'deadline',
              header: 'Deadline Date',
              render: (r) => (
                <div>
                  <div>{r.expectedGraduationDate.toLocaleDateString()}</div>
                  <div className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>
                    End of duration
                  </div>
                </div>
              )
            },
            {
              key: 'daysRemaining',
              header: 'Time Remaining',
              render: (r) => {
                const isVeryUrgent = r.daysRemaining <= 3;
                return (
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--fs-xs)',
                      fontWeight: 700,
                      backgroundColor: isVeryUrgent ? '#fee2e2' : '#fef3c7',
                      color: isVeryUrgent ? '#991b1b' : '#92400e',
                      border: `1px solid ${isVeryUrgent ? '#f87171' : '#fcd34d'}`
                    }}
                  >
                    {isVeryUrgent ? <AlertTriangle size={13} /> : <Clock size={13} />}
                    {r.daysRemaining === 0 ? 'Expires Today!' : `${r.daysRemaining} days left`}
                  </span>
                );
              }
            },
            {
              key: 'action',
              header: 'Action',
              render: (r) => (
                <Link to={`${profileBasePath}/${r.studentId}`}>
                  <Button size="sm" variant="outline" icon={ArrowRight}>
                    View Profile
                  </Button>
                </Link>
              )
            }
          ]}
          rows={filteredList}
          emptyLabel="No students are nearing their program expiration deadline. All on track!"
        />
      ) : (
        <DataTable
          columns={[
            {
              key: 'student',
              header: 'Student',
              render: (r) => (
                <div>
                  <Link 
                    to={`${profileBasePath}/${r.studentId}`} 
                    style={{ fontWeight: 600, color: 'var(--brand)', textDecoration: 'none' }}
                  >
                    {r.studentName}
                  </Link>
                  <div className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>{r.email}</div>
                </div>
              )
            },
            {
              key: 'program',
              header: 'Program & Cohort',
              render: (r) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{r.programName}</div>
                  <div className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>Batch: {r.batchName}</div>
                </div>
              )
            },
            {
              key: 'completion',
              header: 'Completed at Expiry',
              render: (r) => (
                <div style={{ minWidth: 160 }}>
                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-xs)', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: '#166534' }}>
                      {r.completedCourses} Completed
                    </span>
                    <span style={{ color: '#991b1b', fontWeight: 600 }}>
                      {r.remainingCourses} Incomplete
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#fee2e2', borderRadius: 999, overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${r.progressPercentage}%`, 
                        height: '100%', 
                        background: '#dc2626' 
                      }} 
                    />
                  </div>
                </div>
              )
            },
            {
              key: 'expiredOn',
              header: 'Expired On',
              render: (r) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{r.expectedGraduationDate.toLocaleDateString()}</div>
                  <div className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>
                    {Math.abs(r.daysRemaining)} days ago
                  </div>
                </div>
              )
            },
            {
              key: 'status',
              header: 'Status',
              render: () => (
                <span 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--fs-xs)',
                    fontWeight: 700,
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #f87171'
                  }}
                >
                  <AlertOctagon size={13} />
                  EXPIRED
                </span>
              )
            },
            {
              key: 'action',
              header: 'Action',
              render: (r) => (
                <Link to={`${profileBasePath}/${r.studentId}`}>
                  <Button size="sm" variant="outline" icon={ArrowRight}>
                    View Records
                  </Button>
                </Link>
              )
            }
          ]}
          rows={filteredList}
          emptyLabel="No expired programs found."
        />
      )}
    </div>
  );
}

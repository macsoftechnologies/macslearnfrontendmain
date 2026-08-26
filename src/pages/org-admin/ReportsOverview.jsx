import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { GraduationCap, BookOpen, Wallet, TrendingUp, Trophy } from 'lucide-react';
import * as reportsApi from '../../api/reports';
import { StatCard, Card } from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import ReportTabs from './ReportTabs';

const PIE_COLORS = ['url(#colorActive)', 'url(#colorPending)'];

export default function ReportsOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.overview().then((res) => setData(res.data?.data || {})).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const enrollmentTrend = data?.enrollmentTrend || [];
  const statusBreakdown = [
    { name: 'Active', value: data?.activeStudents || 0 },
    { name: 'Pending', value: data?.pendingApprovals || 0 },
  ];
  
  const topCourses = data?.topCourses || [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Analytics</span>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Organization performance at a glance.</p>
        </div>
      </div>

      <ReportTabs />

      <div className="grid-stats" style={{ marginBottom: 'var(--sp-6)' }}>
        <StatCard label="Total Students" value={data?.totalStudents ?? '—'} icon={GraduationCap} tone="ink" />
        <StatCard label="Total Courses" value={data?.totalCourses ?? '—'} icon={BookOpen} tone="sky" />
        <StatCard label="Completion Rate" value={data?.completionRate != null ? `${data.completionRate}%` : '—'} icon={TrendingUp} tone="sage" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--sp-5)', alignItems: 'start' }}>
        
        <Card style={{ padding: 'var(--sp-6)', height: '100%' }}>
          <div style={{ marginBottom: 'var(--sp-6)' }}>
            <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600 }}>Enrollment Trend</h3>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Student enrollments over the last 6 months</p>
          </div>
          {enrollmentTrend.length === 0 ? (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p className="text-muted">No trend data available yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={enrollmentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'var(--bg-muted)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <div className="stack" style={{ gap: 'var(--sp-5)' }}>
          <Card style={{ padding: 'var(--sp-6)' }}>
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600 }}>Student Status</h3>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Active vs Pending users</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <defs>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>
                <Pie 
                  data={statusBreakdown} 
                  dataKey="value" 
                  nameKey="name" 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={5}
                  stroke="none"
                >
                  {statusBreakdown.map((entry, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="row" style={{ justifyContent: 'center', gap: 'var(--sp-4)' }}>
              <div className="row" style={{ gap: 6, fontSize: 'var(--fs-sm)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }}></div>
                Active ({statusBreakdown[0].value})
              </div>
              <div className="row" style={{ gap: 6, fontSize: 'var(--fs-sm)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }}></div>
                Pending ({statusBreakdown[1].value})
              </div>
            </div>
          </Card>

          <Card style={{ padding: 'var(--sp-6)' }}>
            <div className="row" style={{ marginBottom: 'var(--sp-4)', gap: 'var(--sp-2)' }}>
              <Trophy size={18} style={{ color: 'var(--color-amber-500)' }} />
              <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600 }}>Top Performers</h3>
            </div>
            
            {topCourses.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>No course data available.</p>
            ) : (
              <div className="stack" style={{ gap: 'var(--sp-3)' }}>
                {topCourses.map((course, i) => (
                  <div key={course.id} className="row" style={{ justifyContent: 'space-between', paddingBottom: 'var(--sp-3)', borderBottom: i < topCourses.length -1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div className="row" style={{ gap: 'var(--sp-3)' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {i + 1}
                      </div>
                      <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>
                        {course.title}
                      </span>
                    </div>
                    <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--color-primary-600)', background: 'var(--color-primary-50)', padding: '2px 8px', borderRadius: 12 }}>
                      {course.enrollments} enrolls
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

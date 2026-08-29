import {
  LayoutDashboard, MessageSquare, Video, Calendar, Building2, CreditCard, ScrollText, Users, GraduationCap,
  BookOpen, FolderTree, ClipboardList, Wallet, BarChart3, Settings,
  FileCheck2, PenSquare, MessagesSquare, Compass, Library, Award, Receipt, UserCircle, Shield, Clock
} from 'lucide-react';

export const NAV = {
  SUPER_ADMIN: [
    { to: '/super-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/super-admin/organizations', label: 'Organizations', icon: Building2, requiredPermissions: ['TRACK_ORGANIZATIONS'] },
    { to: '/super-admin/organizations?filter=pending', label: 'Pending Approvals', icon: ClipboardList, requiredPermissions: ['TRACK_ORGANIZATIONS'] },
    { to: '/super-admin/organizations?filter=rejected', label: 'Rejected Applications', icon: FileCheck2, requiredPermissions: ['TRACK_ORGANIZATIONS'] },
    { to: '/super-admin/organizations?filter=expiring', label: 'Expired/Expiring', icon: ScrollText, requiredPermissions: ['TRACK_ORGANIZATIONS'] },
    { to: '/super-admin/regions', label: 'Global Regions', icon: Compass, requiredPermissions: ['TRACK_ORGANIZATIONS'] },
    { to: '/super-admin/subscription-plans', label: 'Subscription Plans', icon: CreditCard, requiredPermissions: ['TRACK_ORGANIZATIONS'] },
    { to: '/super-admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
    { to: '/super-admin/payments', label: 'Payments', icon: Wallet, requiredPermissions: ['TRACK_FINANCE'] },
    { to: '/super-admin/users', label: 'All Users', icon: Users, requiredPermissions: ['TRACK_USERS'] },
    { to: '/super-admin/students', label: 'Students', icon: GraduationCap, requiredPermissions: ['TRACK_STUDENTS'] },
    { to: '/super-admin/team', label: 'Team', icon: Shield, requiredPermissions: ['MANAGE_ROLES'] },
  ],
  ORG_USER: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, requiredPermissions: ['MANAGE_CONTENT', 'MANAGE_USERS', 'ALL'] },
    
    // Curriculum & Academics
    { to: '/admin/programs', label: 'Programs & Degrees', icon: GraduationCap },
    { to: '/admin/semesters', label: 'Semesters', icon: Calendar },
    { to: '/admin/courses', label: 'Course Catalog', icon: BookOpen },
    { to: '/admin/live-sessions', label: 'Live Sessions & Attendance', icon: Video },
    { to: '/admin/chat', label: 'Messages & Discussions', icon: MessageSquare },
    { to: '/admin/batches', label: 'Cohorts / Batches', icon: FolderTree },
    { to: '/admin/certificate-templates', label: 'Certificate Templates', icon: Award },
    
    // Users & Roles
    { to: '/admin/students', label: 'Students', icon: GraduationCap, requiredPermissions: ['MANAGE_USERS', 'ALL'] },
    { to: '/admin/faculty', label: 'Faculty', icon: Users, requiredPermissions: ['MANAGE_USERS', 'ALL'] },
    { to: '/admin/team', label: 'Admins & Team', icon: Shield },
    
    // Enrollment & Records
    { to: '/admin/enrollments', label: 'Enrollments', icon: ClipboardList },
    { to: '/admin/program-expiry', label: 'Program Expiry', icon: Clock },
    { to: '/admin/approvals', label: 'Content Approvals', icon: FileCheck2, requiredPermissions: ['MANAGE_CONTENT', 'ALL'] },
    { to: '/admin/grades', label: 'Grades & Transcripts', icon: ScrollText },
    { to: '/admin/dmin-evaluations', label: 'D.Min Evaluations', icon: Award },
    
    // Finance & Operations
    { to: '/admin/payments', label: 'Payments', icon: Wallet },
    { to: '/admin/regions', label: 'Regions & Pricing', icon: Compass },
    { to: '/admin/reports/overview', label: 'Reports', icon: BarChart3 },
    
    // System
    { to: '/admin/settings/organization', label: 'Settings', icon: Settings },
  ],
  FACULTY: [
    { to: '/faculty/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/faculty/courses', label: 'My Courses', icon: BookOpen },
    { to: '/faculty/live-sessions', label: 'Live Sessions & Attendance', icon: Video },
    { to: '/faculty/chat', label: 'Messages & Discussions', icon: MessageSquare },
    { to: '/faculty/grading-queue', label: 'Grading Queue', icon: ClipboardList },
    { to: '/faculty/program-expiry', label: 'Program Expiry', icon: Clock },
    { to: '/faculty/profile', label: 'Profile', icon: UserCircle },
  ],
  STUDENT: [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/programs', label: 'Browse Programs', icon: GraduationCap },
    { to: '/student/my-courses', label: 'My Courses', icon: Library },
    { to: '/student/live-sessions', label: 'Live Sessions & Schedule', icon: Video },
    { to: '/student/chat', label: 'Messages & Classmates', icon: MessageSquare },
    { to: '/student/results', label: 'Results', icon: FileCheck2 },
    { to: '/student/certificates', label: 'Certificates', icon: Award },
    { to: '/student/payments', label: 'Payments', icon: Receipt },
    { to: '/student/profile', label: 'Profile', icon: UserCircle },
  ],
  FINANCE: [
    { to: '/finance/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/finance/payments', label: 'Payments', icon: Wallet },
    { to: '/finance/reports/overview', label: 'Reports', icon: BarChart3 },
    { to: '/finance/profile', label: 'Profile', icon: UserCircle },
  ],
};

export const ROLE_LABEL = {
  SUPER_ADMIN: 'Super Admin',
  ORG_USER: 'Org Admin',
  FACULTY: 'Faculty',
  STUDENT: 'Student',
  FINANCE: 'Finance',
};

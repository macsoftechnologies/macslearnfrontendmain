import { useState, useEffect } from 'react';
import { Plus, Search, Mail, Phone, MoreVertical, Shield, Edit, Power, Download } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Input, { Field } from '../../components/ui/Input';
import Toggle from '../../components/ui/Toggle';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import PageLoader from '../../components/ui/PageLoader';
import { useAuth } from '../../contexts/AuthContext';
import { exportToCSV } from '../../utils/export';
import './Team.css';

const PERMISSIONS_LIST = [
  { id: 'TRACK_FINANCE', label: 'Tracking Finance' },
  { id: 'TRACK_ORGANIZATIONS', label: 'Tracking Organizations' },
  { id: 'TRACK_USERS', label: 'Tracking Users' },
  { id: 'TRACK_STUDENTS', label: 'Tracking Students' },
  { id: 'MANAGE_ROLES', label: 'Managing Roles' },
];

export default function SuperAdminTeam() {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    mobile: '',
    modulePermissions: [],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, [page, search]);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/super-admin-team?page=${page}&limit=10&search=${search}`);
      setTeam(res.data.data);
      setTotalPages(res.data.meta.totalPages);
    } catch (error) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editId) {
        await api.patch(`/users/super-admin-team/${editId}`, {
          fullName: formData.fullName,
          mobile: formData.mobile,
          modulePermissions: formData.modulePermissions
        });
        toast.success('Team member updated successfully');
      } else {
        await api.post('/users/super-admin-team', formData);
        toast.success('Team member created successfully');
      }
      setIsModalOpen(false);
      setFormData({
        fullName: '',
        email: '',
        password: '',
        mobile: '',
        modulePermissions: [],
      });
      setEditId(null);
      fetchTeam();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save team member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (member) => {
    setEditId(member._id || member.id);
    setFormData({
      fullName: member.fullName || '',
      email: member.email || '',
      password: '', // Leave empty for edit
      mobile: member.mobile || '',
      modulePermissions: member.modulePermissions || [],
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (member) => {
    const nextStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/users/super-admin-team/${member._id || member.id}/status`, { status: nextStatus });
      toast.success(`Team member ${nextStatus.toLowerCase()}`);
      fetchTeam();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };


  const handleTogglePermission = (permId) => {
    setFormData(prev => {
      const perms = prev.modulePermissions.includes(permId)
        ? prev.modulePermissions.filter(p => p !== permId)
        : [...prev.modulePermissions, permId];
      return { ...prev, modulePermissions: perms };
    });
  };

  if (!user.permissions?.includes('MANAGE_ROLES') && user.modulePermissions?.length > 0) {
     // Optional: You can choose to lock them out completely if they don't have MANAGE_ROLES
     // For simplicity, we just won't render if we used a higher level guard, but here's a fallback
  }

  if (loading && team.length === 0) return <PageLoader />;

  return (
    <div className="super-admin-team page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Super Admin Team</h1>
          <p className="page-subtitle">Manage your global team members and their access permissions.</p>
        </div>
        <div className="page-actions">
          <Button variant="outline" icon={Download} onClick={() => exportToCSV(team, 'SuperAdminTeam')}>
            Export CSV
          </Button>
          {(!user.permissions || user.permissions.length === 0 || user.permissions.includes('MANAGE_ROLES')) && (
            <Button icon={Plus} onClick={() => {
              setEditId(null);
              setFormData({
                fullName: '',
                email: '',
                password: '',
                mobile: '',
                modulePermissions: [],
              });
              setIsModalOpen(true);
            }}>
              Add Team Member
            </Button>
          )}
        </div>
      </div>

      <div className="card list-controls">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            id="team-search"
            name="teamSearch"
            type="text"
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={[
            {
              key: 'member',
              header: 'Member Name',
              render: (m) => (
                <div className="user-info">
                  <div className="user-avatar">{m.fullName?.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="user-name" style={{ fontWeight: 500, color: 'var(--text-h)' }}>{m.fullName}</div>
                    <div className="user-type" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{m.userType}</div>
                  </div>
                </div>
              ),
            },
            {
              key: 'contact',
              header: 'Contact Info',
              render: (m) => (
                <div className="contact-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> {m.email}</span>
                  {m.mobile && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {m.mobile}</span>}
                </div>
              ),
            },
            {
              key: 'permissions',
              header: 'Permissions',
              render: (m) => (
                <div className="permissions-badges">
                  {!m.modulePermissions || m.modulePermissions.length === 0 ? (
                    <span className="badge badge--gray" style={{ background: 'var(--border)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>Full Access</span>
                  ) : (
                    m.modulePermissions.map(p => (
                      <span key={p} className="badge badge--primary" title={p} style={{ background: 'var(--accent-bg)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                        {PERMISSIONS_LIST.find(pl => pl.id === p)?.label || p}
                      </span>
                    ))
                  )}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (m) => <StatusBadge status={m.status} />,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (m) => {
                const canManageRoles = !user.permissions || user.permissions.length === 0 || user.permissions.includes('MANAGE_ROLES');
                if (!canManageRoles) return <span className="text-muted" style={{ fontSize: '12px' }}>Read Only</span>;
                
                return (
                  <div className="row" style={{ gap: 6 }}>
                    <Button size="sm" variant="ghost" icon={Edit} onClick={() => handleEdit(m)}>Edit</Button>
                    <Button size="sm" variant="outline" icon={Power} onClick={() => handleToggleStatus(m)}>
                      {m.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                );
              },
            },
          ]}
          rows={team}
          loading={loading}
          emptyLabel="No team members found."
        />
        {totalPages > 1 && (
          <div className="pagination-wrapper" style={{ padding: 'var(--sp-4)', borderTop: '1px solid var(--border)' }}>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editId ? "Edit Team Member" : "Add Team Member"}
        description={editId ? "Update permissions and details" : "Invite a new member to the Super Admin team."}
      >
        <form onSubmit={handleSubmit} className="stack" style={{ gap: 'var(--sp-6)', marginTop: 'var(--sp-4)' }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
            <Field label="Full Name" required>
              <Input 
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
                placeholder="John Doe"
                required
              />
            </Field>
            <Field label="Email Address" required>
              <Input 
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="john@example.com"
                required
                disabled={!!editId}
              />
            </Field>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
            <Field label="Password" required={!editId}>
              <Input 
                type="password"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                placeholder={editId ? "Leave blank to keep unchanged" : "••••••••"}
                required={!editId}
              />
            </Field>
            <Field label="Mobile Number (Optional)">
              <Input
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </Field>
          </div>

          <div className="permissions-section">
            <h4><Shield size={16} /> Assign Permissions</h4>
            <p className="permissions-help">Select the specific access areas for this team member.</p>
            <div className="toggles-grid">
              {PERMISSIONS_LIST.map((perm) => (
                <Toggle
                  key={perm.id}
                  label={perm.label}
                  checked={formData.modulePermissions.includes(perm.id)}
                  onChange={() => handleTogglePermission(perm.id)}
                />
              ))}
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--sp-3)', paddingTop: 'var(--sp-4)', borderTop: '1px solid var(--border)' }}>
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editId ? 'Save Changes' : 'Send Invite'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, UserCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import * as usersApi from '../../api/users';
import * as authApi from '../../api/auth';
import { extractErrorMessages, buildStaticUrl } from '../../api/client';
import Input, { Field } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import FileUploader from '../../components/ui/FileUploader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const getAvatar = (u) => {
    if (!u) return '';
    if (u.avatarUrl) return u.avatarUrl; // just in case
    let cp = u.customProfile;
    if (typeof cp === 'string') {
      try { cp = JSON.parse(cp); } catch(e) {}
    }
    return cp?.documents?.photo || '';
  };

  const [tab, setTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ 
    fullName: user?.fullName || '', 
    mobile: user?.mobile || '', 
    avatarUrl: getAvatar(user)
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmProfileOpen, setConfirmProfileOpen] = useState(false);
  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);

  // Update effect to refresh form when user context changes
  useEffect(() => {
    if (!isEditing) {
      setForm({
        fullName: user?.fullName || '', 
        mobile: user?.mobile || '', 
        avatarUrl: getAvatar(user)
      });
    }
  }, [user, isEditing]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));
  const updatePw = (k) => (e) => setPwForm((f) => ({ ...f, [k]: e.target.value }));

  const saveProfile = async () => {
    setErrors({});
    setSaving(true);
    setConfirmProfileOpen(false);
    try {
      const payload = { ...form };
      if (payload.avatarUrl) {
        let cp = user.customProfile;
        if (typeof cp === 'string') {
          try { cp = JSON.parse(cp); } catch(e) {}
        }
        payload.customProfile = {
          ...(cp || {}),
          documents: {
            ...(cp?.documents || {}),
            photo: payload.avatarUrl
          }
        };
      }
      await usersApi.updateMe(payload);
      updateUser(payload);
      setIsEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      const msgs = extractErrorMessages(err);
      toast.error(msgs.join(', '));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setForm({ 
      fullName: user?.fullName || '', 
      mobile: user?.mobile || '', 
      avatarUrl: getAvatar(user)
    });
  };

  const savePassword = async () => {
    setErrors({});
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setErrors({ confirmPassword: 'New password and confirmation do not match.' });
      setConfirmPasswordOpen(false);
      return;
    }
    setSaving(true);
    setConfirmPasswordOpen(false);
    try {
      await authApi.changePassword({
        old_password: pwForm.currentPassword,
        new_password: pwForm.newPassword
      });
      toast.success('Password changed');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msgs = extractErrorMessages(err);
      toast.error(msgs.join(', '));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Account</span>
          <h1 className="page-title">My Profile</h1>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'profile', label: 'Profile', icon: UserCircle },
          { key: 'security', label: 'Security', icon: KeyRound },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'profile' ? (
        <Card style={{ padding: 'var(--sp-6)' }}>
          <form className="stack" onSubmit={(e) => { e.preventDefault(); setConfirmProfileOpen(true); }}>
            
            {isEditing ? (
              <Field label="Profile Photo">
                <FileUploader isPublic={true} accept={{ 'image/*': [] }} preview={form.avatarUrl} onUploaded={(url) => update('avatarUrl')(url)} label="Upload a profile photo" />
              </Field>
            ) : (
              <Field label="Profile Photo">
                {form.avatarUrl ? (
                  <img src={buildStaticUrl(form.avatarUrl)} alt="Profile" style={{ width: 80, height: 80, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCircle size={32} color="var(--text-muted)" />
                  </div>
                )}
              </Field>
            )}

            <Field label="Full Name" required><Input value={form.fullName} onChange={update('fullName')} required disabled={!isEditing} /></Field>
            <Field label="Email"><Input value={user?.email || ''} disabled /></Field>
            <Field label="Mobile"><Input type="tel" value={form.mobile} onChange={(e) => { e.target.value = e.target.value.replace(/[^0-9+\-\s()]/g, ''); update('mobile')(e); }} disabled={!isEditing} /></Field>
            
            <div className="row" style={{ justifyContent: 'flex-end', gap: '10px' }}>
              {!isEditing ? (
                <Button type="button" onClick={() => setIsEditing(true)}>Edit Profile</Button>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                  <Button type="submit" loading={saving}>Save Changes</Button>
                </>
              )}
            </div>
          </form>
        </Card>
      ) : (
        <Card style={{ padding: 'var(--sp-6)' }}>
          <form className="stack" onSubmit={(e) => { e.preventDefault(); setConfirmPasswordOpen(true); }}>
            <Field label="Current Password" required error={errors.currentPassword}><Input type="password" value={pwForm.currentPassword} onChange={updatePw('currentPassword')} required /></Field>
            <Field label="New Password" required hint="At least 8 characters" error={errors.newPassword}><Input type="password" value={pwForm.newPassword} onChange={updatePw('newPassword')} required /></Field>
            <Field label="Confirm New Password" required error={errors.confirmPassword}><Input type="password" value={pwForm.confirmPassword} onChange={updatePw('confirmPassword')} required /></Field>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button type="submit" loading={saving}>Update Password</Button>
            </div>
          </form>
        </Card>
      )}

      <ConfirmDialog
        open={confirmProfileOpen}
        onClose={() => setConfirmProfileOpen(false)}
        onConfirm={saveProfile}
        title="Update Profile?"
        description="Are you sure you want to save these changes to your profile?"
        confirmLabel="Save Changes"
      />

      <ConfirmDialog
        open={confirmPasswordOpen}
        onClose={() => setConfirmPasswordOpen(false)}
        onConfirm={savePassword}
        title="Change Password?"
        description="Are you sure you want to change your password? You will need to use the new password on your next login."
        confirmLabel="Update Password"
      />
    </div>
  );
}


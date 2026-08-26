import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import * as organizationsApi from '../../api/organizations';
import { extractErrorMessages } from '../../api/client';
import Input, { Field, Textarea } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import FileUploader from '../../components/ui/FileUploader';
import StatusBadge from '../../components/ui/StatusBadge';
import PageLoader from '../../components/ui/PageLoader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';

export default function OrganizationSettings() {
  const { updateUser } = useAuth();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    organizationsApi.getMe()
      .then((res) => {
        const data = res.data?.data || res.data || {};
        setOrg({
          ...data,
          contactInfo: data.contactInfo || {},
          zoomConfig: data.zoomConfig || {},
          vimeoConfig: data.vimeoConfig || {}
        });
      })
      .catch((err) => {
        extractErrorMessages(err).forEach((m) => toast.error(m));
      })
      .finally(() => setLoading(false));
  }, []);

  const update = (k) => (e) => setOrg((o) => ({ ...o, [k]: e.target?.value ?? e }));
  const updateContact = (k) => (e) => setOrg((o) => ({ ...o, contactInfo: { ...(o?.contactInfo || {}), [k]: e.target?.value ?? e } }));

  const submit = async (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const confirmSave = async () => {
    setShowConfirm(false);
    setErrors([]);
    setSaving(true);
    try {
      const payload = {
        name: org?.name,
        logoUrl: org?.logoUrl,
        contactInfo: org?.contactInfo,
        zoomConfig: org?.zoomConfig || {},
        vimeoConfig: org?.vimeoConfig || {},
      };
      await organizationsApi.updateMe(payload);
      if (org?.logoUrl) {
        updateUser({ organizationLogo: org.logoUrl });
      }
      toast.success('Organization settings saved successfully');
    } catch (err) {
      setErrors(extractErrorMessages(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Settings</span>
          <h1 className="page-title">Organization Settings</h1>
          <p className="page-subtitle">Manage your institution's profile and course plans.</p>
        </div>
        {org?.status && <StatusBadge status={org.status} />}
      </div>

      <Card style={{ padding: 'var(--sp-6)' }}>
          <form className="stack" onSubmit={submit}>
            {errors.length > 0 && <div className="auth-error-box"><ul>{errors.map((m, i) => <li key={i}>{m}</li>)}</ul></div>}
            
            <Field label="Logo">
              <FileUploader accept={{ 'image/*': [] }} preview={org?.logoUrl} onUploaded={(url) => update('logoUrl')(url)} label="Upload organization logo" />
            </Field>

            <div className="form-grid">
              <Field label="Organization Name" required><Input value={org?.name || ''} onChange={update('name')} required /></Field>
              <Field label="Code"><Input value={org?.code || ''} disabled /></Field>
            </div>

            <Field label="Slug / Domain"><Input value={org?.slug || ''} disabled /></Field>

            <div className="form-grid">
              <Field label="Contact Email"><Input type="email" value={org?.contactInfo?.email || ''} onChange={updateContact('email')} /></Field>
              <Field label="Contact Phone"><Input type="tel" value={org?.contactInfo?.phone || ''} onChange={updateContact('phone')} /></Field>
            </div>

            <Field label="Address"><Textarea rows={3} value={org?.contactInfo?.address || ''} onChange={updateContact('address')} /></Field>

            
            {/* SECTION: ZOOM INTEGRATION SETTINGS */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--text-primary)' }}>Zoom / Virtual Classroom Credentials</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Configure your organization's Zoom credentials for automated interview and live session links.
              </p>

              <div className="form-grid">
                <Field label="Zoom Client ID">
                  <Input 
                    value={org?.zoomConfig?.clientId || ''} 
                    onChange={(e) => setOrg(o => ({ ...o, zoomConfig: { ...(o.zoomConfig || {}), clientId: e.target.value } }))} 
                    placeholder="Enter Zoom Client ID" 
                  />
                </Field>
                <Field label="Zoom Client Secret">
                  <Input 
                    type="password"
                    value={org?.zoomConfig?.clientSecret || ''} 
                    onChange={(e) => setOrg(o => ({ ...o, zoomConfig: { ...(o.zoomConfig || {}), clientSecret: e.target.value } }))} 
                    placeholder="Enter Zoom Client Secret" 
                  />
                </Field>
              </div>

              <div className="form-grid">
                <Field label="Zoom Account ID">
                  <Input 
                    value={org?.zoomConfig?.accountId || ''} 
                    onChange={(e) => setOrg(o => ({ ...o, zoomConfig: { ...(o.zoomConfig || {}), accountId: e.target.value } }))} 
                    placeholder="Enter Zoom Account ID" 
                  />
                </Field>
                <Field label="Default Meeting / Classroom URL">
                  <Input 
                    value={org?.zoomConfig?.defaultMeetingUrl || ''} 
                    onChange={(e) => setOrg(o => ({ ...o, zoomConfig: { ...(o.zoomConfig || {}), defaultMeetingUrl: e.target.value } }))} 
                    placeholder="https://zoom.us/j/1234567890" 
                  />
                </Field>
              </div>
            </div>

            {/* SECTION: VIMEO INTEGRATION SETTINGS */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                Vimeo Video Hosting Configuration
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Configure your organization's custom Vimeo API credentials to host and stream your course video lectures directly from your Vimeo account.
              </p>

              <div className="form-grid">
                <Field label="Vimeo Client ID">
                  <Input 
                    value={org?.vimeoConfig?.clientId || ''} 
                    onChange={(e) => setOrg(o => ({ ...o, vimeoConfig: { ...(o.vimeoConfig || {}), clientId: e.target.value } }))} 
                    placeholder="e.g. 7a8b9c0d1e2f3..." 
                  />
                </Field>
                <Field label="Vimeo Client Secret">
                  <Input 
                    type="password"
                    value={org?.vimeoConfig?.clientSecret || ''} 
                    onChange={(e) => setOrg(o => ({ ...o, vimeoConfig: { ...(o.vimeoConfig || {}), clientSecret: e.target.value } }))} 
                    placeholder="Enter Vimeo Client Secret" 
                  />
                </Field>
              </div>

              <div style={{ marginTop: '0.75rem' }}>
                <Field label="Vimeo Access Token (Personal Access Token with Upload & Edit scopes)">
                  <Input 
                    type="password"
                    value={org?.vimeoConfig?.accessToken || ''} 
                    onChange={(e) => setOrg(o => ({ ...o, vimeoConfig: { ...(o.vimeoConfig || {}), accessToken: e.target.value } }))} 
                    placeholder="Enter Vimeo Access Token" 
                  />
                </Field>
              </div>
            </div>

            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <Button type="submit" loading={saving}>Save Changes</Button>
            </div>
          </form>
      </Card>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmSave}
        title="Save Organization Settings"
        description="Are you sure you want to save these changes?"
        confirmLabel="Save Changes"
        danger={false}
      />
    </div>
  );
}

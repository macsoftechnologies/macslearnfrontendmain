import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, FolderTree } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import DataTable from '../../../components/ui/DataTable';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import Input, { Field, Select } from '../../../components/ui/Input';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import * as programsApi from '../../../api/programs';
import * as regionsApi from '../../../api/regions';
import * as organizationsApi from '../../../api/organizations';
import * as certificatesApi from '../../../api/certificates';

const ProgramsPage = () => {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', totalSemesters: '', totalSubjects: '', maxDurationYears: '', degreeTitle: '', coursePlanId: '', certificateTemplateId: '', certificateIssueMode: 'AUTO' });
  const [editId, setEditId] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [regions, setRegions] = useState([]);
  const [coursePlans, setCoursePlans] = useState([]);
  const [templates, setTemplates] = useState([]);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const res = await programsApi.list();
      setPrograms(res.data || []);
    } catch (err) {
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
    regionsApi.list({ localOnly: true }).then(res => setRegions(res.data?.data || [])).catch(() => { });
    organizationsApi.getCoursePlans().then(res => setCoursePlans(res.data?.data || [])).catch(() => { });
    certificatesApi.listTemplates().then(res => setTemplates(res.data?.data || [])).catch(() => { });
  }, []);

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        totalSubjects: parseInt(formData.totalSubjects),
        maxDurationYears: parseInt(formData.maxDurationYears) || null,
        degreeTitle: formData.degreeTitle,
        coursePlanId: formData.coursePlanId,
        certificateTemplateId: formData.certificateTemplateId || null,
        certificateIssueMode: formData.certificateTemplateId ? formData.certificateIssueMode : undefined,
        regionConfigs: formData.regionConfigs || [],
      };

      if (editId) {
        await programsApi.update(editId, payload);
        toast.success('Program updated');
      } else {
        await programsApi.create(payload);
        toast.success('Program created');
      }
      setModalOpen(false);
      fetchPrograms();
    } catch (err) {
      toast.error('Failed to save program');
    }
  };

  const openCreate = () => {
    setEditId(null);
    setFormData({ name: '', totalSubjects: '', maxDurationYears: '', degreeTitle: '', coursePlanId: '', certificateTemplateId: '', certificateIssueMode: 'AUTO', regionConfigs: [] });
    setModalOpen(true);
  };

  const openEdit = (program) => {
    setEditId(program.id || program._id);
    setFormData({
      name: program.name || '',
      totalSubjects: program.totalSubjects || '',
      maxDurationYears: program.maxDurationYears || '',
      degreeTitle: program.degreeTitle || '',
      coursePlanId: program.coursePlanId || '',
      certificateTemplateId: program.certificateTemplateId || '',
      certificateIssueMode: program.certificateIssueMode || 'AUTO',
      regionConfigs: program.regionConfigs || []
    });
    setModalOpen(true);
  };

  const toggleStatus = async () => {
    if (!deactivateTarget) return;
    try {
      const newStatus = deactivateTarget.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
      await programsApi.update(deactivateTarget.id, { status: newStatus });
      toast.success(`Program ${newStatus === 'PUBLISHED' ? 'published' : 'moved to draft'}`);
      setDeactivateTarget(null);
      fetchPrograms();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Academic</span>
          <h1 className="page-title">Programs & Degrees</h1>
          <p className="page-subtitle">Manage all theological degrees and their requirements.</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>Create Program</Button>
      </div>

      <DataTable
        loading={loading}
        emptyLabel="No programs found."
        columns={[
          { key: 'name', header: 'Program Name' },
          { key: 'totalSubjects', header: 'Total Subjects' },
          { 
            key: 'maxDurationYears', 
            header: 'Max Duration (Years)',
            render: (r) => r.maxDurationYears ? `${r.maxDurationYears} Years` : '—'
          },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'DRAFT'} /> },
          {
            key: 'actions', header: 'Actions', render: (r) => (
              <div className="row" style={{ gap: 6 }}>
                <Button size="sm" variant="primary" icon={FolderTree} onClick={() => navigate(`/admin/programs/${r.id || r._id}`)}>Manage Curriculum</Button>
                <Button size="sm" variant="outline" icon={Edit} onClick={() => openEdit(r)}>Edit Settings</Button>
                <Button size="sm" variant="outline" icon={Trash2} onClick={() => setDeactivateTarget(r)}>
                  {r.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                </Button>
              </div>
            ),
          },
        ]}
        rows={programs}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Program Details" : "Create New Program"} width={720}>
        <div className="stack" style={{ gap: '20px' }}>

          {/* General Information Card */}
          <div style={{ background: 'var(--bg-surface-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '3px', height: '14px', background: 'var(--accent)', borderRadius: '2px', boxShadow: '0 0 8px var(--accent)' }}></div>
              General Information
            </h3>
            <div className="stack" style={{ gap: '14px' }}>
              <div className="row" style={{ gap: '14px' }}>
                <Field label="Program Name" required style={{ flex: 2 }}>
                  <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Master of Divinity" style={{ padding: '10px 14px', fontSize: '14px' }} />
                </Field>
                <Field label="Degree Title" style={{ flex: 1 }}>
                  <Input value={formData.degreeTitle} onChange={e => setFormData({ ...formData, degreeTitle: e.target.value })} placeholder="e.g. M.Div." style={{ padding: '10px 14px', fontSize: '14px' }} />
                </Field>
              </div>

              <div className="row" style={{ gap: '14px' }}>
                <Field label="Total Subjects" required style={{ flex: 1 }}>
                  <Input type="number" value={formData.totalSubjects} onChange={e => setFormData({ ...formData, totalSubjects: e.target.value })} placeholder="e.g. 30" style={{ padding: '10px 14px', fontSize: '14px' }} />
                </Field>
                <Field label="Max Completion Time (Years)" required style={{ flex: 1 }}>
                  <Input 
                    type="number" 
                    value={formData.maxDurationYears} 
                    onChange={e => setFormData({ ...formData, maxDurationYears: e.target.value })} 
                    placeholder="e.g. 3" 
                    style={{ padding: '10px 14px', fontSize: '14px' }} 
                  />
                </Field>
                <Field label="Program Plan (Duration)" style={{ flex: 2 }}>
                  <Select value={formData.coursePlanId} onChange={e => setFormData({ ...formData, coursePlanId: e.target.value })} style={{ padding: '10px 14px', fontSize: '14px' }}>
                    <option value="">Select a plan</option>
                    {coursePlans.map(p => (
                      <option key={p.id || p._id} value={p.id || p._id}>{p.name} ({p.validityDays} Days)</option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>
          </div>

          {/* Region Cohort Settings Card */}
          <div style={{ background: 'var(--bg-surface-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '3px', height: '14px', background: 'var(--color-violet-500)', borderRadius: '2px', boxShadow: '0 0 8px var(--color-violet-500)' }}></div>
                Region Cohort Rules
              </h3>
              <p className="text-muted" style={{ fontSize: '12px', marginLeft: '11px', color: 'var(--text-secondary)' }}>Configure fixed batch generation rules per region (Optional).</p>
            </div>

            <div className="stack" style={{ gap: '12px' }}>
              {regions.map(region => {
                const rName = region.name || region.id;
                const currentConfig = formData.regionConfigs?.find(rc => rc.regionName === rName) || { regionName: rName, hasFixedBatches: false };
                const isEnabled = currentConfig.hasFixedBatches;

                return (
                  <div key={rName} style={{
                    padding: '16px',
                    background: isEnabled ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isEnabled ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                    transition: 'all 0.2s ease'
                  }}>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: isEnabled ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{rName} Region</span>
                        {isEnabled && <span style={{ marginLeft: '8px', fontSize: '10px', background: 'rgba(99, 102, 241, 0.25)', color: 'var(--color-indigo-400)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>ACTIVE</span>}
                      </div>

                      {/* Custom Toggle Switch */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: isEnabled ? 'var(--color-indigo-400)' : 'var(--text-muted)' }}>
                          {isEnabled ? 'Fixed Batches' : 'Rolling Admissions'}
                        </span>
                        <div style={{
                          position: 'relative', width: '36px', height: '20px',
                          background: isEnabled ? 'var(--accent)' : 'rgba(255, 255, 255, 0.15)',
                          borderRadius: '20px', transition: 'background 0.3s'
                        }}>
                          <div style={{
                            position: 'absolute', top: '2px', left: isEnabled ? '18px' : '2px',
                            width: '16px', height: '16px', background: 'white',
                            borderRadius: '50%', transition: 'left 0.2s ease',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                          }}></div>
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData(f => {
                                let newConfigs = [...(f.regionConfigs || [])];
                                if (checked) {
                                  if (!newConfigs.find(c => c.regionName === rName)) newConfigs.push({ regionName: rName, hasFixedBatches: true });
                                  else newConfigs = newConfigs.map(c => c.regionName === rName ? { ...c, hasFixedBatches: true } : c);
                                } else {
                                  newConfigs = newConfigs.map(c => c.regionName === rName ? { ...c, hasFixedBatches: false } : c);
                                }
                                return { ...f, regionConfigs: newConfigs };
                              });
                            }}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                        </div>
                      </label>
                    </div>

                    {isEnabled && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed var(--border-subtle)', animation: 'fadeInDown 0.2s ease' }}>
                        <div style={{ width: '50%', marginBottom: '16px' }}>
                          <Field label="Custom Max Duration (Years)">
                            <Input
                              type="number"
                              placeholder="Override default duration (Optional)"
                              value={currentConfig.customDurationYears || ''}
                              onChange={(e) => {
                                setFormData(f => ({
                                  ...f,
                                  regionConfigs: f.regionConfigs.map(c => c.regionName === rName ? { ...c, customDurationYears: parseInt(e.target.value) || null } : c)
                                }));
                              }}
                              style={{ padding: '8px 12px', fontSize: '13px' }}
                            />
                          </Field>
                        </div>

                        <div className="row" style={{ justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Intake Date Ranges</span>
                          <Button
                            size="sm"
                            variant="outline"
                            icon={Plus}
                            onClick={() => {
                              setFormData(f => {
                                const rc = f.regionConfigs.map(c => {
                                  if (c.regionName === rName) {
                                    return { ...c, batchDateRanges: [...(c.batchDateRanges || []), { startMonth: 'January', endMonth: 'June' }] };
                                  }
                                  return c;
                                });
                                return { ...f, regionConfigs: rc };
                              });
                            }}
                          >
                            Add Batch Dates
                          </Button>
                        </div>

                        {(currentConfig.batchDateRanges || []).map((range, idx) => (
                          <div key={idx} className="row" style={{ gap: '8px', marginBottom: '8px', alignItems: 'center', background: 'var(--bg-surface-muted)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                            <div className="row" style={{ gap: '6px', flex: '1 1 auto', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', width: '35px' }}>Start</span>
                              <Select
                                style={{ flex: 2, minWidth: '80px', padding: '6px' }}
                                value={range.startMonth || 'January'}
                                onChange={(e) => {
                                  setFormData(f => {
                                    const rc = f.regionConfigs.map(c => {
                                      if (c.regionName === rName) {
                                        const newRanges = [...c.batchDateRanges];
                                        newRanges[idx].startMonth = e.target.value;
                                        const maxDays = new Date(2024, ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(e.target.value) + 1, 0).getDate();
                                        if (parseInt(newRanges[idx].startDate || '1') > maxDays) {
                                          newRanges[idx].startDate = maxDays.toString();
                                        }
                                        return { ...c, batchDateRanges: newRanges };
                                      }
                                      return c;
                                    });
                                    return { ...f, regionConfigs: rc };
                                  });
                                }}
                              >
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                                  .filter(m => m === range.startMonth || !(currentConfig.batchDateRanges || []).some(r => r.startMonth === m))
                                  .map(m => <option key={m} value={m}>{m}</option>)}
                              </Select>
                              <Select
                                style={{ flex: 1, minWidth: '50px', padding: '6px' }}
                                value={range.startDate || '1'}
                                onChange={(e) => {
                                  setFormData(f => {
                                    const rc = f.regionConfigs.map(c => {
                                      if (c.regionName === rName) {
                                        const newRanges = [...c.batchDateRanges];
                                        newRanges[idx].startDate = e.target.value;
                                        return { ...c, batchDateRanges: newRanges };
                                      }
                                      return c;
                                    });
                                    return { ...f, regionConfigs: rc };
                                  });
                                }}
                              >
                                {Array.from({ length: new Date(2024, ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(range.startMonth || 'January') + 1, 0).getDate() }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                              </Select>
                            </div>

                            <div style={{ width: '12px', height: '1px', background: 'var(--border-subtle)' }}></div>

                            <div className="row" style={{ gap: '6px', flex: '1 1 auto', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', width: '30px' }}>End</span>
                              <Select
                                style={{ flex: 2, minWidth: '80px', padding: '6px' }}
                                value={range.endMonth || 'June'}
                                onChange={(e) => {
                                  setFormData(f => {
                                    const rc = f.regionConfigs.map(c => {
                                      if (c.regionName === rName) {
                                        const newRanges = [...c.batchDateRanges];
                                        newRanges[idx].endMonth = e.target.value;
                                        const maxDays = new Date(2024, ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(e.target.value) + 1, 0).getDate();
                                        if (parseInt(newRanges[idx].endDate || '1') > maxDays) {
                                          newRanges[idx].endDate = maxDays.toString();
                                        }
                                        return { ...c, batchDateRanges: newRanges };
                                      }
                                      return c;
                                    });
                                    return { ...f, regionConfigs: rc };
                                  });
                                }}
                              >
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                                  .filter(m => m === range.endMonth || !(currentConfig.batchDateRanges || []).some(r => r.endMonth === m))
                                  .map(m => <option key={m} value={m}>{m}</option>)}
                              </Select>
                              <Select
                                style={{ flex: 1, minWidth: '50px', padding: '6px' }}
                                value={range.endDate || '1'}
                                onChange={(e) => {
                                  setFormData(f => {
                                    const rc = f.regionConfigs.map(c => {
                                      if (c.regionName === rName) {
                                        const newRanges = [...c.batchDateRanges];
                                        newRanges[idx].endDate = e.target.value;
                                        return { ...c, batchDateRanges: newRanges };
                                      }
                                      return c;
                                    });
                                    return { ...f, regionConfigs: rc };
                                  });
                                }}
                              >
                                {Array.from({ length: new Date(2024, ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(range.endMonth || 'June') + 1, 0).getDate() }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                              </Select>
                            </div>

                            <Button
                              variant="danger"
                              icon={Trash2}
                              onClick={() => {
                                setFormData(f => {
                                  const rc = f.regionConfigs.map(c => {
                                    if (c.regionName === rName) {
                                      const newRanges = [...c.batchDateRanges];
                                      newRanges.splice(idx, 1);
                                      return { ...c, batchDateRanges: newRanges };
                                    }
                                    return c;
                                  });
                                  return { ...f, regionConfigs: rc };
                                });
                              }}
                              style={{ padding: '6px 10px', minWidth: '32px', borderRadius: 'var(--radius-sm)' }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Certificate Settings Card */}
          <div style={{ background: 'var(--bg-surface-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '3px', height: '14px', background: 'var(--warning)', borderRadius: '2px', boxShadow: '0 0 8px var(--warning)' }}></div>
              Certificate Settings
            </h3>
            <div className="row" style={{ gap: '14px' }}>
              <Field label="Degree / Certificate Template" style={{ flex: 1 }}>
                <Select value={formData.certificateTemplateId} onChange={(e) => setFormData(f => ({ ...f, certificateTemplateId: e.target.value }))} style={{ padding: '10px 14px', fontSize: '14px' }}>
                  <option value="">No Certificate</option>
                  {templates.map(t => <option key={t.id || t._id} value={t.id || t._id}>{t.name}</option>)}
                </Select>
              </Field>
              {formData.certificateTemplateId && (
                <Field label="Issuance Workflow" style={{ flex: 1 }}>
                  <Select value={formData.certificateIssueMode} onChange={(e) => setFormData(f => ({ ...f, certificateIssueMode: e.target.value }))} style={{ padding: '10px 14px', fontSize: '14px' }}>
                    <option value="AUTO">Auto-Issue on Program Completion</option>
                    <option value="MANUAL_APPROVAL">Manual Approval by Admin</option>
                  </Select>
                </Field>
              )}
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', marginTop: '8px', gap: '10px' }}>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || !formData.totalSubjects}
            >
              {editId ? "Save Changes" : "Create Program"}
            </Button>
          </div>

        </div>
      </Modal>

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={toggleStatus}
        title={deactivateTarget?.status === 'PUBLISHED' ? 'Unpublish Program?' : 'Publish Program?'}
        description={`This will make the program ${deactivateTarget?.name} ${deactivateTarget?.status === 'PUBLISHED' ? 'unavailable' : 'available'} for student enrollment.`}
        confirmLabel={deactivateTarget?.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
        danger={deactivateTarget?.status === 'PUBLISHED'}
      />
    </div>
  );
};

export default ProgramsPage;

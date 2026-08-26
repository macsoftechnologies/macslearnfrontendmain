import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Drawer from '../../components/ui/Drawer';
import Button from '../../components/ui/Button';
import Input, { Field, Select, Textarea } from '../../components/ui/Input';
import FileUploader from '../../components/ui/FileUploader';
import * as usersApi from '../../api/users';
import * as studentsApi from '../../api/students';
import * as regionsApi from '../../api/regions';
import * as programsApi from '../../api/programs';
import client, { extractErrorMessages } from '../../api/client';

export default function StudentDrawer({ open, onClose, onCreated, student = null }) {
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [form, setForm] = useState({ fullName: '', email: '', mobile: '', password: '', regionId: '' });
  const [customProfile, setCustomProfile] = useState({
    documents: { photo: '', referenceLetter: '', certificates: [] }
  });

  useEffect(() => {
    if (open) {
      regionsApi.list({ localOnly: true }).then(res => setRegions(res.data?.data || [])).catch(() => {});
      programsApi.list({ limit: 100 }).then(res => setPrograms(res.data || [])).catch(() => {});
      client.get('/form-questions').then(res => setQuestions(res.data?.data || res.data || [])).catch(() => {});
      
      if (student) {
        setForm({
          fullName: student.fullName || '',
          email: student.email || '',
          mobile: student.mobile || '',
          password: '',
          regionId: student.regionId?._id || student.regionId || ''
        });
        if (student.customProfile) {
          setCustomProfile({
            ...customProfile,
            ...student.customProfile,
            documents: student.customProfile.documents || { photo: '', referenceLetter: '', certificates: [] }
          });
        }
      } else {
        setForm({ fullName: '', email: '', mobile: '', password: '', regionId: '' });
        setCustomProfile({
          documents: { photo: '', referenceLetter: '', certificates: [] }
        });
      }
    }
  }, [open, student]);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleCustomChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalVal = type === 'checkbox' ? checked : value;
    if (typeof finalVal === 'string') {
      const q = questions.find(item => item.key === name);
      if (q && (q.type === 'TEL' || q.type === 'PHONE' || /phone|mobile|contact|tel/i.test(q.key) || /phone|mobile|contact|tel/i.test(q.label))) {
        finalVal = finalVal.replace(/[^0-9() +\-]/g, '');
      } else if (q && (q.type === 'NUMBER' || /pin|zip|postal|age/i.test(q.key) || /pin\s*code|zip\s*code|postal\s*code|age/i.test(q.label))) {
        finalVal = finalVal.replace(/\D/g, '');
      }
    }
    setCustomProfile(prev => ({ ...prev, [name]: finalVal }));
  };

  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.regionId) newErrors.regionId = 'Region is required';
    if (!customProfile.documents?.photo) newErrors.photo = 'Passport Photo is required.';
    if (!customProfile.documents?.certificates || customProfile.documents.certificates.length === 0) {
      newErrors.certificates = 'At least one Document/Certificate is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Optional: show a general toast so the user knows why it didn't submit
      toast.error('Please fix the errors in the form.');
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      if (student) {
        const updateData = {
          fullName: form.fullName,
          mobile: form.mobile,
          regionId: form.regionId,
          customProfile
        };
        await studentsApi.update(student._id || student.id, updateData);
        toast.success('Student updated successfully');
      } else {
        if (!form.password) return toast.error('Password is required for new students');
        await usersApi.createStudent({ ...form, customProfile });
        toast.success('Student created successfully');
      }
      onCreated();
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer 
      open={open} 
      onClose={onClose} 
      title={student ? "Edit Student" : "Add New Student"} 
      subtitle="Fill in the details below to complete the student profile."
      width={720}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" form="student-drawer-form" loading={loading}>{student ? 'Save Changes' : 'Create Student'}</Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} id="student-drawer-form" className="stack" style={{ gap: '2rem' }}>
        
        {/* SECTION: BASIC INFO */}
        <section className="stack" style={{ gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>Personal Details</h3>
          
          <div className="form-grid">
            <Field label="Full Name" required error={errors.fullName}><Input name="fullName" value={form.fullName} onChange={handleChange} required placeholder="e.g. John Doe" /></Field>
            <Field label="Email Address" required error={errors.email}><Input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="john@example.com" disabled={!!student} /></Field>
          </div>
          <div className="form-grid">
            <Field label="Mobile Number" required error={errors.mobile}><Input type="tel" name="mobile" value={form.mobile} onChange={(e) => { e.target.value = e.target.value.replace(/[^0-9+\-\s()]/g, ''); handleChange(e); }} required /></Field>
            <Field label="Region" required error={errors.regionId}>
              <Select name="regionId" value={form.regionId} onChange={handleChange} required>
                <option value="">-- Select a Region --</option>
                {regions.map(r => <option key={r._id || r.id} value={r._id || r.id}>{r.name}</option>)}
              </Select>
            </Field>
          </div>
          {!student && (
            <Field label="Temporary Password" required error={errors.password}><Input type="text" name="password" value={form.password} onChange={handleChange} required placeholder="Min. 8 characters" /></Field>
          )}
        </section>

        {/* SECTION: ADDITIONAL DETAILS */}
        <section className="stack" style={{ gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>Additional Details</h3>
          {questions.filter(q => q.key !== 'declarationAccepted').map((q) => {
            if (q.key === 'interestedCourse') {
              return (
                <Field key={q.id} label={q.label} required={q.isRequired} error={errors[q.key]}>
                  <Select name={q.key} value={customProfile[q.key] || ''} onChange={handleCustomChange} required={q.isRequired}>
                    <option value="">Select a Program</option>
                    {programs.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
                  </Select>
                </Field>
              );
            }
            if (q.type === 'TEXTAREA') {
              return (
                <Field key={q.id} label={q.label} required={q.isRequired} error={errors[q.key]}>
                  <Textarea rows={3} name={q.key} value={customProfile[q.key] || ''} onChange={handleCustomChange} required={q.isRequired} />
                </Field>
              );
            }
            if (q.type === 'DROPDOWN') {
              const optionsList = (q.key === 'gender' || /gender/i.test(q.label || '')) ? ['Male', 'Female'] : q.options;
              return (
                <Field key={q.id} label={q.label} required={q.isRequired} error={errors[q.key]}>
                  <Select name={q.key} value={customProfile[q.key] || ''} onChange={handleCustomChange} required={q.isRequired}>
                    <option value="">Select</option>
                    {optionsList?.map(o => <option key={o} value={o}>{o}</option>)}
                  </Select>
                </Field>
              );
            }
            if (q.type === 'DATE') {
              return (
                <Field key={q.id} label={q.label} required={q.isRequired} error={errors[q.key]}>
                  <Input type="date" name={q.key} value={customProfile[q.key] || ''} onChange={handleCustomChange} required={q.isRequired} max={new Date().toISOString().split('T')[0]} />
                </Field>
              );
            }
            if (q.type === 'CHECKBOX') {
              return (
                <label key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 0' }}>
                  <input type="checkbox" name={q.key} checked={!!customProfile[q.key]} onChange={(e) => setCustomProfile(prev => ({...prev, [q.key]: e.target.checked}))} required={q.isRequired} style={{ marginTop: '4px' }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '4px' }}>{q.label} {q.isRequired && '*'}</strong>
                    {q.key === 'declarationAccepted' && (
                      <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                        I hereby do declare that all the details which are mentioned above are true to best of my knowledge. I assure that, if I am admitted, I will abide by the rules and regulations of COTRTS-GO. I submit to the right of the Seminary administration to take any appropriate disciplinary action against me, if, in their judgment, my behavior or character is contrary to the emphasis of the seminary.
                      </div>
                    )}
                  </div>
                </label>
              );
            }
            const isPhone = q.type === 'TEL' || q.type === 'PHONE' || /phone|mobile|contact|tel/i.test(q.key || '') || /phone|mobile|contact|tel/i.test(q.label || '');
            const isNumber = q.type === 'NUMBER' || /pin|zip|postal|age/i.test(q.key || '') || /pin\s*code|zip\s*code|postal\s*code|age/i.test(q.label || '');

            return (
              <Field key={q.id} label={q.label} required={q.isRequired} error={errors[q.key]}>
                <Input 
                  type={isPhone ? 'tel' : isNumber ? 'number' : 'text'} 
                  name={q.key} 
                  value={customProfile[q.key] || ''} 
                  onChange={handleCustomChange} 
                  required={q.isRequired} 
                />
              </Field>
            );
          })}
        </section>

        {/* SECTION: UPLOADED DOCUMENTS */}
        <section className="stack" style={{ gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>Uploaded Documents</h3>
          
          <div className="stack" style={{ gap: '1.25rem' }}>
            <Field label="Passport Photo" error={errors.photo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {customProfile.documents?.photo && <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>âœ“ Uploaded</span>}
                <FileUploader accept={{'image/*': ['.png', '.jpg', '.jpeg']}} onUploaded={url => setCustomProfile(c => ({...c, documents: {...(c.documents || {}), photo: url}}))} label="Upload Photo" />
              </div>
            </Field>
            <Field label="Reference Letter">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {customProfile.documents?.referenceLetter && <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>âœ“ Uploaded</span>}
                <FileUploader accept={{'application/pdf': ['.pdf'], 'image/*': ['.jpg']}} onUploaded={url => setCustomProfile(c => ({...c, documents: {...(c.documents || {}), referenceLetter: url}}))} label="Upload Reference" />
              </div>
            </Field>
            <Field label="Certificates" error={errors.certificates}>
                <FileUploader accept={{'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg']}} onUploaded={url => setCustomProfile(c => { const certs = (c.documents?.certificates || []); return {...c, documents: {...(c.documents || {}), certificates: [...certs, url]}}; })} label="Upload Certificate" />
                {customProfile.documents?.certificates?.length > 0 && (
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                    {customProfile.documents.certificates.map((url, i) => (
                      <li key={i}>Certificate {i+1} <button type="button" onClick={() => setCustomProfile(c => { const certs = [...c.documents.certificates]; certs.splice(i, 1); return {...c, documents: {...c.documents, certificates: certs}}; })} style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', marginLeft: '8px' }}>x</button></li>
                    ))}
                  </ul>
                )}
            </Field>
          </div>
        </section>


        {/* SECTION: DECLARATION */}
        <section className="stack" style={{ gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>Declaration</h3>
          <div style={{ background: 'var(--color-primary-50)', padding: '1.5rem', borderRadius: '8px', border: errors.declarationAccepted ? '1px solid var(--danger)' : '1px solid var(--color-primary-100)' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                name="declarationAccepted"
                checked={!!customProfile.declarationAccepted} 
                onChange={(e) => setCustomProfile(prev => ({...prev, declarationAccepted: e.target.checked}))} 
                style={{ width: '20px', height: '20px', marginTop: '4px' }}
                required
              />
              <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--color-ink-900)' }}>
                <strong>Declaration:</strong><br/><br/>
                I hereby do declare that all the details which are mentioned above are true to best of my knowledge. I assure that, if I am admitted, I will abide by the rules and regulations of COTRTS-GO. I submit to the right of the Seminary administration to take any appropriate disciplinary action against me, if, in their judgment, my behavior or character is contrary to the emphasis of the seminary.
              </div>
            </label>
          </div>
        </section>
      </form>
    </Drawer>
  );
}


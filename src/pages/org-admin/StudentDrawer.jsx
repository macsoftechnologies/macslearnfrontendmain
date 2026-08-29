import { useState, useEffect } from 'react';
import { FileText, Trash2, ShieldCheck } from 'lucide-react';
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

  const [form, setForm] = useState({ fullName: '', email: '', mobile: '', password: '', regionId: '', ataStatus: '' });
  const [customProfile, setCustomProfile] = useState({
    countryOfCitizenship: '',
    countryLivingIn: '',
    documents: {
      photo: null, aadhaarFront: null, aadhaarBack: null,
      tenthCert: null, interCert: null, degreeCert: null,
      degreeTranscript: null, referenceLetter: null, otherCertificates: []
    },
    declarationAccepted: false
  });

  const [errors, setErrors] = useState({});

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
          regionId: student.regionId?._id || student.regionId || '',
          ataStatus: student.customProfile?.ataStatus || ''
        });
        if (student.customProfile) {
          setCustomProfile({
            countryOfCitizenship: student.customProfile.countryOfCitizenship || '',
            countryLivingIn: student.customProfile.countryLivingIn || '',
            ...student.customProfile,
            documents: {
              photo: student.customProfile.documents?.photo || null,
              aadhaarFront: student.customProfile.documents?.aadhaarFront || null,
              aadhaarBack: student.customProfile.documents?.aadhaarBack || null,
              tenthCert: student.customProfile.documents?.tenthCert || null,
              interCert: student.customProfile.documents?.interCert || null,
              degreeCert: student.customProfile.documents?.degreeCert || null,
              degreeTranscript: student.customProfile.documents?.degreeTranscript || null,
              referenceLetter: student.customProfile.documents?.referenceLetter || null,
              otherCertificates: student.customProfile.documents?.otherCertificates || []
            },
            declarationAccepted: student.customProfile.declarationAccepted || false
          });
        }
      } else {
        setForm({ fullName: '', email: '', mobile: '', password: '', regionId: '', ataStatus: '' });
        setCustomProfile({
          countryOfCitizenship: '', countryLivingIn: '',
          documents: {
            photo: null, aadhaarFront: null, aadhaarBack: null,
            tenthCert: null, interCert: null, degreeCert: null,
            degreeTranscript: null, referenceLetter: null, otherCertificates: []
          },
          declarationAccepted: false
        });
      }
      setErrors({});
    }
  }, [open, student]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
  };

  const handleCustomChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalVal = type === 'checkbox' ? checked : value;
    if (typeof finalVal === 'string') {
      const q = questions.find(item => item.key === name);
      if (q && (q.type === 'TEL' || q.type === 'PHONE' || /phone|mobile|contact|tel/i.test(q.key) || /phone|mobile|contact|tel/i.test(q.label))) {
        finalVal = finalVal.replace(/[^0-9() +-]/g, '');
      } else if (q && (q.type === 'NUMBER' || /\b(pin|zip|postal|age)\b/i.test(q.key) || /\b(pin\s*code|zip\s*code|postal\s*code|age)\b/i.test(q.label)) && !/lang/i.test(q.key) && !/lang/i.test(q.label)) {
        finalVal = finalVal.replace(/\D/g, '');
      }
    }
    setCustomProfile(prev => ({ ...prev, [name]: finalVal }));
    if (errors[name]) setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
  };

  const handleDocUpload = (key, url, file) => {
    if (!url) {
      setCustomProfile(p => ({ ...p, documents: { ...p.documents, [key]: null } }));
      return;
    }
    const docObj = { url, name: file?.name || 'Document', size: file?.size || 0 };
    setCustomProfile(p => ({ ...p, documents: { ...p.documents, [key]: docObj } }));
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
  };

  const handleAddOtherCert = (url, file) => {
    if (!url) return;
    const certCount = (customProfile.documents?.otherCertificates?.length || 0) + 1;
    const certObj = { url, name: file?.name || ('Certificate ' + certCount), size: file?.size || 0 };
    setCustomProfile(p => ({ ...p, documents: { ...p.documents, otherCertificates: [...(p.documents?.otherCertificates || []), certObj] } }));
  };

  const handleRemoveOtherCert = (index) => {
    setCustomProfile(p => {
      const list = [...(p.documents?.otherCertificates || [])];
      list.splice(index, 1);
      return { ...p, documents: { ...p.documents, otherCertificates: list } };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!form.ataStatus) newErrors.ataStatus = 'Please select ATA or Non-ATA Track.';
    if (!form.regionId) newErrors.regionId = 'Please select a Region.';
    if (!form.fullName?.trim()) newErrors.fullName = 'Full Name is required.';
    if (!form.email?.trim()) {
      newErrors.email = 'Email Address is required.';
    } else if (!/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(form.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!form.mobile?.trim()) newErrors.mobile = 'Mobile Number is required.';
    if (!student && !form.password) newErrors.password = 'Password is required for new students.';

    questions.forEach(q => {
      if (q.isRequired && q.key !== 'declarationAccepted' && !customProfile[q.key]) {
        newErrors[q.key] = (q.label || q.key) + ' is required.';
      }
    });

    if (!customProfile.documents?.photo) newErrors.photo = 'Passport Size Photo is required.';
    if (!customProfile.documents?.aadhaarFront) newErrors.aadhaarFront = 'Aadhaar Card (Front Side) is required.';
    if (!customProfile.documents?.aadhaarBack) newErrors.aadhaarBack = 'Aadhaar Card (Back Side) is required.';
    if (!customProfile.documents?.tenthCert) newErrors.tenthCert = '10th / SSC Certificate is required.';
    if (!customProfile.documents?.interCert) newErrors.interCert = 'Intermediate / 12th Certificate is required.';
    if (!customProfile.documents?.degreeCert) newErrors.degreeCert = 'Degree Certificate is required.';
    if (!customProfile.documents?.degreeTranscript) newErrors.degreeTranscript = 'Degree Academic Transcript is required.';
    if (!customProfile.documents?.referenceLetter) newErrors.referenceLetter = 'Reference Letter is required.';
    if (!customProfile.declarationAccepted) newErrors.declarationAccepted = 'Declaration must be accepted.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the highlighted errors.');
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const payload = { ...form, customProfile: { ...customProfile, ataStatus: form.ataStatus } };
      if (student) {
        await studentsApi.update(student._id || student.id, {
          fullName: form.fullName, mobile: form.mobile, regionId: form.regionId,
          customProfile: payload.customProfile
        });
        toast.success('Student updated successfully');
      } else {
        if (!form.password) return toast.error('Password is required for new students');
        await usersApi.createStudent(payload);
        toast.success('Student created successfully');
      }
      onCreated();
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  const DocStatus = ({ docObj }) => {
    if (!docObj) return null;
    const name = typeof docObj === 'object' ? docObj.name : 'Uploaded';
    return (
      <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <FileText size={15} /> {name} ✓
      </div>
    );
  };

  return (
    <Drawer 
      open={open} 
      onClose={onClose} 
      title={student ? "Edit Student" : "Add New Student"} 
      subtitle="Fill in the details below to complete the student profile."
      width={780}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" form="student-drawer-form" loading={loading}>{student ? 'Save Changes' : 'Create Student'}</Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} id="student-drawer-form" className="stack" style={{ gap: '2rem' }}>
        
        {/* SECTION 1: ADMISSION TRACK & PERSONAL DETAILS */}
        <section className="stack" style={{ gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <ShieldCheck size={20} color="var(--accent)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>1. Admission Track & Personal Details</h3>
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Accreditation / Track" required error={errors.ataStatus}>
              <Select name="ataStatus" value={form.ataStatus} onChange={handleChange} style={{ fontWeight: 600 }}>
                <option value="">-- Select Track --</option>
                <option value="ATA">ATA (Asia Theological Association)</option>
                <option value="NON_ATA">NON-ATA</option>
              </Select>
            </Field>
            <Field label="Region" required error={errors.regionId}>
              <Select name="regionId" value={form.regionId} onChange={handleChange}>
                <option value="">-- Select Region --</option>
                {regions.map(r => (
                  <option key={r._id || r.id} value={r._id || r.id}>
                    {r.name} {r.isAta ? '(ATA Accredited)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Full Name" required error={errors.fullName}>
              <Input name="fullName" value={form.fullName} onChange={handleChange} placeholder="e.g. John Doe" />
            </Field>
            <Field label="Email Address" required error={errors.email}>
              <Input type="email" name="email" value={form.email} onChange={handleChange} placeholder="john@example.com" disabled={!!student} />
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Mobile Number" required error={errors.mobile}>
              <Input type="tel" name="mobile" value={form.mobile} onChange={(e) => { e.target.value = e.target.value.replace(/[^0-9+\-\s()]/g, ''); handleChange(e); }} placeholder="+91 98765 43210" />
            </Field>
            {!student && (
              <Field label="Temporary Password" required error={errors.password}>
                <Input type="text" name="password" value={form.password} onChange={handleChange} placeholder="Min. 8 characters" />
              </Field>
            )}
          </div>
        </section>

        {/* SECTION 2: RESIDENCE & ADDITIONAL DETAILS */}
        <section className="stack" style={{ gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
            2. Residence & Background Details
          </h3>

          <div className="form-grid">
            <Field label="Country of Citizenship" error={errors.countryOfCitizenship}>
              <Input name="countryOfCitizenship" value={customProfile.countryOfCitizenship || ''} onChange={handleCustomChange} placeholder="e.g. India" />
            </Field>
            <Field label="Country Living In (Current Residence)" error={errors.countryLivingIn}>
              <Input name="countryLivingIn" value={customProfile.countryLivingIn || ''} onChange={handleCustomChange} placeholder="e.g. India, UAE, USA" />
            </Field>
          </div>

          {questions.filter(q => q.key !== 'declarationAccepted' && q.key !== 'countryOfCitizenship' && q.key !== 'countryLivingIn').map((q) => {
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
                  </div>
                </label>
              );
            }
            const isPhone = q.type === 'TEL' || q.type === 'PHONE' || /phone|mobile|contact|tel/i.test(q.key || '') || /phone|mobile|contact|tel/i.test(q.label || '');
            const isNumber = q.type === 'NUMBER' || /\b(pin|zip|postal|age)\b/i.test(q.key || '') || /\b(pin\s*code|zip\s*code|postal\s*code|age)\b/i.test(q.label || '');
            return (
              <Field key={q.id} label={q.label} required={q.isRequired} error={errors[q.key]}>
                <Input type={isPhone ? 'tel' : isNumber ? 'number' : 'text'} name={q.key} value={customProfile[q.key] || ''} onChange={handleCustomChange} required={q.isRequired} />
              </Field>
            );
          })}
        </section>

        {/* SECTION 3: REQUIRED CERTIFICATES & ACADEMIC TRANSCRIPTS */}
        <section className="stack" style={{ gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
            3. Required Certificates & Academic Transcripts
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '-0.5rem 0 0.5rem' }}>
            Upload clear scanned copies (.pdf, .png, .jpg). The original file names will be preserved.
          </p>

          <Field label="Passport Size Photo" required error={errors.photo}>
            <FileUploader isPublic={true} accept={{ 'image/*': ['.png', '.jpg', '.jpeg'] }} onUploaded={(url, file) => handleDocUpload('photo', url, file)} label="Upload Passport Photo" />
            <DocStatus docObj={customProfile.documents?.photo} />
          </Field>

          <div className="form-grid">
            <Field label="Aadhaar Card (Front Side)" required error={errors.aadhaarFront}>
              <FileUploader isPublic={true} accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} onUploaded={(url, file) => handleDocUpload('aadhaarFront', url, file)} label="Upload Aadhaar Front" />
              <DocStatus docObj={customProfile.documents?.aadhaarFront} />
            </Field>
            <Field label="Aadhaar Card (Back Side)" required error={errors.aadhaarBack}>
              <FileUploader isPublic={true} accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} onUploaded={(url, file) => handleDocUpload('aadhaarBack', url, file)} label="Upload Aadhaar Back" />
              <DocStatus docObj={customProfile.documents?.aadhaarBack} />
            </Field>
          </div>

          <div className="form-grid">
            <Field label="10th / SSC Certificate" required error={errors.tenthCert}>
              <FileUploader isPublic={true} accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} onUploaded={(url, file) => handleDocUpload('tenthCert', url, file)} label="Upload 10th Certificate" />
              <DocStatus docObj={customProfile.documents?.tenthCert} />
            </Field>
            <Field label="Intermediate / 12th Certificate" required error={errors.interCert}>
              <FileUploader isPublic={true} accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} onUploaded={(url, file) => handleDocUpload('interCert', url, file)} label="Upload Inter Certificate" />
              <DocStatus docObj={customProfile.documents?.interCert} />
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Degree Certificate" required error={errors.degreeCert}>
              <FileUploader isPublic={true} accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} onUploaded={(url, file) => handleDocUpload('degreeCert', url, file)} label="Upload Degree Certificate" />
              <DocStatus docObj={customProfile.documents?.degreeCert} />
            </Field>
            <Field label="Degree Academic Transcript" required error={errors.degreeTranscript}>
              <FileUploader isPublic={true} accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} onUploaded={(url, file) => handleDocUpload('degreeTranscript', url, file)} label="Upload Degree Transcript" />
              <DocStatus docObj={customProfile.documents?.degreeTranscript} />
            </Field>
          </div>

          <Field label="Reference Letter (Pastor / Elder)" required error={errors.referenceLetter}>
            <FileUploader isPublic={true} accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} onUploaded={(url, file) => handleDocUpload('referenceLetter', url, file)} label="Upload Reference Letter" />
            <DocStatus docObj={customProfile.documents?.referenceLetter} />
          </Field>

          <Field label="Other Supporting Certificates / Documents">
            <FileUploader isPublic={true} accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} onUploaded={(url, file) => handleAddOtherCert(url, file)} label="Upload Additional Certificate" />
            {customProfile.documents?.otherCertificates?.length > 0 && (
              <ul style={{ margin: '0.75rem 0 0', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {customProfile.documents.otherCertificates.map((doc, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', background: 'var(--bg-surface-muted)', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={15} color="var(--accent)" />
                      <strong>{typeof doc === 'object' ? doc.name : ('Certificate ' + (idx + 1))}</strong>
                    </span>
                    <button type="button" onClick={() => handleRemoveOtherCert(idx)} style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Field>
        </section>

        {/* SECTION 4: DECLARATION */}
        <section className="stack" style={{ gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
            4. Declaration
          </h3>
          <div style={{ background: 'var(--color-primary-50)', padding: '1.5rem', borderRadius: '10px', border: errors.declarationAccepted ? '2px solid var(--danger)' : '1px solid var(--color-primary-100)' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                name="declarationAccepted"
                checked={!!customProfile.declarationAccepted} 
                onChange={(e) => setCustomProfile(prev => ({...prev, declarationAccepted: e.target.checked}))} 
                style={{ width: '20px', height: '20px', marginTop: '4px', accentColor: 'var(--accent)' }}
                required
              />
              <div style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Student Declaration:</strong><br />
                I hereby do declare that all the details and documents which are mentioned above are true to best of my knowledge. I assure that, if I am admitted, I will abide by the rules and regulations of COTRTS-GO. I submit to the right of the Seminary administration to take any appropriate disciplinary action against me, if, in their judgment, my behavior or character is contrary to the emphasis of the seminary.
              </div>
            </label>
            {errors.declarationAccepted && (
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: '0.5rem 0 0', fontWeight: 500 }}>
                {errors.declarationAccepted}
              </p>
            )}
          </div>
        </section>
      </form>
    </Drawer>
  );
}

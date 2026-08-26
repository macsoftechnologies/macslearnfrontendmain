import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, AlertCircle, FileText, Trash2, ShieldCheck, UploadCloud } from 'lucide-react';
import AuthShell from './AuthShell';
import Input, { Field, Select, Textarea } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import FileUploader from '../../components/ui/FileUploader';
import * as authApi from '../../api/auth';
import * as regionsApi from '../../api/regions';
import * as programsApi from '../../api/programs';
import client, { extractErrorMessages } from '../../api/client';

export default function Register() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [regions, setRegions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [questions, setQuestions] = useState([]);

  // Core User Fields
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    mobile: '',
    organizationCode: slug || '',
    regionId: '',
    ataStatus: '',
  });

  // Seminary Custom Profile
  const [customProfile, setCustomProfile] = useState({
    countryOfCitizenship: '',
    countryLivingIn: '',
    documents: {
      photo: null,
      aadhaarFront: null,
      aadhaarBack: null,
      tenthCert: null,
      interCert: null,
      degreeCert: null,
      degreeTranscript: null,
      referenceLetter: null,
      otherCertificates: []
    },
    declarationAccepted: false
  });

  useEffect(() => {
    regionsApi.list({ slug, localOnly: true }).then(res => setRegions(res.data?.data || [])).catch(() => { });
    client.get('/programs/public', { params: { limit: 100, slug } }).then(res => setPrograms(res.data?.data || res.data || [])).catch(() => { });
    client.get('/form-questions').then(res => setQuestions(res.data?.data || res.data || [])).catch(() => { });
  }, [slug]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };
  
  const handleCustomChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalVal = type === 'checkbox' ? checked : value;
    if (typeof finalVal === 'string') {
      const q = questions.find(item => item.key === name);
      if (q && (q.type === 'TEL' || q.type === 'PHONE' || /phone|mobile|contact|tel/i.test(q.key) || /phone|mobile|contact|tel/i.test(q.label))) {
        finalVal = finalVal.replace(/[^0-9() +\-]/g, '');
      } else if (q && (q.type === 'NUMBER' || /\b(pin|zip|postal|age)\b/i.test(q.key) || /\b(pin\s*code|zip\s*code|postal\s*code|age)\b/i.test(q.label)) && !/lang/i.test(q.key) && !/lang/i.test(q.label)) {
        finalVal = finalVal.replace(/\D/g, '');
      }
    }
    setCustomProfile(p => ({ ...p, [name]: finalVal }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleDocUpload = (key, url, file) => {
    if (!url) {
      setCustomProfile(p => ({
        ...p,
        documents: { ...p.documents, [key]: null }
      }));
      return;
    }
    const docObj = {
      url,
      name: file?.name || 'Document',
      size: file?.size || 0
    };
    setCustomProfile(p => ({
      ...p,
      documents: { ...p.documents, [key]: docObj }
    }));
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleAddOtherCert = (url, file) => {
    if (!url) return;
    const certObj = {
      url,
      name: file?.name || `Certificate ${(customProfile.documents?.otherCertificates?.length || 0) + 1}`,
      size: file?.size || 0
    };
    setCustomProfile(p => ({
      ...p,
      documents: {
        ...p.documents,
        otherCertificates: [...(p.documents?.otherCertificates || []), certObj]
      }
    }));
  };

  const handleRemoveOtherCert = (index) => {
    setCustomProfile(p => {
      const list = [...(p.documents?.otherCertificates || [])];
      list.splice(index, 1);
      return {
        ...p,
        documents: { ...p.documents, otherCertificates: list }
      };
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // 1. Core Fields Validation
    if (!form.ataStatus) newErrors.ataStatus = 'Please select ATA or Non-ATA Track.';
    if (!form.regionId) newErrors.regionId = 'Please select a Region.';
    if (!form.fullName?.trim()) newErrors.fullName = 'Full Name is required.';
    if (!form.email?.trim()) {
      newErrors.email = 'Email Address is required.';
    } else if (!/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(form.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!form.mobile?.trim()) {
      newErrors.mobile = 'Mobile Number is required.';
    } else if (form.mobile.trim().length < 8) {
      newErrors.mobile = 'Please enter a valid mobile number.';
    }
    if (!form.password) {
      newErrors.password = 'Temporary Password is required.';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.';
    }

    // 2. Dynamic Questions Validation
    questions.forEach(q => {
      if (q.isRequired && q.key !== 'declarationAccepted' && !customProfile[q.key]) {
        newErrors[q.key] = `${q.label || q.key} is required.`;
      }
    });

    // 3. Mandatory Document Validations
    if (!customProfile.documents?.photo) {
      newErrors.photo = 'Passport Size Photo is required.';
    }
    if (!customProfile.documents?.aadhaarFront) {
      newErrors.aadhaarFront = 'Aadhaar Card (Front Side) is required.';
    }
    if (!customProfile.documents?.aadhaarBack) {
      newErrors.aadhaarBack = 'Aadhaar Card (Back Side) is required.';
    }
    if (!customProfile.documents?.tenthCert) {
      newErrors.tenthCert = '10th / SSC Certificate is required.';
    }
    if (!customProfile.documents?.interCert) {
      newErrors.interCert = 'Intermediate / 12th Certificate is required.';
    }
    if (!customProfile.documents?.degreeCert) {
      newErrors.degreeCert = 'Degree Certificate is required.';
    }
    if (!customProfile.documents?.degreeTranscript) {
      newErrors.degreeTranscript = 'Degree Academic Transcript is required.';
    }
    if (!customProfile.documents?.referenceLetter) {
      newErrors.referenceLetter = 'Reference Letter (Pastor / Elder) is required.';
    }

    // 4. Declaration
    if (!customProfile.declarationAccepted) {
      newErrors.declarationAccepted = 'You must accept the student declaration to proceed.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the highlighted errors.');
      // Auto-scroll to top of form or first error
      const firstErrEl = document.querySelector('.field--error, .error-summary');
      if (firstErrEl) {
        firstErrEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const payload = {
        ...form,
        customProfile: {
          ...customProfile,
          ataStatus: form.ataStatus
        }
      };
      await authApi.register(payload);
      setDone(true);
      toast.success('Application submitted successfully!');
    } catch (err) {
      const msgs = extractErrorMessages(err);
      toast.error(msgs.join(', '));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell slug={slug} eyebrow="Registration" title="Application Submitted">
        <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <CheckCircle2 size={48} color="var(--success)" />
          <h3 style={{ margin: '1rem 0 0.5rem', color: 'var(--text-primary)' }}>Application Received!</h3>
          <p className="text-muted" style={{ margin: '0 0 1.5rem', lineHeight: 1.6 }}>
            Your admission application has been registered under <strong>{form.ataStatus === 'ATA' ? 'ATA (Asia Theological Association)' : 'NON-ATA'}</strong> track.
            The administration will review your details and schedule an interview.
          </p>
          <Button full onClick={() => navigate(slug ? `/${slug}/login` : '/login')}>
            Go to Sign In
          </Button>
        </div>
      </AuthShell>
    );
  }

  

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)', alignItems: 'center', padding: '3rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 780 }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.1rem', margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
            Student Enrollment Application
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
            Fill in all required details below to complete your admission registration.
          </p>
        </div>

        <div style={{ background: 'var(--bg-surface-card)', padding: '2.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-md)' }}>
          <form ref={formRef} className="stack" onSubmit={onSubmit} noValidate style={{ gap: '2rem' }}>

            {/* SECTION 1: ADMISSION TRACK & BASIC INFO */}
            <section className="stack" style={{ gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={20} color="var(--primary)" /> 1. Admission Track & Personal Details
                </h3>
              </div>

              {/* ATA vs NON-ATA Prominent Dropdown */}
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <Field label="Accreditation / Track" required error={errors.ataStatus}>
                  <Select name="ataStatus" value={form.ataStatus} onChange={handleChange} style={{ fontWeight: 600, borderColor: errors.ataStatus ? 'var(--danger)' : undefined }}>
                    <option value="">-- Select Track --</option>
                    <option value="ATA">ATA (Asia Theological Association)</option>
                    <option value="NON_ATA">NON-ATA</option>
                  </Select>
                </Field>

                <Field label="Region" required error={errors.regionId}>
                  <Select name="regionId" value={form.regionId} onChange={handleChange} style={{ borderColor: errors.regionId ? 'var(--danger)' : undefined }}>
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
                  <Input type="email" name="email" value={form.email} onChange={handleChange} placeholder="john@example.com" />
                </Field>
              </div>

              <div className="form-grid">
                <Field label="Mobile Number" required error={errors.mobile}>
                  <Input type="tel" name="mobile" value={form.mobile} onChange={handleChange} placeholder="+91 98765 43210" />
                </Field>
                <Field label="Organization Code" required>
                  <Input name="organizationCode" value={form.organizationCode} onChange={handleChange} disabled={!!slug} style={slug ? { opacity: 0.7, cursor: 'not-allowed' } : {}} />
                </Field>
              </div>

              <div className="form-grid">
                <Field label="Temporary Password" required error={errors.password}>
                  <Input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Min. 8 characters" />
                </Field>
              </div>
            </section>

            {/* SECTION 2: RESIDENCE & ADDITIONAL DETAILS */}
            <section className="stack" style={{ gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
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
                      <Select name={q.key} value={customProfile[q.key] || ''} onChange={handleCustomChange}>
                        <option value="">Select a Program</option>
                        {programs.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
                      </Select>
                    </Field>
                  );
                }
                if (q.type === 'TEXTAREA') {
                  return (
                    <Field key={q.id} label={q.label} required={q.isRequired} error={errors[q.key]}>
                      <Textarea rows={3} name={q.key} value={customProfile[q.key] || ''} onChange={handleCustomChange} />
                    </Field>
                  );
                }
                if (q.type === 'DROPDOWN') {
                  const optionsList = (q.key === 'gender' || /gender/i.test(q.label || '')) ? ['Male', 'Female'] : q.options;
                  return (
                    <Field key={q.id} label={q.label} required={q.isRequired} error={errors[q.key]}>
                      <Select name={q.key} value={customProfile[q.key] || ''} onChange={handleCustomChange}>
                        <option value="">Select</option>
                        {optionsList?.map(o => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    </Field>
                  );
                }
                if (q.type === 'DATE') {
                  return (
                    <Field key={q.id} label={q.label} required={q.isRequired} error={errors[q.key]}>
                      <Input type="date" name={q.key} value={customProfile[q.key] || ''} onChange={handleCustomChange} max={new Date().toISOString().split('T')[0]} />
                    </Field>
                  );
                }
                const isPhone = q.type === 'TEL' || q.type === 'PHONE' || /phone|mobile|contact|tel/i.test(q.key || '') || /phone|mobile|contact|tel/i.test(q.label || '');
                const isNumber = (q.type === 'NUMBER' || /\b(pin|zip|postal|age)\b/i.test(q.key || '') || /\b(pin\s*code|zip\s*code|postal\s*code|age)\b/i.test(q.label || '')) && !/lang/i.test(q.key || '') && !/lang/i.test(q.label || '');

                return (
                  <Field key={q.id} label={q.label} required={q.isRequired} error={errors[q.key]}>
                    <Input 
                      type={isPhone ? 'tel' : isNumber ? 'number' : 'text'} 
                      name={q.key} 
                      value={customProfile[q.key] || ''} 
                      onChange={handleCustomChange} 
                    />
                  </Field>
                );
              })}
            </section>

            {/* SECTION 3: DEDICATED UPLOADED DOCUMENTS & TRANSCRIPTS */}
            <section className="stack" style={{ gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                3. Required Certificates & Academic Transcripts
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '-0.5rem 0 0.5rem' }}>
                Upload clear scanned copies (.pdf, .png, .jpg). The original file names will be preserved.
              </p>

              {/* Passport Photo */}
              <Field label="Passport Size Photo" required error={errors.photo}>
                <FileUploader 
                  isPublic={true} 
                  accept={{ 'image/*': ['.png', '.jpg', '.jpeg'] }} 
                  onUploaded={(url, file) => handleDocUpload('photo', url, file)} 
                  label="Upload Passport Photo" 
                />
                {customProfile.documents?.photo?.name && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={15} /> {customProfile.documents.photo.name} ✓
                  </div>
                )}
              </Field>

              {/* Aadhaar Card Front & Back */}
              <div className="form-grid">
                <Field label="Aadhaar Card (Front Side)" required error={errors.aadhaarFront}>
                  <FileUploader 
                    isPublic={true} 
                    accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} 
                    onUploaded={(url, file) => handleDocUpload('aadhaarFront', url, file)} 
                    label="Upload Aadhaar Front" 
                  />
                  {customProfile.documents?.aadhaarFront?.name && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--success)' }}>
                      📄 {customProfile.documents.aadhaarFront.name} ✓
                    </div>
                  )}
                </Field>

                <Field label="Aadhaar Card (Back Side)" required error={errors.aadhaarBack}>
                  <FileUploader 
                    isPublic={true} 
                    accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} 
                    onUploaded={(url, file) => handleDocUpload('aadhaarBack', url, file)} 
                    label="Upload Aadhaar Back" 
                  />
                  {customProfile.documents?.aadhaarBack?.name && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--success)' }}>
                      📄 {customProfile.documents.aadhaarBack.name} ✓
                    </div>
                  )}
                </Field>
              </div>

              {/* 10th & Intermediate Certificates */}
              <div className="form-grid">
                <Field label="10th / SSC Certificate" required error={errors.tenthCert}>
                  <FileUploader 
                    isPublic={true} 
                    accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} 
                    onUploaded={(url, file) => handleDocUpload('tenthCert', url, file)} 
                    label="Upload 10th Certificate" 
                  />
                  {customProfile.documents?.tenthCert?.name && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--success)' }}>
                      📄 {customProfile.documents.tenthCert.name} ✓
                    </div>
                  )}
                </Field>

                <Field label="Intermediate / 12th Certificate" required error={errors.interCert}>
                  <FileUploader 
                    isPublic={true} 
                    accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} 
                    onUploaded={(url, file) => handleDocUpload('interCert', url, file)} 
                    label="Upload Inter Certificate" 
                  />
                  {customProfile.documents?.interCert?.name && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--success)' }}>
                      📄 {customProfile.documents.interCert.name} ✓
                    </div>
                  )}
                </Field>
              </div>

              {/* Degree Certificate & Official Degree Transcript */}
              <div className="form-grid">
                <Field label="Degree Certificate" required error={errors.degreeCert}>
                  <FileUploader 
                    isPublic={true} 
                    accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} 
                    onUploaded={(url, file) => handleDocUpload('degreeCert', url, file)} 
                    label="Upload Degree Certificate" 
                  />
                  {customProfile.documents?.degreeCert?.name && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--success)' }}>
                      📄 {customProfile.documents.degreeCert.name} ✓
                    </div>
                  )}
                </Field>

                <Field label="Degree Academic Transcript" required error={errors.degreeTranscript}>
                  <FileUploader 
                    isPublic={true} 
                    accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} 
                    onUploaded={(url, file) => handleDocUpload('degreeTranscript', url, file)} 
                    label="Upload Degree Transcript" 
                  />
                  {customProfile.documents?.degreeTranscript?.name && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--success)' }}>
                      📄 {customProfile.documents.degreeTranscript.name} ✓
                    </div>
                  )}
                </Field>
              </div>

              {/* Reference Letter */}
              <Field label="Reference Letter (Pastor / Elder)" required error={errors.referenceLetter}>
                <FileUploader 
                  isPublic={true} 
                  accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} 
                  onUploaded={(url, file) => handleDocUpload('referenceLetter', url, file)} 
                  label="Upload Reference Letter" 
                />
                {customProfile.documents?.referenceLetter?.name && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--success)' }}>
                    📄 {customProfile.documents.referenceLetter.name} ✓
                  </div>
                )}
              </Field>

              {/* Additional Other Certificates */}
              <Field label="Other Supporting Certificates / Documents">
                <FileUploader 
                  isPublic={true} 
                  accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }} 
                  onUploaded={(url, file) => handleAddOtherCert(url, file)} 
                  label="Upload Additional Certificate" 
                />
                {customProfile.documents?.otherCertificates?.length > 0 && (
                  <ul style={{ margin: '0.75rem 0 0', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {customProfile.documents.otherCertificates.map((doc, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', background: 'var(--bg-surface-muted)', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={15} color="var(--primary)" />
                          <strong>{doc.name || `Certificate ${idx + 1}`}</strong>
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
              <h3 style={{ fontSize: '1.15rem', margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                4. Declaration
              </h3>
              <div style={{ background: 'var(--bg-surface-muted)', padding: '1.5rem', borderRadius: '8px', border: errors.declarationAccepted ? '2px solid var(--danger)' : '1px solid var(--border-subtle)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="declarationAccepted"
                    checked={!!customProfile.declarationAccepted}
                    onChange={(e) => setCustomProfile(prev => ({ ...prev, declarationAccepted: e.target.checked }))}
                    style={{ width: '20px', height: '20px', marginTop: '4px' }}
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

            {/* Submit Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <Button type="submit" loading={loading} style={{ minWidth: 200 }}>
                Submit Application
              </Button>
            </div>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          Already have an account? <Link to={slug ? `/${slug}/login` : '/login'} style={{ fontWeight: 600 }}>Sign in here</Link>
        </div>
      </div>
    </div>
  );
}

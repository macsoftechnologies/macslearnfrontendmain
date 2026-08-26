import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import * as coursesApi from '../../api/courses';
import * as usersApi from '../../api/users';
import * as organizationsApi from '../../api/organizations';
import * as regionsApi from '../../api/regions';
import * as programsApi from '../../api/programs';
import * as semestersApi from '../../api/semesters';
import { extractErrorMessages } from '../../api/client';
import Input, { Field, Textarea, Select } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import FileUploader from '../../components/ui/FileUploader';
import PageLoader from '../../components/ui/PageLoader';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const initial = {
  credits: '',
  regionalPrices: [],
  thumbnailUrl: '',
  programId: '',
  semesterId: ''
};

export default function CourseForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isFaculty = location.pathname.startsWith('/faculty');
  const base = isFaculty ? '/faculty' : '/admin';
  const searchParams = new URLSearchParams(location.search);
  const qProgramId = searchParams.get('programId');
  const qSemesterId = searchParams.get('semesterId');
  
  const backUrl = qProgramId ? `${base}/programs/${qProgramId}` : `${base}/courses`;
  const backText = qProgramId ? 'Back to Program' : 'Back to courses';

  const [form, setForm] = useState({
    ...initial
  });
  const [categories, setCategories] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [regions, setRegions] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    Promise.all([
      usersApi.list({ userType: 'FACULTY', limit: 100 }),
      regionsApi.list({ localOnly: true }),
      programsApi.list()
    ]).then(([usersRes, regRes, progRes]) => {
      const allUsers = usersRes.data?.data || [];
      setFaculty(allUsers.filter((u) => u.userType === 'FACULTY'));
      setRegions(regRes.data?.data || regRes.data || []);
      setPrograms(progRes.data?.data || progRes.data || []);
    }).catch(() => {});
    
    if (!isEdit && qProgramId) {
      setForm(f => ({ ...f, programIds: [qProgramId] }));
    }
    if (isFaculty) {
      const myId = user?._id || user?.id;
      if (myId) setForm((f) => ({ ...f, instructorIds: [myId] }));
    }
    if (isEdit) {
      coursesApi.getById(id).then((res) => {
        const data = res.data?.data || {};
        const instructorEntities = data.instructorIds?.length
          ? data.instructorIds
          : data.instructor
            ? [data.instructor]
            : data.faculty
              ? [data.faculty]
              : [];
        setForm({ 
          ...initial, 
          ...data,
          title: data.title || '',
          description: data.description || '',
          thumbnailUrl: data.thumbnailUrl || '',
          instructorIds: instructorEntities.map((i) => i.id || i._id || i),
          credits: data.credits || '',
          regionalPrices: Array.isArray(data.regionalPrices) 
            ? data.regionalPrices.map(rp => ({ regionId: rp.regionId, price: rp.price, currency: rp.currency || 'USD' }))
            : [],
          certificateTemplateId: data.certificateTemplateId || '',
          certificateIssueMode: data.certificateIssueMode || 'AUTO'
        });
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id, isEdit, isFaculty, user]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));

  const submit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSaving(true);
    const payload = { 
      title: form.title,
      description: form.description,
      instructorIds: form.instructorIds,
      programIds: form.programIds, // ADDED THIS
      credits: Number(form.credits) || 0,
      pricing: { isPaid: false, amount: 0, currency: 'USD' }, // Removed base price
      regionalPrices: (form.regionalPrices || [])
        .filter(rp => rp.regionId && rp.price !== '' && rp.price !== null && rp.price !== undefined)
        .map(rp => ({ regionId: rp.regionId, price: Number(rp.price), currency: rp.currency })),
      thumbnailUrl: form.thumbnailUrl
    };
    try {
      if (isEdit) {
        await coursesApi.update(id, payload);
        toast.success('Course updated');
      } else {
        const { data } = await coursesApi.create(payload);
        toast.success('Course created');
        navigate(`${base}/courses/${data?.data?._id || data?.data?.id || ''}`);
        return;
      }
      navigate(`${base}/courses/${id}`);
    } catch (err) {
      setErrors(extractErrorMessages(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <style>{`
        .ql-editor {
          min-height: 250px;
          font-size: var(--fs-sm);
        }
      `}</style>
      <Link to={backUrl} className="row text-muted" style={{ marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
        <ArrowLeft size={14} /> {backText}
      </Link>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Catalog</span>
          <h1 className="page-title">{isEdit ? 'Edit Course' : 'Create Course'}</h1>
        </div>
      </div>

      <Card style={{ padding: 'var(--sp-6)' }}>
        <form className="stack" onSubmit={submit}>
          {errors.length > 0 && <div className="auth-error-box"><ul>{errors.map((m, i) => <li key={i}>{m}</li>)}</ul></div>}

          <div className="form-grid">
            <Field label="Course Title" required><Input value={form.title} onChange={update('title')} required /></Field>
            <Field label="Credits"><Input type="number" min={0} step="any" value={form.credits} onChange={update('credits')} placeholder="e.g. 3" /></Field>
          </div>
          
          {regions.length > 0 && (
            <div style={{ marginTop: 'var(--sp-4)', padding: 'var(--sp-4)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                <h3 style={{ fontSize: 'var(--fs-sm)', margin: 0 }}>Course Pricing</h3>
                <Button size="sm" variant="outline" type="button" onClick={() => setForm(f => ({ ...f, regionalPrices: [...f.regionalPrices, { regionId: '', price: '', currency: 'USD' }] }))}>
                  <Plus size={14} style={{ marginRight: 4 }} /> Add Price
                </Button>
              </div>
              <p className="text-muted" style={{ fontSize: 'var(--fs-xs)', marginBottom: 'var(--sp-4)' }}>Set prices and currencies for specific regions. Students will see the price matching their region.</p>
              
              {form.regionalPrices.map((rp, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: 'var(--sp-3)', alignItems: 'end', marginBottom: 'var(--sp-3)' }}>
                  <Field label="Region">
                    <Select value={rp.regionId} onChange={(e) => {
                      const newArr = [...form.regionalPrices];
                      newArr[idx].regionId = e.target.value;
                      setForm(f => ({ ...f, regionalPrices: newArr }));
                    }}>
                      <option value="">Select Region</option>
                      {regions.map(r => <option key={r.id || r._id} value={r.id || r._id}>{r.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Currency">
                    <Select value={rp.currency} onChange={(e) => {
                      const newArr = [...form.regionalPrices];
                      newArr[idx].currency = e.target.value;
                      setForm(f => ({ ...f, regionalPrices: newArr }));
                    }}>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="CAD">CAD ($)</option>
                    </Select>
                  </Field>
                  <Field label="Price">
                    <Input type="number" step="0.01" min={0} value={rp.price} onChange={(e) => {
                      const newArr = [...form.regionalPrices];
                      newArr[idx].price = e.target.value;
                      setForm(f => ({ ...f, regionalPrices: newArr }));
                    }} placeholder="e.g. 29.99" />
                  </Field>
                  <Button variant="danger" size="sm" type="button" style={{ marginBottom: '4px' }} onClick={() => {
                    const newArr = [...form.regionalPrices];
                    newArr.splice(idx, 1);
                    setForm(f => ({ ...f, regionalPrices: newArr }));
                  }}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              
              {form.regionalPrices.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-app)', borderRadius: '4px' }}>
                  <span className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>No regional overrides added.</span>
                </div>
              )}
            </div>
          )}

          <Field label="Description">
            <ReactQuill
              theme="snow"
              value={form.description}
              onChange={(value) => setForm((f) => ({ ...f, description: value }))}
              modules={{
                toolbar: [
                  [{ 'header': [1, 2, 3, false] }],
                  ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                  [{ 'color': [] }, { 'background': [] }],
                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                  ['link', 'image'],
                  ['clean']
                ],
              }}
              style={{
                backgroundColor: 'var(--bg-app)',
                color: 'inherit'
              }}
            />
          </Field>

          <div className="form-grid">

            {/* Co-instructors available for both org admin and faculty */}
            {true && (
              <Field label="Course Instructors">
                <Select
                  multiple
                  value={form.instructorIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                    setForm(f => ({ ...f, instructorIds: selected }));
                  }}
                  style={{ minHeight: '100px' }}
                >
                  {faculty.map((f) => <option key={f._id || f.id} value={f._id || f.id}>{f.fullName}</option>)}
                </Select>
              </Field>
            )}

            <Field label="Assign to Programs (Optional)">
              <Select
                multiple
                value={form.programIds || []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                  setForm(f => ({ ...f, programIds: selected }));
                }}
                style={{ minHeight: '100px' }}
              >
                {programs.map(p => (
                  <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                ))}
              </Select>
            </Field>
          </div>


          <Field label="Thumbnail">
            <FileUploader accept={{ 'image/*': [] }} preview={form.thumbnailUrl} onUploaded={(url) => update('thumbnailUrl')(url)} label="Upload a course thumbnail" />
          </Field>

          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 'var(--sp-2)' }}>
            <Link to={backUrl}><Button variant="outline" type="button">Cancel</Button></Link>
            <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Create Course'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

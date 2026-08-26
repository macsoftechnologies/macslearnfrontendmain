import React, { useState, useEffect } from 'react';
import { Download, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import DataTable from '../../../components/ui/DataTable';
import Input, { Field, Select } from '../../../components/ui/Input';
import * as transcriptsApi from '../../../api/transcripts';
import * as manualGradesApi from '../../../api/manualGrades';
import * as academicBatchesApi from '../../../api/academicBatches';
import * as coursesApi from '../../../api/courses';
import * as semestersApi from '../../../api/semesters';

const GenerateTranscriptPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(null);
  
  const [batchId, setBatchId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [courseId, setCourseId] = useState('');
  
  const [batches, setBatches] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    academicBatchesApi.list().then(res => setBatches(res?.data || res || [])).catch(() => {});
    semestersApi.list().then(res => setSemesters(res?.data || res || [])).catch(() => {});
    coursesApi.list().then(res => setCourses(res?.data?.data || res?.data || [])).catch(() => {});
  }, []);

  const handleLoad = async () => {
    if (!batchId || !courseId) {
      toast.error('Please select a Batch and Course to fetch students');
      return;
    }
    setLoading(true);
    try {
      const sem = semesterId || 'all';
      const res = await manualGradesApi.listGrades(batchId, sem, courseId);
      const studentMap = (res.data || []).map(s => ({
        id: s.studentId,
        name: (s.student?.firstName || 'Student') + ' ' + (s.student?.lastName || ''),
        program: s.student?.program?.name || 'Degree Program',
        conduct: 'Satisfactory',
        awards: 'None'
      }));
      
      const uniqueStudents = Array.from(new Map(studentMap.map(item => [item.id, item])).values());
      setStudents(uniqueStudents);
      if (uniqueStudents.length === 0) toast.error('No enrolled students found');
    } catch (err) {
      toast.error('Failed to load class list');
    } finally {
      setLoading(false);
    }
  };

  const handleMetadataChange = (id, field, value) => {
    setStudents(students.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleGenerate = async (id) => {
    const student = students.find(s => s.id === id);
    setGenerating(id);
    try {
      const metadata = { conduct: student.conduct, awards: student.awards };
      const blob = await transcriptsApi.generate(id, batchId, metadata);
      
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transcript-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Transcript downloaded successfully!');
    } catch (err) {
      toast.error('Failed to generate transcript');
    } finally {
      setGenerating(null);
    }
  };

  const selectedBatch = batches.find(b => b.id === batchId);
  const filteredSemesters = selectedBatch?.programId 
    ? semesters.filter(s => s.programId === selectedBatch.programId)
    : semesters;
  
  const filteredCourses = selectedBatch?.programId
    ? courses.filter(c => c.programId === selectedBatch.programId || !c.programId)
    : courses;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Academic Records</span>
          <h1 className="page-title">Generate Official Transcripts</h1>
          <p className="page-subtitle">Attach Dean's conduct and honors remarks before generating official academic PDF transcripts.</p>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <Field label="Cohort / Batch *">
            <Select value={batchId} onChange={e => {
              setBatchId(e.target.value);
              setSemesterId('');
              setCourseId('');
            }}>
              <option value="">-- Select Batch --</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>

          {filteredSemesters.length > 0 && (
            <Field label="Semester (Optional)">
              <Select value={semesterId} onChange={e => setSemesterId(e.target.value)} disabled={!batchId}>
                <option value="">-- All Semesters --</option>
                {filteredSemesters.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name || s.term}</option>)}
              </Select>
            </Field>
          )}

          <Field label="Course *">
            <Select value={courseId} onChange={e => setCourseId(e.target.value)} disabled={!batchId}>
              <option value="">-- Select Course --</option>
              {filteredCourses.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.title}</option>)}
            </Select>
          </Field>

          <Button icon={Search} onClick={handleLoad} loading={loading} disabled={!batchId || !courseId} variant="primary">
            Load Class List
          </Button>
        </div>
      </div>

      <DataTable
        loading={loading}
        emptyLabel="No students found."
        columns={[
          { key: 'id', header: 'Student ID' },
          { key: 'name', header: 'Student Name' },
          { key: 'program', header: 'Program' },
          { 
            key: 'conduct', 
            header: 'Conduct Remarks', 
            render: (r) => (
              <Input 
                placeholder="e.g. Excellent"
                value={r.conduct} 
                onChange={(e) => handleMetadataChange(r.id, 'conduct', e.target.value)}
              />
            ) 
          },
          { 
            key: 'awards', 
            header: 'Awards / Class', 
            render: (r) => (
              <Input 
                placeholder="e.g. First Class"
                value={r.awards} 
                onChange={(e) => handleMetadataChange(r.id, 'awards', e.target.value)}
              />
            ) 
          },
          {
            key: 'actions', header: 'Actions', render: (r) => (
              <Button 
                size="sm" 
                icon={Download} 
                onClick={() => handleGenerate(r.id)} 
                loading={generating === r.id}
              >
                Download Transcript
              </Button>
            ),
          },
        ]}
        rows={students}
      />
    </div>
  );
};

export default GenerateTranscriptPage;

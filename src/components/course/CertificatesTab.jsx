import React, { useState, useEffect } from 'react';
import * as resultsApi from '../../api/results';
import * as certificatesApi from '../../api/certificates';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import StatusBadge from '../ui/StatusBadge';
import { extractErrorMessages } from '../../api/client';
import toast from 'react-hot-toast';

export default function CertificatesTab({ courseId }) {
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [data, setData] = useState([]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [resultsRes, certsRes] = await Promise.all([
        resultsApi.courseResults(courseId),
        certificatesApi.courseCertificates(courseId)
      ]);
      
      const allResults = resultsRes.data?.data || resultsRes.data || [];
      const allCerts = certsRes.data?.data || certsRes.data || [];
      
      const certMap = {};
      allCerts.forEach(c => {
        certMap[c.studentId?._id || c.studentId?.id || c.studentId] = c;
      });
      
      const passedResults = allResults.filter(r => 
        (r.isPassed === true || r.isPassed === 1) && 
        (r.isPublished === true || r.isPublished === 1)
      );
      
      const studentMap = {};
      passedResults.forEach(r => {
        const sid = r.studentId?._id || r.studentId?.id;
        if (!studentMap[sid]) {
          studentMap[sid] = {
            student: r.studentId,
            certificate: certMap[sid] || null,
          };
        }
      });
      
      setData(Object.values(studentMap));
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) loadData();
  }, [courseId]);
  
  const handleIssue = async (studentId) => {
    try {
      await certificatesApi.approveCertificate({ studentId, courseId });
      toast.success('Certificate issued successfully');
      loadData();
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    }
  };

  const handleIssueAll = async () => {
    const pending = data.filter(d => !d.certificate);
    if (pending.length === 0) {
      toast.success('All qualified students have already received their certificates.');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to issue certificates to ${pending.length} students?`)) return;
    
    setIssuing(true);
    let successCount = 0;
    for (const item of pending) {
      try {
        await certificatesApi.approveCertificate({ studentId: item.student._id || item.student.id, courseId });
        successCount++;
      } catch (err) {
        console.error('Failed to issue for', item.student, err);
      }
    }
    
    setIssuing(false);
    toast.success(`Successfully issued ${successCount} out of ${pending.length} certificates.`);
    loadData();
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Certificates</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
            Manage certificates for students who have successfully completed the course requirements.
          </p>
        </div>
        <div>
          <Button variant="primary" onClick={handleIssueAll} loading={issuing}>
            Issue All Pending
          </Button>
        </div>
      </div>
      
      <DataTable
        data={data}
        loading={loading}
        columns={[
          { key: 'student', header: 'Student', render: (r) => r.student?.fullName || r.student?.email },
          { key: 'status', header: 'Status', render: (r) => (
            <StatusBadge 
              status={r.certificate ? 'SUCCESS' : 'WARNING'} 
              label={r.certificate ? 'ISSUED' : 'PENDING'} 
            />
          )},
          { key: 'issuedAt', header: 'Issued At', render: (r) => (
            r.certificate?.issuedAt ? new Date(r.certificate.issuedAt).toLocaleDateString() : '—'
          )},
          { key: 'actions', header: '', render: (r) => (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              {r.certificate ? (
                <a 
                  href={r.certificate.certificateUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn btn-outline"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  View / Resend
                </a>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  onClick={() => handleIssue(r.student._id || r.student.id)}
                >
                  Issue Certificate
                </Button>
              )}
            </div>
          )}
        ]}
      />
    </div>
  );
}

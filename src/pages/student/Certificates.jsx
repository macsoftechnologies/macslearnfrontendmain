import { useEffect, useState } from 'react';
import { Award, Download } from 'lucide-react';
import * as certificatesApi from '../../api/certificates';
import { buildStaticUrl } from '../../api/client';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';

export default function Certificates() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    certificatesApi.myCertificates().then((res) => setCerts(res.data?.data || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Achievements</span>
          <h1 className="page-title">Certificates</h1>
          <p className="page-subtitle">Certificates earned from completed courses.</p>
        </div>
      </div>

      {certs.length === 0 ? (
        <EmptyState icon={Award} title="No certificates yet" description="Complete a course to earn your first certificate." />
      ) : (
        <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {certs.map((c) => (
            <div key={c.id} className="card" style={{ padding: 'var(--sp-5)', textAlign: 'center' }}>
              <Award size={32} color="var(--color-amber-500)" style={{ margin: '0 auto var(--sp-3)' }} />
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-md)' }}>{c.course?.title || c.courseTitle || 'Course'}</strong>
              <p className="text-muted" style={{ fontSize: 'var(--fs-xs)', margin: '6px 0 var(--sp-4)' }}>
                Issued {c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : '—'}
              </p>
              {c.certificateUrl && (
                <a href={buildStaticUrl(c.certificateUrl)} target="_blank" rel="noreferrer">
                  <Button size="sm" icon={Download} full>Download</Button>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import * as api from '../../api/certificates';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import PageLoader from '../../components/ui/PageLoader';
import { buildStaticUrl } from '../../api/client';

const DUMMY_DATA = {
  student_name: 'John Doe',
  course_title: 'Advanced Web Development',
  completion_date: new Date().toLocaleDateString(),
  certificate_number: 'CERT-ABCD1234'
};

export default function CertificateTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const navigate = useNavigate();
  
  // Real PDF A4 Landscape Dimensions
  const A4_WIDTH = 842;
  const A4_HEIGHT = 595;

  const load = () => {
    setLoading(true);
    api.listTemplates()
      .then(res => setTemplates(res.data?.data || []))
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div style={{ padding: 'var(--sp-6)' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700 }}>Certificate Templates</h1>
          <p className="text-muted">Design and manage certificate templates for your organization.</p>
        </div>
        <Button icon={Plus} onClick={() => navigate('/admin/certificate-templates/create')}>Create Template</Button>
      </div>

      <DataTable
        emptyLabel="No templates created yet."
        columns={[
          { key: 'name', header: 'Template Name', render: (r) => r.name },
          { key: 'bgType', header: 'Background', render: (r) => r.backgroundType },
          { key: 'fields', header: 'Dynamic Fields', render: (r) => r.fields?.length || 0 },
          { key: 'createdAt', header: 'Created At', render: (r) => new Date(r.createdAt).toLocaleDateString() },
          {
            key: 'actions', header: 'Actions', render: (r) => (
              <div className="row" style={{ gap: '8px' }}>
                <Button size="sm" variant="ghost" onClick={() => setPreviewTemplate(r)}>Preview</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/admin/certificate-templates/${r._id || r.id}`)}>Edit Template</Button>
              </div>
            )
          }
        ]}
        rows={templates}
      />

      <Modal open={!!previewTemplate} onClose={() => setPreviewTemplate(null)} title="Template Preview" width={950}>
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', background: 'var(--color-paper-50)' }}>
          {/* Layout Wrapper */}
          <div style={{ width: `${A4_WIDTH * 0.9}px`, height: `${A4_HEIGHT * 0.9}px`, position: 'relative', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', background: '#fff' }}>
            <div style={{
              width: `${A4_WIDTH}px`,
              height: `${A4_HEIGHT}px`,
              backgroundColor: previewTemplate?.backgroundType === 'BLANK' ? '#ffffff' : 'transparent',
              backgroundImage: previewTemplate?.backgroundType === 'IMAGE' && previewTemplate?.backgroundImageUrl ? `url('${buildStaticUrl(previewTemplate.backgroundImageUrl)}')` : 'none',
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              position: 'absolute',
              top: 0,
              left: 0,
              overflow: 'hidden',
              transform: 'scale(0.9)',
              transformOrigin: 'top left'
            }}>
              {(previewTemplate?.fields || []).map((f, i) => {
              if (f.type === 'text') {
                return (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${f.x}px`,
                    top: `${f.y}px`,
                    transform: 'translate(-50%, -50%)',
                    fontSize: `${f.fontSize || 16}px`,
                    color: f.color || '#000000',
                    fontFamily: f.fontFamily || 'Helvetica',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    {f.variable ? (DUMMY_DATA[f.variable] || `[${f.variable}]`) : f.value || 'Text Field'}
                  </div>
                );
              }
              if (f.type === 'image') {
                return (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${f.x}px`,
                    top: `${f.y}px`,
                    transform: 'translate(-50%, -50%)'
                  }}>
                    <img 
                      src={buildStaticUrl(f.url)} 
                      alt="embedded" 
                      style={{ 
                        width: `${f.width || 100}px`, 
                        height: `${f.height || 50}px`, 
                        objectFit: 'contain',
                        opacity: f.opacity !== undefined ? f.opacity : 1
                      }} 
                    />
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
        </div>
        <div className="modal-panel__foot" style={{ margin: '0 -24px -24px', padding: '16px 24px', justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close Preview</Button>
        </div>
      </Modal>
    </div>
  );
}

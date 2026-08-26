import { useState, useEffect, useRef } from 'react';
import { Plus, Image as ImageIcon, Type, Save, Trash2, X, ArrowLeft, Settings, Layers, FileSignature, Droplet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../../api/certificates';
import Button from '../../components/ui/Button';
import Input, { Field, Select } from '../../components/ui/Input';
import FileUploader from '../../components/ui/FileUploader';
import PageLoader from '../../components/ui/PageLoader';
import { buildStaticUrl } from '../../api/client';

const DUMMY_DATA = {
  student_name: 'John Doe',
  course_title: 'Advanced Web Development',
  completion_date: new Date().toLocaleDateString(),
  certificate_number: 'CERT-ABCD1234'
};

const A4_WIDTH = 842;
const A4_HEIGHT = 595;

function DraggableElement({ field, index, onUpdate, onRemove, scale = 1, onSelect, isSelected }) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, initX: 0, initY: 0 });

  const handleMouseDown = (e) => {
    e.stopPropagation();
    onSelect(index);
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      initX: field.x,
      initY: field.y
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e) => {
      const dx = (e.clientX - dragStart.current.x) / scale;
      const dy = (e.clientY - dragStart.current.y) / scale;
      onUpdate(index, { 
        ...field, 
        x: Math.round(dragStart.current.initX + dx),
        y: Math.round(dragStart.current.initY + dy)
      });
    };
    
    const handleMouseUp = () => setIsDragging(false);
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, field, index, onUpdate, scale]);

  const style = {
    position: 'absolute',
    left: `${field.x}px`,
    top: `${field.y}px`,
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    border: isSelected ? '2px dashed var(--color-primary-500)' : '2px dashed transparent',
    padding: '4px',
    transform: 'translate(-50%, -50%)',
    zIndex: field.type === 'text' ? 10 : 5,
  };

  if (field.type === 'text') {
    return (
      <div style={style} onMouseDown={handleMouseDown}>
        <div style={{
          fontSize: `${field.fontSize || 16}px`,
          color: field.color || '#000000',
          fontFamily: field.fontFamily || 'Helvetica',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          background: 'rgba(255, 255, 255, 0.7)',
          padding: '2px 8px',
          borderRadius: '4px'
        }}>
          {field.variable ? (DUMMY_DATA[field.variable] || `[${field.variable}]`) : field.value || 'Text Field'}
        </div>
        {isSelected && (
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(index); }}
            style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'red', color: 'white', borderRadius: '50%', border: 'none', cursor: 'pointer', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}
          >
            <X size={12} />
          </button>
        )}
      </div>
    );
  }

  if (field.type === 'image') {
    return (
      <div style={style} onMouseDown={handleMouseDown}>
        <img 
          src={buildStaticUrl(field.url)} 
          alt="embedded" 
          style={{ 
            width: `${field.width || 100}px`, 
            height: `${field.height || 50}px`, 
            objectFit: 'contain',
            background: 'rgba(255, 255, 255, 0.7)',
            padding: '4px',
            borderRadius: '4px',
            opacity: field.opacity !== undefined ? field.opacity : 1
          }} 
          draggable={false}
        />
        {isSelected && (
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(index); }}
            style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'red', color: 'white', borderRadius: '50%', border: 'none', cursor: 'pointer', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}
          >
            <X size={12} />
          </button>
        )}
      </div>
    );
  }

  return null;
}

export default function CertificateTemplateBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  
  const [templateName, setTemplateName] = useState('');
  const [bgType, setBgType] = useState('BLANK');
  const [bgUrl, setBgUrl] = useState('');
  const [fields, setFields] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  
  const canvasContainerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.listTemplates()
        .then(res => {
          const templates = res.data?.data || res.data;
          const template = templates.find(t => (t._id === id || t.id === id));
          if (template) {
            setTemplateName(template.name || '');
            setBgType(template.backgroundType || 'BLANK');
            setBgUrl(template.backgroundImageUrl || '');
            setFields(template.fields || []);
          } else {
             toast.error('Template not found');
             navigate('/admin/certificate-templates');
          }
        })
        .catch(() => {
          toast.error('Failed to load template');
        })
        .finally(() => setLoading(false));
    } else {
      setTemplateName('');
      setBgType('BLANK');
      setBgUrl('');
      setFields([
        { 
          type: 'text', 
          value: 'Certificate of Completion', 
          x: A4_WIDTH / 2, 
          y: 120, 
          fontSize: 48, 
          color: '#000000', 
          fontFamily: 'Helvetica' 
        },
        { 
          type: 'text', 
          variable: 'student_name', 
          x: A4_WIDTH / 2, 
          y: 280, 
          fontSize: 40, 
          color: '#1a242f', 
          fontFamily: 'Helvetica' 
        },
        { 
          type: 'text', 
          value: 'has successfully completed the course', 
          x: A4_WIDTH / 2, 
          y: 340, 
          fontSize: 20, 
          color: '#000000', 
          fontFamily: 'Helvetica' 
        },
        { 
          type: 'text', 
          variable: 'course_title', 
          x: A4_WIDTH / 2, 
          y: 400, 
          fontSize: 24, 
          color: '#2980b9', 
          fontFamily: 'Helvetica' 
        },
        { 
          type: 'text', 
          variable: 'certificate_number', 
          x: A4_WIDTH / 2, 
          y: 500, 
          fontSize: 14, 
          color: '#7f8c8d', 
          fontFamily: 'Helvetica' 
        }
      ]);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (loading) return;
    if (canvasContainerRef.current) {
      const updateScale = () => {
        const containerWidth = canvasContainerRef.current.clientWidth;
        const containerHeight = canvasContainerRef.current.clientHeight;
        const scaleX = (containerWidth - 40) / A4_WIDTH;
        const scaleY = (containerHeight - 40) / A4_HEIGHT;
        const newScale = Math.min(scaleX, scaleY, 1);
        setScale(newScale);
      };
      updateScale();
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }
  }, [loading]);

  const addTextField = () => {
    setFields([...fields, { 
      type: 'text', 
      variable: 'student_name', 
      x: A4_WIDTH / 2, 
      y: A4_HEIGHT / 2, 
      fontSize: 32, 
      color: '#000000', 
      fontFamily: 'Helvetica' 
    }]);
  };
  
  const addSignatureField = (uploadedUrl) => {
    setFields([...fields, { 
      type: 'image', 
      url: uploadedUrl, 
      x: A4_WIDTH / 2 + 200, 
      y: A4_HEIGHT - 100, 
      width: 150, 
      height: 60 
    }]);
  };

  const addWatermarkField = (uploadedUrl) => {
    setFields([...fields, { 
      type: 'image', 
      url: uploadedUrl, 
      x: A4_WIDTH / 2, 
      y: A4_HEIGHT / 2, 
      width: 300, 
      height: 300,
      opacity: 0.15
    }]);
  };

  const updateField = (index, newField) => {
    const updated = [...fields];
    updated[index] = newField;
    setFields(updated);
  };

  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!templateName) return toast.error('Please enter a template name');
    setSaving(true);
    try {
      const payload = {
        name: templateName,
        backgroundType: bgType,
        backgroundImageUrl: bgUrl,
        fields
      };
      if (id) {
        await api.updateTemplate(id, payload);
        toast.success('Template updated successfully');
      } else {
        await api.createTemplate(payload);
        toast.success('Template saved successfully');
      }
      navigate('/admin/certificate-templates');
    } catch (err) {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const activeField = selectedIndex !== null ? fields[selectedIndex] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-h))', boxSizing: 'border-box', background: 'var(--bg-app)' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-glass)', backdropFilter: 'var(--backdrop-blur)', flexShrink: 0, zIndex: 10 }}>
        <div className="row" style={{ gap: '16px' }}>
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/admin/certificate-templates')}>
            Back
          </Button>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
          <Input 
            value={templateName} 
            onChange={e => setTemplateName(e.target.value)} 
            placeholder="Template Name..." 
            style={{ border: 'none', background: 'rgba(255, 255, 255, 0.04)', fontSize: '16px', fontWeight: 600, width: '300px', padding: '6px 12px' }} 
          />
        </div>
        <div className="row" style={{ gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <span>A4 Landscape (842 x 595 px)</span>
          <span>Zoom: {Math.round(scale * 100)}%</span>
        </div>
        <div className="row" style={{ gap: '12px' }}>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/certificate-templates')}>Cancel</Button>
          <Button icon={Save} size="sm" onClick={handleSave} loading={saving}>Save Template</Button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        
        {/* Left Tool Strip */}
        <div style={{ width: '76px', flexShrink: 0, borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-surface-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: '24px' }}>
          <div className="stack" style={{ alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-primary)' }} onClick={addTextField}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid var(--border-strong)', color: 'var(--color-indigo-400)', transition: 'all var(--transition-fast)' }}>
              <Type size={20} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Text</span>
          </div>

          <FileUploader 
            onUploaded={addSignatureField}
            renderCustom={({ getRootProps, getInputProps }) => (
              <div {...getRootProps()} className="stack" style={{ alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input {...getInputProps()} />
                <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.3)', color: 'var(--color-violet-400)', transition: 'all var(--transition-fast)' }}>
                  <FileSignature size={20} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Signature</span>
              </div>
            )}
          />

          <FileUploader 
            onUploaded={addWatermarkField}
            renderCustom={({ getRootProps, getInputProps }) => (
              <div {...getRootProps()} className="stack" style={{ alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input {...getInputProps()} />
                <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', color: 'var(--color-cyan-400)', transition: 'all var(--transition-fast)' }}>
                  <Droplet size={20} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Seal</span>
              </div>
            )}
          />
        </div>

        {/* Center Canvas Workspace */}
        <div 
          ref={canvasContainerRef} 
          onMouseDown={() => setSelectedIndex(null)}
          style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', background: 'var(--bg-app)' }}
        >
          {/* Layout Wrapper to reserve exact scaled space */}
          <div style={{ width: `${A4_WIDTH * scale}px`, height: `${A4_HEIGHT * scale}px`, position: 'relative', boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)', background: '#FFFFFF', borderRadius: '4px' }}>
            
            {/* Visual Canvas (scaled down via CSS transform) */}
            <div style={{
              width: `${A4_WIDTH}px`,
              height: `${A4_HEIGHT}px`,
              backgroundColor: bgType === 'BLANK' ? '#ffffff' : 'transparent',
              position: 'absolute',
              top: 0,
              left: 0,
              overflow: 'hidden',
              transform: `scale(${scale})`,
              transformOrigin: 'top left'
            }}>
              {bgType === 'IMAGE' && bgUrl && (
                <img 
                  src={buildStaticUrl(bgUrl)} 
                  alt="background" 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 0,
                    objectFit: 'fill'
                  }}
                  onError={(e) => {
                    if (!e.target.dataset.errored) {
                      e.target.dataset.errored = 'true';
                      import('react-hot-toast').then(module => {
                        module.default.error(`Failed to load background image from server: ${e.target.src}`);
                      });
                    }
                  }}
                />
              )}
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px dashed rgba(0,0,0,0.1)' }} />
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1px dashed rgba(0,0,0,0.1)' }} />

            {fields.map((f, i) => (
              <DraggableElement 
                key={i} 
                field={f} 
                index={i} 
                onUpdate={updateField} 
                onRemove={removeField} 
                scale={scale} 
                isSelected={selectedIndex === i}
                onSelect={setSelectedIndex}
              />
            ))}
          </div>
        </div>
        </div>

        {/* Right Properties Panel */}
        <div style={{ width: '320px', flexShrink: 0, borderLeft: '1px solid var(--border-subtle)', background: 'var(--bg-surface-card)', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '20px' }}>
             <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-indigo-400)', borderBottom: '2px solid var(--accent)', paddingBottom: '4px' }}>Properties</div>
             <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-muted)' }}>Layers ({fields.length})</div>
          </div>


          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            
            {!activeField ? (
              // Global Background Settings
              <div className="stack" style={{ gap: '16px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Background Settings</h3>
                <div className="row" style={{ gap: '8px' }}>
                  <Button size="sm" style={{ flex: 1 }} variant={bgType === 'BLANK' ? 'primary' : 'outline'} onClick={() => setBgType('BLANK')}>Blank</Button>
                  <Button size="sm" style={{ flex: 1 }} variant={bgType === 'IMAGE' ? 'primary' : 'outline'} onClick={() => setBgType('IMAGE')}>Image</Button>
                </div>
                {bgType === 'IMAGE' && (
                  <div>
                    <p style={{ fontSize: '12px', marginBottom: '8px' }}>Upload Background (A4 Size)</p>
                    <FileUploader onUploaded={(url) => setBgUrl(url)} />
                  </div>
                )}
                
                <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '16px 0' }} />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Select an element on the canvas to edit its properties.</p>
              </div>
            ) : (
              // Context-Aware Element Settings
              <div className="stack" style={{ gap: '16px' }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Edit {activeField.type}
                  </h3>
                  <button onClick={() => { removeField(selectedIndex); setSelectedIndex(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                    <Trash2 size={16}/>
                  </button>
                </div>

                {activeField.type === 'text' && (
                  <div className="stack" style={{ gap: '12px' }}>
                    <Field label="Variable Mapping">
                      <Select 
                        value={activeField.variable || ''} 
                        onChange={e => updateField(selectedIndex, { ...activeField, variable: e.target.value, value: '' })}
                      >
                        <option value="">-- Custom Text --</option>
                        <option value="student_name">[Student Name]</option>
                        <option value="course_title">[Course Title]</option>
                        <option value="completion_date">[Completion Date]</option>
                        <option value="certificate_number">[Certificate Number]</option>
                      </Select>
                    </Field>
                    
                    {!activeField.variable && (
                      <Field label="Static Text">
                        <Input 
                          value={activeField.value || ''} 
                          onChange={e => updateField(selectedIndex, { ...activeField, value: e.target.value })} 
                        />
                      </Field>
                    )}
                    
                    <div className="row" style={{ gap: '12px' }}>
                      <Field label="Font Family" style={{ flex: 1 }}>
                        <Select 
                          value={activeField.fontFamily || 'Helvetica'} 
                          onChange={e => updateField(selectedIndex, { ...activeField, fontFamily: e.target.value })}
                        >
                          <option value="Helvetica">Helvetica</option>
                          <option value="Arial">Arial</option>
                          <option value="Times New Roman">Times New Roman</option>
                          <option value="Courier New">Courier New</option>
                          <option value="Georgia">Georgia</option>
                          <option value="Verdana">Verdana</option>
                        </Select>
                      </Field>
                    </div>

                    <div className="row" style={{ gap: '12px' }}>
                      <Field label="Size (px)" style={{ flex: 1 }}>
                        <Input 
                          type="number" 
                          value={activeField.fontSize || 16} 
                          onChange={e => updateField(selectedIndex, { ...activeField, fontSize: parseInt(e.target.value) })} 
                        />
                      </Field>
                      <Field label="Color" style={{ width: '60px' }}>
                        <Input 
                          type="color" 
                          value={activeField.color || '#000000'} 
                          onChange={e => updateField(selectedIndex, { ...activeField, color: e.target.value })} 
                          style={{ padding: '0', height: '40px' }}
                        />
                      </Field>
                    </div>
                  </div>
                )}
                
                {activeField.type === 'image' && (
                  <div className="stack" style={{ gap: '12px' }}>
                    <div className="row" style={{ gap: '12px' }}>
                      <Field label="Width" style={{ flex: 1 }}>
                        <Input 
                          type="number" 
                          value={activeField.width || 100} 
                          onChange={e => updateField(selectedIndex, { ...activeField, width: parseInt(e.target.value) })} 
                        />
                      </Field>
                      <Field label="Height" style={{ flex: 1 }}>
                        <Input 
                          type="number" 
                          value={activeField.height || 50} 
                          onChange={e => updateField(selectedIndex, { ...activeField, height: parseInt(e.target.value) })} 
                        />
                      </Field>
                    </div>
                    <Field label="Opacity (0 to 1)">
                      <Input 
                        type="number" 
                        step="0.05"
                        min="0"
                        max="1"
                        value={activeField.opacity !== undefined ? activeField.opacity : 1} 
                        onChange={e => updateField(selectedIndex, { ...activeField, opacity: parseFloat(e.target.value) })} 
                      />
                    </Field>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

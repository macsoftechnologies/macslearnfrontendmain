import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2 } from 'lucide-react';
import AuthShell from './AuthShell';
import Input, { Field, Select, Textarea } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import * as regionsApi from '../../api/regions';
import client, { extractErrorMessages } from '../../api/client';

export default function RegisterOrganization() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', mobile: '',
    orgName: '', orgCode: '', regionId: '', planId: '',
    contactEmail: '', contactPhone: '', address: ''
  });
  
  const [regions, setRegions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    regionsApi.list({ globalOnly: true }).then(res => setRegions(res.data?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.regionId) {
      // Fetch public plans for the selected region
      client.get('/subscription-plans/public', { params: { regionId: form.regionId } })
        .then(res => setPlans(res.data?.data || res.data || []))
        .catch(() => {});
    } else {
      setPlans([]);
    }
    // Reset plan selection if region changes
    setForm(f => ({ ...f, planId: '' }));
  }, [form.regionId]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const nextStep = (e) => {
    e.preventDefault();
    if (step === 2 && !form.regionId) {
      toast.error('Please select a region');
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.planId) {
      toast.error('Please select a subscription plan');
      return;
    }
    
    setErrors([]);
    setLoading(true);
    try {
      await client.post('/organizations/register', form);
      setDone(true);
      toast.success('Organization registered successfully');
    } catch (err) {
      setErrors(extractErrorMessages(err));
      // If error, jump back to step 1 to show the error box properly
      setStep(1); 
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell eyebrow="B2B Registration" title="Registration Submitted">
        <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <CheckCircle2 size={44} color="var(--success)" />
          <p className="text-muted">
            Thank you for registering <strong>{form.orgName}</strong>. Our team will review your registration and get back to you shortly.
            <br /><br />
            If you need immediate assistance with payment, please contact our Support Team.
          </p>
          <Button full variant="outline" onClick={() => window.location.reload()}>
            Register Another Organization
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={`Step ${step} of 3`}
      title={step === 1 ? "Admin Details" : step === 2 ? "Organization Setup" : "Select a Plan"}
      subtitle={step === 1 ? "Create your master admin account." : step === 2 ? "Set up your workspace." : "Choose the right tier for your needs."}
      wide={step === 3}
      // footer={
      //   <>
      //     Already have an organization? <Link to="/super-admin/login">Sign in here</Link>
      //   </>
      // }
    >
      <form className="stack" onSubmit={step === 3 ? onSubmit : nextStep}>
        {errors.length > 0 && (
          <div className="auth-error-box">
            <ul>
              {errors.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {step === 1 && (
          <>
            <Field label="Full Name" required>
              <Input value={form.fullName} onChange={update('fullName')} required />
            </Field>
            <Field label="Work Email" required>
              <Input type="email" value={form.email} onChange={update('email')} required />
            </Field>
            <Field label="Mobile Number">
              <Input value={form.mobile} onChange={update('mobile')} />
            </Field>
            <Field label="Password" required hint="At least 8 characters">
              <Input type="password" value={form.password} onChange={update('password')} required />
            </Field>
            <Button type="submit" full size="lg">Continue</Button>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Organization Name" required>
              <Input value={form.orgName} onChange={update('orgName')} placeholder="e.g. Acme Corp" required />
            </Field>
            <Field label="Organization Code (Slug)" required hint="Used for your login URL, e.g. acme">
              <Input value={form.orgCode} onChange={update('orgCode')} required />
            </Field>

            <Field label="Contact Email">
              <Input type="email" value={form.contactEmail} onChange={update('contactEmail')} />
            </Field>
            <Field label="Contact Phone" required>
              <Input type="tel" value={form.contactPhone} onChange={update('contactPhone')} required />
            </Field>
            <Field label="Address">
              <Textarea value={form.address} onChange={update('address')} rows={2} />
            </Field>
            <Field label="Region" required hint="This determines your pricing and data residency.">
              <Select value={form.regionId} onChange={update('regionId')} required>
                <option value="">Select your region</option>
                {regions.map((r) => (
                  <option key={r.id || r._id} value={r.id || r._id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="row" style={{ gap: '12px' }}>
              <Button type="button" variant="outline" onClick={prevStep} full size="lg">Back</Button>
              <Button type="submit" full size="lg">Continue to Plans</Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            {/* Add a subtle colorful background blob to make glassmorphism visible */}
            <div style={{ position: 'absolute', top: '10%', left: '-20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '-20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(236,72,153,0.15) 0%, rgba(236,72,153,0) 70%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', position: 'relative', zIndex: 1 }}>
              {plans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
                  <p className="text-muted">No active plans found for this region.</p>
                </div>
              ) : (
                plans.map(p => {
                  const isSelected = form.planId === p.id;
                  const isRecommended = p.name.toLowerCase().includes('pro') || p.name.toLowerCase().includes('enterprise');
                  return (
                    <div 
                      key={p.id} 
                      onClick={() => setForm(f => ({ ...f, planId: p.id }))}
                      style={{ 
                        padding: '24px', 
                        border: isSelected ? '1.5px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.5)',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        background: isSelected 
                          ? 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)' 
                          : 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 100%)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        boxShadow: isSelected 
                          ? '0 12px 40px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.5)' 
                          : '0 8px 32px rgba(0, 0, 0, 0.04), inset 0 0 0 1px rgba(255, 255, 255, 0.3)',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isSelected ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 100%)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 100%)';
                        }
                      }}
                    >
                      {isRecommended && (
                         <div style={{ 
                           position: 'absolute', 
                           top: 0, 
                           right: 24, 
                           background: 'linear-gradient(90deg, #6366f1, #ec4899)', 
                           color: 'white', 
                           fontSize: '11px', 
                           padding: '6px 16px', 
                           borderRadius: '0 0 8px 8px', 
                           fontWeight: 'bold',
                           letterSpacing: '0.5px',
                           boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)'
                         }}>
                           RECOMMENDED
                         </div>
                      )}
                      
                      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                        <strong style={{ fontSize: '18px', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{p.name}</strong>
                        {isSelected && (
                          <CheckCircle2 size={24} color="var(--accent)" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
                        )}
                      </div>
                      
                      <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: 16, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-muted)' }}>{p.currency || 'USD'}</span>
                        <span style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                          {p.price}
                        </span>
                      </div>
                      
                      <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', background: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(255,255,255,0.8)', padding: '4px 10px', borderRadius: '20px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                          {p.maxUsers ? `Up to ${p.maxUsers} Users` : 'Unlimited Users'}
                        </span>
                        <span style={{ fontSize: '13px', background: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(255,255,255,0.8)', padding: '4px 10px', borderRadius: '20px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                          {p.storageGB ? `${p.storageGB} GB Storage` : 'Unlimited Storage'}
                        </span>
                        <span style={{ fontSize: '13px', background: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(255,255,255,0.8)', padding: '4px 10px', borderRadius: '20px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                          {p.durationInDays} Days
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="row" style={{ gap: '12px', marginTop: '8px' }}>
              <Button type="button" variant="outline" onClick={prevStep} full size="lg">Back</Button>
              <Button type="submit" full size="lg" loading={loading} disabled={!form.planId}>Complete Registration</Button>
            </div>
          </>
        )}
      </form>
    </AuthShell>
  );
}


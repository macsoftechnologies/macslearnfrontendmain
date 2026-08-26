import { useState } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import Input, { Field } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { extractErrorMessages } from '../../api/client';

export default function Login() {
  const { login, homeFor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();
  const [form, setForm] = useState({ organizationCode: slug || '', email: '', password: '' });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      const role = await login(form);
      toast.success('Welcome back!');
      navigate(location.state?.from?.pathname || homeFor(role), { replace: true });
    } catch (err) {
      setErrors(extractErrorMessages(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      slug={slug}
      eyebrow="Sign in"
      title="Welcome back"
      subtitle="Enter your organization credentials to continue."
      footer={
        <>
          New student?{' '}
          <Link to={slug ? `/${slug}/register` : '/register'}>Register here</Link>
          <br />
          {/* <span style={{ display: 'inline-block', marginTop: 10 }}>
            Super Admin? <Link to="/super-admin/login">Sign in here</Link>
          </span> */}
        </>
      }
    >
      <form className="stack" onSubmit={onSubmit}>
        {errors.length > 0 && (
          <div className="auth-error-box">
            <ul>
              {errors.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <Field label="Organization Code" required>
          <Input placeholder="e.g. ACME" value={form.organizationCode} onChange={update('organizationCode')} required disabled={!!slug} />
        </Field>
        <Field label="Email" required>
          <Input type="email" placeholder="you@organization.com" value={form.email} onChange={update('email')} required />
        </Field>
        <Field label="Password" required>
          <Input type="password" placeholder="••••••••" value={form.password} onChange={update('password')} required />
        </Field>

        <Button type="submit" full size="lg" loading={loading}>
          Sign In
        </Button>
      </form>
    </AuthShell>
  );
}

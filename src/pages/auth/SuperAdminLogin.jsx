import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import Input, { Field } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { extractErrorMessages } from '../../api/client';

export default function SuperAdminLogin() {
  const { superAdminLogin, homeFor } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      const role = await superAdminLogin(form);
      toast.success('Welcome back!');
      navigate(homeFor(role), { replace: true });
    } catch (err) {
      setErrors(extractErrorMessages(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Super admin"
      title="Platform sign in"
      subtitle="Restricted access for platform administrators."

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
        <Field label="Email" required>
          <Input type="email" placeholder="admin@lms.com" value={form.email} onChange={update('email')} required />
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

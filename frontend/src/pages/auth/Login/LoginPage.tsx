import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { roleHomePath } from '@/lib/roleHome';
import type { LoginFormValues } from '@/types/auth.types';

const initialValues: LoginFormValues = { email: '', password: '' };

export function LoginPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [values, setValues] = useState<LoginFormValues>(initialValues);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(roleHomePath[user.role], { replace: true });
    }
  }, [user, navigate]);

  const handleChange =
    (field: keyof LoginFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(values.email, values.password);
      navigate(roleHomePath[loggedInUser.role], { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md p-8">
        <h1 className="text-xl font-bold text-slate-900">Welcome Back</h1>
        <p className="mt-1 text-sm text-slate-500">
          Please enter your credentials to access the governance dashboard.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <Input
            id="email"
            name="email"
            type="email"
            label="Email Address"
            placeholder="name@company.com"
            leftIcon={<Mail size={16} />}
            value={values.email}
            onChange={handleChange('email')}
            autoComplete="email"
            required
          />

          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            labelAction={
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Forgot Password?
              </Link>
            }
            placeholder="••••••••"
            leftIcon={<Lock size={16} />}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="pointer-events-auto text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            value={values.password}
            onChange={handleChange('password')}
            autoComplete="current-password"
            required
          />

          <Button type="submit" isLoading={isSubmitting}>
            Sign In
            <LogIn size={16} />
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/contact-it" className="font-medium text-blue-600 hover:text-blue-700">
            Contact IT Infrastructure
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
}

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { login } from '@/services/auth.service';
import type { LoginFormValues } from '@/types/auth.types';

const initialValues: LoginFormValues = { email: '', password: '' };

export function LoginPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<LoginFormValues>(initialValues);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange =
    (field: keyof LoginFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(values);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsLoading(false);
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

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" isLoading={isLoading}>
            Sign In
            <LogIn size={16} />
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <a href="#contact-it" className="font-medium text-blue-600 hover:text-blue-700">
            Contact IT Infrastructure
          </a>
        </p>
      </Card>
    </AuthLayout>
  );
}

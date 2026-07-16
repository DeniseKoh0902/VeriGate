import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, ShieldCheck, User } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { LoginFormValues } from '@/types/auth.types';

const initialValues: LoginFormValues = { email: '', password: '' };

type LoginRole = 'admin' | 'employee';

export function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<LoginRole>('admin');
  const [values, setValues] = useState<LoginFormValues>(initialValues);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange =
    (field: keyof LoginFormValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    navigate(role === 'admin' ? '/dashboard' : '/workspace');
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md p-8">
        <h1 className="text-xl font-bold text-slate-900">Welcome Back</h1>
        <p className="mt-1 text-sm text-slate-500">
          Please enter your credentials to access the governance dashboard.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors',
              role === 'admin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <ShieldCheck size={15} />
            IT Infrastructure
          </button>
          <button
            type="button"
            onClick={() => setRole('employee')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors',
              role === 'employee' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <User size={15} />
            Employee
          </button>
        </div>

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

          <Button type="submit">
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

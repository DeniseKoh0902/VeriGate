import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import * as authService from '@/services/auth.service';
import { PASSWORD_HINT, validatePassword } from '@/lib/password';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError('This reset link is missing its token. Request a new one.');
      return;
    }
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authService.resetPassword(token, newPassword);
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md p-8">
        <h1 className="text-xl font-bold text-slate-900">Reset Password</h1>
        <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>

        {message ? (
          <>
            <p className="mt-6 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              {message}
            </p>
            <Button className="mt-6" onClick={() => navigate('/login')}>
              Back to Sign In
            </Button>
          </>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <Input
              id="newPassword"
              name="newPassword"
              type={showPassword ? 'text' : 'password'}
              label="New Password"
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
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <p className="-mt-3 text-xs text-slate-400">{PASSWORD_HINT}</p>

            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              label="Confirm New Password"
              placeholder="••••••••"
              leftIcon={<Lock size={16} />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            <Button type="submit" isLoading={isSubmitting}>
              Reset Password
              <KeyRound size={16} />
            </Button>
          </form>
        )}

        {!message && (
          <p className="mt-6 text-center text-sm text-slate-500">
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Back to Sign In
            </Link>
          </p>
        )}
      </Card>
    </AuthLayout>
  );
}

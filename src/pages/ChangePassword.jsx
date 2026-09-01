import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import './Login.css';

export default function ChangePassword() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSaving(true);

      const { error: passwordError } =
        await supabase.auth.updateUser({
          password,
        });

      if (passwordError) {
        throw passwordError;
      }

const { error: profileError } = await supabase
  .from('profiles')
  .update({
    must_change_password: false,
  })
  .eq('id', profile.id);

if (profileError) {
  throw profileError;
}
await refreshProfile();

if (profile.role === 'admin') {
  navigate('/admin', { replace: true });
} else if (profile.role === 'teacher') {
  navigate('/teacher', { replace: true });
} else if (profile.role === 'student') {
  navigate('/student', { replace: true });
}

      navigate('/teacher', { replace: true });
    } catch (err) {
      setError(
        err.message || 'Failed to change password.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <img
          src="/logo.svg"
          alt="Codelab"
          className="logo"
        />

        <h1>Change Your Password</h1>

        <p className="subtitle">
          You must change your temporary password before
          continuing.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <label htmlFor="password">
              New password
            </label>

            <div className="password-wrap">
              <input
                type={
                  showPassword ? 'text' : 'password'
                }
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                minLength={8}
              />

              <button
                type="button"
                className="peek-btn"
                onClick={() =>
                  setShowPassword((show) => !show)
                }
              >
                {showPassword ? 'Hide' : 'Peek'}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">
              Confirm new password
            </label>

            <input
              type={
                showPassword ? 'text' : 'password'
              }
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
              minLength={8}
            />
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={saving}
          >
            {saving
              ? 'Updating password...'
              : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  );
}
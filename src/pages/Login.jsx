import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { ROLE_HOME } from '../config/navigation';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setLoading(true);

    const result = await login(email.trim(), password);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    /*
     * AuthProvider loads the user's profile after authentication.
     *
     * For now, get the profile directly so we can determine
     * where the user should go.
     */

    const { supabase } = await import('../lib/supabase');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active, must_change_password')
      .eq('id', result.user.id)
      .single();

    if (profileError || !profile) {
      setError('Your account profile could not be loaded.');
      setLoading(false);
      return;
    }

    if (!profile.is_active) {
      setError('Your account has been disabled.');
      setLoading(false);
      return;
    }

    if (profile.must_change_password) {
      /*
       * We'll build this page later.
       */
      navigate('/change-password', { replace: true });
      setLoading(false);
      return;
    }

    const destination = ROLE_HOME[profile.role.toUpperCase()];

    if (!destination) {
      setError('Your account has an invalid role.');
      setLoading(false);
      return;
    }

    navigate(destination, { replace: true });
    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <img src="/logo.svg" alt="Codelab" className="logo" />

        <h1>Welcome Back</h1>

        <p className="subtitle">
          Login to your account
        </p>

        <form onSubmit={handleSubmit} noValidate>

          <div className="input-group">
            <label htmlFor="email">
              Email
            </label>

            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">
              Password
            </label>

            <div className="password-wrap">

              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button
                type="button"
                className="peek-btn"
                onClick={() =>
                  setShowPassword((show) => !show)
                }
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Peek'}
              </button>

            </div>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

        </form>
      </div>
    </div>
  );
}

export default Login;
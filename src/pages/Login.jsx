import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
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

    try {
      const result = await login(email.trim(), password);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const profile = result.profile;

      if (!profile) {
        setError('Your account profile could not be loaded.');
        return;
      }

      if (!profile.is_active) {
        setError('Your account has been disabled.');
        return;
      }

      if (profile.must_change_password) {
        navigate('/change-password', { replace: true });
        return;
      }

      const destination =
        ROLE_HOME[profile.role.toUpperCase()];

      if (!destination) {
        setError('Your account has an invalid role.');
        return;
      }

      navigate(destination, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed.');
    } finally {
      setLoading(false);
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
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">
              Password
            </label>

            <div className="password-wrap">
              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                id="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />

              <button
                type="button"
                className="peek-btn"
                onClick={() =>
                  setShowPassword(
                    (show) => !show,
                  )
                }
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Peek'}
              </button>
            </div>
          </div>

          {error && (
            <p
              className="form-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading
              ? 'Logging in...'
              : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

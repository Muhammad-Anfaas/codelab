import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findMockAccount } from '../mock/data';
import { ROLE_HOME } from '../config/navigation';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    // ------------------------------------------------------------------
    // MOCK LOGIN — frontend only. The password is not checked at all.
    //
    // Real version (backend step):
    //   const res = await fetch('/api/auth/login', { method: 'POST', ... });
    //   const { user } = await res.json();   // role comes from the SERVER
    //   navigate(ROLE_HOME[user.role]);
    //
    // The role must always come from the server's response, never from
    // anything typed into this form or stored in the browser.
    // ------------------------------------------------------------------
    const account = findMockAccount(email);
    if (!account) {
      setError('No account found with that email address.');
      return;
    }
    navigate(ROLE_HOME[account.role], { replace: true });
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <img src="/logo.svg" alt="Codelab" className="logo" />
        <h1>Welcome Back</h1>
        <p className="subtitle">Login to your account</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <label htmlFor="email">Email</label>
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
            <label htmlFor="password">Password</label>
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
                onClick={() => setShowPassword((show) => !show)}
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

          <button type="submit" className="login-btn">
            Login
          </button>
        </form>

        {/* import.meta.env.DEV is true for `npm run dev` and false for
            `npm run build`, so this hint never ships to production. */}
        {import.meta.env.DEV && (
          <p className="dev-hint">
            Dev accounts: admin@codelab.dev · teacher@codelab.dev · student@codelab.dev
            (any password)
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;

import "./Login.css";

function Login() {
  return (
    <div className="login-page">
      <div className="login-box">
         <img src="/favicon.svg" alt="Logo" className="logo" />
        <h1>CodeLab</h1>
        <p className="subtitle">Login to your account</p>

        <form>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              placeholder="Enter your username"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
            />
          </div>

          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}

export default Login;


import { useState } from "react";
import "./Login.css";

const API_URL = "http://localhost:5000/api";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Login amalga oshmadi");
      }

      onLogin(data);
    } catch (err) {
      setError(err.message || "Server bilan bog‘lanib bo‘lmadi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-background"></div>

      <div className="login-container">
        <div className="login-brand">
          <div className="login-logo">K</div>

          <div>
            <h1>KOKAND</h1>
            <span>CYBER CAMPUS</span>
          </div>
        </div>

        <div className="login-card">
          <div className="login-header">
            <span className="login-eyebrow">SECURE ACCESS</span>

            <h2>Tizimga kirish</h2>

            <p>
              Kiberxavfsizlik fakulteti platformasiga xush kelibsiz.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <label>Email</label>

            <div className="login-input">
              <span>✉</span>

              <input
                type="email"
                placeholder="Email manzilingiz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <label>Parol</label>

            <div className="login-input">
              <span>🔒</span>

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Parolingiz"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="show-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>

            {error && (
              <div className="login-error">
                <span>!</span>
                {error}
              </div>
            )}

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Kirilmoqda..." : "Kirish →"}
            </button>
          </form>

          <div className="login-divider">
            <span>yoki</span>
          </div>

          <button className="google-button" type="button">
            <span className="google-icon">G</span>
            Google orqali kirish
            <small>Tez orada</small>
          </button>

          <div className="security-note">
            <span>🛡</span>

            <div>
              <strong>Himoyalangan tizim</strong>
              <p>
                Barcha login ma'lumotlari xavfsiz autentifikatsiya
                orqali tekshiriladi.
              </p>
            </div>
          </div>
        </div>

        <div className="login-footer">
          <span>© 2026 Kokand Cyber Campus</span>
          <span>SECURE • PRIVATE • ACADEMIC</span>
        </div>
      </div>
    </div>
  );
}

export default Login;

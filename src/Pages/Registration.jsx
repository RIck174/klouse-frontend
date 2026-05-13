import { useState, useEffect } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import "../Css/Registration.css";
import "boxicons/css/boxicons.min.css";
import { useNavigate } from "react-router-dom";

function Registration() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/home");
  }, [navigate]);

  // Clear error when switching tabs
  useEffect(() => {
    setError("");
  }, [activeTab]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: loginData.username,
            password: loginData.password,
          }),
        },
      );
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        navigate("/home");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (registerData.password !== registerData.confirmPassword) {
      return setError("Passwords do not match");
    }
    if (registerData.password.length < 6) {
      return setError("Password must be at least 6 characters");
    }
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: registerData.username,
            email: registerData.email,
            password: registerData.password,
          }),
        },
      );
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        navigate("/home");
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/google`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.displayName,
            email: user.email,
            googleId: user.uid,
          }),
        },
      );
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        navigate("/home");
      } else {
        setError(data.message || "Google sign in failed");
      }
    } catch (err) {
      setError("Google sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-page">
      {/* ── Hero ── */}
      <div className="reg-hero">
        <div className="reg-brand">
          <div className="reg-brand-logo">
            <div className="reg-brand-icon">
              <i className="bx bxs-car" />
            </div>
            <span className="reg-brand-name">Klouse</span>
          </div>
          <p className="reg-brand-tagline">
            Your ride, your way. Move smarter.
          </p>
        </div>
        <div className="reg-road">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="reg-road-line" />
          ))}
        </div>
      </div>

      {/* ── Form Panel ── */}
      <div className="reg-panel">
        {/* Tab switcher */}
        <div className="reg-tabs">
          <button
            className={`reg-tab ${activeTab === "login" ? "reg-tab-active" : ""}`}
            onClick={() => setActiveTab("login")}
          >
            Sign In
          </button>
          <button
            className={`reg-tab ${activeTab === "register" ? "reg-tab-active" : ""}`}
            onClick={() => setActiveTab("register")}
          >
            Create Account
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="reg-error">
            <i className="bx bxs-error-circle" />
            {error}
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {activeTab === "login" && (
          <>
            <h2 className="reg-form-title">Welcome back</h2>
            <p className="reg-form-subtitle">
              Sign in to continue your journey
            </p>
            <form onSubmit={handleLoginSubmit}>
              <div className="reg-input-group">
                <input
                  className="reg-input"
                  type="text"
                  placeholder=" "
                  required
                  value={loginData.username}
                  onChange={(e) =>
                    setLoginData({ ...loginData, username: e.target.value })
                  }
                />
                <label className="reg-label">Username</label>
                <i className="bx bxs-user reg-input-icon" />
              </div>

              <div className="reg-input-group">
                <input
                  className="reg-input"
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  required
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                />
                <label className="reg-label">Password</label>
                <i
                  className={`bx ${showPassword ? "bx-hide" : "bx-show"} reg-input-icon`}
                  onClick={() => setShowPassword(!showPassword)}
                />
              </div>

              <button className="reg-btn" type="submit" disabled={loading}>
                {loading ? <span className="reg-spinner" /> : "Sign In"}
              </button>
            </form>

            <div className="reg-divider">
              <div className="reg-divider-line" />
              <span className="reg-divider-text">or continue with</span>
              <div className="reg-divider-line" />
            </div>

            <button
              className="reg-google-btn"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="reg-google-icon" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </>
        )}

        {/* ── REGISTER FORM ── */}
        {activeTab === "register" && (
          <>
            <h2 className="reg-form-title">Create account</h2>
            <p className="reg-form-subtitle">
              Join Klouse and start riding today
            </p>
            <form onSubmit={handleRegisterSubmit}>
              <div className="reg-input-group">
                <input
                  className="reg-input"
                  type="text"
                  placeholder=" "
                  required
                  value={registerData.username}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      username: e.target.value,
                    })
                  }
                />
                <label className="reg-label">Username</label>
                <i className="bx bxs-user reg-input-icon" />
              </div>

              <div className="reg-input-group">
                <input
                  className="reg-input"
                  type="email"
                  placeholder=" "
                  required
                  value={registerData.email}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, email: e.target.value })
                  }
                />
                <label className="reg-label">Email address</label>
                <i className="bx bxs-envelope reg-input-icon" />
              </div>

              <div className="reg-input-group">
                <input
                  className="reg-input"
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  required
                  value={registerData.password}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      password: e.target.value,
                    })
                  }
                />
                <label className="reg-label">Password</label>
                <i
                  className={`bx ${showPassword ? "bx-hide" : "bx-show"} reg-input-icon`}
                  onClick={() => setShowPassword(!showPassword)}
                />
              </div>

              <div className="reg-input-group">
                <input
                  className="reg-input"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder=" "
                  required
                  value={registerData.confirmPassword}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
                <label className="reg-label">Confirm password</label>
                <i
                  className={`bx ${showConfirmPassword ? "bx-hide" : "bx-show"} reg-input-icon`}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              </div>

              <button className="reg-btn" type="submit" disabled={loading}>
                {loading ? <span className="reg-spinner" /> : "Create Account"}
              </button>
            </form>

            <div className="reg-divider">
              <div className="reg-divider-line" />
              <span className="reg-divider-text">or continue with</span>
              <div className="reg-divider-line" />
            </div>

            <button
              className="reg-google-btn"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="reg-google-icon" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Registration;

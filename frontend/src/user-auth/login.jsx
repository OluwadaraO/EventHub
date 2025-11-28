import { useState } from "react";
import { useNavigate, Link  } from "react-router-dom";
import './login.css';

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Login failed");
      }

      const data = await response.json();
      localStorage.setItem("token", data.access_token);
      alert("Login successful!");
      navigate("/home");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="background-slideshow">
        <img className="bg-image" src="/event-hub-fall-school-fair.jpg" alt="" />
        <img className="bg-image" src="/event-hub-summer-party-event-poster.jpg" alt="" />
        <img className="bg-image" src="/event-hub-summer-party-two.jpg" alt="" />
      </div>

      <div className="login-container">
        <h2 className="login-title">Login</h2>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label className="login-label">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="login-input"
            />
          </div>
          <div className="input-group">
            <label className="login-label">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="login-input"
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <p className="sign-up-switch">
            Don't have an account?{" "}
            <Link to="/" className="sign-up-link">
              Sign Up
            </Link>
          </p>
          <button type="submit" className="login-button">Login</button>
        </form>
      </div>
    </>
  );
}

export default Login;
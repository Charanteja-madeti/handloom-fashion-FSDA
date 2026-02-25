import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem("user", JSON.stringify(form));
    alert("Signup Successful 🎉");
    navigate("/login");
  };

  return (
    <section className="container section auth-section">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Sign up to access your personalized shopping dashboard.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email Address
            <input
              name="email"
              type="email"
              placeholder="Enter your email"
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              placeholder="Create a secure password"
              onChange={handleChange}
              required
            />
          </label>
          <button type="submit" className="auth-submit">Sign Up</button>
        </form>

        <button type="button" className="auth-switch" onClick={() => navigate('/login')}>
          Already have an account? <span>Login</span>
        </button>
      </div>
    </section>
  );
}

export default Signup;
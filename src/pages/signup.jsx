import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signupUser } from "./auth";

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const response = await signupUser(form);

      if (response?.alreadyRegistered) {
        alert("Account already exists. Please login.");
        navigate("/login");
        return;
      }

      alert("Signup Successful 🎉");
      navigate("/login");
    } catch (error) {
      alert(error.message || "Signup failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="container section auth-section">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Sign up to access your personalized shopping dashboard.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Full Name
            <input
              name="name"
              type="text"
              placeholder="Enter your name"
              onChange={handleChange}
              required
            />
          </label>
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
          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <button type="button" className="auth-switch" onClick={() => navigate('/login')}>
          Already have an account? <span>Login</span>
        </button>
      </div>
    </section>
  );
}

export default Signup;
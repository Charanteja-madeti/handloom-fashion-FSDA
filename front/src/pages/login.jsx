import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "./auth";

const generateCaptcha = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let index = 0; index < 6; index += 1) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    value += chars[randomIndex];
  }
  return value;
};

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [captchaText, setCaptchaText] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (captchaInput.trim().toUpperCase() !== captchaText) {
      alert("Captcha does not match ❌");
      setCaptchaText(generateCaptcha());
      setCaptchaInput("");
      return;
    }

    try {
      setIsSubmitting(true);
      await loginUser({ email: form.email, password: form.password });
      alert("Login Successful 🎉");
      navigate("/dashboard");
    } catch (error) {
      alert(error.message || "Invalid Credentials ❌");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="container section auth-section">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Login to continue shopping with Handloom Fashion.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email Address
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Enter Captcha
            <input
              type="text"
              name="captcha"
              placeholder="Type the captcha shown"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              required
            />
          </label>

          <p className="captcha-text auth-subtitle">
            {captchaText}
          </p>

          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setCaptchaText(generateCaptcha());
              setCaptchaInput("");
            }}
          >
            Refresh Captcha
          </button>

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <button type="button" className="auth-switch" onClick={() => navigate('/signup')}>
          Don&apos;t have an account? <span>Sign up</span>
        </button>
      </div>
    </section>
  );
}

export default Login;
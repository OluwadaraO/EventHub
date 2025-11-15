import { useState } from 'react';
import { useNavigate, Link } from "react-router-dom"; 
import './sign-up.css';
function SignUp() {
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

   const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        try {
            const response = await fetch("http://127.0.0.1:8000/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: form.name,
                email: form.email,
                password: form.password,
            }),
            });

            if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Registration failed");
            }
            await response.json();
            alert("🎉 Registration successful!");
            navigate("/login");
            setSuccess("Registration successful!");
            setForm({
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
            });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <>
            <div className="background-slideshow">
                <img className="bg-image" src="/event-hub-fall-school-fair.jpg" alt="background-image" />
                <img className="bg-image" src="/event-hub-summer-party-event-poster.jpg" alt="background-image" />
                <img className="bg-image" src="/event-hub-summer-party-two.jpg" alt="background-image" />
            </div>
            <div className="sign-up-container">
                <h2 className="sign-up-title">Sign Up</h2>
                <form onSubmit={handleSubmit} className="sign-up-form">
                    <div  className="input-group">
                        <label className="sign-up-label">Name</label>
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            autoComplete="off"
                            className="sign-up-input"
                        />
                    </div>
                    <div className="input-group">
                        <label className="sign-up-label">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            autoComplete="off"
                            className="sign-up-input"
                        />
                    </div>
                    <div className="input-group">
                        <label className="sign-up-label">Password</label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                            className="sign-up-input"
                        />
                    </div>
                    <div className="input-group">
                        <label className="sign-up-label">Confirm Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            required
                            minLength={6}
                            className="sign-up-input"
                        />
                    </div>
                    {error && <div className="sign-up-error">{error}</div>}
                    {success && <div className="success-message">{success}</div>}
                    <button type="submit" className="sign-up-button">Register</button>
                    <p className="sign-up-switch">
                        Already a user?{" "}
                        <Link to="/login" className="sign-up-link">
                            Login
                        </Link>
                    </p>
                </form>
            </div>
        </>

    );
}

export default SignUp;

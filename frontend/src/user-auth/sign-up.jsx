import { useState } from 'react';

function SignUp() {
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        // TODO: Replace with actual registration logic (API call)
        setSuccess('Registration successful!');
        setForm({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
        });
    };

    return (
        <div className="sign-up-container">
            <h2 className="sign-up-title">Sign Up</h2>
            <form onSubmit={handleSubmit} className="sign-up-form">
                <div>
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
                <div>
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
                <div>
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
                <div>
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
            </form>
        </div>
    );
}

export default SignUp;

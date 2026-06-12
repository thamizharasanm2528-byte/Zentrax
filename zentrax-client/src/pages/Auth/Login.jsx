import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import logo from '../../assets/logo.png';
import { Loader2, Mail, Lock, AlertCircle, ArrowRight, Sun, Moon, Sparkles, Users, FolderKanban, ChevronRight } from 'lucide-react';

const ALLOWED_DOMAIN = '@rajalakshmi.edu.in';

/* ── Design Tokens (matching Landing) ── */
const T = {
    light: {
        bg: '#F8FAFC', bgCard: '#FFFFFF', bgCardAlt: '#F1F5F9',
        border: 'rgba(15,23,42,0.08)', borderFocus: 'rgba(59,130,246,0.4)',
        text: '#0F172A', textSec: '#334155', textMuted: '#64748B', textFaint: '#94A3B8',
        accent: '#3B82F6', accentHover: '#2563EB', accentSoft: 'rgba(59,130,246,0.06)',
        gradient: 'linear-gradient(135deg, #3B82F6 0%, #0F172A 100%)',
        inputBg: '#FFFFFF', inputBorder: '#E2E8F0',
        shadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        shadowLg: '0 20px 60px rgba(15,23,42,0.08), 0 8px 24px rgba(15,23,42,0.04)',
        errorBg: 'rgba(239,68,68,0.05)', errorBorder: 'rgba(239,68,68,0.15)',
        errorText: '#DC2626',
    },
    dark: {
        bg: '#0F172A', bgCard: '#1E293B', bgCardAlt: '#1E293B',
        border: 'rgba(248,250,252,0.08)', borderFocus: 'rgba(59,130,246,0.5)',
        text: '#F8FAFC', textSec: '#CBD5E1', textMuted: '#94A3B8', textFaint: '#64748B',
        accent: '#3B82F6', accentHover: '#60A5FA', accentSoft: 'rgba(59,130,246,0.12)',
        gradient: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
        inputBg: '#0F172A', inputBorder: 'rgba(248,250,252,0.1)',
        shadow: '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.15)',
        shadowLg: '0 20px 60px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2)',
        errorBg: 'rgba(239,68,68,0.1)', errorBorder: 'rgba(239,68,68,0.2)',
        errorText: '#FCA5A5',
    }
};

const Login = () => {
    const { login, fetchUserProfile } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { isDark, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setTimeout(() => setMounted(true), 50);
    }, []);

    const t = isDark ? T.dark : T.light;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const emailLower = email.toLowerCase().trim();
        setLoading(true);
        try {
            const result = await login(emailLower, password);
            const profile = await fetchUserProfile(result.user.uid);
            if (profile?.role === 'admin') navigate('/admin', { replace: true });
            else if (profile?.profileCompleted === false) {
                const path = profile?.role === 'mentor' ? '/onboarding/mentor' : '/onboarding/student';
                navigate(path, { replace: true });
            } else if (profile?.role === 'mentor') navigate('/mentor-dashboard', { replace: true });
            else navigate('/student-dashboard', { replace: true });
        } catch (err) {
            const code = err.code || '';
            if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential'))
                setError('Invalid email or password.');
            else if (code.includes('too-many-requests'))
                setError('Too many attempts. Please try again later.');
            else setError(err.message || 'Login failed. Please try again.');
        }
        setLoading(false);
    };

    const inputStyle = {
        width: '100%', padding: '12px 12px 12px 44px', fontSize: '14px', fontFamily: 'Inter, sans-serif',
        borderRadius: '12px', border: `1px solid ${t.inputBorder}`, background: t.inputBg,
        color: t.text, outline: 'none', transition: 'all 0.2s',
    };

    const features = [
        { icon: Sparkles, text: 'AI-powered team matching' },
        { icon: Users, text: 'Connect with expert mentors' },
        { icon: FolderKanban, text: 'Collaborative workspaces' },
    ];

    return (
        <div data-theme={isDark ? 'dark' : 'light'} style={{
            minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif',
            background: t.bg, transition: 'background 0.4s ease',
        }}>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

            {/* ═══ Left Panel — Branding ═══ */}
            <div className="auth-left-panel" style={{
                flex: '1 1 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
                padding: '64px', position: 'relative', overflow: 'hidden',
                background: t.gradient,
            }}>
                {/* Decorative shapes */}
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
                    <div style={{ position: 'absolute', top: '-20%', right: '-15%', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', animation: 'float 20s ease-in-out infinite' }} />
                    <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', animation: 'float 25s ease-in-out infinite reverse' }} />
                    <div style={{ position: 'absolute', top: '40%', left: '60%', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', animation: 'float 15s ease-in-out infinite 3s' }} />
                </div>

                <div style={{ position: 'relative', zIndex: 10, maxWidth: '460px' }}>
                    {/* Logo */}
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', textDecoration: 'none', marginBottom: '36px' }}>
                        <img src={logo} alt="Zentrax Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>ZENTRAX</span>
                    </Link>

                    {/* Headline */}
                    <h1 style={{ fontSize: 'clamp(2rem, 3vw, 3rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: '20px', letterSpacing: '-0.03em' }}>
                        Welcome back<br />to your workspace
                    </h1>
                    <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: '28px', fontFamily: 'Manrope, sans-serif', maxWidth: '380px' }}>
                        Pick up right where you left off. Your team, mentors, and projects are waiting.
                    </p>

                    {/* Feature list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {features.map((f, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                                }}>
                                    <f.icon style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.8)' }} />
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{f.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom quote */}
                <div style={{ position: 'absolute', bottom: '32px', left: '64px', right: '64px', zIndex: 10 }}>
                    <div style={{ padding: '20px 24px', borderRadius: '16px', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, fontStyle: 'italic', fontFamily: 'Manrope, sans-serif', marginBottom: '8px' }}>
                            "ZENTRAX helped me find the perfect team for my capstone project. The AI matching is incredibly accurate."
                        </p>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>— Priya Sharma, CSE 3rd Year</p>
                    </div>
                </div>
            </div>

            {/* ═══ Right Panel — Form ═══ */}
            <div style={{
                flex: '1 1 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                padding: '48px 24px', position: 'relative',
            }}>
                {/* Theme toggle */}
                <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
                    <button onClick={toggleTheme} style={{
                        width: '40px', height: '40px', borderRadius: '12px', border: `1px solid ${t.border}`,
                        background: t.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.3s', boxShadow: t.shadow,
                    }} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
                        {isDark ? <Sun style={{ width: 16, height: 16, color: t.textMuted }} /> : <Moon style={{ width: 16, height: 16, color: t.textMuted }} />}
                    </button>
                </div>

                <div style={{
                    width: '100%', maxWidth: '400px',
                    opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)',
                    transition: 'all 0.6s ease',
                }}>
                    {/* Mobile logo (hidden on desktop) */}
                    <div className="auth-mobile-logo" style={{ display: 'none', textAlign: 'center', marginBottom: '32px' }}>
                        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                            <img src={logo} alt="Zentrax Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                            <span style={{ fontSize: '16px', fontWeight: 700, color: t.text }}>ZENTRAX</span>
                        </Link>
                    </div>

                    {/* Header */}
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '28px', fontWeight: 800, color: t.text, marginBottom: '8px', letterSpacing: '-0.02em' }}>Sign in</h2>
                        <p style={{ fontSize: '14px', color: t.textMuted, fontFamily: 'Manrope, sans-serif' }}>
                            Enter your credentials to access your account
                        </p>
                    </div>

                    {/* Form Card */}
                    <form onSubmit={handleSubmit}>
                        <div style={{
                            background: t.bgCard, borderRadius: '20px', padding: '28px',
                            border: `1px solid ${t.border}`, boxShadow: t.shadowLg,
                        }}>
                            {/* Email */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSec, marginBottom: '8px' }}>Email address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: t.textFaint }} />
                                    <input
                                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                                        placeholder="you@rajalakshmi.edu.in" required autoFocus
                                        style={inputStyle}
                                        onFocus={e => { e.target.style.borderColor = t.borderFocus; e.target.style.boxShadow = `0 0 0 3px ${t.accentSoft}`; }}
                                        onBlur={e => { e.target.style.borderColor = t.inputBorder; e.target.style.boxShadow = 'none'; }}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSec, marginBottom: '8px' }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: t.textFaint }} />
                                    <input
                                        type="password" value={password} onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••" required minLength={6}
                                        style={inputStyle}
                                        onFocus={e => { e.target.style.borderColor = t.borderFocus; e.target.style.boxShadow = `0 0 0 3px ${t.accentSoft}`; }}
                                        onBlur={e => { e.target.style.borderColor = t.inputBorder; e.target.style.boxShadow = 'none'; }}
                                    />
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px',
                                    borderRadius: '12px', marginBottom: '20px', fontSize: '13px',
                                    background: t.errorBg, border: `1px solid ${t.errorBorder}`,
                                }}>
                                    <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: '1px', color: t.errorText }} />
                                    <span style={{ color: t.errorText, fontWeight: 500 }}>{error}</span>
                                </div>
                            )}

                            {/* Submit */}
                            <button type="submit" disabled={loading} style={{
                                width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                                background: t.accent, color: '#fff', fontSize: '15px', fontWeight: 700,
                                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
                            }}
                                onMouseEnter={e => { if (!loading) e.target.style.background = t.accentHover; }}
                                onMouseLeave={e => { e.target.style.background = t.accent; }}
                            >
                                {loading ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : <ArrowRight style={{ width: 18, height: 18 }} />}
                                {loading ? 'Signing in...' : 'Sign in'}
                            </button>
                        </div>

                        {/* Mentor note */}
                        <Link to="/signup?role=mentor" style={{ textDecoration: 'none' }}>
                            <div style={{
                                marginTop: '16px', padding: '14px 18px', borderRadius: '14px',
                                background: t.bgCard, border: `1px solid ${t.border}`,
                                display: 'flex', alignItems: 'center', gap: '10px',
                                cursor: 'pointer', transition: 'all 0.2s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; }}
                            >
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139,92,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Users style={{ width: 14, height: 14, color: '#8B5CF6' }} />
                                </div>
                                <p style={{ fontSize: '12px', color: t.textMuted, lineHeight: 1.5, fontFamily: 'Manrope, sans-serif' }}>
                                    <span style={{ fontWeight: 700, color: t.textSec }}>Mentor?</span> Sign up with your invite code <ChevronRight style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', color: '#8B5CF6' }} />
                                </p>
                            </div>
                        </Link>
                    </form>

                    {/* Signup link */}
                    <div style={{ textAlign: 'center', marginTop: '32px' }}>
                        <p style={{ fontSize: '14px', color: t.textMuted }}>
                            Don't have an account?{' '}
                            <Link to="/signup" style={{ fontWeight: 700, color: t.accent, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                Create account <ChevronRight style={{ width: 14, height: 14 }} />
                            </Link>
                        </p>
                    </div>

                    {/* Domain note */}
                    <p style={{ textAlign: 'center', fontSize: '11px', color: t.textFaint, marginTop: '12px', fontWeight: 500 }}>
                        Student registration requires a @rajalakshmi.edu.in email
                    </p>
                </div>
            </div>

            {/* ═══ Styles ═══ */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(30px, -30px) scale(1.05); }
                    50% { transform: translate(-20px, 20px) scale(0.95); }
                    75% { transform: translate(15px, -15px) scale(1.02); }
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                [data-theme="dark"] h1, [data-theme="dark"] h2, [data-theme="dark"] h3 { color: #F8FAFC !important; }
                [data-theme="light"] h1, [data-theme="light"] h2, [data-theme="light"] h3 { color: #0F172A !important; }

                /* Left panel hidden on mobile */
                @media (max-width: 900px) {
                    .auth-left-panel { display: none !important; }
                    .auth-mobile-logo { display: block !important; }
                }
            `}</style>
        </div>
    );
};

export default Login;
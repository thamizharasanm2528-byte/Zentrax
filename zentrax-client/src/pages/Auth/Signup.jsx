import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import logo from '../../assets/logo.png';
import { API_BASE_URL } from '../../apiConfig';
import {
    Loader2, Mail, Lock, User, AlertCircle, ArrowRight, Sun, Moon,
    Sparkles, Award, Brain, Check, ChevronRight, KeyRound, CheckCircle2, ShieldCheck
} from 'lucide-react';

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
        errorBg: 'rgba(239,68,68,0.05)', errorBorder: 'rgba(239,68,68,0.15)', errorText: '#DC2626',
        successBg: 'rgba(34,197,94,0.06)', successBorder: 'rgba(34,197,94,0.15)', successText: '#16A34A',
        mentorAccent: '#8B5CF6', mentorSoft: 'rgba(139,92,246,0.06)',
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
        errorBg: 'rgba(239,68,68,0.1)', errorBorder: 'rgba(239,68,68,0.2)', errorText: '#FCA5A5',
        successBg: 'rgba(34,197,94,0.1)', successBorder: 'rgba(34,197,94,0.2)', successText: '#86EFAC',
        mentorAccent: '#A78BFA', mentorSoft: 'rgba(139,92,246,0.12)',
    }
};

const Signup = () => {
    const { signup, loginWithCustomToken, fetchUserProfile } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [role, setRole] = useState(searchParams.get('role') === 'mentor' ? 'mentor' : 'student');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [inviteValidated, setInviteValidated] = useState(false);
    const [inviteData, setInviteData] = useState(null);
    const [validatingCode, setValidatingCode] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { isDark, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setTimeout(() => setMounted(true), 50);
    }, []);

    const t = isDark ? T.dark : T.light;

    // Reset form when switching roles
    useEffect(() => {
        setError('');
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setInviteCode('');
        setInviteValidated(false);
        setInviteData(null);
    }, [role]);

    /* ── Validate invite code ── */
    const handleValidateCode = async () => {
        if (!inviteCode.trim()) { setError('Please enter your invite code.'); return; }
        setError('');
        setValidatingCode(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/validate-invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: inviteCode.trim() }),
            });
            const data = await res.json();

            if (res.ok && data.valid) {
                setInviteValidated(true);
                setInviteData(data);
                setName(data.name || '');
                setEmail(data.email || '');
            } else {
                setError(data.error || 'Invalid invite code.');
            }
        } catch (err) {
            setError('Failed to validate code. Check your connection.');
        }
        setValidatingCode(false);
    };

    /* ── Student signup ── */
    const handleStudentSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) { setError('Full name is required.'); return; }
        const emailLower = email.toLowerCase().trim();
        if (!emailLower.endsWith(ALLOWED_DOMAIN)) {
            setError(`Only ${ALLOWED_DOMAIN} emails are allowed for student registration.`);
            return;
        }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

        setLoading(true);
        try {
            const result = await signup(emailLower, password);
            const token = await result.user.getIdToken();

            const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ uid: result.user.uid, email: emailLower, name: name.trim(), role: 'student' })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create profile');
            }
            navigate('/onboarding/student', { replace: true });
        } catch (err) {
            const code = err.code || '';
            if (code.includes('email-already-in-use')) setError('An account with this email already exists.');
            else if (code.includes('invalid-email')) setError('Invalid email format.');
            else if (code.includes('weak-password')) setError('Password is too weak.');
            else setError(err.message || 'Signup failed. Please try again.');
        }
        setLoading(false);
    };

    /* ── Mentor signup via invite code ── */
    const handleMentorSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!inviteValidated) { setError('Please validate your invite code first.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/register-mentor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: inviteCode.trim(),
                    email: inviteData.email,
                    password,
                    name: inviteData.name,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Registration failed.');
            }

            // Auto-login with custom token
            if (data.customToken) {
                await loginWithCustomToken(data.customToken);
                navigate('/onboarding/mentor', { replace: true });
            } else {
                // Fallback: redirect to login
                navigate('/login', { replace: true });
            }
        } catch (err) {
            setError(err.message || 'Mentor registration failed.');
        }
        setLoading(false);
    };

    const inputStyle = {
        width: '100%', padding: '12px 12px 12px 44px', fontSize: '14px', fontFamily: 'Inter, sans-serif',
        borderRadius: '12px', border: `1px solid ${t.inputBorder}`, background: t.inputBg,
        color: t.text, outline: 'none', transition: 'all 0.2s',
    };

    const benefits = role === 'student' ? [
        'AI-powered teammate & mentor matching',
        'Project workspaces with Kanban boards',
        'Real-time chat & live mentoring sessions',
        'AI assistant for code & architecture help',
        'Badges, analytics & portfolio building',
    ] : [
        'Manage and mentor multiple student teams',
        'Live video sessions with screen sharing',
        'Structured doubt resolution queue',
        'Analytics & progress tracking dashboard',
        'Session scheduling & calendar integration',
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
                background: role === 'mentor'
                    ? (isDark ? 'linear-gradient(135deg, #7C3AED 0%, #1E1B4B 100%)' : 'linear-gradient(135deg, #8B5CF6 0%, #1E1B4B 100%)')
                    : t.gradient,
                transition: 'background 0.5s ease',
            }}>
                {/* Decorative shapes */}
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
                    <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '450px', height: '450px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', animation: 'float 22s ease-in-out infinite' }} />
                    <div style={{ position: 'absolute', bottom: '-15%', left: '-5%', width: '380px', height: '380px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', animation: 'float 18s ease-in-out infinite reverse' }} />
                </div>

                <div style={{ position: 'relative', zIndex: 10, maxWidth: '460px' }}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', textDecoration: 'none', marginBottom: '36px' }}>
                        <img src={logo} alt="Zentrax Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>ZENTRAX</span>
                    </Link>

                    <h1 style={{ fontSize: 'clamp(2rem, 3vw, 3rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: '20px', letterSpacing: '-0.03em' }}>
                        {role === 'student' ? <>Start building<br />your future today</> : <>Guide the next<br />generation of builders</>}
                    </h1>
                    <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: '24px', fontFamily: 'Manrope, sans-serif', maxWidth: '380px' }}>
                        {role === 'student'
                            ? 'Join hundreds of students already collaborating, learning, and growing on ZENTRAX.'
                            : 'Share your expertise, mentor student teams, and make a lasting impact on aspiring engineers.'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {benefits.map((b, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }}>
                                    <Check style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.9)' }} />
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.85)', fontFamily: 'Manrope, sans-serif' }}>{b}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats bar */}
                <div style={{
                    position: 'absolute', bottom: '28px', left: '64px', right: '64px', zIndex: 10,
                    display: 'flex', gap: '24px', padding: '20px 24px', borderRadius: '16px',
                    background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)',
                }}>
                    {[
                        { value: '500+', label: 'Students' },
                        { value: '120+', label: 'Projects' },
                        { value: '40+', label: 'Mentors' },
                        { value: '95%', label: 'Match Rate' },
                    ].map(s => (
                        <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
                            <p style={{ fontSize: '20px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{s.value}</p>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ Right Panel — Form ═══ */}
            <div style={{
                flex: '1 1 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                padding: '48px 24px', position: 'relative', overflowY: 'auto',
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
                    width: '100%', maxWidth: '420px',
                    opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)',
                    transition: 'all 0.6s ease',
                }}>
                    {/* Mobile logo */}
                    <div className="auth-mobile-logo" style={{ display: 'none', textAlign: 'center', marginBottom: '24px' }}>
                        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                            <img src={logo} alt="Zentrax Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                            <span style={{ fontSize: '16px', fontWeight: 700, color: t.text }}>ZENTRAX</span>
                        </Link>
                    </div>

                    {/* Header */}
                    <div style={{ marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '28px', fontWeight: 800, color: t.text, marginBottom: '8px', letterSpacing: '-0.02em' }}>Create account</h2>
                        <p style={{ fontSize: '14px', color: t.textMuted, fontFamily: 'Manrope, sans-serif' }}>
                            {role === 'student' ? "Join ZENTRAX as a student — it's completely free" : 'Register as a mentor with your invite code'}
                        </p>
                    </div>

                    {/* ── Role Toggle ── */}
                    <div style={{
                        display: 'flex', padding: '4px', borderRadius: '14px', marginBottom: '24px',
                        background: t.bgCardAlt, border: `1px solid ${t.border}`,
                    }}>
                        {[
                            { key: 'student', label: 'Student', icon: Award },
                            { key: 'mentor', label: 'Mentor', icon: ShieldCheck },
                        ].map(tab => {
                            const active = role === tab.key;
                            return (
                                <button key={tab.key} onClick={() => setRole(tab.key)} style={{
                                    flex: 1, padding: '10px 16px', borderRadius: '10px', border: 'none',
                                    background: active ? t.bgCard : 'transparent',
                                    color: active ? t.text : t.textMuted,
                                    fontWeight: active ? 700 : 500, fontSize: '14px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    transition: 'all 0.25s',
                                    boxShadow: active ? t.shadow : 'none',
                                }}>
                                    <tab.icon style={{ width: 15, height: 15, color: active ? (tab.key === 'mentor' ? t.mentorAccent : t.accent) : t.textFaint }} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* ═══════ STUDENT FORM ═══════ */}
                    {role === 'student' && (
                        <form onSubmit={handleStudentSubmit}>
                            <div style={{ background: t.bgCard, borderRadius: '20px', padding: '28px', border: `1px solid ${t.border}`, boxShadow: t.shadowLg }}>
                                {/* Name */}
                                <div style={{ marginBottom: '18px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSec, marginBottom: '8px' }}>Full name</label>
                                    <div style={{ position: 'relative' }}>
                                        <User style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: t.textFaint }} />
                                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required autoFocus style={inputStyle}
                                            onFocus={e => { e.target.style.borderColor = t.borderFocus; e.target.style.boxShadow = `0 0 0 3px ${t.accentSoft}`; }}
                                            onBlur={e => { e.target.style.borderColor = t.inputBorder; e.target.style.boxShadow = 'none'; }} />
                                    </div>
                                </div>

                                {/* Email */}
                                <div style={{ marginBottom: '18px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSec, marginBottom: '8px' }}>College email</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: t.textFaint }} />
                                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@rajalakshmi.edu.in" required style={inputStyle}
                                            onFocus={e => { e.target.style.borderColor = t.borderFocus; e.target.style.boxShadow = `0 0 0 3px ${t.accentSoft}`; }}
                                            onBlur={e => { e.target.style.borderColor = t.inputBorder; e.target.style.boxShadow = 'none'; }} />
                                    </div>
                                    <p style={{ fontSize: '11px', color: t.textFaint, marginTop: '6px', marginLeft: '2px', fontWeight: 500 }}>Must be a @rajalakshmi.edu.in email</p>
                                </div>

                                {/* Passwords */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSec, marginBottom: '8px' }}>Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: t.textFaint }} />
                                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 chars" required minLength={6} style={inputStyle}
                                                onFocus={e => { e.target.style.borderColor = t.borderFocus; e.target.style.boxShadow = `0 0 0 3px ${t.accentSoft}`; }}
                                                onBlur={e => { e.target.style.borderColor = t.inputBorder; e.target.style.boxShadow = 'none'; }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSec, marginBottom: '8px' }}>Confirm</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: t.textFaint }} />
                                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter" required style={inputStyle}
                                                onFocus={e => { e.target.style.borderColor = t.borderFocus; e.target.style.boxShadow = `0 0 0 3px ${t.accentSoft}`; }}
                                                onBlur={e => { e.target.style.borderColor = t.inputBorder; e.target.style.boxShadow = 'none'; }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Password strength */}
                                {password.length > 0 && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} style={{
                                                    flex: 1, height: '3px', borderRadius: '2px',
                                                    background: password.length >= i * 3 ? (password.length >= 12 ? '#22C55E' : password.length >= 8 ? '#F59E0B' : '#EF4444') : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                                                    transition: 'all 0.3s',
                                                }} />
                                            ))}
                                        </div>
                                        <p style={{ fontSize: '11px', color: t.textFaint, fontWeight: 500 }}>
                                            {password.length < 6 ? 'Too short' : password.length < 8 ? 'Weak' : password.length < 12 ? 'Good' : 'Strong'}
                                        </p>
                                    </div>
                                )}

                                {/* Error */}
                                {error && (
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', background: t.errorBg, border: `1px solid ${t.errorBorder}` }}>
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
                                }}>
                                    {loading ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : <ArrowRight style={{ width: 18, height: 18 }} />}
                                    {loading ? 'Creating account...' : 'Create account'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ═══════ MENTOR FORM ═══════ */}
                    {role === 'mentor' && (
                        <form onSubmit={handleMentorSubmit}>
                            <div style={{ background: t.bgCard, borderRadius: '20px', padding: '28px', border: `1px solid ${t.border}`, boxShadow: t.shadowLg }}>

                                {/* Step 1: Invite Code */}
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSec, marginBottom: '8px' }}>
                                        Invite code
                                        {inviteValidated && <CheckCircle2 style={{ width: 14, height: 14, color: t.successText, marginLeft: '6px', display: 'inline', verticalAlign: 'middle' }} />}
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <KeyRound style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: inviteValidated ? t.successText : t.textFaint }} />
                                            <input
                                                type="text" value={inviteCode}
                                                onChange={e => { setInviteCode(e.target.value.toUpperCase()); setInviteValidated(false); setInviteData(null); }}
                                                placeholder="Enter 8-char code"
                                                disabled={inviteValidated}
                                                style={{
                                                    ...inputStyle,
                                                    fontFamily: 'monospace', letterSpacing: '0.15em', fontSize: '15px', fontWeight: 700,
                                                    background: inviteValidated ? t.successBg : t.inputBg,
                                                    borderColor: inviteValidated ? t.successBorder : t.inputBorder,
                                                }}
                                                onFocus={e => { if (!inviteValidated) { e.target.style.borderColor = t.borderFocus; e.target.style.boxShadow = `0 0 0 3px ${t.accentSoft}`; } }}
                                                onBlur={e => { e.target.style.borderColor = inviteValidated ? t.successBorder : t.inputBorder; e.target.style.boxShadow = 'none'; }}
                                            />
                                        </div>
                                        {!inviteValidated ? (
                                            <button type="button" onClick={handleValidateCode} disabled={validatingCode} style={{
                                                padding: '12px 18px', borderRadius: '12px', border: 'none',
                                                background: t.mentorAccent, color: '#fff', fontSize: '13px', fontWeight: 700,
                                                cursor: validatingCode ? 'not-allowed' : 'pointer',
                                                opacity: validatingCode ? 0.7 : 1, whiteSpace: 'nowrap',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                            }}>
                                                {validatingCode ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Check style={{ width: 14, height: 14 }} />}
                                                Verify
                                            </button>
                                        ) : (
                                            <button type="button" onClick={() => { setInviteValidated(false); setInviteData(null); setInviteCode(''); setName(''); setEmail(''); }}
                                                style={{ padding: '12px 14px', borderRadius: '12px', border: `1px solid ${t.border}`, background: t.bgCard, color: t.textMuted, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                                Change
                                            </button>
                                        )}
                                    </div>
                                    <p style={{ fontSize: '11px', color: t.textFaint, marginTop: '6px', fontWeight: 500 }}>
                                        Enter the invite code provided by the ZENTRAX admin
                                    </p>
                                </div>

                                {/* Step 2: Pre-filled details (only after code validated) */}
                                {inviteValidated && (
                                    <>
                                        {/* Name (read-only, from invite) */}
                                        <div style={{ marginBottom: '18px' }}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSec, marginBottom: '8px' }}>Full name</label>
                                            <div style={{ position: 'relative' }}>
                                                <User style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: t.textFaint }} />
                                                <input type="text" value={name} readOnly style={{ ...inputStyle, background: t.bgCardAlt, cursor: 'not-allowed', opacity: 0.8 }} />
                                            </div>
                                        </div>

                                        {/* Email (read-only, from invite) */}
                                        <div style={{ marginBottom: '18px' }}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSec, marginBottom: '8px' }}>Email address</label>
                                            <div style={{ position: 'relative' }}>
                                                <Mail style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: t.textFaint }} />
                                                <input type="email" value={email} readOnly style={{ ...inputStyle, background: t.bgCardAlt, cursor: 'not-allowed', opacity: 0.8 }} />
                                            </div>
                                            <p style={{ fontSize: '11px', color: t.successText, marginTop: '6px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <ShieldCheck style={{ width: 12, height: 12 }} /> Verified from invite — cannot be changed
                                            </p>
                                        </div>

                                        {/* Passwords */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSec, marginBottom: '8px' }}>Password</label>
                                                <div style={{ position: 'relative' }}>
                                                    <Lock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: t.textFaint }} />
                                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 chars" required minLength={6} style={inputStyle}
                                                        onFocus={e => { e.target.style.borderColor = t.borderFocus; e.target.style.boxShadow = `0 0 0 3px ${t.accentSoft}`; }}
                                                        onBlur={e => { e.target.style.borderColor = t.inputBorder; e.target.style.boxShadow = 'none'; }} />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: t.textSec, marginBottom: '8px' }}>Confirm</label>
                                                <div style={{ position: 'relative' }}>
                                                    <Lock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: t.textFaint }} />
                                                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter" required style={inputStyle}
                                                        onFocus={e => { e.target.style.borderColor = t.borderFocus; e.target.style.boxShadow = `0 0 0 3px ${t.accentSoft}`; }}
                                                        onBlur={e => { e.target.style.borderColor = t.inputBorder; e.target.style.boxShadow = 'none'; }} />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Error */}
                                {error && (
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', background: t.errorBg, border: `1px solid ${t.errorBorder}` }}>
                                        <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: '1px', color: t.errorText }} />
                                        <span style={{ color: t.errorText, fontWeight: 500 }}>{error}</span>
                                    </div>
                                )}

                                {/* Submit */}
                                <button type="submit" disabled={loading || !inviteValidated} style={{
                                    width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                                    background: inviteValidated ? t.mentorAccent : t.textFaint, color: '#fff',
                                    fontSize: '15px', fontWeight: 700,
                                    cursor: (loading || !inviteValidated) ? 'not-allowed' : 'pointer',
                                    opacity: (loading || !inviteValidated) ? 0.6 : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    transition: 'all 0.2s', boxShadow: inviteValidated ? '0 4px 16px rgba(139,92,246,0.3)' : 'none',
                                }}>
                                    {loading ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : <ArrowRight style={{ width: 18, height: 18 }} />}
                                    {loading ? 'Creating account...' : inviteValidated ? 'Create mentor account' : 'Verify invite code first'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Terms */}
                    <p style={{ fontSize: '11px', color: t.textFaint, textAlign: 'center', marginTop: '16px', lineHeight: 1.6, fontFamily: 'Manrope, sans-serif' }}>
                        By creating an account, you agree to ZENTRAX's Terms of Service and Privacy Policy.
                    </p>

                    {/* Login link */}
                    <div style={{ textAlign: 'center', marginTop: '24px' }}>
                        <p style={{ fontSize: '14px', color: t.textMuted }}>
                            Already have an account?{' '}
                            <Link to="/login" style={{ fontWeight: 700, color: t.accent, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                Sign in <ChevronRight style={{ width: 14, height: 14 }} />
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Styles */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(30px, -30px) scale(1.05); }
                    50% { transform: translate(-20px, 20px) scale(0.95); }
                    75% { transform: translate(15px, -15px) scale(1.02); }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                [data-theme="dark"] h1, [data-theme="dark"] h2, [data-theme="dark"] h3, [data-theme="dark"] label { color: #F8FAFC !important; }
                [data-theme="light"] h1, [data-theme="light"] h2, [data-theme="light"] h3 { color: #0F172A !important; }
                @media (max-width: 900px) {
                    .auth-left-panel { display: none !important; }
                    .auth-mobile-logo { display: block !important; }
                }
            `}</style>
        </div>
    );
};

export default Signup;
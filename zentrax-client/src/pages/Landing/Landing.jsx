import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import logo from '../../assets/logo.png';
import {
    ArrowRight, Play, Star, Quote, ChevronDown,
    Github, Linkedin, Twitter,
    UserPlus, FolderKanban, Users, Sparkles, GraduationCap, Brain,
    MessageSquare, BarChart3, Rocket, BookOpen, Award, Clock,
    Video, Plus, Minus, Heart, Sun, Moon, Cpu, Menu, X
} from 'lucide-react';

/* ─────────── Design Tokens ─────────── */
const T = {
    light: {
        bg:         '#F8FAFC',
        bgAlt:      '#FFFFFF',
        bgCard:     '#FFFFFF',
        bgCardAlt:  '#F1F5F9',
        border:     'rgba(15,23,42,0.08)',
        borderHover:'rgba(59,130,246,0.3)',
        text:       '#0F172A',
        textSec:    '#334155',
        textMuted:  '#64748B',
        textFaint:  '#94A3B8',
        accent:     '#3B82F6',
        accentHover:'#2563EB',
        accentSoft: 'rgba(59,130,246,0.08)',
        accentBorder:'rgba(59,130,246,0.2)',
        gradient:   'linear-gradient(135deg, #3B82F6 0%, #0F172A 100%)',
        shadow:     '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        shadowLg:   '0 10px 40px rgba(15,23,42,0.08)',
        navBg:      'rgba(248,250,252,0.85)',
        navBorder:  'rgba(15,23,42,0.06)',
        badgeBg:    'rgba(59,130,246,0.06)',
        badgeBorder:'rgba(59,130,246,0.15)',
        badgeText:  '#3B82F6',
        starColor:  '#F59E0B',
        mentorAccent:'#8B5CF6',
        mentorSoft:  'rgba(139,92,246,0.08)',
        mentorBorder:'rgba(139,92,246,0.2)',
    },
    dark: {
        bg:         '#0F172A',
        bgAlt:      '#0F172A',
        bgCard:     '#1E293B',
        bgCardAlt:  '#1E293B',
        border:     'rgba(248,250,252,0.08)',
        borderHover:'rgba(59,130,246,0.4)',
        text:       '#F8FAFC',
        textSec:    '#CBD5E1',
        textMuted:  '#94A3B8',
        textFaint:  '#64748B',
        accent:     '#3B82F6',
        accentHover:'#60A5FA',
        accentSoft: 'rgba(59,130,246,0.12)',
        accentBorder:'rgba(59,130,246,0.25)',
        gradient:   'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
        shadow:     '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.15)',
        shadowLg:   '0 10px 40px rgba(0,0,0,0.3)',
        navBg:      'rgba(15,23,42,0.85)',
        navBorder:  'rgba(248,250,252,0.06)',
        badgeBg:    'rgba(59,130,246,0.12)',
        badgeBorder:'rgba(59,130,246,0.25)',
        badgeText:  '#60A5FA',
        starColor:  '#F59E0B',
        mentorAccent:'#A78BFA',
        mentorSoft:  'rgba(139,92,246,0.15)',
        mentorBorder:'rgba(139,92,246,0.3)',
    }
};

/* ─────────── Intersection Observer Hook ─────────── */
const useInView = (options = {}) => {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setInView(true); obs.unobserve(el); }
        }, { threshold: 0.15, ...options });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return [ref, inView];
};

/* ─────────── Animated Counter ─────────── */
const Counter = ({ end, suffix = '', duration = 2000 }) => {
    const [count, setCount] = useState(0);
    const [ref, inView] = useInView();
    useEffect(() => {
        if (!inView) return;
        let start = 0;
        const step = end / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= end) { setCount(end); clearInterval(timer); }
            else setCount(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [inView, end, duration]);
    return <span ref={ref}>{count}{suffix}</span>;
};

/* ─────────── FAQ Accordion Item ─────────── */
const FAQItem = ({ question, answer, isOpen, onToggle, t }) => (
    <div style={{
        border: `1px solid ${isOpen ? t.accentBorder : t.border}`,
        background: isOpen ? t.accentSoft : t.bgCard,
        borderRadius: '16px',
        transition: 'all 0.3s ease',
    }}>
        <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, paddingRight: '16px', color: isOpen ? t.text : t.textSec, fontFamily: 'Inter, sans-serif', transition: 'color 0.3s' }}>{question}</span>
            <div style={{
                flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isOpen ? t.accent : t.accentSoft,
                border: isOpen ? 'none' : `1px solid ${t.border}`,
                transition: 'all 0.3s',
            }}>
                {isOpen ? <Minus style={{ width: 16, height: 16, color: '#fff' }} /> : <Plus style={{ width: 16, height: 16, color: t.textMuted }} />}
            </div>
        </button>
        <div style={{ overflow: 'hidden', maxHeight: isOpen ? '300px' : '0', opacity: isOpen ? 1 : 0, transition: 'all 0.3s ease' }}>
            <p style={{ padding: '0 24px 20px', color: t.textMuted, fontSize: '14px', lineHeight: 1.7, fontFamily: 'Manrope, sans-serif', margin: 0 }}>{answer}</p>
        </div>
    </div>
);

/* ─────────── Subtle Background Shapes ─────────── */
const BGShapes = ({ t }) => (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
        <div style={{
            position: 'absolute', top: '-10%', left: '-5%', width: '500px', height: '500px', borderRadius: '50%', opacity: 0.5,
            background: `radial-gradient(circle, ${t.accentSoft} 0%, transparent 70%)`,
            animation: 'float 20s ease-in-out infinite',
        }} />
        <div style={{
            position: 'absolute', top: '40%', right: '-10%', width: '400px', height: '400px', borderRadius: '50%', opacity: 0.3,
            background: `radial-gradient(circle, ${t.mentorSoft} 0%, transparent 70%)`,
            animation: 'float 25s ease-in-out infinite reverse',
        }} />
        <div style={{
            position: 'absolute', bottom: '-5%', left: '30%', width: '350px', height: '350px', borderRadius: '50%', opacity: 0.35,
            background: `radial-gradient(circle, ${t.accentSoft} 0%, transparent 70%)`,
            animation: 'float 18s ease-in-out infinite 2s',
        }} />
    </div>
);

export default function Landing() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [openFAQ, setOpenFAQ] = useState(0);
    const { isDark, toggleTheme } = useTheme();
    const [mobileMenu, setMobileMenu] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const t = isDark ? T.dark : T.light;

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    /* Section refs for scroll animations */
    const [heroRef, heroInView] = useInView();
    const [featRef, featInView] = useInView();
    const [stepsRef, stepsInView] = useInView();
    const [rolesRef, rolesInView] = useInView();
    const [techRef, techInView] = useInView();
    const [showcaseRef, showcaseInView] = useInView();
    const [testRef, testInView] = useInView();
    const [faqRef, faqInView] = useInView();
    const [ctaRef, ctaInView] = useInView();

    const navLinks = [
        { label: 'Features', href: '#features' },
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'For Students', href: '#for-students' },
        { label: 'Testimonials', href: '#testimonials' },
        { label: 'FAQ', href: '#faq' },
    ];

    const features = [
        { icon: Cpu, title: 'AI-Powered Matching', desc: 'Our AI analyzes skills, interests, and goals to find the perfect teammates and mentors for your project.' },
        { icon: Users, title: 'Team Formation', desc: 'Build dream teams with complementary skills. Browse open projects or let AI suggest the best matches.' },
        { icon: GraduationCap, title: 'Mentor Connect', desc: 'Get guided by industry experts. Request mentorship, schedule sessions, and receive real-time feedback.' },
        { icon: FolderKanban, title: 'Project Workspace', desc: 'Manage tasks with Kanban boards, track progress, collaborate in real-time, and bring your ideas to life.' },
        { icon: MessageSquare, title: 'Real-time Chat', desc: 'Direct messaging, group chats, and mentor channels — communicate seamlessly across your entire team.' },
        { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Track project progress, team performance, and skill growth with beautiful visual analytics.' },
    ];

    const steps = [
        { num: '01', icon: UserPlus, title: 'Create Your Profile', desc: 'Sign up as a student or mentor, add your skills, interests, and tell us about your goals. Our onboarding guides you through it.' },
        { num: '02', icon: Sparkles, title: 'Get AI-Matched', desc: 'Our AI analyzes your profile to suggest ideal teammates and mentors. Find the perfect match for your project in seconds.' },
        { num: '03', icon: FolderKanban, title: 'Collaborate & Build', desc: 'Use project workspaces with Kanban boards, real-time chat, live mentoring sessions, and task tracking to build together.' },
        { num: '04', icon: Award, title: 'Showcase & Grow', desc: 'Present your finished project, earn badges, build your portfolio, and level up your career with verified achievements.' },
    ];

    const studentFeatures = [
        { icon: Sparkles, title: 'AI Team Matching', desc: 'Get matched with teammates who complement your skills' },
        { icon: FolderKanban, title: 'Project Workspaces', desc: 'Kanban boards, task tracking, and file sharing in one place' },
        { icon: Brain, title: 'AI Assistant', desc: 'Get help with code, architecture, and project ideas 24/7' },
        { icon: MessageSquare, title: 'Real-time Chat', desc: 'Message teammates and mentors with instant notifications' },
        { icon: BookOpen, title: 'Doubt Resolution', desc: 'Submit doubts and get expert answers from assigned mentors' },
        { icon: Award, title: 'Badges & Portfolio', desc: 'Earn achievement badges and build your professional profile' },
    ];

    const mentorFeatures = [
        { icon: Users, title: 'Team Management', desc: 'View and manage all assigned student teams from one dashboard' },
        { icon: Video, title: 'Live Sessions', desc: 'Conduct live mentoring sessions with screen sharing and chat' },
        { icon: MessageSquare, title: 'Mentor Chat Hub', desc: 'Dedicated messaging channels with each mentee team' },
        { icon: BarChart3, title: 'Analytics & Insights', desc: 'Track student progress, engagement, and project milestones' },
        { icon: BookOpen, title: 'Doubt Queue', desc: 'Structured doubt resolution with priority and status tracking' },
        { icon: Clock, title: 'Session Scheduling', desc: 'Schedule and manage mentoring sessions with calendar integration' },
    ];

    const testimonials = [
        { name: 'Priya Sharma', role: 'CSE, 3rd Year', text: 'ZENTRAX helped me find the perfect team for my capstone project. The AI matching is incredibly accurate — we had complementary skills from day one!', avatar: 'PS' },
        { name: 'Rahul Kumar', role: 'AI/ML Mentor', text: 'As a mentor, I can easily discover promising projects and guide multiple teams simultaneously. The live session feature is a game-changer.', avatar: 'RK' },
        { name: 'Ananya Raj', role: 'ECE, 4th Year', text: 'The project workspace is amazing. We tracked everything with Kanban boards and our mentor could see our progress in real-time.', avatar: 'AR' },
        { name: 'Dr. Venkatesh', role: 'Industry Mentor', text: 'ZENTRAX bridges the gap between academia and industry. I can mentor students remotely with all the tools I need — chat, live sessions, and analytics.', avatar: 'DV' },
    ];

    const faqs = [
        { q: 'What is ZENTRAX and who is it for?', a: 'ZENTRAX is an AI-powered student-mentor collaboration platform designed for engineering college students and industry mentors. Students can form teams, find mentors, and collaborate on projects, while mentors can guide multiple teams with structured tools for doubt resolution, live sessions, and progress tracking.' },
        { q: 'How does AI-powered team matching work?', a: 'When you create your profile, you add your skills, interests, department, and project preferences. Our AI algorithm analyzes these factors to suggest teammates with complementary skills and mentors with relevant expertise.' },
        { q: 'Is ZENTRAX free for students?', a: 'Yes! ZENTRAX is completely free for students at Rajalakshmi Engineering College. You can create projects, join teams, use the AI assistant, chat with teammates, and attend live mentor sessions — all at no cost.' },
        { q: 'How do live mentoring sessions work?', a: 'Students can request mentoring sessions through the platform. Once a mentor accepts, both parties join a live session room with real-time video, screen sharing, and an integrated chat panel.' },
        { q: 'Can I use the AI Assistant for project help?', a: 'Absolutely! The ZENTRAX AI Assistant is available 24/7 to help you with project ideas, code debugging, architecture advice, technical documentation, and more.' },
        { q: 'What departments and branches are supported?', a: 'ZENTRAX supports cross-department collaboration. Students from CSE, ECE, EEE, AI/ML, Data Science, Mechanical, Civil, and all other branches can join and form interdisciplinary teams.' },
    ];

    const showcaseItems = [
        { label: 'Student Dashboard', desc: 'Overview of projects, teams, tasks & mentor connections' },
        { label: 'Mentor Hub', desc: 'Manage teams, view doubts, schedule sessions' },
        { label: 'Project Canvas', desc: 'Kanban boards, task tracking & file collaboration' },
        { label: 'Live Sessions', desc: 'Real-time video mentoring with screen sharing' },
        { label: 'Team Analytics', desc: 'Performance metrics, progress tracking & insights' },
        { label: 'AI Workspace', desc: '24/7 AI assistant for code, ideas & architecture' },
    ];

    /* ─── Common card style helper ─── */
    const cardStyle = (extra = {}) => ({
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: '16px',
        boxShadow: t.shadow,
        transition: 'all 0.3s ease',
        ...extra,
    });

    return (
        <div data-theme={isDark ? 'dark' : 'light'} style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', background: t.bg, color: t.textSec, overflowX: 'hidden', transition: 'background 0.4s ease, color 0.4s ease' }}>
            {/* ═══════════ Google Fonts ═══════════ */}
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

            {/* ═══════════ NAV ═══════════ */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
                background: scrolled ? t.navBg : 'transparent',
                backdropFilter: scrolled ? 'blur(20px)' : 'none',
                borderBottom: scrolled ? `1px solid ${t.navBorder}` : '1px solid transparent',
                transition: 'all 0.4s ease',
            }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Logo */}
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                        <img src={logo} alt="Zentrax Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                        <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.02em', color: t.text }}>ZENTRAX</span>
                    </Link>

                    {/* Desktop Links */}
                    <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                        {navLinks.map(link => (
                            <a key={link.label} href={link.href} style={{ fontSize: '14px', fontWeight: 500, color: t.textMuted, textDecoration: 'none', transition: 'color 0.2s' }}
                                onMouseEnter={e => e.target.style.color = t.text} onMouseLeave={e => e.target.style.color = t.textMuted}>
                                {link.label}
                            </a>
                        ))}
                    </div>

                    {/* Right side */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Theme toggle */}
                        <button onClick={toggleTheme} style={{
                            width: '36px', height: '36px', borderRadius: '10px', border: `1px solid ${t.border}`,
                            background: t.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.3s',
                        }} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
                            {isDark ? <Sun style={{ width: 16, height: 16, color: t.textMuted }} /> : <Moon style={{ width: 16, height: 16, color: t.textMuted }} />}
                        </button>

                        <div className="nav-cta-desktop" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {user ? (
                                <Link to="/dashboard" style={{
                                    padding: '8px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                                    background: t.accent, color: '#fff', textDecoration: 'none', transition: 'all 0.2s',
                                }}>Dashboard</Link>
                            ) : (
                                <>
                                    <Link to="/login" style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 500, color: t.textMuted, textDecoration: 'none', transition: 'color 0.2s' }}
                                        onMouseEnter={e => e.target.style.color = t.text} onMouseLeave={e => e.target.style.color = t.textMuted}>Sign In</Link>
                                    <Link to="/signup" style={{
                                        padding: '8px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                                        background: t.accent, color: '#fff', textDecoration: 'none', transition: 'all 0.2s',
                                        boxShadow: '0 2px 12px rgba(59,130,246,0.3)',
                                    }}>Get Started</Link>
                                </>
                            )}
                        </div>

                        {/* Mobile menu toggle */}
                        <button className="nav-mobile-btn" onClick={() => setMobileMenu(!mobileMenu)} style={{
                            display: 'none', padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: t.text
                        }}>
                            {mobileMenu ? <X style={{ width: 22, height: 22 }} /> : <Menu style={{ width: 22, height: 22 }} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenu && (
                    <div style={{ background: t.bgCard, borderBottom: `1px solid ${t.border}`, padding: '24px', backdropFilter: 'blur(20px)' }}>
                        {navLinks.map(link => (
                            <a key={link.label} href={link.href} onClick={() => setMobileMenu(false)}
                                style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: t.textSec, padding: '10px 0', textDecoration: 'none' }}>
                                {link.label}
                            </a>
                        ))}
                        <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: `1px solid ${t.border}`, marginTop: '8px' }}>
                            <Link to="/login" style={{ flex: 1, textAlign: 'center', fontSize: '14px', fontWeight: 500, padding: '10px', borderRadius: '10px', color: t.text, background: t.bgCardAlt, border: `1px solid ${t.border}`, textDecoration: 'none' }}>Sign In</Link>
                            <Link to="/signup" style={{ flex: 1, textAlign: 'center', fontSize: '14px', fontWeight: 600, padding: '10px', borderRadius: '10px', color: '#fff', background: t.accent, textDecoration: 'none' }}>Get Started</Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* ═══════════ HERO ═══════════ */}
            <section ref={heroRef} style={{ position: 'relative', paddingTop: '140px', paddingBottom: '80px', overflow: 'hidden' }}>
                <BGShapes t={t} />

                <div style={{ position: 'relative', zIndex: 10, maxWidth: '1280px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
                    {/* Badge */}
                    <div className={`anim-el ${heroInView ? 'anim-in' : ''}`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px',
                        borderRadius: '100px', fontSize: '12px', fontWeight: 600, marginBottom: '32px',
                        background: t.badgeBg, border: `1px solid ${t.badgeBorder}`, color: t.badgeText,
                    }}>
                        <Sparkles style={{ width: 12, height: 12 }} />
                        AI-Powered Student Collaboration
                        <ChevronDown style={{ width: 12, height: 12 }} />
                    </div>

                    {/* Title */}
                    <h1 className={`anim-el ${heroInView ? 'anim-in' : ''}`} style={{
                        fontSize: 'clamp(2.5rem, 7vw, 5rem)', fontWeight: 900, lineHeight: 0.95,
                        letterSpacing: '-0.03em', marginBottom: '24px', fontFamily: 'Inter, sans-serif',
                    }}>
                        <span style={{ display: 'block', color: t.text }}>Build Projects.</span>
                        <span className="accent-text" style={{ display: 'block', marginTop: '8px', color: t.accent }}>Find Your Team.</span>
                        <span style={{ display: 'block', marginTop: '8px', color: t.text }}>Grow Together.</span>
                    </h1>

                    {/* Subtitle */}
                    <p className={`anim-el delay-1 ${heroInView ? 'anim-in' : ''}`} style={{
                        fontSize: '18px', color: t.textMuted, maxWidth: '640px', margin: '0 auto 40px',
                        lineHeight: 1.7, fontFamily: 'Manrope, sans-serif',
                    }}>
                        ZENTRAX connects students with teammates and mentors using AI.
                        Create projects, form teams, get expert guidance, and build something amazing — all in one platform.
                    </p>

                    {/* CTA Buttons */}
                    <div className={`anim-el delay-2 ${heroInView ? 'anim-in' : ''}`} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '64px' }}>
                        <Link to="/signup" style={{
                            padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                            background: t.accent, color: '#fff', textDecoration: 'none',
                            boxShadow: '0 4px 20px rgba(59,130,246,0.3)', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            Start Building Free <ArrowRight style={{ width: 16, height: 16 }} />
                        </Link>
                        <a href="#how-it-works" style={{
                            padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
                            background: t.bgCard, color: t.textSec, textDecoration: 'none',
                            border: `1px solid ${t.border}`, transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            <Play style={{ width: 14, height: 14 }} />
                            See How It Works
                        </a>
                    </div>

                    {/* Dashboard Preview */}
                    <div className={`anim-el delay-3 ${heroInView ? 'anim-in' : ''}`} style={{ maxWidth: '960px', margin: '0 auto 0' }}>
                        <div style={{
                            ...cardStyle({ padding: '24px 32px', borderRadius: '20px', boxShadow: t.shadowLg }),
                        }}>
                            {/* Browser dots */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
                                <div style={{ flex: 1 }} />
                                <span style={{ fontSize: '10px', color: t.textFaint, fontFamily: 'monospace' }}>zentrax.app/dashboard</span>
                            </div>
                            {/* Stat cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
                                {[
                                    { label: 'Active Projects', value: '12', color: t.accent },
                                    { label: 'Team Members', value: '48', color: '#3B82F6' },
                                    { label: 'Mentors Active', value: '8', color: '#8B5CF6' },
                                    { label: 'AI Matches', value: '156', color: '#F59E0B' },
                                ].map(s => (
                                    <div key={s.label} style={{ padding: '16px', borderRadius: '12px', background: t.bgCardAlt, border: `1px solid ${t.border}`, textAlign: 'left' }}>
                                        <p style={{ fontSize: '22px', fontWeight: 900, color: s.color, marginBottom: '4px' }}>{s.value}</p>
                                        <p style={{ fontSize: '10px', color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{s.label}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Placeholder rows */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} style={{ height: '80px', borderRadius: '12px', background: t.bgCardAlt, border: `1px solid ${t.border}`, padding: '12px' }}>
                                        <div style={{ height: '8px', width: '64px', borderRadius: '4px', background: t.border, marginBottom: '8px' }} />
                                        <div style={{ height: '8px', width: '96px', borderRadius: '4px', background: t.border, marginBottom: '8px', opacity: 0.6 }} />
                                        <div style={{ height: '8px', width: '48px', borderRadius: '4px', background: t.border, opacity: 0.3 }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ STATS ═══════════ */}
            <section style={{ padding: '48px 24px', borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}>
                <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', textAlign: 'center' }}>
                    {[
                        { label: 'Active Students', value: 500, suffix: '+' },
                        { label: 'Projects Built', value: 120, suffix: '+' },
                        { label: 'Expert Mentors', value: 40, suffix: '+' },
                        { label: 'Match Accuracy', value: 95, suffix: '%' },
                    ].map((stat, i) => (
                        <div key={i}>
                            <p style={{
                                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 900, marginBottom: '4px',
                                color: t.accent,
                            }}>
                                <Counter end={stat.value} suffix={stat.suffix} />
                            </p>
                            <p style={{ fontSize: '12px', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════════ TRUSTED BY ═══════════ */}
            <section style={{ padding: '40px 24px' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: '20px' }}>Trusted by students & mentors at</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '32px', opacity: 0.4 }}>
                        {['Rajalakshmi Engineering College', 'REC Innovation Lab', 'ACM Student Chapter', 'IEEE REC'].map(name => (
                            <span key={name} style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '-0.01em', color: t.text, whiteSpace: 'nowrap' }}>{name}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ FEATURES ═══════════ */}
            <section id="features" ref={featRef} style={{ padding: '96px 24px', position: 'relative' }}>
                <BGShapes t={t} />
                <div style={{ position: 'relative', zIndex: 10, maxWidth: '1280px', margin: '0 auto' }}>
                    <div className={`anim-el ${featInView ? 'anim-in' : ''}`} style={{ textAlign: 'center', marginBottom: '64px' }}>
                        <span style={{ display: 'inline-block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px', color: t.accent }}>Capabilities</span>
                        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 900, color: t.text, marginBottom: '16px' }}>
                            Everything you need to{' '}
                            <span className="accent-text" style={{ color: t.accent }}>build & grow</span>
                        </h2>
                        <p style={{ fontSize: '16px', color: t.textMuted, maxWidth: '580px', margin: '0 auto', fontFamily: 'Manrope, sans-serif', lineHeight: 1.7 }}>
                            From AI-powered matching to real-time collaboration, ZENTRAX provides a complete ecosystem for student projects and mentorship.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                        {features.map((feat, i) => (
                            <div key={i}
                                className={`card-hover anim-el ${featInView ? 'anim-in' : ''}`}
                                style={{ ...cardStyle({ padding: '28px' }), transitionDelay: `${i * 80}ms` }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: t.accentSoft, marginBottom: '16px',
                                }}>
                                    <feat.icon style={{ width: 24, height: 24, color: t.accent }} />
                                </div>
                                <h3 style={{ fontSize: '17px', fontWeight: 700, color: t.text, marginBottom: '8px' }}>{feat.title}</h3>
                                <p style={{ fontSize: '14px', color: t.textMuted, lineHeight: 1.7, fontFamily: 'Manrope, sans-serif' }}>{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ HOW IT WORKS ═══════════ */}
            <section id="how-it-works" ref={stepsRef} style={{ padding: '96px 24px', position: 'relative' }}>
                <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
                    <div className={`anim-el ${stepsInView ? 'anim-in' : ''}`} style={{ textAlign: 'center', marginBottom: '64px' }}>
                        <span style={{ display: 'inline-block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px', color: t.accent }}>How It Works</span>
                        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 900, color: t.text, marginBottom: '16px' }}>
                            Get started in{' '}
                            <span className="accent-text" style={{ color: t.accent }}>4 simple steps</span>
                        </h2>
                        <p style={{ fontSize: '16px', color: t.textMuted, maxWidth: '520px', margin: '0 auto', fontFamily: 'Manrope, sans-serif', lineHeight: 1.7 }}>
                            From signing up to showcasing your project — ZENTRAX guides you through every step.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                        {steps.map((step, i) => (
                            <div key={step.num}
                                className={`card-hover anim-el ${stepsInView ? 'anim-in' : ''}`}
                                style={{ ...cardStyle({ padding: '28px', position: 'relative', overflow: 'hidden' }), transitionDelay: `${i * 120}ms` }}>
                                {/* Watermark number */}
                                <span style={{ position: 'absolute', top: '16px', right: '20px', fontSize: '56px', fontWeight: 900, color: t.text, opacity: 0.03, lineHeight: 1, userSelect: 'none' }}>{step.num}</span>

                                <div style={{ position: 'relative', zIndex: 10, display: 'flex', gap: '16px' }}>
                                    <div style={{
                                        flexShrink: 0, width: '48px', height: '48px', borderRadius: '12px',
                                        background: t.accentSoft, border: `1px solid ${t.accentBorder}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <step.icon style={{ width: 22, height: 22, color: t.accent }} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: t.textFaint }}>{step.num}</span>
                                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: t.text }}>{step.title}</h3>
                                        </div>
                                        <p style={{ fontSize: '13px', color: t.textMuted, lineHeight: 1.7, fontFamily: 'Manrope, sans-serif' }}>{step.desc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ FOR STUDENTS / FOR MENTORS ═══════════ */}
            <section id="for-students" ref={rolesRef} style={{ padding: '96px 24px', borderTop: `1px solid ${t.border}` }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                    <div className={`anim-el ${rolesInView ? 'anim-in' : ''}`} style={{ textAlign: 'center', marginBottom: '64px' }}>
                        <span style={{ display: 'inline-block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px', color: t.accent }}>Built for Everyone</span>
                        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 900, color: t.text, marginBottom: '16px' }}>
                            Whether you're a{' '}
                            <span className="accent-text" style={{ color: t.accent }}>Student or Mentor</span>
                        </h2>
                        <p style={{ fontSize: '16px', color: t.textMuted, maxWidth: '640px', margin: '0 auto', fontFamily: 'Manrope, sans-serif', lineHeight: 1.7 }}>
                            ZENTRAX provides tailored experiences for both students seeking guidance and mentors looking to make an impact.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                        {/* For Students */}
                        <div className={`anim-el ${rolesInView ? 'anim-in' : ''}`} style={{ ...cardStyle({ padding: '36px', borderRadius: '20px' }) }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: t.accentSoft, border: `1px solid ${t.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <GraduationCap style={{ width: 20, height: 20, color: t.accent }} />
                                </div>
                                <h3 style={{ fontSize: '22px', fontWeight: 800, color: t.text }}>For Students</h3>
                            </div>
                            <p style={{ fontSize: '14px', color: t.textMuted, marginBottom: '28px', marginLeft: '52px', fontFamily: 'Manrope, sans-serif' }}>Find teams, get mentored, build projects, and launch your career.</p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                {studentFeatures.map((f, i) => (
                                    <div key={i} className="card-hover" style={{ display: 'flex', gap: '10px', padding: '14px', borderRadius: '12px', background: t.bgCardAlt, border: `1px solid ${t.border}`, transition: 'all 0.2s' }}>
                                        <f.icon style={{ width: 18, height: 18, color: t.accent, flexShrink: 0, marginTop: '2px' }} />
                                        <div>
                                            <p style={{ fontSize: '13px', fontWeight: 600, color: t.text, marginBottom: '2px' }}>{f.title}</p>
                                            <p style={{ fontSize: '11px', color: t.textFaint, lineHeight: 1.5, fontFamily: 'Manrope, sans-serif' }}>{f.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Link to="/signup" style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '28px',
                                padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                                background: t.accent, color: '#fff', textDecoration: 'none',
                                boxShadow: '0 2px 12px rgba(59,130,246,0.25)', transition: 'all 0.2s',
                            }}>
                                Join as Student <ArrowRight style={{ width: 16, height: 16 }} />
                            </Link>
                        </div>

                        {/* For Mentors */}
                        <div className={`anim-el delay-1 ${rolesInView ? 'anim-in' : ''}`} style={{ ...cardStyle({ padding: '36px', borderRadius: '20px' }) }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: t.mentorSoft, border: `1px solid ${t.mentorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Award style={{ width: 20, height: 20, color: t.mentorAccent }} />
                                </div>
                                <h3 style={{ fontSize: '22px', fontWeight: 800, color: t.text }}>For Mentors</h3>
                            </div>
                            <p style={{ fontSize: '14px', color: t.textMuted, marginBottom: '28px', marginLeft: '52px', fontFamily: 'Manrope, sans-serif' }}>Guide the next generation with powerful tools built for mentorship.</p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                {mentorFeatures.map((f, i) => (
                                    <div key={i} className="card-hover" style={{ display: 'flex', gap: '10px', padding: '14px', borderRadius: '12px', background: t.bgCardAlt, border: `1px solid ${t.border}`, transition: 'all 0.2s' }}>
                                        <f.icon style={{ width: 18, height: 18, color: t.mentorAccent, flexShrink: 0, marginTop: '2px' }} />
                                        <div>
                                            <p style={{ fontSize: '13px', fontWeight: 600, color: t.text, marginBottom: '2px' }}>{f.title}</p>
                                            <p style={{ fontSize: '11px', color: t.textFaint, lineHeight: 1.5, fontFamily: 'Manrope, sans-serif' }}>{f.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Link to="/signup" style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '28px',
                                padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                                background: t.bgCardAlt, color: t.text, textDecoration: 'none',
                                border: `1px solid ${t.border}`, transition: 'all 0.2s',
                            }}>
                                Join as Mentor <ArrowRight style={{ width: 16, height: 16 }} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ SHOWCASE ═══════════ */}
            <section id="showcase" ref={showcaseRef} style={{ padding: '96px 24px', borderTop: `1px solid ${t.border}` }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                    <div className={`anim-el ${showcaseInView ? 'anim-in' : ''}`} style={{ textAlign: 'center', marginBottom: '64px' }}>
                        <span style={{ display: 'inline-block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px', color: t.accent }}>Platform Showcase</span>
                        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 900, color: t.text, marginBottom: '16px' }}>
                            Experience{' '}
                            <span className="accent-text" style={{ color: t.accent }}>Every Feature</span>
                        </h2>
                        <p style={{ fontSize: '16px', color: t.textMuted, maxWidth: '580px', margin: '0 auto', fontFamily: 'Manrope, sans-serif', lineHeight: 1.7 }}>
                            See how students and mentors use ZENTRAX's intuitive interfaces to collaborate, build, and grow.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        {showcaseItems.map((item, i) => {
                            const isWide = i === 0 || i === 3;

                            /* --- Mini UI Previews --- */
                            const miniUI = {
                                0: /* Student Dashboard */ (
                                    <div style={{ padding: '16px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div><div style={{ height: 8, width: 120, borderRadius: 4, background: t.text, opacity: 0.7, marginBottom: 4 }} /><div style={{ height: 6, width: 80, borderRadius: 4, background: t.textFaint }} /></div>
                                            <div style={{ padding: '4px 10px', borderRadius: 6, background: t.accent, fontSize: 7, fontWeight: 700, color: '#fff' }}>+ New Project</div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                                            {[{ v: '3', l: 'Projects', c: '#4F46E5' }, { v: '2', l: 'Requests', c: '#f59e0b' }, { v: '1', l: 'Invites', c: '#3b82f6' }, { v: '67%', l: 'Progress', c: '#8b5cf6' }].map(s => (
                                                <div key={s.l} style={{ padding: '8px', borderRadius: 8, background: t.bgCardAlt, border: `1px solid ${t.border}` }}>
                                                    <div style={{ width: 16, height: 16, borderRadius: 5, background: `${s.c}20`, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <div style={{ width: 6, height: 6, borderRadius: 2, background: s.c }} />
                                                    </div>
                                                    <div style={{ fontSize: 14, fontWeight: 900, color: t.text }}>{s.v}</div>
                                                    <div style={{ fontSize: 6, color: t.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.l}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 6, minHeight: 0 }}>
                                            <div style={{ borderRadius: 8, background: t.bgCardAlt, border: `1px solid ${t.border}`, padding: 8, overflow: 'hidden' }}>
                                                <div style={{ fontSize: 7, fontWeight: 700, color: t.text, marginBottom: 6 }}>Recent Projects</div>
                                                {['Smart Campus App', 'ML Pipeline', 'Chat Platform'].map((p, j) => (
                                                    <div key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderTop: j ? `1px solid ${t.border}` : 'none' }}>
                                                        <div><div style={{ fontSize: 7, fontWeight: 600, color: t.text }}>{p}</div><div style={{ fontSize: 5, color: t.textFaint }}>3 members</div></div>
                                                        <div style={{ width: 28, height: 4, borderRadius: 2, background: t.border, overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: 2, background: '#4F46E5', width: `${[75, 45, 20][j]}%` }} /></div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <div style={{ flex: 1, borderRadius: 8, background: t.bgCardAlt, border: `1px solid ${t.border}`, padding: 8 }}>
                                                    <div style={{ fontSize: 7, fontWeight: 700, color: t.text, marginBottom: 4 }}>Team Invites</div>
                                                    <div style={{ fontSize: 6, color: t.textFaint }}>No pending invites</div>
                                                </div>
                                                <div style={{ flex: 1, borderRadius: 8, background: t.bgCardAlt, border: `1px solid ${t.border}`, padding: 8 }}>
                                                    <div style={{ fontSize: 7, fontWeight: 700, color: t.text, marginBottom: 4 }}>Quick Actions</div>
                                                    {['Find Teammates', 'Ask AI'].map(a => (
                                                        <div key={a} style={{ fontSize: 6, padding: '3px 6px', borderRadius: 4, background: t.bgCard, border: `1px solid ${t.border}`, marginBottom: 3, color: t.textMuted, fontWeight: 500, textAlign: 'center' }}>{a}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ),
                                1: /* Mentor Hub */ (
                                    <div style={{ padding: '16px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div><div style={{ height: 8, width: 100, borderRadius: 4, background: t.text, opacity: 0.7, marginBottom: 4 }} /><div style={{ height: 6, width: 80, borderRadius: 4, background: t.textFaint }} /></div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                                            {[{ v: '5', l: 'Mentorships', c: '#4F46E5' }, { v: '3', l: 'Pending', c: '#f59e0b' }, { v: '12', l: 'Students', c: '#3b82f6' }, { v: '5', l: 'This Week', c: '#8b5cf6' }].map(s => (
                                                <div key={s.l} style={{ padding: '8px', borderRadius: 8, background: t.bgCardAlt, border: `1px solid ${t.border}` }}>
                                                    <div style={{ width: 16, height: 16, borderRadius: 5, background: `${s.c}20`, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 6, height: 6, borderRadius: 2, background: s.c }} /></div>
                                                    <div style={{ fontSize: 14, fontWeight: 900, color: t.text }}>{s.v}</div>
                                                    <div style={{ fontSize: 6, color: t.textFaint, fontWeight: 600, textTransform: 'uppercase' }}>{s.l}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, minHeight: 0 }}>
                                            <div style={{ borderRadius: 8, background: t.bgCardAlt, border: `1px solid ${t.border}`, padding: 8, overflow: 'hidden' }}>
                                                <div style={{ fontSize: 7, fontWeight: 700, color: t.text, marginBottom: 6 }}>Pending Requests</div>
                                                {['Priya S.', 'Rahul K.', 'Ananya R.'].map((n, j) => (
                                                    <div key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderTop: j ? `1px solid ${t.border}` : 'none' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <div style={{ width: 14, height: 14, borderRadius: 4, background: `${t.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 700, color: t.accent }}>{n[0]}</div>
                                                            <div style={{ fontSize: 7, fontWeight: 600, color: t.text }}>{n}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 2 }}>
                                                            <div style={{ padding: '2px 5px', borderRadius: 3, background: '#4F46E520', fontSize: 5, fontWeight: 700, color: '#4F46E5' }}>✓</div>
                                                            <div style={{ padding: '2px 5px', borderRadius: 3, background: '#ef444420', fontSize: 5, fontWeight: 700, color: '#ef4444' }}>✕</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ borderRadius: 8, background: t.bgCardAlt, border: `1px solid ${t.border}`, padding: 8, overflow: 'hidden' }}>
                                                <div style={{ fontSize: 7, fontWeight: 700, color: t.text, marginBottom: 6 }}>Active Mentorships</div>
                                                {['Vikram P.', 'Sneha M.'].map((n, j) => (
                                                    <div key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderTop: j ? `1px solid ${t.border}` : 'none' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: `${t.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 700, color: t.accent }}>{n[0]}</div>
                                                            <div style={{ fontSize: 7, fontWeight: 600, color: t.text }}>{n}</div>
                                                        </div>
                                                        <div style={{ padding: '2px 6px', borderRadius: 4, background: `${t.accent}15`, fontSize: 5, fontWeight: 700, color: t.accent }}>Active</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ),
                                2: /* Project Canvas / Kanban */ (
                                    <div style={{ padding: '16px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ width: 16, height: 16, borderRadius: 5, background: `${t.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 6, height: 6, borderRadius: 2, background: t.accent }} /></div>
                                                <div style={{ fontSize: 8, fontWeight: 700, color: t.text }}>Smart Campus App</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 3 }}>{[-2, -4, -6].map((m, j) => <div key={j} style={{ width: 14, height: 14, borderRadius: '50%', background: ['#4F46E5', '#3b82f6', '#8b5cf6'][j], border: `1.5px solid ${t.bgCard}`, marginLeft: m, fontSize: 6, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{['A', 'P', 'R'][j]}</div>)}</div>
                                        </div>
                                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, minHeight: 0 }}>
                                            {[{ title: 'To Do', color: '#f59e0b', tasks: ['Design wireframes', 'Setup database'] }, { title: 'In Progress', color: '#3b82f6', tasks: ['Auth system', 'API endpoints'] }, { title: 'Done', color: '#22c55e', tasks: ['Project setup', 'UI mockups'] }].map(col => (
                                                <div key={col.title} style={{ borderRadius: 8, background: t.bgCardAlt, border: `1px solid ${t.border}`, padding: 6, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: col.color }} />
                                                        <span style={{ fontSize: 6, fontWeight: 700, color: t.text }}>{col.title}</span>
                                                        <span style={{ fontSize: 5, color: t.textFaint, fontWeight: 600, marginLeft: 'auto' }}>{col.tasks.length}</span>
                                                    </div>
                                                    {col.tasks.map(task => (
                                                        <div key={task} style={{ padding: 5, borderRadius: 5, background: t.bgCard, border: `1px solid ${t.border}`, fontSize: 6, fontWeight: 500, color: t.textSec }}>
                                                            {task}
                                                            <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
                                                                <div style={{ padding: '1px 4px', borderRadius: 3, background: `${col.color}15`, fontSize: 4, fontWeight: 700, color: col.color }}>{col.title === 'Done' ? 'completed' : 'active'}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ),
                                3: /* Live Sessions */ (
                                    <div style={{ padding: '16px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, minHeight: 0 }}>
                                            <div style={{ borderRadius: 10, background: '#1a1a2e', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>DV</div>
                                                <div style={{ position: 'absolute', bottom: 6, left: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.6)', fontSize: 6, color: '#fff', fontWeight: 600 }}>Dr. Venkatesh</div>
                                                <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                                                <div style={{ position: 'absolute', top: 6, left: 8, display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.8)', fontSize: 5, fontWeight: 700, color: '#fff' }}>● LIVE</div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <div style={{ borderRadius: 8, background: '#1a1a2e', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff' }}>P</div>
                                                    <div style={{ position: 'absolute', bottom: 4, left: 6, fontSize: 5, color: '#fff', fontWeight: 600 }}>Priya S.</div>
                                                </div>
                                                <div style={{ borderRadius: 8, background: t.bgCardAlt, border: `1px solid ${t.border}`, flex: 1, padding: 6, overflow: 'hidden' }}>
                                                    <div style={{ fontSize: 6, fontWeight: 700, color: t.text, marginBottom: 4 }}>Chat</div>
                                                    {['Great approach!', 'Try using useEffect', 'Thanks mentor!'].map((m, j) => (
                                                        <div key={j} style={{ fontSize: 5, color: j === 2 ? t.accent : t.textMuted, marginBottom: 2, fontWeight: 500 }}>
                                                            <span style={{ fontWeight: 700 }}>{j === 2 ? 'Priya: ' : 'Dr.V: '}</span>{m}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                                            {[{ icon: '🎤', bg: t.bgCardAlt }, { icon: '📷', bg: t.bgCardAlt }, { icon: '🖥️', bg: `${t.accent}30` }, { icon: '📞', bg: '#ef4444' }].map((btn, j) => (
                                                <div key={j} style={{ width: 22, height: 22, borderRadius: 6, background: btn.bg, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>{btn.icon}</div>
                                            ))}
                                        </div>
                                    </div>
                                ),
                                4: /* Team Analytics */ (
                                    <div style={{ padding: '16px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <div style={{ width: 16, height: 16, borderRadius: 5, background: 'linear-gradient(135deg, #4F46E5, #22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 6, height: 6, borderRadius: 1, background: '#fff' }} /></div>
                                                <div style={{ fontSize: 8, fontWeight: 700, color: t.text }}>My Analytics</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 6px', borderRadius: 6, background: '#f97316' + '20', border: '1px solid #f9731640' }}>
                                                <span style={{ fontSize: 7 }}>🔥</span>
                                                <span style={{ fontSize: 6, fontWeight: 700, color: '#f97316' }}>5 day streak</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                                            {[{ v: '4', l: 'Projects', c: '#3b82f6' }, { v: '18', l: 'Tasks Done', c: '#22c55e' }, { v: '6', l: 'In Progress', c: '#6366f1' }, { v: '75%', l: 'Completion', c: '#f59e0b' }].map(s => (
                                                <div key={s.l} style={{ padding: 6, borderRadius: 8, background: `${s.c}10`, border: `1px solid ${s.c}20` }}>
                                                    <div style={{ width: 14, height: 14, borderRadius: 6, background: `linear-gradient(135deg, ${s.c}, ${s.c}aa)`, marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 5, height: 5, borderRadius: 1, background: '#fff' }} /></div>
                                                    <div style={{ fontSize: 12, fontWeight: 900, color: t.text }}>{s.v}</div>
                                                    <div style={{ fontSize: 5, color: t.textFaint, fontWeight: 600 }}>{s.l}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, minHeight: 0 }}>
                                            <div style={{ borderRadius: 8, background: t.bgCardAlt, border: `1px solid ${t.border}`, padding: 8 }}>
                                                <div style={{ fontSize: 7, fontWeight: 700, color: t.text, marginBottom: 8 }}>Tasks This Week</div>
                                                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 3, height: 50 }}>
                                                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, j) => (
                                                        <div key={d + j} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                            <div style={{ width: '100%', borderRadius: 3, background: `linear-gradient(to top, #4F46E5, #818cf8)`, height: [30, 18, 40, 25, 50, 10, 5][j] + '%', minHeight: 3, transition: 'height 0.5s' }} />
                                                            <span style={{ fontSize: 4, fontWeight: 700, color: t.textFaint }}>{d}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div style={{ borderRadius: 8, background: t.bgCardAlt, border: `1px solid ${t.border}`, padding: 8 }}>
                                                <div style={{ fontSize: 7, fontWeight: 700, color: t.text, marginBottom: 6 }}>Tech Stack</div>
                                                {['React', 'Node.js', 'Firebase', 'Python'].map((sk, j) => (
                                                    <div key={sk} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                                        <span style={{ fontSize: 5, fontWeight: 600, color: t.textMuted, width: 28 }}>{sk}</span>
                                                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: t.border, overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', borderRadius: 2, background: ['#4F46E5', '#22c55e', '#f59e0b', '#8b5cf6'][j], width: [90, 70, 55, 40][j] + '%' }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ),
                                5: /* AI Workspace */ (
                                    <div style={{ padding: '16px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                            <div style={{ width: 16, height: 16, borderRadius: 5, background: 'linear-gradient(135deg, #4F46E5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 6, height: 6, borderRadius: 2, background: '#fff' }} /></div>
                                            <div style={{ fontSize: 8, fontWeight: 700, color: t.text }}>ZENTRAX AI</div>
                                            <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} />
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
                                            {/* User message */}
                                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                <div style={{ maxWidth: '70%', padding: '5px 8px', borderRadius: '8px 8px 2px 8px', background: `${t.accent}15`, border: `1px solid ${t.accent}30`, fontSize: 6, color: t.text, fontWeight: 500 }}>
                                                    Suggest a tech stack for a student collab platform
                                                </div>
                                            </div>
                                            {/* AI reply */}
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <div style={{ width: 14, height: 14, borderRadius: 4, background: '#4F46E5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 5, height: 5, borderRadius: 1, background: '#fff' }} /></div>
                                                <div style={{ fontSize: 6, color: t.textSec, lineHeight: 1.5, fontWeight: 500 }}>
                                                    <div style={{ fontWeight: 700, color: t.text, marginBottom: 2 }}>Here's my recommended stack:</div>
                                                    <div>• <span style={{ fontWeight: 600 }}>Frontend:</span> React + Vite</div>
                                                    <div>• <span style={{ fontWeight: 600 }}>Backend:</span> Node.js + Express</div>
                                                    <div>• <span style={{ fontWeight: 600 }}>Database:</span> Firebase Firestore</div>
                                                    <div>• <span style={{ fontWeight: 600 }}>Auth:</span> Firebase Auth</div>
                                                    <div style={{ marginTop: 3, padding: '3px 5px', borderRadius: 4, background: t.bgCardAlt, border: `1px solid ${t.border}`, fontFamily: 'monospace', fontSize: 5, color: t.accent }}>npx create-vite@latest</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {['🚀 Tech stack', '🐛 Debug', '📁 Structure'].map(ch => (
                                                <div key={ch} style={{ padding: '3px 6px', borderRadius: 5, border: `1px solid ${t.border}`, fontSize: 5, color: t.textMuted, fontWeight: 600, background: t.bgCardAlt }}>{ch}</div>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', borderRadius: 8, background: t.bgCardAlt, border: `1px solid ${t.border}` }}>
                                            <div style={{ fontSize: 6, color: t.textFaint, flex: 1, fontWeight: 500 }}>Message ZENTRAX-AI...</div>
                                            <div style={{ width: 14, height: 14, borderRadius: 4, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 0, height: 0, borderLeft: '4px solid #fff', borderTop: '3px solid transparent', borderBottom: '3px solid transparent', marginLeft: 1 }} /></div>
                                        </div>
                                    </div>
                                ),
                            };

                            return (
                                <div key={i} className={`card-hover anim-el ${showcaseInView ? 'anim-in' : ''}`} style={{
                                    position: 'relative', borderRadius: '16px', overflow: 'hidden',
                                    border: `1px solid ${t.border}`,
                                    gridColumn: isWide ? 'span 2' : 'span 1',
                                    aspectRatio: isWide ? '2/1' : '1/1',
                                    display: 'flex', flexDirection: 'column',
                                    background: t.bgCard,
                                    transition: 'all 0.3s',
                                    transitionDelay: `${i * 80}ms`,
                                }}>
                                    {/* Mini UI preview */}
                                    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                                        {miniUI[i]}
                                    </div>
                                    {/* Label bar */}
                                    <div style={{ padding: '12px 16px', borderTop: `1px solid ${t.border}`, background: t.bgCardAlt }}>
                                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: t.text, marginBottom: '2px' }}>{item.label}</h4>
                                        <p style={{ fontSize: '11px', color: t.textMuted, fontFamily: 'Manrope, sans-serif' }}>{item.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══════════ TESTIMONIALS ═══════════ */}
            <section id="testimonials" ref={testRef} style={{ padding: '96px 24px', position: 'relative' }}>
                <BGShapes t={t} />
                <div style={{ position: 'relative', zIndex: 10, maxWidth: '1280px', margin: '0 auto' }}>
                    <div className={`anim-el ${testInView ? 'anim-in' : ''}`} style={{ textAlign: 'center', marginBottom: '64px' }}>
                        <span style={{ display: 'inline-block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px', color: t.accent }}>Testimonials</span>
                        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 900, color: t.text, marginBottom: '16px' }}>
                            Loved by{' '}
                            <span className="accent-text" style={{ color: t.accent }}>students & mentors</span>
                        </h2>
                        <p style={{ fontSize: '16px', color: t.textMuted, maxWidth: '480px', margin: '0 auto', fontFamily: 'Manrope, sans-serif', lineHeight: 1.7 }}>
                            Hear from the people who use ZENTRAX every day to build, learn, and grow.
                        </p>
                    </div>

                    <div className={`anim-el ${testInView ? 'anim-in' : ''}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                        {testimonials.map((tl, i) => (
                            <div key={tl.name} className="card-hover" style={{ ...cardStyle({ padding: '24px' }), transitionDelay: `${i * 80}ms` }}>
                                {/* Stars */}
                                <div style={{ display: 'flex', gap: '3px', marginBottom: '16px' }}>
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} style={{ width: 14, height: 14, fill: t.starColor, color: t.starColor }} />)}
                                </div>
                                <Quote style={{ width: 22, height: 22, color: t.accent, opacity: 0.2, marginBottom: '8px' }} />
                                <p style={{ fontSize: '14px', color: t.textMuted, lineHeight: 1.7, marginBottom: '20px', fontFamily: 'Manrope, sans-serif' }}>{tl.text}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '16px', borderTop: `1px solid ${t.border}` }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '12px', fontWeight: 700, background: t.accentSoft, color: t.accent, border: `1px solid ${t.accentBorder}`,
                                    }}>{tl.avatar}</div>
                                    <div>
                                        <p style={{ fontSize: '14px', fontWeight: 700, color: t.text }}>{tl.name}</p>
                                        <p style={{ fontSize: '12px', color: t.textFaint, fontWeight: 500 }}>{tl.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ FAQ ═══════════ */}
            <section id="faq" ref={faqRef} style={{ padding: '96px 24px', borderTop: `1px solid ${t.border}` }}>
                <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                    <div className={`anim-el ${faqInView ? 'anim-in' : ''}`} style={{ textAlign: 'center', marginBottom: '64px' }}>
                        <span style={{ display: 'inline-block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px', color: t.accent }}>FAQ</span>
                        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 900, color: t.text, marginBottom: '16px' }}>Frequently Asked Questions</h2>
                        <p style={{ fontSize: '16px', color: t.textMuted, fontFamily: 'Manrope, sans-serif' }}>Everything you need to know about ZENTRAX.</p>
                    </div>

                    <div className={`anim-el ${faqInView ? 'anim-in' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {faqs.map((faq, i) => (
                            <FAQItem key={i} question={faq.q} answer={faq.a} isOpen={openFAQ === i} onToggle={() => setOpenFAQ(openFAQ === i ? -1 : i)} t={t} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════ FINAL CTA ═══════════ */}
            <section ref={ctaRef} style={{ padding: '96px 24px', position: 'relative' }}>
                <BGShapes t={t} />
                <div className={`anim-el ${ctaInView ? 'anim-in' : ''}`} style={{ position: 'relative', zIndex: 10, maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ ...cardStyle({ padding: '64px 48px', borderRadius: '24px', boxShadow: t.shadowLg }) }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 24px', background: t.gradient,
                            boxShadow: '0 4px 24px rgba(59,130,246,0.25)',
                        }}>
                            <Rocket style={{ width: 32, height: 32, color: '#fff' }} />
                        </div>
                        <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.75rem)', fontWeight: 900, color: t.text, marginBottom: '16px' }}>
                            Ready to{' '}
                            <span className="accent-text" style={{ color: t.accent }}>build something</span>
                            {' '}amazing?
                        </h2>
                        <p style={{ fontSize: '16px', color: t.textMuted, maxWidth: '480px', margin: '0 auto 32px', lineHeight: 1.7, fontFamily: 'Manrope, sans-serif' }}>
                            Join hundreds of students already building, learning, and growing on ZENTRAX. It's completely free.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                            <Link to="/signup" style={{
                                padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                                background: t.accent, color: '#fff', textDecoration: 'none',
                                boxShadow: '0 4px 20px rgba(59,130,246,0.3)', transition: 'all 0.2s',
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                            }}>
                                Get Started Free <ArrowRight style={{ width: 16, height: 16 }} />
                            </Link>
                            <Link to="/login" style={{ fontSize: '14px', fontWeight: 600, color: t.textMuted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', transition: 'color 0.2s' }}>
                                Already have an account? <ArrowRight style={{ width: 14, height: 14 }} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ FOOTER ═══════════ */}
            <footer style={{ borderTop: `1px solid ${t.border}`, background: t.bgCard, padding: '64px 24px 32px' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '48px', marginBottom: '48px' }}>
                        {/* Brand */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <img src={logo} alt="Zentrax Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                                <span style={{ fontSize: '15px', fontWeight: 700, color: t.text }}>ZENTRAX</span>
                            </div>
                            <p style={{ fontSize: '14px', color: t.textMuted, lineHeight: 1.7, maxWidth: '280px', marginBottom: '12px', fontFamily: 'Manrope, sans-serif' }}>
                                AI-powered student-mentor collaboration platform built at Rajalakshmi Engineering College.
                            </p>
                            <p style={{ fontSize: '12px', color: t.textFaint, marginBottom: '20px' }}>
                                Made with <Heart style={{ width: 12, height: 12, display: 'inline', color: t.accent, fill: t.accent }} /> at REC
                            </p>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[Twitter, Github, Linkedin].map((Icon, i) => (
                                    <a key={i} href="#" style={{
                                        width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: t.bgCardAlt, border: `1px solid ${t.border}`, color: t.textMuted, transition: 'all 0.2s',
                                    }}>
                                        <Icon style={{ width: 16, height: 16 }} />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Links */}
                        {[
                            { title: 'Platform', links: ['Features', 'How It Works', 'For Students', 'For Mentors', 'FAQ'] },
                            { title: 'Features', links: ['AI Matching', 'Project Workspace', 'Live Sessions', 'AI Assistant', 'Analytics'] },
                            { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
                        ].map(col => (
                            <div key={col.title}>
                                <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.textFaint, marginBottom: '20px' }}>{col.title}</h4>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {col.links.map(link => (
                                        <li key={link} style={{ marginBottom: '12px' }}>
                                            <a href="#" style={{ fontSize: '14px', color: t.textMuted, textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}
                                                onMouseEnter={e => e.target.style.color = t.accent} onMouseLeave={e => e.target.style.color = t.textMuted}>
                                                {link}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* Bottom */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingTop: '24px', borderTop: `1px solid ${t.border}`, gap: '16px' }}>
                        <p style={{ fontSize: '13px', color: t.textFaint, fontWeight: 500 }}>© 2026 ZENTRAX. All rights reserved.</p>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
                            borderRadius: '100px', background: t.bgCardAlt, border: `1px solid ${t.border}`,
                        }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s ease-in-out infinite' }} />
                            <span style={{ fontSize: '12px', fontWeight: 500, color: t.textMuted }}>All systems operational</span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* ═══════════ STYLES ═══════════ */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(30px, -30px) scale(1.05); }
                    50% { transform: translate(-20px, 20px) scale(0.95); }
                    75% { transform: translate(15px, -15px) scale(1.02); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }

                .anim-el {
                    opacity: 0;
                    transform: translateY(24px);
                    transition: opacity 0.7s ease, transform 0.7s ease;
                }
                .anim-el.anim-in {
                    opacity: 1;
                    transform: translateY(0);
                }
                .anim-el.delay-1 { transition-delay: 0.15s; }
                .anim-el.delay-2 { transition-delay: 0.3s; }
                .anim-el.delay-3 { transition-delay: 0.45s; }

                .card-hover {
                    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease !important;
                }
                .card-hover:hover {
                    transform: translateY(-3px) !important;
                    box-shadow: ${t.shadowLg} !important;
                    border-color: ${t.borderHover} !important;
                }

                /* Responsive */
                @media (max-width: 1024px) {
                    .nav-links-desktop { display: none !important; }
                }
                @media (max-width: 768px) {
                    .nav-cta-desktop { display: none !important; }
                    .nav-mobile-btn { display: flex !important; }
                }
                @media (max-width: 640px) {
                    section > div > div[style*="grid-template-columns: repeat(4"] {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                    footer > div > div:first-child {
                        grid-template-columns: 1fr 1fr !important;
                    }
                }
                /* Landing page heading overrides — ensures dark mode headings are visible */
                [data-theme="light"] h1,
                [data-theme="light"] h2,
                [data-theme="light"] h3,
                [data-theme="light"] h4 {
                    color: #0F172A !important;
                }
                [data-theme="dark"] h1,
                [data-theme="dark"] h2,
                [data-theme="dark"] h3,
                [data-theme="dark"] h4 {
                    color: #F8FAFC !important;
                }

                /* Accent-colored spans inside headings must override the heading color */
                .accent-text {
                    color: ${t.accent} !important;
                }
            `}</style>
        </div>
    );
}

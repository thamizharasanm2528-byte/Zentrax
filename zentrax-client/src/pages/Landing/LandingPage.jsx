import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight, Sparkles, Users, FolderKanban, GraduationCap,
    Brain, Zap, Target, Shield, ChevronRight, Star, Play,
    MessageSquare, BarChart3, Globe, Rocket, ArrowUpRight, Menu, X
} from 'lucide-react';

/* ── Intersection Observer Hook ── */
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

/* ── Animated Counter ── */
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

/* ── Floating Orbs Background ── */
const FloatingOrbs = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', animation: 'float 20s ease-in-out infinite' }} />
        <div className="absolute top-[35%] right-[-10%] w-[450px] h-[450px] rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', animation: 'float 25s ease-in-out infinite reverse' }} />
        <div className="absolute bottom-[-5%] left-[25%] w-[400px] h-[400px] rounded-full opacity-35"
            style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.05) 0%, transparent 70%)', animation: 'float 18s ease-in-out infinite 2s' }} />
    </div>
);

/* ── Grid Lines Background ── */
const GridBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.05]" aria-hidden="true">
        <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(15,23,42,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
        }} />
    </div>
);

const LandingPage = () => {
    const [mobileMenu, setMobileMenu] = useState(false);
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    /* ── Section Refs ── */
    const [heroRef, heroInView] = useInView();
    const [featRef, featInView] = useInView();
    const [bentoRef, bentoInView] = useInView();
    const [statsRef, statsInView] = useInView();
    const [testRef, testInView] = useInView();
    const [ctaRef, ctaInView] = useInView();

    const navLinks = [
        { label: 'Features', href: '#features' },
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'Testimonials', href: '#testimonials' },
    ];

    const features = [
        { icon: Brain, title: 'AI-Powered Matching', desc: 'Our AI analyzes skills, interests, and goals to find the perfect teammates and mentors for your project.', color: '#4F46E5' },
        { icon: Users, title: 'Team Formation', desc: 'Build dream teams with complementary skills. Browse open projects or let AI suggest the best matches.', color: '#3B82F6' },
        { icon: GraduationCap, title: 'Mentor Connect', desc: 'Get guided by industry experts. Request mentorship, schedule sessions, and receive real-time feedback.', color: '#8B5CF6' },
        { icon: FolderKanban, title: 'Project Workspace', desc: 'Manage tasks, track progress, collaborate in real-time, and bring your ideas to life in one place.', color: '#F59E0B' },
        { icon: MessageSquare, title: 'Real-time Chat', desc: 'Direct messaging, group chats, and mentor channels — communicate seamlessly across your entire team.', color: '#EC4899' },
        { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Track project progress, team performance, and skill growth with beautiful visual analytics.', color: '#06B6D4' },
    ];

    const bentoItems = [
        { span: 'col-span-2 row-span-2', icon: Sparkles, title: 'AI Assistant', desc: 'Chat with ZENTRAX AI for project ideas, code help, architecture advice, and more. Your personal AI mentor, always available.', color: '#4F46E5', size: 'lg' },
        { span: 'col-span-1 row-span-1', icon: Zap, title: 'Instant Matching', desc: 'Get team and mentor suggestions in seconds.', color: '#F59E0B', size: 'sm' },
        { span: 'col-span-1 row-span-1', icon: Shield, title: 'Secure Platform', desc: 'Enterprise-grade security for all your data.', color: '#3B82F6', size: 'sm' },
        { span: 'col-span-1 row-span-2', icon: Target, title: 'Goal Tracking', desc: 'Set milestones, track deadlines, and visualize your project journey from start to finish.', color: '#8B5CF6', size: 'md' },
        { span: 'col-span-2 row-span-1', icon: Globe, title: 'Cross-Department Collaboration', desc: 'Connect with students from CSE, ECE, AI/ML, and more. Build interdisciplinary teams that innovate.', color: '#06B6D4', size: 'md' },
    ];

    const testimonials = [
        { name: 'Priya Sharma', role: 'CSE, 3rd Year', text: 'ZENTRAX helped me find the perfect team for my capstone project. The AI matching is incredibly accurate!', avatar: 'PS' },
        { name: 'Rahul Kumar', role: 'AI/ML Mentor', text: 'As a mentor, I can easily discover promising projects and guide multiple teams. The platform is intuitive and powerful.', avatar: 'RK' },
        { name: 'Ananya Raj', role: 'ECE, 4th Year', text: 'The project workspace is amazing. We tracked everything in one place and our mentor could see our progress in real-time.', avatar: 'AR' },
        { name: 'Dr. Venkatesh', role: 'Industry Mentor', text: 'ZENTRAX bridges the gap between academia and industry. I can mentor students remotely with all the tools I need.', avatar: 'DV' },
    ];

    const steps = [
        { num: '01', title: 'Create Your Profile', desc: 'Sign up, add your skills and interests, and tell us about your goals.' },
        { num: '02', title: 'Start a Project', desc: 'Define your project, and let AI find the best teammates and mentors.' },
        { num: '03', title: 'Collaborate & Build', desc: 'Work together in real-time, track progress, and get expert guidance.' },
        { num: '04', title: 'Showcase & Grow', desc: 'Present your finished project and level up your career portfolio.' },
    ];

    return (
        <div className="min-h-screen text-slate-600 overflow-x-hidden" style={{ background: '#F8FAFC' }}>
            {/* ═══════════════════ NAV ═══════════════════ */}
            <nav
                className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
                style={{
                    background: scrollY > 50 ? 'rgba(255,255,255,0.85)' : 'transparent',
                    backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
                    borderBottom: scrollY > 50 ? '1px solid rgba(15,23,42,0.06)' : '1px solid transparent',
                }}
            >
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center transition-all text-white"
                            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
                            <span className="text-sm font-black">Z</span>
                        </div>
                        <span className="text-base font-bold tracking-tight text-slate-900">ZENTRAX</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map(link => (
                            <a key={link.label} href={link.href} className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium">
                                {link.label}
                            </a>
                        ))}
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors px-4 py-2">
                            Sign in
                        </Link>
                        <Link to="/signup" className="group relative text-sm font-semibold px-5 py-2.5 rounded-lg overflow-hidden transition-all text-white hover:shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
                            Get Started
                            <ArrowRight className="inline-block ml-1.5 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    <button className="md:hidden p-2 text-slate-500" onClick={() => setMobileMenu(!mobileMenu)}>
                        {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenu && (
                    <div className="md:hidden absolute top-16 left-0 right-0 p-6 space-y-4 shadow-xl"
                        style={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                        {navLinks.map(link => (
                            <a key={link.label} href={link.href} className="block text-sm text-slate-600 hover:text-slate-900 py-2 font-medium"
                                onClick={() => setMobileMenu(false)}>{link.label}</a>
                        ))}
                        <div className="flex gap-3 pt-4" style={{ borderTop: '1px solid rgba(15,23,42,0.06)' }}>
                            <Link to="/login" className="flex-1 text-center text-sm font-medium py-2.5 rounded-lg text-slate-700" style={{ background: 'rgba(15,23,42,0.03)', border: '1px solid rgba(15,23,42,0.06)' }}>Sign in</Link>
                            <Link to="/signup" className="flex-1 text-center text-sm font-semibold py-2.5 rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>Get Started</Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* ═══════════════════ HERO ═══════════════════ */}
            <section className="relative pt-32 pb-24 md:pt-44 md:pb-36 overflow-hidden" ref={heroRef}>
                <FloatingOrbs />
                <GridBackground />

                <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                    {/* Badge */}
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 transition-all duration-700 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                        style={{ background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.15)', color: '#4F46E5' }}>
                        <Sparkles className="h-3 w-3" />
                        AI-Powered Student Collaboration
                        <ChevronRight className="h-3 w-3" />
                    </div>

                    {/* Hero Title */}
                    <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight mb-6 transition-all duration-1000 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <span className="block text-slate-900">Build Projects.</span>
                        <span className="block mt-2" style={{
                            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>Find Your Team.</span>
                        <span className="block mt-2 text-slate-800">Grow Together.</span>
                    </h1>

                    {/* Subtitle */}
                    <p className={`text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-1000 delay-200 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        ZENTRAX connects students with teammates and mentors using AI.
                        Create projects, get matched, collaborate, and build something amazing.
                    </p>

                    {/* CTA Buttons */}
                    <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 transition-all duration-1000 delay-400 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <Link to="/signup"
                            className="group relative px-8 py-4 rounded-xl text-base font-bold overflow-hidden transition-all text-white hover:shadow-xl hover:-translate-y-0.5"
                            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
                            <span className="relative z-10 flex items-center gap-2">
                                Start Building <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ background: 'linear-gradient(135deg, #5A52F2, #8B5CF6)' }} />
                        </Link>

                        <a href="#how-it-works"
                            className="group flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all hover:bg-slate-50"
                            style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.08)', color: '#475569' }}>
                            <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.04)' }}>
                                <Play className="h-3 w-3 ml-0.5" />
                            </div>
                            See How It Works
                        </a>
                    </div>

                    {/* Hero Visual — Glassmorphism Dashboard Preview */}
                    <div className={`relative max-w-5xl mx-auto transition-all duration-1000 delay-500 ${heroInView ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
                        <div className="absolute -inset-1 rounded-2xl opacity-20 blur-xl"
                            style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.3), rgba(124,58,237,0.3), rgba(236,72,153,0.3))' }} />
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl"
                            style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.08)' }}>
                            {/* Mock Dashboard */}
                            <div className="p-6 md:p-8">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="h-3 w-3 rounded-full" style={{ background: '#ef4444' }} />
                                    <div className="h-3 w-3 rounded-full" style={{ background: '#f59e0b' }} />
                                    <div className="h-3 w-3 rounded-full" style={{ background: '#22c55e' }} />
                                    <div className="flex-1" />
                                    <span className="text-[10px] text-slate-400 font-mono">zentrax.app/dashboard</span>
                                </div>
                                <div className="grid grid-cols-4 gap-3 mb-4">
                                    {[
                                        { label: 'Active Projects', value: '12', color: '#4F46E5' },
                                        { label: 'Team Members', value: '48', color: '#3b82f6' },
                                        { label: 'Mentors Active', value: '8', color: '#8b5cf6' },
                                        { label: 'AI Matches', value: '156', color: '#f59e0b' },
                                    ].map(s => (
                                        <div key={s.label} className="p-4 rounded-xl text-left" style={{ background: '#F8FAFC', border: '1px solid rgba(15,23,42,0.05)' }}>
                                            <p className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.value}</p>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-24 rounded-xl text-left" style={{ background: '#F8FAFC', border: '1px solid rgba(15,23,42,0.04)' }}>
                                            <div className="p-3">
                                                <div className="h-2 w-16 rounded mb-2" style={{ background: 'rgba(15,23,42,0.06)' }} />
                                                <div className="h-2 w-24 rounded mb-2" style={{ background: 'rgba(15,23,42,0.04)' }} />
                                                <div className="h-2 w-12 rounded" style={{ background: 'rgba(15,23,42,0.03)' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════ TRUSTED BY ═══════════════════ */}
            <section className="py-12 border-y" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-[0.2em] font-bold mb-6">Trusted by students at</p>
                    <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-50">
                        {['Rajalakshmi Engineering College', 'REC Innovation Lab', 'ACM Student Chapter', 'IEEE REC'].map(name => (
                            <span key={name} className="text-sm md:text-base font-extrabold tracking-tight text-slate-700 whitespace-nowrap">{name}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ FEATURES ═══════════════════ */}
            <section id="features" className="relative py-24 md:py-32" ref={featRef}>
                <FloatingOrbs />
                <div className="relative z-10 max-w-7xl mx-auto px-6">
                    <div className={`text-center mb-16 transition-all duration-700 ${featInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] mb-4 animate-pulse-soft" style={{ color: '#4F46E5' }}>Features</span>
                        <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-900">
                            Everything you need to
                            <span style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> build & grow</span>
                        </h2>
                        <p className="text-lg text-slate-500 max-w-xl mx-auto">
                            From AI-powered matching to real-time collaboration, ZENTRAX has it all.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {features.map((feat, i) => (
                            <div key={feat.title}
                                className={`group p-6 rounded-2xl transition-all duration-700 cursor-default hover:-translate-y-1 shadow-sm hover:shadow-md ${featInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                                style={{
                                    background: '#FFFFFF',
                                    border: '1px solid rgba(15,23,42,0.06)',
                                    transitionDelay: `${i * 100}ms`
                                }}>
                                <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-all"
                                    style={{ background: `rgba(79, 70, 229, 0.06)` }}>
                                    <feat.icon className="h-6 w-6" style={{ color: '#4F46E5' }} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">{feat.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ BENTO GRID ═══════════════════ */}
            <section className="relative py-24 md:py-32" ref={bentoRef}>
                <div className="relative z-10 max-w-7xl mx-auto px-6">
                    <div className={`text-center mb-16 transition-all duration-700 ${bentoInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#7C3AED' }}>Platform</span>
                        <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-900">
                            Built for
                            <span style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> modern teams</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[160px] md:auto-rows-[180px]">
                        {bentoItems.map((item, i) => (
                            <div key={item.title}
                                className={`group relative ${item.span} p-6 rounded-2xl overflow-hidden transition-all duration-700 hover:-translate-y-1 shadow-sm hover:shadow-md`}
                                style={{
                                    background: '#FFFFFF',
                                    border: '1px solid rgba(15,23,42,0.06)',
                                    transitionDelay: `${i * 100}ms`
                                }}>
                                {/* Glow on hover */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                    style={{ background: `radial-gradient(circle at 50% 50%, rgba(79,70,229,0.04) 0%, transparent 70%)` }} />

                                <div className="relative z-10 h-full flex flex-col">
                                    <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `rgba(79,70,229,0.06)` }}>
                                        <item.icon className="h-5 w-5" style={{ color: '#4F46E5' }} />
                                    </div>
                                    <h3 className={`font-bold text-slate-900 mb-1 ${item.size === 'lg' ? 'text-xl' : 'text-base'}`}>{item.title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed flex-1">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ STATS ═══════════════════ */}
            <section className="relative py-24" ref={statsRef}>
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(79,70,229,0.02) 50%, transparent 100%)' }} />
                <div className="relative z-10 max-w-5xl mx-auto px-6">
                    <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 transition-all duration-700 ${statsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        {[
                            { value: 500, suffix: '+', label: 'Active Students' },
                            { value: 120, suffix: '+', label: 'Projects Built' },
                            { value: 40, suffix: '+', label: 'Expert Mentors' },
                            { value: 95, suffix: '%', label: 'Match Accuracy' },
                        ].map(stat => (
                            <div key={stat.label} className="text-center p-6 rounded-2xl shadow-sm" style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.06)' }}>
                                <p className="text-4xl md:text-5xl font-black mb-2" style={{
                                    background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}>
                                    <Counter end={stat.value} suffix={stat.suffix} />
                                </p>
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
            <section id="how-it-works" className="relative py-24 md:py-32">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#F59E0B' }}>How It Works</span>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900">
                            Get started in
                            <span style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> 4 simple steps</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {steps.map((step, i) => (
                            <div key={step.num} className="group flex gap-5 p-6 rounded-2xl shadow-sm hover:bg-slate-50/50"
                                style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.06)' }}>
                                <div className="flex-shrink-0 h-14 w-14 rounded-xl flex items-center justify-center text-xl font-black transition-all"
                                    style={{ background: 'rgba(79,70,229,0.08)', color: '#4F46E5', border: '1px solid rgba(79,70,229,0.15)' }}>
                                    {step.num}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">{step.title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ TESTIMONIALS ═══════════════════ */}
            <section id="testimonials" className="relative py-24 md:py-32" ref={testRef}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className={`text-center mb-16 transition-all duration-700 ${testInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#EC4899' }}>Testimonials</span>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900">
                            Loved by
                            <span style={{ background: 'linear-gradient(135deg, #EC4899, #4F46E5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> students & mentors</span>
                        </h2>
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-700 ${testInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        {testimonials.map((t, i) => (
                            <div key={t.name} className="group p-6 rounded-2xl shadow-sm hover:-translate-y-1"
                                style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.06)', transitionDelay: `${i * 100}ms` }}>
                                <div className="flex gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed mb-6 italic">"{t.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold"
                                        style={{ background: 'rgba(79,70,229,0.08)', color: '#4F46E5', border: '1px solid rgba(79,70,229,0.15)' }}>
                                        {t.avatar}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{t.name}</p>
                                        <p className="text-xs text-slate-500 font-medium">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ CTA ═══════════════════ */}
            <section className="relative py-24 md:py-32" ref={ctaRef}>
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-30 blur-3xl"
                        style={{ background: 'radial-gradient(ellipse, rgba(79,70,229,0.15) 0%, rgba(124,58,237,0.05) 50%, transparent 80%)' }} />
                </div>
                <div className={`relative z-10 max-w-3xl mx-auto px-6 text-center transition-all duration-700 ${ctaInView ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
                    <div className="p-12 md:p-16 rounded-3xl shadow-xl" style={{
                        background: '#FFFFFF',
                        border: '1px solid rgba(15,23,42,0.08)',
                    }}>
                        <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white"
                            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
                            <Rocket className="h-8 w-8" />
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black mb-4 text-slate-900">
                            Ready to
                            <span style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> build something</span>
                            {' '}amazing?
                        </h2>
                        <p className="text-lg text-slate-500 mb-8 max-w-lg mx-auto">
                            Join hundreds of students already building, learning, and growing on ZENTRAX.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/signup"
                                className="group px-8 py-4 rounded-xl text-base font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
                                style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
                                Get Started Free <ArrowRight className="inline-block ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link to="/login" className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1">
                                Already have an account? <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════ FOOTER ═══════════════════ */}
            <footer style={{ borderTop: '1px solid rgba(15,23,42,0.06)', background: '#FFFFFF' }}>
                <div className="max-w-7xl mx-auto px-6 py-16">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
                        {/* Brand */}
                        <div className="col-span-2 md:col-span-2 text-left">
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
                                    <span className="text-sm font-black">Z</span>
                                </div>
                                <span className="text-base font-bold text-slate-900">ZENTRAX</span>
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed max-w-xs mb-6">
                                AI-powered student-mentor collaboration platform. Build projects, find teams, grow together.
                            </p>
                            <div className="flex gap-3">
                                {['GitHub', 'LinkedIn', 'Twitter'].map(social => (
                                    <a key={social} href="#" className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all border"
                                        style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
                                        {social.charAt(0)}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Links */}
                        {[
                            { title: 'Product', links: ['Features', 'AI Assistant', 'Team Finder', 'Mentorship'] },
                            { title: 'Resources', links: ['Documentation', 'API Reference', 'Blog', 'Changelog'] },
                            { title: 'Company', links: ['About', 'Careers', 'Privacy Policy', 'Terms of Service'] },
                        ].map(col => (
                            <div key={col.title} className="text-left">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">{col.title}</h4>
                                <ul className="space-y-2.5">
                                    {col.links.map(link => (
                                        <li key={link}>
                                            <a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium">{link}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* Bottom */}
                    <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(15,23,42,0.06)' }}>
                        <p className="text-xs text-slate-400 font-medium">© 2026 ZENTRAX. All rights reserved.</p>
                        <p className="text-xs text-slate-400 font-medium">
                            Made with <span style={{ color: '#4F46E5' }}>♥</span> at Rajalakshmi Engineering College
                        </p>
                    </div>
                </div>
            </footer>

            {/* ═══════════════════ ANIMATIONS ═══════════════════ */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(30px, -30px) scale(1.05); }
                    50% { transform: translate(-20px, 20px) scale(0.95); }
                    75% { transform: translate(15px, -15px) scale(1.02); }
                }
            `}</style>
        </div>
    );
};

export default LandingPage;

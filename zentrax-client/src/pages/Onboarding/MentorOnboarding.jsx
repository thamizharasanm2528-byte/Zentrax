import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase';
import { API_BASE_URL } from '../../apiConfig';
import { Loader2, ArrowRight, ArrowLeft, X, Check } from 'lucide-react';

const EXPERTISE_OPTIONS = [
    'Full Stack', 'AI/ML', 'UI/UX', 'Cloud', 'Cybersecurity',
    'Data Science', 'Mobile Development', 'IoT', 'Embedded Systems'
];

const MentorOnboarding = () => {
    const { user, fetchUserProfile } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        fullName: '', profession: '', company: '', yearsOfExperience: '',
        expertise: [], technologies: [],
        linkedin: '', portfolio: '', bio: '', availableHours: ''
    });

    const [techInput, setTechInput] = useState('');

    const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const toggleExpertise = (item) => {
        const current = form.expertise;
        if (current.includes(item)) {
            updateField('expertise', current.filter(e => e !== item));
        } else {
            updateField('expertise', [...current, item]);
        }
    };

    const addTech = () => {
        const val = techInput.trim();
        if (val && !form.technologies.includes(val)) {
            updateField('technologies', [...form.technologies, val]);
            setTechInput('');
        }
    };

    const canProceed = () => {
        if (step === 1) return form.fullName && form.profession && form.company && form.yearsOfExperience;
        if (step === 2) return form.expertise.length > 0;
        if (step === 3) return form.bio;
        return true;
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: form.fullName,
                    fullName: form.fullName,
                    profession: form.profession,
                    company: form.company,
                    yearsOfExperience: parseInt(form.yearsOfExperience) || 0,
                    expertise: form.expertise,
                    skills: form.expertise,
                    techStack: form.technologies,
                    technologies: form.technologies,
                    linkedin: form.linkedin,
                    portfolio: form.portfolio,
                    bio: form.bio,
                    availableHours: parseInt(form.availableHours) || 0,
                    profileCompleted: true
                })
            });
            if (!res.ok) throw new Error('Failed to save profile');
            await fetchUserProfile(user.uid);
            navigate('/mentor-dashboard', { replace: true });
        } catch (err) {
            setError(err.message || 'Failed to save. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-8" style={{ background: 'var(--color-zen-bg)' }}>
            <div className="w-full max-w-lg animate-fade-in">
                {/* Progress */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-slate-800">Mentor Profile Setup</p>
                        <p className="text-xs text-slate-400">Step {step} of 3</p>
                    </div>
                    <div className="zen-progress">
                        <div className="zen-progress-bar" style={{ width: `${(step / 3) * 100}%` }} />
                    </div>
                    <div className="flex justify-between mt-2">
                        {['Professional', 'Expertise', 'Profile'].map((label, i) => (
                            <span key={label} className={`text-[10px] font-medium ${step > i ? 'text-[#4F46E5]' : 'text-slate-400'}`}>
                                {step > i + 1 ? '✓ ' : ''}{label}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="zen-card p-6 space-y-5">
                    {/* Step 1: Professional */}
                    {step === 1 && (
                        <>
                            <h2 className="text-lg font-bold text-slate-900">Professional Details</h2>
                            <div>
                                <label className="zen-label">Full Name *</label>
                                <input type="text" value={form.fullName} onChange={e => updateField('fullName', e.target.value)} className="zen-input" placeholder="Your full name" autoFocus />
                            </div>
                            <div>
                                <label className="zen-label">Profession *</label>
                                <input type="text" value={form.profession} onChange={e => updateField('profession', e.target.value)} className="zen-input" placeholder="e.g. Software Engineer" />
                            </div>
                            <div>
                                <label className="zen-label">Company *</label>
                                <input type="text" value={form.company} onChange={e => updateField('company', e.target.value)} className="zen-input" placeholder="e.g. Google, TCS, Freelance" />
                            </div>
                            <div>
                                <label className="zen-label">Years of Experience *</label>
                                <input type="number" value={form.yearsOfExperience} onChange={e => updateField('yearsOfExperience', e.target.value)} className="zen-input" placeholder="e.g. 5" min="0" max="50" />
                            </div>
                        </>
                    )}

                    {/* Step 2: Expertise */}
                    {step === 2 && (
                        <>
                            <h2 className="text-lg font-bold text-slate-900">Expertise Areas</h2>
                            <div>
                                <label className="zen-label">Select your expertise * <span className="text-slate-400 font-normal">(pick at least one)</span></label>
                                <div className="grid grid-cols-2 gap-2">
                                    {EXPERTISE_OPTIONS.map(item => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => toggleExpertise(item)}
                                            className="px-3 py-2 rounded-lg text-sm font-medium transition-all text-left"
                                            style={{
                                                background: form.expertise.includes(item) ? 'rgba(79, 70, 229, 0.08)' : '#FFFFFF',
                                                border: `1px solid ${form.expertise.includes(item) ? 'rgba(79, 70, 229, 0.2)' : 'rgba(15, 23, 42, 0.06)'}`,
                                                color: form.expertise.includes(item) ? '#4F46E5' : '#475569',
                                            }}
                                        >
                                            {form.expertise.includes(item) ? '✓ ' : ''}{item}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="zen-label">Technologies <span className="text-slate-400 font-normal">(type & press Enter)</span></label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={techInput}
                                        onChange={e => setTechInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }}
                                        className="zen-input flex-1"
                                        placeholder="e.g. React, AWS, TensorFlow"
                                    />
                                    <button type="button" onClick={addTech} className="zen-btn-secondary px-3">Add</button>
                                </div>
                                {form.technologies.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {form.technologies.map((tech, i) => (
                                            <span key={i} className="zen-badge flex items-center gap-1">
                                                {tech}
                                                <button type="button" onClick={() => updateField('technologies', form.technologies.filter((_, idx) => idx !== i))} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Step 3: Profile */}
                    {step === 3 && (
                        <>
                            <h2 className="text-lg font-bold text-slate-900">Complete Your Profile</h2>
                            <div>
                                <label className="zen-label">LinkedIn URL</label>
                                <input type="url" value={form.linkedin} onChange={e => updateField('linkedin', e.target.value)} className="zen-input" placeholder="https://linkedin.com/in/..." />
                            </div>
                            <div>
                                <label className="zen-label">Portfolio URL</label>
                                <input type="url" value={form.portfolio} onChange={e => updateField('portfolio', e.target.value)} className="zen-input" placeholder="https://your-portfolio.com" />
                            </div>
                            <div>
                                <label className="zen-label">Bio *</label>
                                <textarea value={form.bio} onChange={e => updateField('bio', e.target.value)} className="zen-input resize-none" rows={4} placeholder="Tell students about yourself and your mentoring approach..." />
                            </div>
                            <div>
                                <label className="zen-label">Available Hours per Week</label>
                                <input type="number" value={form.availableHours} onChange={e => updateField('availableHours', e.target.value)} className="zen-input" placeholder="e.g. 5" min="1" max="40" />
                            </div>
                        </>
                    )}

                    {error && <p className="text-xs text-red-600 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.05)' }}>{error}</p>}

                    <div className="flex items-center justify-between pt-2">
                        {step > 1 ? (
                            <button onClick={() => setStep(step - 1)} className="zen-btn-secondary flex items-center gap-1.5"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
                        ) : <div />}
                        {step < 3 ? (
                            <button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="zen-btn-primary flex items-center gap-1.5">Next <ArrowRight className="h-3.5 w-3.5" /></button>
                        ) : (
                            <button onClick={handleSubmit} disabled={loading || !canProceed()} className="zen-btn-primary flex items-center gap-1.5">
                                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                {loading ? 'Saving...' : 'Complete Setup'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MentorOnboarding;

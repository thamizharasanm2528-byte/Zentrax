import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase';
import { API_BASE_URL } from '../../apiConfig';
import { Loader2, ArrowRight, ArrowLeft, X, Check } from 'lucide-react';

/* ── TagInput: defined OUTSIDE the component to avoid re-mount on every keystroke ── */
const TagInput = ({ field, placeholder, tagInputs, setTagInputs, tags, onAdd, onRemove }) => (
    <div>
        <div className="flex gap-2">
            <input
                type="text"
                value={tagInputs[field]}
                onChange={e => setTagInputs(prev => ({ ...prev, [field]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(field); } }}
                className="zen-input flex-1"
                placeholder={placeholder}
            />
            <button type="button" onClick={() => onAdd(field)} className="zen-btn-secondary px-3">Add</button>
        </div>
        {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag, i) => (
                    <span key={i} className="zen-badge flex items-center gap-1">
                        {tag}
                        <button type="button" onClick={() => onRemove(field, i)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                    </span>
                ))}
            </div>
        )}
    </div>
);

const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'CSD', 'Other'];
const YEARS = ['1', '2', '3', '4'];

const StudentOnboarding = () => {
    const { user, fetchUserProfile } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        fullName: '', department: '', year: '',
        skills: [], interests: [],
        linkedin: '', github: '',
        resume: '', previousExperience: '', careerGoal: '',
        isFresher: false
    });

    const [tagInputs, setTagInputs] = useState({ skills: '', interests: '' });

    const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const addTag = (field) => {
        const val = tagInputs[field].trim();
        if (val && !form[field].includes(val)) {
            updateField(field, [...form[field], val]);
            setTagInputs(prev => ({ ...prev, [field]: '' }));
        }
    };

    const removeTag = (field, idx) => {
        updateField(field, form[field].filter((_, i) => i !== idx));
    };

    const canProceed = () => {
        if (step === 1) return form.fullName && form.department && form.year;
        if (step === 2) return form.skills.length > 0 && form.interests.length > 0;
        if (step === 3) return form.isFresher || (form.previousExperience && form.careerGoal);
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
                    department: form.department,
                    year: form.year,
                    skills: form.skills,
                    interests: form.interests,
                    linkedin: form.linkedin,
                    github: form.github,
                    resume: form.resume,
                    isFresher: form.isFresher,
                    previousExperience: form.isFresher ? '' : form.previousExperience,
                    careerGoal: form.isFresher ? '' : form.careerGoal,
                    profileCompleted: true
                })
            });
            if (!res.ok) throw new Error('Failed to save profile');
            await fetchUserProfile(user.uid);
            navigate('/student-dashboard', { replace: true });
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
                        <p className="text-sm font-medium text-slate-800">Profile Setup</p>
                        <p className="text-xs text-slate-400">Step {step} of 3</p>
                    </div>
                    <div className="zen-progress">
                        <div className="zen-progress-bar" style={{ width: `${(step / 3) * 100}%` }} />
                    </div>
                    <div className="flex justify-between mt-2">
                        {['Personal', 'Skills', 'Experience'].map((label, i) => (
                            <span key={label} className={`text-[10px] font-medium ${step > i ? 'text-[#4F46E5]' : 'text-slate-400'}`}>
                                {step > i + 1 ? '✓ ' : ''}{label}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="zen-card p-6 space-y-5">
                    {/* Step 1: Personal */}
                    {step === 1 && (
                        <>
                            <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
                            <div>
                                <label className="zen-label">Full Name *</label>
                                <input type="text" value={form.fullName} onChange={e => updateField('fullName', e.target.value)} className="zen-input" placeholder="Enter your full name" autoFocus />
                            </div>
                            <div>
                                <label className="zen-label">Department *</label>
                                <select value={form.department} onChange={e => updateField('department', e.target.value)} className="zen-select">
                                    <option value="">Select department</option>
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="zen-label">Year *</label>
                                <select value={form.year} onChange={e => updateField('year', e.target.value)} className="zen-select">
                                    <option value="">Select year</option>
                                    {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {/* Step 2: Skills */}
                    {step === 2 && (
                        <>
                            <h2 className="text-lg font-bold text-slate-900">Skills & Interests</h2>
                            <div>
                                <label className="zen-label">Skills * <span className="text-slate-400 font-normal">(type & press Enter)</span></label>
                                <TagInput field="skills" placeholder="e.g. React, Python, Machine Learning" tagInputs={tagInputs} setTagInputs={setTagInputs} tags={form.skills} onAdd={addTag} onRemove={removeTag} />
                            </div>
                            <div>
                                <label className="zen-label">Interests * <span className="text-slate-400 font-normal">(type & press Enter)</span></label>
                                <TagInput field="interests" placeholder="e.g. Web Dev, AI, Cloud" tagInputs={tagInputs} setTagInputs={setTagInputs} tags={form.interests} onAdd={addTag} onRemove={removeTag} />
                            </div>
                            <div>
                                <label className="zen-label">LinkedIn URL</label>
                                <input type="url" value={form.linkedin} onChange={e => updateField('linkedin', e.target.value)} className="zen-input" placeholder="https://linkedin.com/in/..." />
                            </div>
                            <div>
                                <label className="zen-label">GitHub URL</label>
                                <input type="url" value={form.github} onChange={e => updateField('github', e.target.value)} className="zen-input" placeholder="https://github.com/..." />
                            </div>
                        </>
                    )}

                    {/* Step 3: Experience */}
                    {step === 3 && (
                        <>
                            <h2 className="text-lg font-bold text-slate-900">Experience & Goals</h2>

                            {/* Fresher toggle */}
                            <label
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                                    background: form.isFresher ? 'rgba(79,70,229,0.06)' : 'rgba(100,116,139,0.04)',
                                    border: `1.5px solid ${form.isFresher ? 'rgba(79,70,229,0.3)' : 'rgba(100,116,139,0.12)'}`,
                                    transition: 'all 0.2s',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={form.isFresher}
                                    onChange={e => updateField('isFresher', e.target.checked)}
                                    style={{ width: '16px', height: '16px', accentColor: '#4F46E5', cursor: 'pointer' }}
                                />
                                <div>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: form.isFresher ? '#4F46E5' : '#334155' }}>
                                        I'm a fresher
                                    </span>
                                    <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', lineHeight: 1.4 }}>
                                        No prior project experience? No worries — skip the fields below
                                    </p>
                                </div>
                            </label>

                            <div>
                                <label className="zen-label">Resume URL</label>
                                <input type="url" value={form.resume} onChange={e => updateField('resume', e.target.value)} className="zen-input" placeholder="Link to your resume (Drive, etc.)" />
                            </div>
                            <div style={{ opacity: form.isFresher ? 0.45 : 1, pointerEvents: form.isFresher ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                                <label className="zen-label">Previous Project Experience {!form.isFresher && '*'}</label>
                                <textarea value={form.previousExperience} onChange={e => updateField('previousExperience', e.target.value)} className="zen-input resize-none" rows={3} placeholder={form.isFresher ? 'Skipped for freshers' : 'Describe your past projects...'} />
                            </div>
                            <div style={{ opacity: form.isFresher ? 0.45 : 1, pointerEvents: form.isFresher ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                                <label className="zen-label">Career Goal {!form.isFresher && '*'}</label>
                                <textarea value={form.careerGoal} onChange={e => updateField('careerGoal', e.target.value)} className="zen-input resize-none" rows={3} placeholder={form.isFresher ? 'Skipped for freshers' : 'What do you want to achieve?'} />
                            </div>
                        </>
                    )}

                    {error && (
                        <p className="text-xs text-red-600 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.05)' }}>{error}</p>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-2">
                        {step > 1 ? (
                            <button onClick={() => setStep(step - 1)} className="zen-btn-secondary flex items-center gap-1.5">
                                <ArrowLeft className="h-3.5 w-3.5" /> Back
                            </button>
                        ) : <div />}

                        {step < 3 ? (
                            <button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="zen-btn-primary flex items-center gap-1.5">
                                Next <ArrowRight className="h-3.5 w-3.5" />
                            </button>
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

export default StudentOnboarding;

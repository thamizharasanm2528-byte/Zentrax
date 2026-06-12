import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE_URL } from '../../apiConfig';
import {
    Settings as SettingsIcon, User, Lock, Shield, Save, Loader2, CheckCircle, AlertCircle,
    Camera, Github, Linkedin, Globe, Plus, X, Bell, BellOff, Eye, EyeOff,
    UserCog, Palette, ShieldCheck, Trash2, LogOut, Monitor, Moon, Sun,
    Mail, MessageSquare, Users, Cpu, Globe2, Clock, AlertTriangle, Code, Briefcase
} from 'lucide-react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import Toast from '../../components/Toast';

const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const ROLES = ['student', 'mentor'];

// ─── Toggle component ───
const Toggle = ({ value, onChange, label, desc }) => (
    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(15,23,42,0.02)', border: '1px solid var(--color-zen-border)' }}>
        <div>
            <p className="text-sm font-medium text-slate-900">{label}</p>
            {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
        </div>
        <button onClick={() => onChange(!value)}
            className="relative w-10 h-5 rounded-full transition-colors"
            style={{ background: value ? '#4F46E5' : 'rgba(15,23,42,0.1)' }}>
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} style={{ background: value ? '#ffffff' : '#94A3B8' }} />
        </button>
    </div>
);

const Settings = () => {
    const { user, userData, fetchUserProfile } = useAuth();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('profile');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const fileInputRef = useRef(null);
    const [viewingPic, setViewingPic] = useState(false);

    // ─── Profile State ───
    const [name, setName] = useState('');
    const [college, setCollege] = useState('');
    const [bio, setBio] = useState('');
    const [skills, setSkills] = useState('');
    const [availability, setAvailability] = useState('Available');
    const [experienceLevel, setExperienceLevel] = useState('Beginner');
    const [githubUrl, setGithubUrl] = useState('');
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [profilePicture, setProfilePicture] = useState('');
    const [uploadingPic, setUploadingPic] = useState(false);

    // ─── Extended Profile State ───
    const [department, setDepartment] = useState('');
    const [year, setYear] = useState('');
    const [interests, setInterests] = useState('');
    const [preferredStack, setPreferredStack] = useState('');
    const [preferredRole, setPreferredRole] = useState('');
    // Mentor-specific
    const [profession, setProfession] = useState('');
    const [company, setCompany] = useState('');
    const [yearsOfExperience, setYearsOfExperience] = useState('');
    const [industries, setIndustries] = useState('');
    const [mentoringInterests, setMentoringInterests] = useState('');
    const [maxGuidanceCount, setMaxGuidanceCount] = useState(5);
    const [portfolio, setPortfolio] = useState('');

    // ─── Security State ───
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // ─── Preferences State ───
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [mentorNotifications, setMentorNotifications] = useState(true);
    const [projectNotifications, setProjectNotifications] = useState(true);
    const [teamInviteNotifications, setTeamInviteNotifications] = useState(true);
    const [aiSuggestions, setAiSuggestions] = useState(true);

    // ─── Privacy State ───
    const [profileVisibility, setProfileVisibility] = useState('public');
    const [showEmail, setShowEmail] = useState(true);
    const [showSkills, setShowSkills] = useState(true);
    const [showActivity, setShowActivity] = useState(true);
    const [whoCanMessage, setWhoCanMessage] = useState('everyone');
    const [whoCanInvite, setWhoCanInvite] = useState('everyone');

    // Sync userData
    useEffect(() => {
        if (userData) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setName(userData.name || '');
            setCollege(userData.college || '');
            setBio(userData.bio || '');
            setSkills(userData.skills?.join(', ') || '');
            setAvailability(userData.availability || 'Available');
            setExperienceLevel(userData.experienceLevel || 'Beginner');
            setGithubUrl(userData.githubUrl || userData.github || '');
            setLinkedinUrl(userData.linkedinUrl || userData.linkedin || '');
            setProfilePicture(userData.profilePicture || user?.photoURL || '');
            // Extended fields
            setDepartment(userData.department || '');
            setYear(userData.year || '');
            setInterests(userData.interests?.join(', ') || '');
            setPreferredStack(userData.preferredStack?.join(', ') || '');
            setPreferredRole(userData.preferredRole || '');
            // Mentor fields
            setProfession(userData.profession || '');
            setCompany(userData.company || '');
            setYearsOfExperience(userData.yearsOfExperience || '');
            setIndustries(userData.industries?.join(', ') || '');
            setMentoringInterests(userData.mentoringInterests?.join(', ') || '');
            setMaxGuidanceCount(userData.maxGuidanceCount || 5);
            setPortfolio(userData.portfolio || '');
            // Preferences
            setEmailNotifications(userData.notifications?.email !== false);
            setMentorNotifications(userData.notifications?.mentor !== false);
            setProjectNotifications(userData.notifications?.project !== false);
            setTeamInviteNotifications(userData.notifications?.teamInvite !== false);
            setAiSuggestions(userData.notifications?.aiSuggestions !== false);
            // Privacy
            setProfileVisibility(userData.privacy?.profileVisibility || 'public');
            setShowEmail(userData.privacy?.showEmail !== false);
            setShowSkills(userData.privacy?.showSkills !== false);
            setShowActivity(userData.privacy?.showActivity !== false);
            setWhoCanMessage(userData.privacy?.whoCanMessage || 'everyone');
            setWhoCanInvite(userData.privacy?.whoCanInvite || 'everyone');
        }
    }, [userData, user]);

    // ─── Helpers ───
    const inputClass = "zen-input";
    const labelClass = "zen-label";
    const cardClass = "zen-card p-6 space-y-5";
    const sectionTitle = (icon, title) => (
        <div className="flex items-center space-x-2 pb-4" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
            {React.cloneElement(icon, { style: { color: '#4F46E5' } })}
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        </div>
    );

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    // ─── API Helper ───
    const saveToApi = async (data) => {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to update');
        return result;
    };

    // ─── Profile Picture Upload ───
    const handleProfilePicUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            showToast('Only JPG, PNG, and WebP images are allowed', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be under 5 MB', 'error');
            return;
        }
        setUploadingPic(true);
        try {
            const token = await user.getIdToken();
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${API_BASE_URL}/api/upload/image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (data.success && data.file?.file_url) {
                const picUrl = `${API_BASE_URL}${data.file.file_url}`;
                setProfilePicture(picUrl);
                await saveToApi({ profilePicture: picUrl });
                await fetchUserProfile(user.uid);
                showToast('Profile picture updated!');
            } else {
                showToast(data.error || 'Upload failed', 'error');
            }
        } catch {
            showToast('Failed to upload profile picture', 'error');
        }
        setUploadingPic(false);
    };


    const handleDeleteProfilePic = async () => {
        if (!profilePicture) return;
        if (!window.confirm("Are you sure you want to remove your profile picture?")) return;
        
        setSaving(true);
        try {
            await saveToApi({ profilePicture: '' });
            setProfilePicture('');
            await fetchUserProfile(user.uid);
            showToast('Profile picture removed');
        } catch {
            showToast('Failed to remove profile picture', 'error');
        }
        setSaving(false);
    };

    // ─── Save Handlers ───
    const handleProfileSave = async () => {
        setSaving(true);
        try {
            const profileData = {
                name, college, bio,
                skills: skills.split(',').map(s => s.trim()).filter(Boolean),
                availability, experienceLevel, githubUrl, linkedinUrl,
                profilePicture,
                department, year,
                interests: interests.split(',').map(s => s.trim()).filter(Boolean),
                preferredStack: preferredStack.split(',').map(s => s.trim()).filter(Boolean),
                preferredRole,
            };
            // Add mentor-specific fields if mentor
            if (userData?.role === 'mentor') {
                profileData.profession = profession;
                profileData.company = company;
                profileData.yearsOfExperience = Number(yearsOfExperience) || 0;
                profileData.industries = industries.split(',').map(s => s.trim()).filter(Boolean);
                profileData.mentoringInterests = mentoringInterests.split(',').map(s => s.trim()).filter(Boolean);
                profileData.maxGuidanceCount = Number(maxGuidanceCount);
                profileData.portfolio = portfolio;
            }
            await saveToApi(profileData);
            await fetchUserProfile(user.uid);
            showToast('Profile updated successfully!');
        } catch {
            showToast('Failed to update profile. Please try again.', 'error');
        }
        setSaving(false);
    };

    const handlePasswordChange = async () => {
        if (newPassword !== confirmPassword) { showToast('New passwords do not match.', 'error'); return; }
        if (newPassword.length < 6) { showToast('Password must be at least 6 characters.', 'error'); return; }
        setSaving(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            await saveToApi({ lastPasswordChanged: new Date().toISOString() });
            showToast('Password changed successfully!');
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err) {
            showToast(err.code === 'auth/wrong-password' ? 'Current password is incorrect.' : 'Failed to change password.', 'error');
        }
        setSaving(false);
    };

    const handlePreferencesSave = async () => {
        setSaving(true);
        try {
            await saveToApi({
                notifications: {
                    email: emailNotifications, mentor: mentorNotifications,
                    project: projectNotifications, teamInvite: teamInviteNotifications,
                    aiSuggestions
                }
            });
            await fetchUserProfile(user.uid);
            showToast('Preferences saved!');
        } catch {
            showToast('Failed to save preferences.', 'error');
        }
        setSaving(false);
    };

    const handlePrivacySave = async () => {
        setSaving(true);
        try {
            await saveToApi({
                privacy: {
                    profileVisibility, showEmail, showSkills, showActivity,
                    whoCanMessage, whoCanInvite
                }
            });
            await fetchUserProfile(user.uid);
            showToast('Privacy settings saved!');
        } catch {
            showToast('Failed to save privacy settings.', 'error');
        }
        setSaving(false);
    };

    // ─── Password Strength ───
    const getPasswordStrength = (pwd) => {
        if (!pwd) return { score: 0, label: '', color: '' };
        let s = 0;
        if (pwd.length >= 6) s++;
        if (pwd.length >= 10) s++;
        if (/[A-Z]/.test(pwd)) s++;
        if (/[0-9]/.test(pwd)) s++;
        if (/[^A-Za-z0-9]/.test(pwd)) s++;
        const map = [
            { label: '', color: '' },
            { label: 'Weak', color: 'bg-red-500' },
            { label: 'Fair', color: 'bg-orange-500' },
            { label: 'Good', color: 'bg-amber-500' },
            { label: 'Strong', color: 'bg-green-500' },
            { label: 'Very Strong', color: 'bg-emerald-500' },
        ];
        return { score: s, ...map[s] };
    };
    const pwdStrength = getPasswordStrength(newPassword);

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'account', label: 'Account', icon: UserCog },
        { id: 'preferences', label: 'Preferences', icon: Palette },
        { id: 'privacy', label: 'Privacy', icon: ShieldCheck },
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <header>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" style={{ color: '#4F46E5' }} /> Settings
                </h1>
                <p className="text-sm text-slate-500 mt-1">Manage your profile, security, and preferences.</p>
            </header>

            {/* Tabs */}
            <div className="zen-tabs">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`zen-tab ${activeTab === tab.id ? 'zen-tab-active' : ''} flex items-center gap-1.5`}>
                        <tab.icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ═══════════════════════════════════════════
                 PROFILE TAB
                 ═══════════════════════════════════════════ */}
            {activeTab === 'profile' && (
                <div className="space-y-6">
                    {/* Avatar + Basic */}
                    <div className={cardClass}>
                        <div className="flex items-center space-x-5 pb-6 border-b border-gray-100 dark:border-gray-700">
                            <div className="relative group">
                                <div className="h-24 w-24 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 border-2 border-primary-200 dark:border-primary-800 overflow-hidden">
                                    {profilePicture ? (
                                        <img src={profilePicture} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        <User className="h-12 w-12" />
                                    )}
                                </div>
                                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPic}
                                    className="absolute -bottom-1 -right-1 h-8 w-8 bg-primary-600 hover:bg-primary-500 text-slate-900 rounded-full flex items-center justify-center shadow-lg transition-all"
                                    title="Upload Picture">
                                    {uploadingPic ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                                </button>
                                {profilePicture && (
                                    <>
                                        <button onClick={() => setViewingPic(true)}
                                            className="absolute -bottom-1 -left-1 h-8 w-8 bg-gray-600 hover:bg-gray-500 text-slate-900 rounded-full flex items-center justify-center shadow-lg transition-all"
                                            title="View Picture">
                                            <Eye className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={handleDeleteProfilePic}
                                            className="absolute -top-1 -right-1 h-8 w-8 bg-red-600 hover:bg-red-500 text-slate-900 rounded-full flex items-center justify-center shadow-lg transition-all"
                                            title="Remove Picture">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProfilePicUpload} />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-gray-900 dark:text-slate-900">{userData?.name || 'User'}</p>
                                <p className="text-sm text-gray-500">{user?.email}</p>
                                <span className="mt-1 inline-block px-3 py-0.5 bg-primary-100 dark:bg-primary-900/20 text-primary-600 text-xs font-bold rounded-full capitalize">{userData?.role || 'student'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClass}>Full Name</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} autoComplete="off" />
                            </div>
                            <div>
                                <label className={labelClass}>College / Institution</label>
                                <input type="text" value={college} onChange={e => setCollege(e.target.value)} className={inputClass} autoComplete="off" />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Bio / About Me</label>
                            <textarea rows="3" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself..." className={`${inputClass} resize-none`} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClass}>Experience Level</label>
                                <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} className={inputClass}>
                                    {EXPERIENCE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Availability</label>
                                <select value={availability} onChange={e => setAvailability(e.target.value)} className={inputClass}>
                                    <option value="Available">Available</option>
                                    <option value="Busy">Busy</option>
                                    <option value="Away">Away</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Skills (comma separated)</label>
                            <input type="text" value={skills} onChange={e => setSkills(e.target.value)} placeholder="React, Node.js, Python" className={inputClass} autoComplete="off" />
                        </div>
                    </div>

                    {/* Extended Profile — Student */}
                    {userData?.role === 'student' && (
                        <div className={cardClass}>
                            {sectionTitle(<Code className="h-5 w-5 text-primary-600" />, 'Academic & Skills')}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>Department</label>
                                    <input type="text" value={department} onChange={e => setDepartment(e.target.value)} className={inputClass} placeholder="e.g. Computer Science" autoComplete="off" />
                                </div>
                                <div>
                                    <label className={labelClass}>Year of Study</label>
                                    <input type="text" value={year} onChange={e => setYear(e.target.value)} className={inputClass} placeholder="e.g. 3rd Year" autoComplete="off" />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Interests (comma separated)</label>
                                <input type="text" value={interests} onChange={e => setInterests(e.target.value)} placeholder="Web Dev, Machine Learning, IoT" className={inputClass} autoComplete="off" />
                            </div>
                            <div>
                                <label className={labelClass}>Preferred Tech Stack (comma separated)</label>
                                <input type="text" value={preferredStack} onChange={e => setPreferredStack(e.target.value)} placeholder="MERN, Django, Flutter" className={inputClass} autoComplete="off" />
                            </div>
                            <div>
                                <label className={labelClass}>Preferred Role in Team</label>
                                <select value={preferredRole} onChange={e => setPreferredRole(e.target.value)} className={inputClass}>
                                    <option value="">Select role</option>
                                    <option value="frontend">Frontend</option>
                                    <option value="backend">Backend</option>
                                    <option value="uiux">UI/UX</option>
                                    <option value="aiml">AI/ML</option>
                                    <option value="fullstack">Full Stack</option>
                                    <option value="docs">Documentation</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Extended Profile — Mentor */}
                    {userData?.role === 'mentor' && (
                        <div className={cardClass}>
                            {sectionTitle(<Briefcase className="h-5 w-5 text-primary-600" />, 'Professional Details')}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>Profession</label>
                                    <input type="text" value={profession} onChange={e => setProfession(e.target.value)} className={inputClass} placeholder="e.g. Software Engineer" autoComplete="off" />
                                </div>
                                <div>
                                    <label className={labelClass}>Company</label>
                                    <input type="text" value={company} onChange={e => setCompany(e.target.value)} className={inputClass} placeholder="e.g. Google" autoComplete="off" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>Years of Experience</label>
                                    <input type="number" min="0" max="50" value={yearsOfExperience} onChange={e => setYearsOfExperience(e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Max Students to Guide</label>
                                    <input type="number" min="1" max="20" value={maxGuidanceCount} onChange={e => setMaxGuidanceCount(e.target.value)} className={inputClass} />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Industries (comma separated)</label>
                                <input type="text" value={industries} onChange={e => setIndustries(e.target.value)} placeholder="Fintech, Healthcare, EdTech" className={inputClass} autoComplete="off" />
                            </div>
                            <div>
                                <label className={labelClass}>Mentoring Interests (comma separated)</label>
                                <input type="text" value={mentoringInterests} onChange={e => setMentoringInterests(e.target.value)} placeholder="Career guidance, Code review, Architecture" className={inputClass} autoComplete="off" />
                            </div>
                            <div>
                                <label className={labelClass}>Portfolio URL</label>
                                <input type="url" value={portfolio} onChange={e => setPortfolio(e.target.value)} className={inputClass} placeholder="https://yourportfolio.com" autoComplete="off" />
                            </div>
                        </div>
                    )}

                    {/* Social Links */}
                    <div className={cardClass}>
                        {sectionTitle(<Globe className="h-5 w-5 text-primary-600" />, 'Social Links')}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Github className="h-5 w-5 text-gray-400 shrink-0" />
                                <input type="url" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/username" className={inputClass} autoComplete="off" />
                            </div>
                            <div className="flex items-center gap-3">
                                <Linkedin className="h-5 w-5 text-blue-500 shrink-0" />
                                <input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/username" className={inputClass} autoComplete="off" />
                            </div>
                        </div>
                    </div>



                    <button onClick={handleProfileSave} disabled={saving}
                        className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center disabled:opacity-50">
                        {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                        Save Profile
                    </button>
                </div>
            )}

            {/* ═══════════════════════════════════════════
                 SECURITY TAB
                 ═══════════════════════════════════════════ */}
            {activeTab === 'security' && (
                <div className="space-y-6">
                    {/* Change Password */}
                    <div className={cardClass}>
                        {sectionTitle(<Shield className="h-5 w-5 text-primary-600" />, 'Change Password')}

                        {/* Hidden autofill trap for this form specifically */}
                        <input type="text" name="trap_user" autoComplete="username" className="w-0 h-0 opacity-0 absolute pointer-events-none" tabIndex={-1} aria-hidden="true" />

                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Current Password</label>
                                <div className="relative">
                                    <input type={showCurrent ? 'text' : 'password'} autoComplete="current-password"
                                        value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={`${inputClass} pr-12`} />
                                    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>New Password</label>
                                <div className="relative">
                                    <input type={showNew ? 'text' : 'password'} autoComplete="new-password"
                                        value={newPassword} onChange={e => setNewPassword(e.target.value)} className={`${inputClass} pr-12`} />
                                    <button type="button" onClick={() => setShowNew(!showNew)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {/* Password Strength Indicator */}
                                {newPassword && (
                                    <div className="mt-2 space-y-1">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= pwdStrength.score ? pwdStrength.color : 'bg-gray-200 dark:bg-gray-600'}`} />
                                            ))}
                                        </div>
                                        <p className={`text-xs font-medium ${pwdStrength.score <= 2 ? 'text-red-500' : pwdStrength.score <= 3 ? 'text-amber-500' : 'text-green-500'}`}>
                                            {pwdStrength.label}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className={labelClass}>Confirm New Password</label>
                                <div className="relative">
                                    <input type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`${inputClass} pr-12`} />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <p className="text-xs text-red-500 mt-1 flex items-center"><AlertCircle className="h-3 w-3 mr-1" /> Passwords do not match</p>
                                )}
                                {confirmPassword && newPassword === confirmPassword && confirmPassword.length >= 6 && (
                                    <p className="text-xs text-green-500 mt-1 flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> Passwords match</p>
                                )}
                            </div>
                        </div>

                        <button onClick={handlePasswordChange} disabled={saving || !currentPassword || !newPassword || newPassword !== confirmPassword}
                            className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center disabled:opacity-50">
                            {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Lock className="h-5 w-5 mr-2" />}
                            Update Password
                        </button>
                    </div>

                    {/* Security Info */}
                    <div className={cardClass}>
                        {sectionTitle(<Clock className="h-5 w-5 text-primary-600" />, 'Security Info')}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-900">Last Password Change</p>
                                    <p className="text-xs text-gray-500">{userData?.lastPasswordChanged ? new Date(userData.lastPasswordChanged).toLocaleDateString() : 'Never'}</p>
                                </div>
                                <Lock className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-900">Two-Factor Authentication</p>
                                    <p className="text-xs text-gray-500">Coming soon — enhance your account security</p>
                                </div>
                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/20 text-amber-600 text-[10px] font-bold rounded-full">SOON</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-900">Active Sessions</p>
                                    <p className="text-xs text-gray-500">Manage devices — coming soon</p>
                                </div>
                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/20 text-amber-600 text-[10px] font-bold rounded-full">SOON</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════
                 ACCOUNT TAB
                 ═══════════════════════════════════════════ */}
            {activeTab === 'account' && (
                <div className="space-y-6">
                    <div className={cardClass}>
                        {sectionTitle(<UserCog className="h-5 w-5 text-primary-600" />, 'Account Information')}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-900 mt-0.5">{user?.email}</p>
                                </div>
                                <Mail className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="flex justify-between items-center p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Role</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-900 mt-0.5 capitalize">{userData?.role || 'student'}</p>
                                </div>
                                <User className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="flex justify-between items-center p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-900 mt-0.5">
                                        {userData?.joinedAt ? new Date(userData.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}
                                    </p>
                                </div>
                                <Clock className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="flex justify-between items-center p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">User ID</p>
                                    <p className="text-xs font-mono text-gray-500 mt-0.5">{user?.uid}</p>
                                </div>
                                <Shield className="h-4 w-4 text-gray-400" />
                            </div>
                        </div>
                    </div>


                </div>
            )}

            {/* ═══════════════════════════════════════════
                 PREFERENCES TAB
                 ═══════════════════════════════════════════ */}
            {activeTab === 'preferences' && (
                <div className="space-y-6">
                    {/* Appearance */}
                    <div className={cardClass}>
                        {sectionTitle(<Palette className="h-5 w-5 text-primary-600" />, 'Appearance')}
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Theme Mode</label>
                                <p className="text-xs text-slate-500 mb-3">Choose how ZENTRAX looks on your device.</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'light', label: 'Light', icon: Sun },
                                    { id: 'dark', label: 'Dark', icon: Moon },
                                    { id: 'system', label: 'System', icon: Monitor },
                                ].map(option => {
                                    const Icon = option.icon;
                                    const isSystemStored = !localStorage.getItem('zentrax-theme');
                                    const isActive = option.id === 'system' ? isSystemStored : (!isSystemStored && theme === option.id);
                                    
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => setTheme(option.id)}
                                            className="flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center cursor-pointer gap-2 hover:bg-slate-50"
                                            style={{
                                                borderColor: isActive ? '#4F46E5' : 'var(--color-zen-border)',
                                                background: isActive ? 'rgba(79, 70, 229, 0.04)' : 'var(--color-zen-surface)',
                                                color: isActive ? '#4F46E5' : 'var(--color-zen-text)',
                                            }}
                                        >
                                            <Icon className="h-5 w-5" />
                                            <span className="text-xs font-semibold">{option.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className={cardClass}>
                        {sectionTitle(<Bell className="h-5 w-5 text-primary-600" />, 'Notification Preferences')}
                        <div className="space-y-3">
                            <Toggle value={emailNotifications} onChange={setEmailNotifications}
                                label="Email Notifications" desc="Receive email alerts for important updates" />
                            <Toggle value={mentorNotifications} onChange={setMentorNotifications}
                                label="Mentor Notifications" desc="Get notified about mentor responses and sessions" />
                            <Toggle value={projectNotifications} onChange={setProjectNotifications}
                                label="Project Notifications" desc="Alerts for project updates and team activity" />
                            <Toggle value={teamInviteNotifications} onChange={setTeamInviteNotifications}
                                label="Team Invite Notifications" desc="Get notified when someone invites you to a team" />
                        </div>
                    </div>

                    {/* AI Preferences */}
                    <div className={cardClass}>
                        {sectionTitle(<Cpu className="h-5 w-5 text-primary-600" />, 'AI Assistant')}
                        <div className="space-y-3">
                            <Toggle value={aiSuggestions} onChange={setAiSuggestions}
                                label="AI Suggestions" desc="Allow ZENTRAX-AI to suggest improvements and solutions" />
                        </div>
                    </div>

                    <button onClick={handlePreferencesSave} disabled={saving}
                        className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center disabled:opacity-50">
                        {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                        Save Preferences
                    </button>
                </div>
            )}

            {/* ═══════════════════════════════════════════
                 PRIVACY TAB
                 ═══════════════════════════════════════════ */}
            {activeTab === 'privacy' && (
                <div className="space-y-6">
                    {/* Visibility */}
                    <div className={cardClass}>
                        {sectionTitle(<ShieldCheck className="h-5 w-5 text-primary-600" />, 'Profile Visibility')}
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Who can see your profile?</label>
                                <select value={profileVisibility} onChange={e => setProfileVisibility(e.target.value)} className={inputClass}>
                                    <option value="public">Everyone (Public)</option>
                                    <option value="platform">ZENTRAX Users Only</option>
                                    <option value="private">Only Me (Private)</option>
                                </select>
                            </div>
                            <Toggle value={showEmail} onChange={setShowEmail} label="Show Email Address" desc="Display your email on your public profile" />
                            <Toggle value={showSkills} onChange={setShowSkills} label="Show Skills" desc="Display your skills on your public profile" />
                            <Toggle value={showActivity} onChange={setShowActivity} label="Show Activity" desc="Allow others to see your project activity" />
                        </div>
                    </div>

                    {/* Interaction */}
                    <div className={cardClass}>
                        {sectionTitle(<Users className="h-5 w-5 text-primary-600" />, 'Interaction Controls')}
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Who can message me?</label>
                                <select value={whoCanMessage} onChange={e => setWhoCanMessage(e.target.value)} className={inputClass}>
                                    <option value="everyone">Everyone</option>
                                    <option value="team">Team Members Only</option>
                                    <option value="mentors">Mentors Only</option>
                                    <option value="nobody">Nobody</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Who can invite me to projects?</label>
                                <select value={whoCanInvite} onChange={e => setWhoCanInvite(e.target.value)} className={inputClass}>
                                    <option value="everyone">Everyone</option>
                                    <option value="mentors">Mentors Only</option>
                                    <option value="nobody">Nobody</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button onClick={handlePrivacySave} disabled={saving}
                        className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center disabled:opacity-50">
                        {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                        Save Privacy Settings
                    </button>
                </div>
            )}
            {/* Full-Screen Image Viewer Modal */}
            {viewingPic && profilePicture && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setViewingPic(false)}>
                    <button className="absolute top-6 right-6 text-slate-900/70 hover:text-slate-900 transition-colors" onClick={() => setViewingPic(false)}>
                        <X className="h-8 w-8" />
                    </button>
                    <img src={profilePicture} alt="Full view" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
};

export default Settings;
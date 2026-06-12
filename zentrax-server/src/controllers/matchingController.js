const { db } = require('../middleware/auth');
const OpenAI = require('openai');

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
});

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

/**
 * Robustly extract a JSON array from AI response text.
 * Handles: raw arrays, objects with any key wrapping an array,
 * and freeform text with embedded JSON.
 */
function extractJsonArray(raw) {
    if (!raw || typeof raw !== 'string') return [];

    // Try direct parse first
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        // If it's an object, find the first array value (handles any key name)
        if (parsed && typeof parsed === 'object') {
            for (const key of Object.keys(parsed)) {
                if (Array.isArray(parsed[key])) return parsed[key];
            }
        }
        return [];
    } catch {
        // Not valid JSON — try to extract JSON from freeform text
    }

    // Regex: find first [ ... ] block in the text
    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
        try {
            const arr = JSON.parse(arrayMatch[0]);
            if (Array.isArray(arr)) return arr;
        } catch {}
    }

    // Regex: find first { ... } block (object wrapping an array)
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
        try {
            const obj = JSON.parse(objMatch[0]);
            if (obj && typeof obj === 'object') {
                for (const key of Object.keys(obj)) {
                    if (Array.isArray(obj[key])) return obj[key];
                }
            }
        } catch {}
    }

    return [];
}

/**
 * POST /api/matching/team
 * AI-based team member matching for a project
 */
exports.matchTeamMembers = async (req, res) => {
    try {
        const { title, description, techStack, requiredSkills, teamSize, domain, difficulty, rolesNeeded } = req.body;
        const userId = req.user.uid;

        if (!title || !description) {
            return res.status(400).json({ error: 'Project title and description are required' });
        }

        if (!process.env.GROQ_API_KEY) {
            return res.status(200).json({ matches: [], fallback: true, message: 'AI matching unavailable — API key not configured.' });
        }

        // Fetch available students (exclude current user, mentors, admins)
        const snapshot = await db.collection('users').get();

        // Keywords to exclude internal/admin/system accounts
        const internalKeywords = ['admin', 'platform', 'zentrax', 'system', 'test'];

        const requestingUserEmail = (req.user.email || '').toLowerCase();

        const candidates = [];
        const seenIds = new Set(); // Deduplication
        snapshot.forEach(doc => {
            const d = doc.data();
            const userRole = (d.role || '').toLowerCase().trim();

            // STRICT: Only include students
            if (userRole !== 'student') return;

            // Skip self (check doc.id, stored uid, AND email)
            const candidateEmail = (d.email || '').toLowerCase();
            if (doc.id === userId || d.uid === userId || (requestingUserEmail && candidateEmail === requestingUserEmail)) return;

            // Skip busy
            if (d.availability === 'Busy') return;

            // Skip internal/admin/system/test accounts
            const userName = (d.name || '').toLowerCase();
            const userEmail = (d.email || '').toLowerCase();
            const isInternal = internalKeywords.some(kw =>
                userName.includes(kw) || userEmail.includes(kw)
            );
            if (isInternal) return;

            // Skip users who are actually mentors (bad role data)
            const isMentorByName = userName.includes('mentor');
            const hasMentorOnboardingFields = d.mentorProfile || d.mentorOnboarding
                || d.isMentor === true
                || (d.profession && d.expertise)
                || (Array.isArray(d.mentoringInterests) && d.mentoringInterests.length > 0)
                || (d.maxGuidanceCount && d.yearsOfExperience);
            if (isMentorByName || hasMentorOnboardingFields) return;

            // Deduplication
            const dedupeKey = userEmail || d.uid || doc.id;
            if (seenIds.has(dedupeKey)) return;
            seenIds.add(dedupeKey);
            if (doc.id && doc.id !== dedupeKey) {
                if (seenIds.has(doc.id)) return;
                seenIds.add(doc.id);
            }

            candidates.push({
                id: doc.id,
                email: d.email || '',
                name: d.name || d.fullName || 'Student',
                skills: d.skills || [],
                interests: d.interests || [],
                preferredRole: d.preferredRole || '',
                experienceLevel: d.experienceLevel || 'Beginner',
                preferredStack: d.preferredStack || [],
                college: d.college || '',
                availability: d.availability || 'Available'
            });
        });

        console.log(`[Matching] Found ${candidates.length} valid student candidates (excluded self, mentors, admins, internal accounts)`);

        if (candidates.length === 0) {
            return res.status(200).json({ matches: [], message: 'No available students found for matching.' });
        }

        const wantCount = Math.min(teamSize || 5, candidates.length, 8);

        // Build AI prompt — ask for a JSON object to satisfy Groq json_object mode
        const prompt = `You are a team matching AI for ZENTRAX, a student collaboration platform.

PROJECT DETAILS:
- Title: "${title}"
- Description: "${description}"
- Current Tech Stack: ${(techStack || []).join(', ') || 'Not specified'}
- Required Skills: ${(requiredSkills || []).join(', ') || 'Not specified'}
- Domain: ${domain || 'General'}
- Difficulty: ${difficulty || 'Intermediate'}
- Roles Needed: ${(rolesNeeded || []).join(', ') || 'Any'}

AVAILABLE STUDENTS:
${candidates.map((c, i) => `${i + 1}. Name: ${c.name}, Skills: [${c.skills.join(', ')}], Preferred Role: ${c.preferredRole || 'Any'}, Experience: ${c.experienceLevel}, Interests: [${c.interests.join(', ')}], Stack: [${c.preferredStack.join(', ')}]`).join('\n')}

TASK:
1. Analyze the project's requirements and identify any gaps in the current team/tech stack.
2. Select the top ${wantCount} best matches who provide COMPLEMENTARY skills (not just identical ones).
3. For each match, provide a "reason" explaining what specific missing skill they bring or how they strengthen the team.

Return a JSON object: {"matches": [{"index": 1, "reason": "Brings React expertise which is currently missing...", "complementarySkill": "React"}]}
Only return valid JSON.`;

        const completion = await client.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: GROQ_MODEL,
            response_format: { type: 'json_object' },
            temperature: 0.3
        });

        const rawContent = completion.choices[0]?.message?.content || '';
        console.log('[Matching] Raw AI team response:', rawContent.substring(0, 500));

        const aiResult = extractJsonArray(rawContent);

        if (aiResult.length === 0) {
            console.warn('[Matching] Could not extract matches from AI response');
            return res.status(200).json({ matches: [], fallback: true, message: 'AI returned an unparseable response. Please try again.' });
        }

        // Map AI results back to full student data
        const matches = aiResult.map(m => {
            const idx = (m.index || m.rank || 1) - 1;
            if (idx < 0 || idx >= candidates.length) return null;
            const candidate = candidates[idx];
            if (!candidate) return null;
            return {
                id: candidate.id,
                name: candidate.name,
                skills: candidate.skills,
                preferredRole: candidate.preferredRole,
                experienceLevel: candidate.experienceLevel,
                availability: candidate.availability,
                college: candidate.college,
                reason: m.reason || m.explanation || 'Good match for this project'
            };
        }).filter(Boolean);

        // Final safety filter — absolutely guarantee requesting user is excluded
        const safeMatches = matches.filter(m => 
            m.id !== userId && (m.email || '').toLowerCase() !== requestingUserEmail
        );

        console.log(`[Matching] Team match for "${title}": ${safeMatches.length} results from ${candidates.length} candidates`);
        res.status(200).json({ matches: safeMatches });

    } catch (error) {
        console.error('[Matching] Team matching error:', error.message);
        console.error('[Matching] Full error:', error);
        const isQuota = error.status === 429 || (error.message || '').toLowerCase().includes('quota');
        const isRateLimit = error.status === 429 || (error.message || '').toLowerCase().includes('rate');
        res.status(200).json({
            matches: [],
            fallback: true,
            message: isQuota || isRateLimit
                ? 'AI matching temporarily unavailable (rate limit). Please wait a moment and try again.'
                : `AI matching encountered an error: ${error.message || 'Unknown error'}`
        });
    }
};

/**
 * POST /api/matching/mentor
 * AI-based mentor matching for a student
 */
exports.matchMentors = async (req, res) => {
    try {
        const { projectTitle, projectDescription, techStack, domain, studentSkills, studentInterests } = req.body;
        const userId = req.user.uid;

        if (!process.env.GROQ_API_KEY) {
            return res.status(200).json({ matches: [], fallback: true, message: 'AI matching unavailable — API key not configured.' });
        }

        // Fetch student profile for context
        let studentProfile = {};
        try {
            const sDoc = await db.collection('users').doc(userId).get();
            if (sDoc.exists) studentProfile = sDoc.data();
        } catch {}

        // Fetch all mentors
        const snapshot = await db.collection('users')
            .where('role', '==', 'mentor')
            .get();

        const mentors = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            if (d.availability === 'Busy') return;
            mentors.push({
                id: doc.id,
                name: d.name || d.fullName || 'Mentor',
                profession: d.profession || '',
                company: d.company || '',
                expertise: d.expertise || d.skills || [],
                techStack: d.techStack || [],
                yearsOfExperience: d.yearsOfExperience || 0,
                industries: d.industries || [],
                mentoringInterests: d.mentoringInterests || [],
                bio: d.bio || '',
                availability: d.availability || 'Available'
            });
        });

        if (mentors.length === 0) {
            return res.status(200).json({ matches: [], message: 'No mentors available for matching.' });
        }

        const prompt = `You are a mentor matching AI for ZENTRAX.

PROJECT CONTEXT:
- Title: "${projectTitle || 'General mentorship'}"
- Description: "${projectDescription || 'Looking for guidance'}"
- Tech Stack: ${(techStack || []).join(', ') || 'Not specified'}
- Domain: ${domain || 'General'}

STUDENT BACKGROUND:
- Skills: ${(studentSkills || studentProfile.skills || []).join(', ') || 'Not specified'}
- Experience: ${studentProfile.experienceLevel || 'Beginner'}

AVAILABLE MENTORS:
${mentors.map((m, i) => `${i + 1}. Name: ${m.name}, Profession: ${m.profession}, Expertise: [${m.expertise.join(', ')}], Tech Stack: [${m.techStack.join(', ')}], Experience: ${m.yearsOfExperience}y`).join('\n')}

TASK:
1. Match the project's technical needs and domain with the mentors' expertise and profession.
2. Prioritize mentors who have solved similar problems in their professional career.
3. Select the top ${Math.min(5, mentors.length)} matches.
4. For each, provide a "reason" focusing on their relevant expertise and a "score" (1-100).

Return JSON: {"matches": [{"index": 1, "reason": "Expert in Cloud architecture which fits your project domain perfectly.", "score": 95}]}
Only return valid JSON.`;

        const completion = await client.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: GROQ_MODEL,
            response_format: { type: 'json_object' },
            temperature: 0.3
        });

        const rawContent = completion.choices[0]?.message?.content || '';
        console.log('[Matching] Raw AI mentor response:', rawContent.substring(0, 500));

        const aiResult = extractJsonArray(rawContent);

        if (aiResult.length === 0) {
            console.warn('[Matching] Could not extract mentor matches from AI response');
            return res.status(200).json({ matches: [], fallback: true, message: 'AI returned an unparseable response. Please try again.' });
        }

        const matches = aiResult.map(m => {
            const idx = (m.index || m.rank || 1) - 1;
            if (idx < 0 || idx >= mentors.length) return null;
            const mentor = mentors[idx];
            if (!mentor) return null;
            return {
                id: mentor.id,
                name: mentor.name,
                profession: mentor.profession,
                expertise: mentor.expertise,
                techStack: mentor.techStack,
                yearsOfExperience: mentor.yearsOfExperience,
                availability: mentor.availability,
                reason: m.reason || 'Good match',
                score: m.score || 70
            };
        }).filter(Boolean);

        console.log(`[Matching] Mentor match: ${matches.length} results from ${mentors.length} mentors`);
        res.status(200).json({ matches });

    } catch (error) {
        console.error('[Matching] Mentor matching error:', error.message);
        console.error('[Matching] Full error:', error);
        const isQuota = error.status === 429 || (error.message || '').toLowerCase().includes('quota');
        const isRateLimit = error.status === 429 || (error.message || '').toLowerCase().includes('rate');
        res.status(200).json({
            matches: [],
            fallback: true,
            message: isQuota || isRateLimit
                ? 'AI matching temporarily unavailable (rate limit). Please wait a moment and try again.'
                : `AI matching encountered an error: ${error.message || 'Unknown error'}`
        });
    }
};

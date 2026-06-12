const { db } = require('../middleware/auth');
const OpenAI = require('openai');
const activityService = require('../services/activityService');

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
});

// ─── Helper: fetch project + verify ownership ───
async function getProjectAndVerifyOwner(projectId, userId) {
    const doc = await db.collection('projects').doc(projectId).get();
    if (!doc.exists) return { error: 'Project not found', status: 404 };
    const project = { id: doc.id, ...doc.data() };
    const ownerId = project.createdBy || project.authorId;
    if (ownerId !== userId) return { error: 'Only the project owner can perform this action', status: 403, project };
    return { project };
}

exports.createProject = async (req, res) => {
    try {
        const { title, description, techStack, requiredSkills, teamSize, status, looking_for_teammates, requirement_note, visibility, slots_available } = req.body;
        const authorId = req.user.uid;

        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        // Call OpenAI for suggestions (non-blocking fallback)
        let aiSuggestions = {};
        if (process.env.GROQ_API_KEY) {
            try {
                const prompt = `I am building a project called "${title}". Description: "${description}". 
Please provide:
1. Suggested Tech Stack (comma separated list)
2. Required Team Roles (comma separated list)
3. A brief 3-step learning roadmap.
Format the response as JSON with keys: techStack (array of strings), requiredRoles (array of strings), roadmap (array of strings).`;

                const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
                const completion = await client.chat.completions.create({
                    messages: [{ role: "user", content: prompt }],
                    model: GROQ_MODEL,
                    response_format: { type: "json_object" }
                });

                aiSuggestions = JSON.parse(completion.choices[0].message.content);
            } catch (aiError) {
                console.warn('[Projects] Groq suggestion failed (non-fatal):', aiError.message);
            }
        }

        // Get owner name
        let ownerName = '';
        try {
            const userDoc = await db.collection('users').doc(authorId).get();
            if (userDoc.exists) ownerName = userDoc.data().name || '';
        } catch {}

        const effectiveTeamSize = teamSize || 3;

        const newProject = {
            title,
            description,
            authorId,
            createdBy: authorId,
            owner_id: authorId,
            owner_name: ownerName,
            techStack: techStack || aiSuggestions.techStack || [],
            requiredSkills: requiredSkills || aiSuggestions.requiredRoles || [],
            requiredRoles: aiSuggestions.requiredRoles || [],
            roadmap: aiSuggestions.roadmap || [],
            teamSize: effectiveTeamSize,
            status: status || 'Planning',
            looking_for_teammates: looking_for_teammates !== undefined ? looking_for_teammates : true,
            requirement_note: requirement_note || '',
            visibility: visibility || 'public',
            slots_available: slots_available !== undefined ? slots_available : Math.max(0, effectiveTeamSize - 1),
            members: [authorId],
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('projects').add(newProject);
        
        // Log project creation activity
        await activityService.logActivity({
            projectId: docRef.id,
            userId: authorId,
            actionType: 'project_created',
            message: `Created project "${title}"`
        });

        res.status(201).json({ id: docRef.id, ...newProject });

    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
};

exports.getProjects = async (req, res) => {
    try {
        const snapshot = await db.collection('projects').orderBy('createdAt', 'desc').get();
        const projects = [];
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const ownerId = data.createdBy || data.authorId;
            
            // Active User Gate: Verify owner exists
            const ownerDoc = await db.collection('users').doc(ownerId).get();
            if (ownerDoc.exists) {
                projects.push({ id: doc.id, ...data, ownerName: ownerDoc.data().name });
            }
        }
        
        res.status(200).json({ success: true, data: { projects } });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};

exports.getUserProjects = async (req, res) => {
    try {
        const userId = req.user.uid;
        // Fetch all projects to handle potential indexing issues with old data
        const snapshot = await db.collection('projects').get();
        const projects = [];
        
        for (const doc of snapshot.docs) {
            const d = doc.data();
            const ownerId = d.createdBy || d.authorId || d.owner_id;
            
            const isMember = (d.members || []).includes(userId);
            const isCreator = d.authorId === userId || d.createdBy === userId || d.owner_id === userId;
            
            if (isMember || isCreator) {
                // Active User Gate (Strong Authenticated check)
                const ownerDoc = await db.collection('users').doc(ownerId).get();
                if (ownerDoc.exists) {
                    projects.push({ id: doc.id, ...d }); 
                }
            }
        }
        
        projects.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        res.status(200).json({ success: true, data: { projects } });
    } catch (error) {
        console.error('Error fetching user projects:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch your projects' });
    }
};

exports.getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const projectDoc = await db.collection('projects').doc(id).get();
        if (!projectDoc.exists) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        res.status(200).json({ success: true, data: { project: { id: projectDoc.id, ...projectDoc.data() } } });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
};

// ─── UPDATE PROJECT (owner only) ───
exports.updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;

        // Ownership check
        const { error, status, project } = await getProjectAndVerifyOwner(id, userId);
        if (error) return res.status(status).json({ error });

        const { title, description, techStack, requiredSkills, teamSize, status: projStatus, tasks, looking_for_teammates, requirement_note, visibility, slots_available } = req.body;
        const updateData = {};
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (techStack) updateData.techStack = techStack;
        if (requiredSkills) updateData.requiredSkills = requiredSkills;
        if (teamSize) updateData.teamSize = teamSize;
        if (projStatus) updateData.status = projStatus;
        if (tasks !== undefined) updateData.tasks = tasks;
        if (looking_for_teammates !== undefined) updateData.looking_for_teammates = looking_for_teammates;
        if (requirement_note !== undefined) updateData.requirement_note = requirement_note;
        if (visibility !== undefined) updateData.visibility = visibility;
        if (slots_available !== undefined) updateData.slots_available = slots_available;

        await db.collection('projects').doc(id).update(updateData);
        res.status(200).json({ message: 'Project updated successfully' });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
};

// ─── UPDATE PROJECT STATUS (owner only) ───
exports.updateProjectStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;

        const { error, status: errStatus } = await getProjectAndVerifyOwner(id, userId);
        if (error) return res.status(errStatus).json({ error });

        const { status } = req.body;
        await db.collection('projects').doc(id).update({ status });
        res.status(200).json({ message: 'Project status updated successfully' });
    } catch (error) {
        console.error('Error updating project status:', error);
        res.status(500).json({ error: 'Failed to update project status' });
    }
};

// ─── DELETE PROJECT (owner only, cascade cleanup) ───
exports.deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;

        const { error, status } = await getProjectAndVerifyOwner(id, userId);
        if (error) return res.status(status).json({ error });

        // Cascade: delete join_requests for this project
        const joinSnap = await db.collection('join_requests').where('project_id', '==', id).get();
        const batch1 = db.batch();
        joinSnap.forEach(doc => batch1.delete(doc.ref));
        if (!joinSnap.empty) await batch1.commit();

        // Cascade: delete discussions for this project
        const discSnap = await db.collection('discussions').where('projectId', '==', id).get();
        const batch2 = db.batch();
        discSnap.forEach(doc => batch2.delete(doc.ref));
        if (!discSnap.empty) await batch2.commit();

        // Delete the project document itself (tasks are stored in-doc)
        await db.collection('projects').doc(id).delete();

        console.log(`[Projects] Deleted project ${id} by owner ${userId}`);
        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
};

// ─── REMOVE MEMBER (owner only) ───
exports.removeMember = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;
        const { memberId } = req.body;

        if (!memberId) return res.status(400).json({ error: 'memberId is required' });

        const { error, status, project } = await getProjectAndVerifyOwner(id, userId);
        if (error) return res.status(status).json({ error });

        // Cannot remove yourself (owner)
        if (memberId === userId) return res.status(400).json({ error: 'Owner cannot remove themselves' });

        // Check if member is actually in the project
        if (!(project.members || []).includes(memberId)) {
            return res.status(400).json({ error: 'User is not a member of this project' });
        }

        const { FieldValue } = require('firebase-admin/firestore');
        await db.collection('projects').doc(id).update({
            members: FieldValue.arrayRemove(memberId)
        });

        // Notify removed member
        await db.collection('notifications').add({
            userId: memberId,
            type: 'team',
            title: 'Removed from Project',
            message: `You have been removed from "${project.title}".`,
            read: false,
            time: new Date().toISOString()
        }).catch(() => {});

        console.log(`[Projects] Removed member ${memberId} from project ${id} by owner ${userId}`);
        res.status(200).json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
};

// ─── UPDATE OWN TASK STATUS (any member) ───
exports.updateOwnTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;
        const { taskId, status: newStatus } = req.body;

        if (!taskId || !newStatus) return res.status(400).json({ error: 'taskId and status are required' });
        if (!['pending', 'in-progress', 'completed'].includes(newStatus)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const doc = await db.collection('projects').doc(id).get();
        if (!doc.exists) return res.status(404).json({ error: 'Project not found' });

        const project = doc.data();

        // Must be a member
        if (!(project.members || []).includes(userId)) {
            return res.status(403).json({ error: 'You are not a member of this project' });
        }

        const tasks = project.tasks || [];
        const taskIndex = tasks.findIndex(t => t.id === taskId || t.id === Number(taskId));
        if (taskIndex === -1) return res.status(404).json({ error: 'Task not found' });

        const taskTitle = tasks[taskIndex].text || tasks[taskIndex].title || 'Task';
        const oldStatus = tasks[taskIndex].status;

        const ownerId = project.createdBy || project.authorId;

        // Non-owners can only update their assigned tasks
        if (userId !== ownerId) {
            if (tasks[taskIndex].assignedTo && tasks[taskIndex].assignedTo !== userId) {
                return res.status(403).json({ error: 'You can only update your own assigned tasks' });
            }
        }

        tasks[taskIndex].status = newStatus;
        await db.collection('projects').doc(id).update({ tasks });

        // Log task activity if status changed to completed
        if (newStatus === 'completed' && oldStatus !== 'completed') {
            await activityService.logActivity({
                projectId: id,
                userId,
                actionType: 'task_completed',
                message: `Completed task: "${taskTitle}"`
            });
        } else if (newStatus === 'in-progress' && oldStatus === 'pending') {
            await activityService.logActivity({
                projectId: id,
                userId,
                actionType: 'task_started',
                message: `Started task: "${taskTitle}"`
            });
        }

        res.status(200).json({ message: 'Task status updated' });
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ error: 'Failed to update task status' });
    }
};

const dotenv = require('dotenv');
dotenv.config();

const { db } = require('./src/middleware/auth');

async function heal() {
    try {
        console.log("=== SCANNING FOR CORRUPT PROJECTS ===");
        const projSnap = await db.collection('projects').get();
        
        for (const doc of projSnap.docs) {
            const data = doc.data();
            const projectId = doc.id;
            const mentorId = data.mentorId;
            const members = data.members || [];

            if (mentorId && !members.includes(mentorId)) {
                console.log(`\nFound corrupt project: "${data.title}" (ID: ${projectId})`);
                console.log(`Mentor ID ${mentorId} is set, but not in members list: ${JSON.stringify(members)}`);

                // 1. Clear mentorId in project
                console.log(`Clearing mentorId for project ${projectId}...`);
                await db.collection('projects').doc(projectId).update({
                    mentorId: null
                });

                // 2. Cancel corresponding accepted mentorship_requests
                const mentorshipSnap = await db.collection('mentorship_requests')
                    .where('project_id', '==', projectId)
                    .where('mentor_id', '==', mentorId)
                    .where('status', '==', 'accepted')
                    .get();

                if (!mentorshipSnap.empty) {
                    const batch = db.batch();
                    mentorshipSnap.forEach(rDoc => {
                        console.log(`Cancelling mentorship_request: ${rDoc.id}`);
                        batch.update(rDoc.ref, { status: 'cancelled', cancelled_at: new Date().toISOString() });
                    });
                    await batch.commit();
                }

                // 3. Cancel corresponding accepted mentor_requests
                const mentorSnap = await db.collection('mentor_requests')
                    .where('projectId', '==', projectId)
                    .where('mentor_id', '==', mentorId)
                    .where('status', '==', 'accepted')
                    .get();

                if (!mentorSnap.empty) {
                    const batch = db.batch();
                    mentorSnap.forEach(rDoc => {
                        console.log(`Cancelling mentor_request: ${rDoc.id}`);
                        batch.update(rDoc.ref, { status: 'cancelled', cancelled_at: new Date().toISOString() });
                    });
                    await batch.commit();
                }

                console.log(`Healing complete for "${data.title}"!`);
            }
        }
        console.log("\n=== HEALING SCAN COMPLETE ===");
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

heal();

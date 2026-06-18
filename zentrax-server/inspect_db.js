const dotenv = require('dotenv');
dotenv.config();

const { db } = require('./src/middleware/auth');

async function run() {
    try {
        console.log("=== PROJECTS ===");
        const projSnap = await db.collection('projects').get();
        let targetProj = null;
        projSnap.forEach(doc => {
            const data = doc.data();
            console.log(`Project ID: ${doc.id} | Title: "${data.title}" | mentorId: ${data.mentorId} | members: ${JSON.stringify(data.members)}`);
            if (data.title && data.title.includes("Placement Preparation")) {
                targetProj = { id: doc.id, ...data };
            }
        });

        console.log("\n=== MENTORSHIP REQUESTS ===");
        const mentorshipSnap = await db.collection('mentorship_requests').get();
        mentorshipSnap.forEach(doc => {
            const data = doc.data();
            console.log(`Req ID: ${doc.id} | project_id: ${data.project_id} | mentor_id: ${data.mentor_id} | status: ${data.status}`);
        });

        console.log("\n=== MENTOR REQUESTS ===");
        const mentorSnap = await db.collection('mentor_requests').get();
        mentorSnap.forEach(doc => {
            const data = doc.data();
            console.log(`Req ID: ${doc.id} | projectId: ${data.projectId} | mentor_id: ${data.mentor_id} | status: ${data.status}`);
        });

        if (targetProj) {
            console.log("\n=== TARGET PROJECT DETAIL ===");
            console.log(JSON.stringify(targetProj, null, 2));
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

run();

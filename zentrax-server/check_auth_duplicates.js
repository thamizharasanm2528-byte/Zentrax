const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
});

const auth = admin.auth();

async function run() {
    try {
        console.log("=== Checking Firebase Auth for vishwa.k.2024.cse@rajalakshmi.edu.in ===");
        const listUsers = await auth.listUsers();
        listUsers.users.forEach(u => {
            if (u.email === 'vishwa.k.2024.cse@rajalakshmi.edu.in') {
                console.log(`Auth User - UID: ${u.uid} | Email: ${u.email} | Created: ${u.metadata.creationTime}`);
            }
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();

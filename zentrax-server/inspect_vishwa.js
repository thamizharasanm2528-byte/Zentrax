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

const db = admin.firestore();
const auth = admin.auth();
const email = 'vishwa.k.2024.cse@rajalakshmi.edu.in';

async function run() {
    try {
        console.log("=== Auth users ===");
        const listUsers = await auth.listUsers();
        listUsers.users.forEach(u => {
            if (u.email === email) {
                console.log(`Auth User - UID: ${u.uid} | Email: ${u.email} | Created: ${u.metadata.creationTime}`);
            }
        });

        console.log("\n=== Firestore docs ===");
        const snap = await db.collection('users').where('email', '==', email).get();
        snap.forEach(doc => {
            console.log(`Doc ID: ${doc.id} | Data:`, doc.data());
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();

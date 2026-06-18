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

async function run() {
    try {
        console.log("=== Checking users collection ===");
        const snap = await db.collection('users').get();
        console.log(`Total documents found: ${snap.size}`);
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`Doc ID: ${doc.id} | Email: ${data.email} | Name: ${data.name} | Role: ${data.role}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();

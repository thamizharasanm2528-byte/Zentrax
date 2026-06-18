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

const email = 'zentrax.platform@gmail.com';

async function run() {
    try {
        console.log("=== Checking Firebase Auth ===");
        try {
            const userRecord = await auth.getUserByEmail(email);
            console.log("Auth User Found:");
            console.log(`- UID: ${userRecord.uid}`);
            console.log(`- Email: ${userRecord.email}`);
            console.log(`- Email Verified: ${userRecord.emailVerified}`);
            console.log(`- Disabled: ${userRecord.disabled}`);
        } catch (err) {
            console.log(`Error checking Auth: ${err.message}`);
        }

        console.log("\n=== Checking Firestore Users Collection ===");
        const usersSnap = await db.collection('users').where('email', '==', email).get();
        if (usersSnap.empty) {
            console.log("No matching user document in Firestore users collection.");
        } else {
            usersSnap.forEach(doc => {
                console.log(`Firestore User Doc (${doc.id}):`);
                console.log(JSON.stringify(doc.data(), null, 2));
            });
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

run();

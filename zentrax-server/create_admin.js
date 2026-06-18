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
const password = 'password123';

async function run() {
    try {
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
            console.log('User already exists in Firebase Auth, updating password...');
            await auth.updateUser(userRecord.uid, { password });
        } catch (err) {
            if (err.code === 'auth/user-not-found') {
                console.log('User does not exist, creating...');
                userRecord = await auth.createUser({
                    email,
                    password,
                    emailVerified: true
                });
            } else {
                throw err;
            }
        }

        console.log(`User created/updated: ${userRecord.uid}`);

        const userRef = db.collection('users').doc(userRecord.uid);
        await userRef.set({
            uid: userRecord.uid,
            name: 'Zentrax Admin',
            email: email,
            role: 'admin',
            profileCompleted: true,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        console.log('Firestore user document updated with admin role.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

run();

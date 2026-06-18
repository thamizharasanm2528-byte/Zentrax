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

async function run() {
    try {
        console.log("=== Loading all Firestore users ===");
        const snap = await db.collection('users').get();
        console.log(`Found ${snap.size} user documents in Firestore.`);

        const usersByEmail = {};
        snap.forEach(doc => {
            const data = doc.data();
            const email = (data.email || '').toLowerCase().trim();
            if (email) {
                if (!usersByEmail[email]) {
                    usersByEmail[email] = [];
                }
                usersByEmail[email].push({ id: doc.id, ...data });
            }
        });

        console.log("\n=== Checking for duplicates ===");
        for (const [email, docs] of Object.entries(usersByEmail)) {
            if (docs.length > 1) {
                console.log(`Duplicate found for email: ${email} (${docs.length} docs)`);
                // Let's check which document matches the Firebase Auth user UID
                let authUser = null;
                try {
                    authUser = await auth.getUserByEmail(email);
                    console.log(`- Firebase Auth UID for ${email} is ${authUser.uid}`);
                } catch (err) {
                    console.log(`- Firebase Auth user not found for ${email}: ${err.message}`);
                }

                for (const doc of docs) {
                    const isAuthUid = authUser && doc.id === authUser.uid;
                    const isCompleted = doc.profileCompleted === true;
                    console.log(`  - Doc ID: ${doc.id} | profileCompleted: ${doc.profileCompleted} | isAuthUid: ${isAuthUid}`);

                    // Deciding deletion rule:
                    // If we have an Auth UID, any Firestore document for this email that does NOT match the Auth UID is a duplicate stale document and should be deleted!
                    if (authUser) {
                        if (doc.id !== authUser.uid) {
                            console.log(`    => ACTION: Deleting stale Firestore document ${doc.id}`);
                            await db.collection('users').doc(doc.id).delete();
                        }
                    } else {
                        // If no Auth UID found, delete the incomplete one
                        if (doc.profileCompleted === false) {
                            console.log(`    => ACTION: Deleting incomplete Firestore document ${doc.id}`);
                            await db.collection('users').doc(doc.id).delete();
                        }
                    }
                }
            }
        }
        console.log("\n=== Healing completed ===");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();

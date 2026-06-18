const dotenv = require('dotenv');
dotenv.config();

const { db } = require('./src/middleware/auth');

async function test() {
    try {
        console.log("Setting up mock invite codes for testing...");

        // Define mock codes
        const codeActive = "TEST-ACT";
        const codeUsed = "TEST-USD";
        const codeExpired = "TEST-EXP";

        const now = new Date();
        const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        await db.collection('mentor_invites').doc(codeActive).set({
            code: codeActive,
            email: "active@example.com",
            name: "Active Mentor",
            used: false,
            createdAt: now.toISOString(),
            expiresAt: futureDate.toISOString()
        });

        await db.collection('mentor_invites').doc(codeUsed).set({
            code: codeUsed,
            email: "used@example.com",
            name: "Used Mentor",
            used: true,
            createdAt: now.toISOString(),
            expiresAt: futureDate.toISOString()
        });

        await db.collection('mentor_invites').doc(codeExpired).set({
            code: codeExpired,
            email: "expired@example.com",
            name: "Expired Mentor",
            used: false,
            createdAt: now.toISOString(),
            expiresAt: pastDate.toISOString()
        });

        console.log("Mock data inserted.");

        // Simulate individual delete of a used code
        console.log("Simulating individual delete of a USED code...");
        const usedDocRef = db.collection('mentor_invites').doc(codeUsed);
        await usedDocRef.delete();
        const checkUsed = await usedDocRef.get();
        console.log(`Used code deleted: ${!checkUsed.exists ? "SUCCESS" : "FAILED"}`);

        // Simulate bulk clear of used and expired codes
        console.log("Simulating bulk clear of used and expired codes...");
        const snapshot = await db.collection('mentor_invites').get();
        const batch = db.batch();
        let clearedCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const isUsed = data.used === true;
            const isExpired = new Date(data.expiresAt) < now;

            // Only clear our test ones to be safe
            if (doc.id === codeActive || doc.id === codeExpired || doc.id === codeUsed) {
                if (isUsed || isExpired) {
                    batch.delete(doc.ref);
                    clearedCount++;
                }
            }
        });

        if (clearedCount > 0) {
            await batch.commit();
        }

        console.log(`Bulk clear complete. Cleared: ${clearedCount} (Expected: 1, since used was deleted individually and expired was left)`);

        const checkExpired = await db.collection('mentor_invites').doc(codeExpired).get();
        const checkActive = await db.collection('mentor_invites').doc(codeActive).get();
        console.log(`Expired code deleted by bulk: ${!checkExpired.exists ? "SUCCESS" : "FAILED"}`);
        console.log(`Active code remains untouched: ${checkActive.exists ? "SUCCESS" : "FAILED"}`);

        // Clean up remaining active mock
        await db.collection('mentor_invites').doc(codeActive).delete();
        console.log("Cleaned up remaining test entries.");

    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

test();

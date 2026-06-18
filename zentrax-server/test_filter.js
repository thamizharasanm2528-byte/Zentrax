const dotenv = require('dotenv');
dotenv.config();

const { db } = require('./src/middleware/auth');
const { getDoubts } = require('./src/controllers/mentorshipController');

async function test() {
    try {
        console.log("Running getDoubts logic test...");
        
        // Mock request for a new mentor
        const req = {
            query: {},
            user: { uid: "new_mentor_123" }
        };

        const res = {
            status: function(code) {
                console.log(`Response Status: ${code}`);
                return this;
            },
            json: function(payload) {
                console.log("Response JSON:");
                console.log(JSON.stringify(payload, null, 2));
            }
        };

        // Create temporary user document for the mock mentor
        await db.collection('users').doc('new_mentor_123').set({
            role: 'mentor',
            name: 'New Mock Mentor'
        });

        await getDoubts(req, res);

        // Clean up
        await db.collection('users').doc('new_mentor_123').delete();
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

test();

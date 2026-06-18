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

        await getDoubts(req, res);
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

test();

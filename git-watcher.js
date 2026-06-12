const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WATCH_DIR = __dirname;
const DEBOUNCE_MS = 8000; // Wait 8 seconds of quietness before committing/pushing
let timeoutId = null;

console.log("=========================================");
console.log("  Zentrax Git Auto-Sync Watcher Started  ");
console.log(`  Watching: ${WATCH_DIR}`);
console.log("=========================================\n");

// Helper to run commands and print them
function runCommand(cmd) {
    console.log(`> ${cmd}`);
    try {
        const output = execSync(cmd, { cwd: WATCH_DIR, stdio: 'pipe' }).toString().trim();
        return { success: true, output };
    } catch (error) {
        return { success: false, output: error.stderr ? error.stderr.toString().trim() : error.message };
    }
}

// Function to generate a descriptive commit message based on Git status output
function generateCommitMessage(statusLines) {
    if (statusLines.length === 0) return "Auto-sync: routine update";
    
    const additions = [];
    const modifications = [];
    const deletions = [];
    const renames = [];

    statusLines.forEach(line => {
        const match = line.match(/^([ ADMRU?]{2})\s+(.+)$/);
        if (!match) return;
        const type = match[1].trim();
        const file = match[2].replace(/"/g, '');
        const baseName = path.basename(file);

        if (type === 'A' || type === '??') {
            additions.push(baseName);
        } else if (type === 'M') {
            modifications.push(baseName);
        } else if (type === 'D') {
            deletions.push(baseName);
        } else if (type === 'R') {
            renames.push(baseName);
        }
    });

    const parts = [];
    if (additions.length > 0) parts.push(`added ${additions.join(', ')}`);
    if (modifications.length > 0) parts.push(`modified ${modifications.join(', ')}`);
    if (deletions.length > 0) parts.push(`deleted ${deletions.join(', ')}`);
    if (renames.length > 0) parts.push(`renamed ${renames.join(', ')}`);

    let msg = "Auto-sync: " + parts.join('; ');
    if (msg.length > 70 || msg === "Auto-sync: ") {
        msg = `Auto-sync: updated ${statusLines.length} files`;
    }
    return msg;
}

// Perform Git synchronization
function syncChanges() {
    timeoutId = null;
    
    // Get actual changed files from git status (ignores ignored files automatically)
    const statusResult = runCommand("git status --porcelain");
    if (!statusResult.success) {
        console.error("Error running git status:", statusResult.output);
        return;
    }

    const lines = statusResult.output.split('\n').filter(line => line.trim().length > 0);
    
    // Filter out changes to git-watcher.js, .gitignore or .git
    const validLines = lines.filter(line => {
        const match = line.match(/^([ ADMRU?]{2})\s+(.+)$/);
        const file = match ? match[2] : line.slice(3);
        return !file.includes('git-watcher.js') && !file.includes('.git/');
    });

    if (validLines.length === 0) {
        return; // No real changes to commit
    }

    console.log(`\n[${new Date().toLocaleTimeString()}] Changes detected in:`);
    const fileNames = validLines.map(line => {
        const match = line.match(/^([ ADMRU?]{2})\s+(.+)$/);
        return match ? match[2].replace(/"/g, '') : line.slice(3);
    });
    fileNames.forEach(f => console.log(`  - ${f}`));

    // 1. Git Add
    const addResult = runCommand("git add .");
    if (!addResult.success) {
        console.error("Failed to git add:", addResult.output);
        return;
    }

    // 2. Git Commit
    const commitMsg = generateCommitMessage(validLines);
    const commitResult = runCommand(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
    if (!commitResult.success) {
        console.error("Failed to commit:", commitResult.output);
        return;
    }

    // 3. Git Push with retry logic
    let pushSuccess = false;
    let attempts = 0;
    const maxAttempts = 5;
    let delay = 3000; // Start with 3 seconds delay

    while (!pushSuccess && attempts < maxAttempts) {
        attempts++;
        if (attempts > 1) {
            console.log(`Retrying push (attempt ${attempts}/${maxAttempts}) in ${delay / 1000}s...`);
            // Custom cross-platform sync sleep
            const start = Date.now();
            while (Date.now() - start < delay) {}
            delay *= 2; // Exponential backoff
        }
        
        const pushResult = runCommand("git push origin main");
        if (pushResult.success) {
            pushSuccess = true;
            console.log("\n=========================================");
            console.log("  Git Sync Success!  ");
            console.log(`  - Committed files: ${fileNames.join(', ')}`);
            console.log(`  - Commit message: "${commitMsg}"`);
            console.log("  - Push status: Completed successfully.");
            console.log("=========================================\n");
        } else {
            console.error(`Push attempt ${attempts} failed:`, pushResult.output);
        }
    }

    if (!pushSuccess) {
        console.error("\n[WARNING] Git push failed after maximum attempts. Will try again on the next local file change.");
    }
}

// Watch directory recursively (native support on Windows)
try {
    fs.watch(WATCH_DIR, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        
        // Skip ignored directories/files immediately
        const isIgnored = filename.includes('node_modules') ||
                          filename.includes('dist') ||
                          filename.includes('build') ||
                          filename.includes('.cache') ||
                          filename.includes('.next') ||
                          filename.includes('.vercel') ||
                          filename.includes('.git') ||
                          filename.includes('.env') ||
                          filename.includes('git-watcher.js');
                          
        if (isIgnored) return;

        // Reset debounce timer
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(syncChanges, DEBOUNCE_MS);
    });
} catch (error) {
    console.error("Error setting up recursive watch:", error.message);
}

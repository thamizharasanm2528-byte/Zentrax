const path = require('path');

function generateCommitMessage(statusLines) {
    if (statusLines.length === 0) return "Auto-sync: routine update";
    
    const additions = [];
    const modifications = [];
    const deletions = [];
    const renames = [];

    statusLines.forEach(line => {
        const match = line.match(/^([ ADMRU?]{2})\s+(.+)$/);
        console.log("Line:", JSON.stringify(line));
        console.log("Match:", match);
        if (!match) return;
        const type = match[1].trim();
        const file = match[2].replace(/"/g, '');
        const baseName = path.basename(file);
        console.log("Parsed type:", JSON.stringify(type), "file:", JSON.stringify(file));

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
    console.log("Generated message:", JSON.stringify(msg));
    if (msg.length > 70 || msg === "Auto-sync: ") {
        msg = `Auto-sync: updated ${statusLines.length} files`;
    }
    return msg;
}

const mockLines = [
    ' M test-sync.txt'
];

console.log("Final Message:", generateCommitMessage(mockLines));

const fs = require('fs');
const path = require('path');

const emojisToRemove = [
  '⚔️', '🎟️', '⏳', '🛡️', '📺', '🎒', '🏆', '📅', '⚙️', '📊', '👥', '💵', '🛒', '✂️', '🚪', '🤖', '💸', '⏱️', '🔐', '🚀', '💰', '🗓️', '🗡️', '🔥', '✨'
];

function removeEmojis(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    for (const emoji of emojisToRemove) {
        // Match the emoji, with an optional following space
        const regex = new RegExp(emoji + ' ?', 'g');
        content = content.replace(regex, '');
    }
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            removeEmojis(fullPath);
        }
    }
}

walk('./frontend/src');

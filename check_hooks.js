const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let hasReturn = false;
    let blockLevel = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes('return ')) {
            hasReturn = true;
        }
        
        if (hasReturn && line.match(/use(State|Effect|Context|Ref|Memo|Callback)\(/)) {
            console.log(`Potential hook after return in ${filePath}:${i+1}`);
        }
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walk(filePath);
        } else if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
            checkFile(filePath);
        }
    }
}

walk('./frontend/src');

import fs from 'fs';

const content = fs.readFileSync('src/pages/student/StudentPagesA.tsx', 'utf-8');

// Find all exports with their positions
const exportRegex = /export\s+function\s+(\w+)\s*\(\s*\)/g;
let match;
let exports = [];

while ((match = exportRegex.exec(content)) !== null) {
  exports.push({
    name: match[1],
    position: match.index,
    fullMatch: match[0]
  });
}

console.log('Found exports (in order):');
exports.forEach((exp, i) => {
  console.log(`${i+1}. ${exp.name} (position ${exp.position})`);
});

// Check for duplicates
const names = exports.map(e => e.name);
const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
if (duplicates.length > 0) {
  console.log('\n⚠️  Found duplicate exports:', new Set(duplicates));
}

// Now check if StudentAIAssistant is actually a complete function
const aiAssistantExport = exports.find(e => e.name === 'StudentAIAssistant');
if (aiAssistantExport) {
  console.log('\nStudentAIAssistant found at position', aiAssistantExport.position);
  
  // Find the next export after it
  const nextExport = exports.find(e => e.position > aiAssistantExport.position);
  if (nextExport) {
    const betweenStart = aiAssistantExport.position;
    const betweenEnd = nextExport.position;
    const between = content.substring(betweenStart, betweenEnd);
    
    // Count braces in this function
    let braceCount = 0;
    for (let i = 0; i < between.length; i++) {
      if (between[i] === '{') braceCount++;
      else if (between[i] === '}') braceCount++;
    }
    console.log(`Brace delta between StudentAIAssistant and ${nextExport.name}: ${braceCount}`);
  } else {
    console.log('StudentAIAssistant is the last export');
  }
}

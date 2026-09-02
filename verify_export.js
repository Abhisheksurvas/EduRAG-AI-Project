import fs from 'fs';
const content = fs.readFileSync('src/pages/student/StudentPagesA.tsx', 'utf-8');

// Find the position of StudentAIAssistant
const pos = content.indexOf('StudentAIAssistant');
if (pos === -1) {
  console.log('ERROR: StudentAIAssistant not found');
  process.exit(1);
}

// Show context
const start = Math.max(0, pos - 300);
const end = Math.min(content.length, pos + 300);
console.log('Context around StudentAIAssistant:');
console.log(content.substring(start, end));
console.log('\n---\n');

// Try to find all export statements
const exportMatches = content.match(/export\s+(?:function|const)\s+(\w+)/g);
if (exportMatches) {
  console.log('All exports found:');
  exportMatches.forEach(e => {
    const name = e.match(/(\w+)$/)[1];
    console.log('  - ' + name);
  });
} else {
  console.log('No exports found');
}

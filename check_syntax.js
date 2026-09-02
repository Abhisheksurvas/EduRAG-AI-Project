import fs from 'fs';

const content = fs.readFileSync('src/pages/student/StudentPagesA.tsx', 'utf-8');

// Count braces
let braceCount = 0;
let parenCount = 0;
let bracketCount = 0;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '{') braceCount++;
  else if (char === '}') braceCount--;
  else if (char === '(') parenCount++;
  else if (char === ')') parenCount--;
  else if (char === '[') bracketCount++;
  else if (char === ']') bracketCount--;
  
  if (braceCount < 0 || parenCount < 0 || bracketCount < 0) {
    console.log(`Syntax error at position ${i}`);
    console.log(`Character: ${char}`);
    console.log(`Context: ${content.substring(Math.max(0, i-100), i+100)}`);
    process.exit(1);
  }
}

console.log('Final brace counts:');
console.log(`  Braces: ${braceCount}`);
console.log(`  Parens: ${parenCount}`);
console.log(`  Brackets: ${bracketCount}`);

if (braceCount === 0 && parenCount === 0 && bracketCount === 0) {
  console.log('✓ File appears to have balanced braces/parens/brackets');
} else {
  console.log('✗ File has unbalanced braces/parens/brackets - syntax error likely');
}

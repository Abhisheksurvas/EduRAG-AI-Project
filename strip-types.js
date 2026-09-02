const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const files = [
  'src/App.jsx',
  'src/components/ui.jsx',
  'src/components/DashboardShell.jsx',
  'src/pages/LandingPage.jsx',
  'src/pages/LoginPage.jsx',
  'src/pages/SignupPage.jsx',
  'src/pages/teacher/TeacherPages.jsx',
  'src/pages/student/StudentPagesA.jsx',
  'src/pages/student/StudentPagesB.jsx',
  'src/pages/hod/HODPages.jsx',
];

for (const file of files) {
  const filePath = path.join(process.cwd(), file);
  const code = fs.readFileSync(filePath, 'utf8');
  const result = esbuild.transformSync(code, {
    loader: 'tsx',
    format: 'esm',
    platform: 'browser',
  });
  fs.writeFileSync(filePath, result.code);
  console.log(`Processed: ${file}`);
}

console.log('All files processed successfully!');

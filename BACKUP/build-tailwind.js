const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 필요한 디렉토리 생성
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

if (!fs.existsSync('src')) {
  fs.mkdirSync('src');
}

// 기본 tailwind.css 파일이 없는 경우 생성
const tailwindCssPath = path.join('src', 'tailwind.css');
if (!fs.existsSync(tailwindCssPath)) {
  const defaultContent = `@tailwind base;
@tailwind components;
@tailwind utilities;`;
  fs.writeFileSync(tailwindCssPath, defaultContent);
}

console.log('Building Tailwind CSS...');
try {
  execSync('npx tailwindcss -i ./src/tailwind.css -o ./dist/tailwind.css');
  console.log('Tailwind CSS built successfully!');
} catch (error) {
  console.error('Error building Tailwind CSS:', error.message);
  process.exit(1);
} 
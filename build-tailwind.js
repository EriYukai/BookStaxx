const { exec } = require('child_process');
const path = require('path');

const inputFile = path.resolve(__dirname, 'src/tailwind.css');
const outputFile = path.resolve(__dirname, 'dist/output.css');

const command = `npx tailwindcss -i "${inputFile}" -o "${outputFile}" ${process.argv.includes('--watch') ? '--watch' : ''} ${process.argv.includes('--minify') ? '--minify' : ''}`;

console.log(`Executing: ${command}`);

const buildProcess = exec(command);

buildProcess.stdout.on('data', (data) => {
  process.stdout.write(data);
});

buildProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

buildProcess.on('close', (code) => {
  console.log(`Tailwind CSS build process exited with code ${code}`);
}); 
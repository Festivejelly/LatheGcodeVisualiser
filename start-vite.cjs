const { exec } = require('child_process');

const vite = exec('npm run dev', {
  cwd: process.cwd()
});

vite.stdout.on('data', (data) => {
  console.log(data);
});

vite.stderr.on('data', (data) => {
  console.error(data);
});

vite.on('close', (code) => {
  console.log(`Vite process exited with code ${code}`);
});
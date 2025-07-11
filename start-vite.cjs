const { exec } = require('child_process');
const { truncate } = require('fs/promises');

const vite = exec('npm run dev', {
  cwd: process.cwd(),
  windowsHide: truncate
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
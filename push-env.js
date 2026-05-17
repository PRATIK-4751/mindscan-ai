const fs = require('fs');
const cp = require('child_process');
const env = fs.readFileSync('.env', 'utf-8');
const lines = env.split('\n');

for (const line of lines) {
  const [key, ...rest] = line.trim().split('=');
  const val = rest.join('=');
  
  if (key && !key.startsWith('#') && val) {
    console.log('Adding ' + key + ' to Vercel...');
    try {
      // Create a temporary file containing only the value
      fs.writeFileSync('.temp-val', val);
      // Push from the temp file
      cp.execSync('npx --yes vercel env add ' + key + ' production < .temp-val', { stdio: 'inherit' });
    } catch (e) {
      console.log('Error adding ' + key + ': ' + e.message);
    }
  }
}

if (fs.existsSync('.temp-val')) fs.unlinkSync('.temp-val');
console.log('Done!');

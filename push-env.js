const fs = require('fs');
const cp = require('child_process');
const env = fs.readFileSync('.env', 'utf-8');
const lines = env.split('\n');

for (const line of lines) {
  const trimmedLine = line.trim();
  if (!trimmedLine || trimmedLine.startsWith('#')) continue;

  const [rawKey, ...rest] = trimmedLine.split('=');
  const key = rawKey.trim();
  const val = rest.join('=').trim();
  
  if (key && val) {
    console.log('Updating ' + key + ' on Vercel...');
    try {
      // First, try to remove the existing variable (ignore errors if it doesn't exist)
      try {
        cp.execSync('npx --yes vercel env rm ' + key + ' production -y', { stdio: 'ignore' });
      } catch (e) {
        // Variable might not exist, ignore
      }

      // Create a temporary file containing only the value
      fs.writeFileSync('.temp-val', val);
      // Push from the temp file
      cp.execSync('npx --yes vercel env add ' + key + ' production < .temp-val', { stdio: 'inherit' });
    } catch (e) {
      console.log('Error updating ' + key + ': ' + e.message);
    }
  }
}

if (fs.existsSync('.temp-val')) fs.unlinkSync('.temp-val');
console.log('Done!');

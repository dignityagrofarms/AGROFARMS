import fs from 'fs';
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)="?(.*?)"?$/);
  if (match) acc[match[1]] = match[2];
  return acc;
}, {});

const url = env.VITE_SUPABASE_URL + '/rest/v1/admin_access?select=*';
const key = env.SUPABASE_SERVICE_ROLE_KEY;

fetch(url, {
  headers: {
    apikey: key,
    Authorization: 'Bearer ' + key
  }
}).then(res => res.text()).then(console.log).catch(console.error);

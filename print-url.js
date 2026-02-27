const fs = require('fs');
const http = require('http');
const { exec } = require('child_process');

function checkStatus() {
  console.log(`\n⏳ Procurando URL exp://...`);
  
  // 1. Tenta ler o arquivo de log
  try {
    if (fs.existsSync('expo.log')) {
      const log = fs.readFileSync('expo.log', 'utf8');
      const match = log.match(/exp:\/\/[\w\.-]+(:\d+)?/);
      if (match) {
        console.log(`\n✅ URL ENCONTRADA (Log): ${match[0]}`);
        return; 
      }
    }
  } catch (e) {}

  // 2. Tenta npx expo-cli url
  exec('npx expo-cli url --tunnel', (error, stdout, stderr) => {
    if (stdout && stdout.includes('exp://')) {
        const url = stdout.trim();
        console.log(`\n✅ URL ENCONTRADA (CLI): ${url}`);
    } 
  });

  // 3. Tenta pegar o manifesto do Metro e headers
  http.get('http://localhost:8081/', (res) => {
      // Às vezes o header X-Expo-Go-URL ou similar contém a info
      if (res.headers['x-expo-go-url']) {
          console.log(`\n✅ URL ENCONTRADA (Header): ${res.headers['x-expo-go-url']}`);
      }
      
      // Tenta ler o corpo para ver se tem algo útil
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
          // Procura por exp:// no corpo do manifesto
          const match = data.match(/exp:\/\/[\w\.-]+(:\d+)?/);
          if (match) {
              console.log(`\n✅ URL ENCONTRADA (Metro Body): ${match[0]}`);
          }
      });
  }).on('error', () => {});
}

// Loop a cada 5s
setInterval(checkStatus, 5000);

console.log("Monitor de URL (Log + CLI + Metro Headers) iniciado...");

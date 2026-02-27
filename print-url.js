const fs = require('fs');
const { exec } = require('child_process');

function checkStatus() {
  console.log(`\n⏳ Procurando URL exp://...`);
  
  // Tenta ler o arquivo de log primeiro
  try {
    if (fs.existsSync('expo.log')) {
      const log = fs.readFileSync('expo.log', 'utf8');
      const match = log.match(/exp:\/\/[\w\.-]+(:\d+)?/);
      if (match) {
        console.log(`\n✅ URL ENCONTRADA (Log): ${match[0]}`);
        console.log(`📲 Cole este link no Expo Go: ${match[0]}`);
        return; // Sucesso
      }
    }
  } catch (e) {}

  // Se não achou no log, tenta usar o comando 'expo-cli url'
  // (funciona se expo-cli estiver instalado, ou tenta 'npx expo-cli')
  exec('npx expo-cli url --tunnel', (error, stdout, stderr) => {
    if (stdout && stdout.includes('exp://')) {
        const url = stdout.trim();
        console.log(`\n✅ URL ENCONTRADA (CLI): ${url}`);
        console.log(`📲 Cole este link no Expo Go: ${url}`);
    } else {
        // Tenta pegar o manifesto do Metro diretamente
        // O Metro roda na porta 8081 e expõe / (root) que pode conter infos no header ou body
        // Mas a URL do túnel é externa.
        console.log(`❌ URL ainda não encontrada. Tentando novamente...`);
    }
  });
}

// Loop infinito a cada 10s para não floodar
setInterval(checkStatus, 10000);

console.log("Monitor de URL (Log + CLI) iniciado...");

const fs = require('fs');

function checkStatus() {
  console.log(`\n⏳ Procurando URL exp:// no arquivo de log...`);
  
  try {
    if (fs.existsSync('expo.log')) {
      const log = fs.readFileSync('expo.log', 'utf8');
      
      // Procura por qualquer URL exp:// no log
      const match = log.match(/exp:\/\/[\w\.-]+(:\d+)?/);
      if (match) {
        console.log(`\n✅ URL ENCONTRADA: ${match[0]}`);
        console.log(`📲 Cole este link no Expo Go: ${match[0]}`);
      } else {
        console.log(`❌ URL exp:// ainda não encontrada no log.`);
      }
    } else {
      console.log(`⚠️  Arquivo expo.log ainda não existe.`);
    }
  } catch (e) {
    console.error(e);
  }
}

// Loop infinito a cada 5s
setInterval(checkStatus, 5000);

console.log("Monitor de URL (via Log File) iniciado...");

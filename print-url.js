const http = require('http');

// Tenta conectar na API do Expo Dev Server para pegar o status
// O Expo geralmente expõe status na porta 8081 (ou a porta configurada)
// Se não achar, tenta usar variáveis de ambiente ou logs
const PORT = 8081;

function checkStatus() {
  const req = http.get(`http://localhost:${PORT}/status`, (res) => {
    // Se respondeu, tenta pegar o manifesto ou status
    // O Expo Router/Metro pode não ter rota /status padrão, mas o Dev Server sim
    // Vamos tentar pegar o manifesto ou simplesmente imprimir "Tente acessar via túnel"
    
    // Na verdade, a URL do túnel é mais difícil de pegar via HTTP simples
    // Mas podemos tentar ler o output do processo ou usar expo-cli
    
    console.log(`\n✅ Expo Dev Server respondendo na porta ${PORT}!`);
    console.log(`ℹ️  Se você configurou EXPO_TOKEN, veja o link em: https://expo.dev/projects`);
    console.log(`ℹ️  Se não, procure nos logs acima por "exp://"`);
    console.log(`ℹ️  Tentando descobrir URL do túnel...`);
    
    // Tenta pegar do endpoint /json/list (DevTools)
    http.get(`http://localhost:8081/json/list`, (res2) => {
        let data = '';
        res2.on('data', chunk => data += chunk);
        res2.on('end', () => {
            try {
                // Tenta achar URLs no JSON
                console.log("Status do DevTools:", data.substring(0, 200)); 
            } catch (e) {}
        });
    }).on('error', () => {});

  }).on('error', (e) => {
    // Ainda não subiu
  });
}

// Loop infinito a cada 10s
setInterval(checkStatus, 10000);

console.log("Monitor de URL iniciado...");

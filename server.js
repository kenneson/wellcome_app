// Entry point for Hostinger deployment
const path = require('path');

try {
  // Mudar o diretório de trabalho para 'backend' para garantir que os caminhos relativos (como .env) funcionem
  const backendDir = path.join(__dirname, 'backend');
  process.chdir(backendDir);
  console.log('Changed working directory to:', process.cwd());
  
  // Carregar o código compilado
  // Nota: O caminho do require deve ser relativo ao server.js ou absoluto
  require(path.join(backendDir, 'dist', 'index.js'));
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}

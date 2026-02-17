// Entry point for Hostinger deployment
// Mudar o diretório de trabalho para 'backend' para garantir que os caminhos relativos funcionem
try {
  process.chdir('backend');
  console.log('Changed working directory to:', process.cwd());
  
  // Carregar o código compilado
  require('./dist/index.js');
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}

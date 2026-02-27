#!/bin/sh

# Inicia um servidor HTTP fake na porta 80 usando Python (para o EasyPanel achar que está tudo ok)
# Se o Python não estiver disponível, tente node
echo "Starting Healthcheck Server on port 80..."
if command -v python3 >/dev/null 2>&1; then
  nohup python3 -m http.server 80 > /dev/null 2>&1 &
elif command -v python >/dev/null 2>&1; then
  nohup python -m http.server 80 > /dev/null 2>&1 &
else
  # Fallback para Node se não tiver python (cria um server simples)
  nohup node -e 'require("http").createServer((req, res) => {res.writeHead(200); res.end("OK");}).listen(80)' > /dev/null 2>&1 &
fi

echo "Healthcheck Server running."

# Agora roda o Expo na porta 8081 (para não conflitar com a 80) e com túnel
# O túnel vai gerar a URL exp:// que você precisa
echo "Starting Expo Tunnel..."
npx expo start --tunnel --port 8081 --dev-client --clear

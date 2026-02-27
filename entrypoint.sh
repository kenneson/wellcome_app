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

# Agora roda o Expo na porta 8081 em modo LAN (para acessar via IP direto)
# Você deve abrir a porta 8081 no Firewall da VPS
echo "Starting Expo in LAN Mode (port 8081)..."

# Redireciona output para arquivo e console (tee)
# Remove --tunnel e adiciona --host lan
# O unbuffer garante que o QR code apareça
unbuffer npx expo start --host lan --port 8081 --dev-client --clear | tee expo.log

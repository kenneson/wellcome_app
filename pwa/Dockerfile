# Etapa 1: Build da aplicação React/Vite
FROM node:20-alpine AS builder
WORKDIR /app

# Copia e instala as dependências
COPY package*.json ./
RUN npm ci

# Copia o restante do código e executa o build de produção PWA
COPY . .
RUN npm run build

# Etapa 2: Servidor Web Nginx
FROM nginx:alpine

# Removemos a página padrão do nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiamos as pastas "buildadas" do vite (pasta dist)
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiamos as configurações personalizadas do Nginx para suportar as rotas do React (SPA) e PWA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

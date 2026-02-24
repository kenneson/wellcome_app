# Estágio de Build
FROM node:20-slim AS builder

WORKDIR /app

# Argumentos de build para variáveis de ambiente do Expo
# Estas variáveis são embutidas no código em tempo de build
ARG EXPO_PUBLIC_API_URL
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY

# Definir as variáveis de ambiente para o build
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY

# Copiar arquivos de dependência
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar todo o código fonte
COPY . .

# Construir a versão Web do Expo
# Isso cria a pasta 'dist' com os arquivos estáticos
RUN npx expo export -p web

# Estágio de Produção (Nginx)
FROM nginx:alpine

# Copiar configuração do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar os arquivos estáticos gerados no build
COPY --from=builder /app/dist /usr/share/nginx/html

# Expor porta 80
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]

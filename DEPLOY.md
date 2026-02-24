# Guia de Deploy no Easypanel (Hostinger VPS)

O **Easypanel** é um painel de controle moderno baseado em Docker que facilita muito o deploy.

## 1. Configurando o Projeto no Easypanel

1. Acesse seu painel Easypanel (geralmente `http://seu_ip:3000` ou seu domínio configurado).
2. Crie um novo **Project** (ex: `Wellcome`).
3. Clique em **Service** e escolha **App**.

## 2. Configurando o Serviço (Backend)

- **Source**:
    - Se seu código está no GitHub: Conecte sua conta e selecione o repositório `wellcome`.
    - **Build Path**: Configure para `backend` (já que seu Dockerfile está dentro dessa pasta).
    - **Docker Image**: Deixe vazio para usar o Dockerfile do repositório.

- **Environment Variables**:
    - Adicione todas as variáveis do seu arquivo `.env`:
        - `DATABASE_URL`
        - `DIRECT_URL`
        - `SUPABASE_URL`
        - `SUPABASE_ANON_KEY`
        - `PORT`: `3000`

- **Domains**:
    - Adicione seu domínio, ex: `api.seudominio.com`.
    - O Easypanel configurará automaticamente o SSL (HTTPS) para você.

## 3. Deploy do Backend

1. Clique em **Deploy**.
2. Acompanhe os logs. O Easypanel vai ler o `backend/Dockerfile`, instalar as dependências, gerar o Prisma Client e iniciar o servidor.

---

# Parte 2: Deploy do Frontend (Versão Web)

Como seus amigos estão distantes, a maneira mais fácil deles testarem é acessando o app pelo navegador (como um site).

## 1. Configurando o Serviço (Frontend)

1. Crie um **novo serviço** do tipo **App** no mesmo projeto.
2. Nomeie como `Wellcome Web`.

- **Source**:
    - Repositório: `wellcome` (mesmo do backend).
    - **Build Path**: `.` (raiz, deixe vazio ou ponto).
    - **Docker Image**: Deixe vazio.
    - **Arquivo (Dockerfile)**: `Dockerfile` (agora é o padrão, pois renomeamos o arquivo).

- **Environment Variables**:
    - `EXPO_PUBLIC_API_URL`: `https://api.seudominio.com` (A URL do seu backend que você configurou acima).

- **Domains**:
    - Adicione o domínio para o app, ex: `app.seudominio.com`.

## 2. Deploy

1. Clique em **Deploy**.
2. O Easypanel vai construir a versão web do seu app Expo e servi-la usando Nginx.
3. Seus amigos poderão acessar `https://app.seudominio.com` e usar o app direto no navegador (celular ou PC).

---

# Parte 3: App Nativo (Opcional)

Se você quiser que eles testem o app **nativo** (instalar no Android):

1. No seu computador, gere um APK:
   ```bash
   eas build -p android --profile preview
   ```
2. Isso vai gerar um link para baixar o arquivo `.apk`.
3. Envie esse link para seus amigos com Android.



# Guia de Deploy no Easypanel (Hostinger VPS)

O **Easypanel** é um painel de controle moderno baseado em Docker que facilita muito o deploy.

---

## Pré-requisitos

- Uma VPS na Hostinger com Easypanel instalado
- Um domínio configurado (opcional, mas recomendado)
- Repositório no GitHub com o código do projeto

---

# Parte 1: Deploy do Backend

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

## IMPORTANTE: Variáveis de Ambiente em Tempo de Build

O Expo usa variáveis `EXPO_PUBLIC_*` que são **embutidas no código em tempo de build**. Isso significa que você DEVE configurar os **Build Arguments** no Easypanel, não apenas Environment Variables.

## 1. Configurando o Serviço (Frontend)

1. Crie um **novo serviço** do tipo **App** no mesmo projeto.
2. Nomeie como `Wellcome Web` ou `Wellcome Frontend`.

### Configurações do Serviço:

- **Source**:
    - Repositório: `wellcome` (mesmo do backend).
    - **Build Path**: `.` (raiz, deixe vazio ou ponto).
    - **Docker Image**: Deixe vazio.
    - **Dockerfile**: `Dockerfile` (arquivo na raiz do projeto).

### Build Arguments (CRÍTICO):

No Easypanel, procure a seção **Build Arguments** ou **Build Args** e adicione:

| Nome | Valor |
|------|-------|
| `EXPO_PUBLIC_API_URL` | `https://api.seudominio.com` |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://cmkknuvydqetzmdpzzqv.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_NcU_Jp3xZY6SKd-x5uY0gg_AXXWZvM2` |

> ⚠️ **Atenção**: Substitua `https://api.seudominio.com` pela URL real do seu backend deployado na Parte 1.

### Domains:

- Adicione o domínio para o app, ex: `app.seudominio.com` ou `wellcome.seudominio.com`.
- O Easypanel configurará automaticamente o SSL (HTTPS).

## 2. Deploy

1. Clique em **Deploy**.
2. O Easypanel vai construir a versão web do seu app Expo e servi-la usando Nginx.
3. Acesse `https://app.seudominio.com` para usar o app direto no navegador (celular ou PC).

---

# Parte 3: Atualizando o Frontend

Quando você precisar atualizar o frontend com uma nova URL de backend:

1. Vá nas configurações do serviço no Easypanel
2. Atualize o **Build Argument** `EXPO_PUBLIC_API_URL`
3. Clique em **Deploy** novamente (é necessário um novo build para as variáveis serem atualizadas)

---

# Parte 4: App Nativo (Opcional)

Se você quiser que eles testem o app **nativo** (instalar no Android):

1. No seu computador, gere um APK:
   ```bash
   eas build -p android --profile preview
   ```
2. Isso vai gerar um link para baixar o arquivo `.apk`.
3. Envie esse link para seus amigos com Android.

---

# Troubleshooting

## Erro de CORS

Se você receber erros de CORS no navegador:
1. Verifique se o `EXPO_PUBLIC_API_URL` está correto (incluindo `https://`)
2. Verifique se o backend está rodando e acessível
3. Verifique os logs do backend para erros

## Tela Branca

Se o app carregar com tela branca:
1. Abra o DevTools do navegador (F12)
2. Verifique o Console por erros
3. Verifique se as variáveis de ambiente foram configuradas corretamente nos Build Arguments

## Build Falhando

Se o build do frontend falhar:
1. Verifique os logs do build no Easypanel
2. Certifique-se de que os Build Arguments estão configurados
3. Verifique se o Dockerfile está na raiz do projeto



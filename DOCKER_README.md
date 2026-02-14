# Guia de Implantação com Docker

Este guia descreve como executar o sistema Wellcome (Backend + Frontend) utilizando Docker e Docker Compose.

## Pré-requisitos

- [Docker](https://www.docker.com/products/docker-desktop) instalado.
- [Docker Compose](https://docs.docker.com/compose/install/) instalado (geralmente incluído no Docker Desktop).
- Credenciais do Supabase (URL e Anon Key).
- URL do Banco de Dados (PostgreSQL connection string).

## Estrutura do Projeto

- **Frontend**: Aplicação Expo (React Native) exportada para Web e servida via Nginx.
- **Backend**: API Node.js com Fastify e Prisma.

## Configuração

1. Crie um arquivo `.env` na raiz do projeto (`wellcome/`) com as seguintes variáveis. Você pode copiar este modelo:

```env
# Configurações do Banco de Dados (Prisma)
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# Configurações do Supabase (Backend e Frontend)
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_ANON_KEY="sua-chave-anonima"

# Configurações do Frontend
# URL da API Backend (importante: se rodar localmente, use o IP da sua máquina ou localhost se acessar do mesmo PC)
# Para produção, use o domínio/IP do servidor onde o backend está rodando.
EXPO_PUBLIC_API_URL="http://localhost:3000"

# Repita as chaves do Supabase para o Expo (prefixo EXPO_PUBLIC_ é necessário para o build)
EXPO_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="sua-chave-anonima"
```

> **Nota**: O frontend é construído estaticamente. Se você alterar as variáveis `EXPO_PUBLIC_*`, precisará reconstruir a imagem do frontend.

## Executando com Docker Compose

Para construir e iniciar os serviços, execute o seguinte comando na raiz do projeto:

```bash
docker-compose up --build
```

Isso irá:
1. Construir a imagem do Backend.
2. Construir a imagem do Frontend (pode levar alguns minutos para instalar dependências e exportar o site).
3. Iniciar os containers.

Para rodar em segundo plano (modo detached):

```bash
docker-compose up -d --build
```

Para parar os serviços:

```bash
docker-compose down
```

## Acessando a Aplicação

- **Frontend**: Acesse `http://localhost` (ou o IP do servidor).
- **Backend API**: Acesse `http://localhost:3000` (ou o IP do servidor:3000).
- **Documentação da API (Swagger)**: `http://localhost:3000/docs`.

## Detalhes Técnicos

### Backend
- O Dockerfile do backend está em `backend/Dockerfile`.
- Ele usa `node:20-alpine`.
- Executa `npx prisma generate` na construção para garantir que o cliente Prisma esteja atualizado.
- Expõe a porta 3000.

### Frontend
- O Dockerfile do frontend está na raiz `Dockerfile`.
- É um build multi-estágio:
  1. **Builder**: Usa Node.js para instalar dependências e rodar `npx expo export --platform web`.
  2. **Runner**: Usa Nginx (Alpine) para servir os arquivos estáticos gerados na pasta `dist`.
- As variáveis de ambiente `EXPO_PUBLIC_*` são injetadas durante o build (tempo de construção), não em tempo de execução.

## Solução de Problemas

### Erro de Conexão com Banco de Dados
Verifique se a `DATABASE_URL` está correta e se o container do backend consegue alcançar o banco de dados. Se o banco estiver rodando no host (fora do Docker), use `host.docker.internal` (no Windows/Mac) ou o IP da rede local em vez de `localhost`.

### Frontend não conecta ao Backend
Se o frontend carregar mas der erro ao tentar login ou buscar dados, verifique a variável `EXPO_PUBLIC_API_URL`.
- Abra o Console do Desenvolvedor no navegador (F12).
- Verifique para onde as requisições de rede estão indo.
- Se estiverem indo para o lugar errado, ajuste o `.env` e rode `docker-compose up --build` novamente para reconstruir o frontend com a nova URL.

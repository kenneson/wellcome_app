# Wellcome Landing

Landing page de lancamento da Wellcome, isolada do aplicativo mobile e pronta para deploy na Vercel.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3001` se a porta 3000 estiver ocupada pelo backend do aplicativo.

## Lista de espera

1. Execute [supabase/waitlist.sql](./supabase/waitlist.sql) no SQL Editor do Supabase.
2. Na Vercel, configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
3. Nunca exponha a `SUPABASE_SERVICE_ROLE_KEY` como uma variavel `NEXT_PUBLIC_*`.

O endpoint `POST /api/waitlist` valida e-mails, ignora o campo anti-spam e registra `email`, `intent` e `source` usando a chave de servico apenas no servidor.

## Deploy na Vercel

Importe a pasta `wellcome-landing` como um novo projeto ou execute `vercel` a partir dela. A Vercel detecta Next.js sem configuracao adicional.

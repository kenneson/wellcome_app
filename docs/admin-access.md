# Acesso administrativo

O painel administrativo fica na rota `admin/login` do aplicativo. Ele usa a mesma
conta do Supabase, mas a API libera as funcoes administrativas somente quando o
campo `public.profiles.role` estiver definido como `ADMIN`.

## Conceder acesso

1. Crie ou confirme o usuario no Supabase Auth.
2. Aplique as migrations do projeto para que todo usuario do Auth tenha um perfil.
3. No SQL Editor do Supabase, execute a consulta abaixo substituindo o e-mail.
4. Confirme que a consulta retornou exatamente um usuario antes de usar o painel.

```sql
insert into public.profiles (id, email, full_name, role)
select id, email, raw_user_meta_data ->> 'full_name', 'ADMIN'
from auth.users
where lower(email) = lower('admin@example.com')
on conflict (id) do update
set email = excluded.email,
    role = 'ADMIN'
returning id, email, role;
```

O app nao possui tela para conceder esse papel. Essa decisao deve continuar
restrita ao SQL Editor ou a uma operacao de backoffice com controles equivalentes.
Se a consulta nao retornar linhas, primeiro crie ou confirme a conta no Supabase Auth.

## Operacao disponivel

- Revisar, aprovar ou rejeitar solicitacoes KYC pendentes.
- Autorizar saques Pix pendentes.
- Resolver ou dispensar denuncias pendentes.
- Acompanhar os contadores operacionais na tela inicial do painel.

# Leadflow

Sistema independente de captura e distribuição de leads (roleta round-robin) com hierarquia de
3 níveis (Admin de marketing oculto → Gestor → Corretor). É uma fração isolada que compartilha
apenas o banco Postgres físico com o CRM Real-Sales — nenhuma tabela ou regra do CRM é
reaproveitada.

## Isolamento com o banco do Real-Sales — leia antes de mexer no schema

Este projeto e o Real-Sales **compartilham o mesmo banco Postgres/Supabase**, mas cada um tem
seu próprio conjunto de tabelas:

- Este projeto só possui/gerencia tabelas `leadflow_*` (definidas em `prisma/schema.prisma`).
- A tabela `users` (e todas as outras do CRM) **não são modeladas aqui** e são lidas
  exclusivamente via SQL bruto somente-leitura em [`lib/crm-users.ts`](lib/crm-users.ts).

### ⚠️ NUNCA rode `prisma migrate dev`, `prisma migrate reset` ou `prisma db push` neste projeto

O banco já tem dezenas de tabelas do CRM que não existem no `schema.prisma` deste projeto. As
ferramentas acima tentam fazer o banco convergir para bater exatamente com o `schema.prisma` —
ou seja, elas vão detectar as tabelas do CRM como "drift" e **oferecer um reset completo do
schema `public`, apagando todos os dados do Real-Sales**.

Para qualquer alteração de schema deste projeto, o fluxo seguro é:

1. Edite `prisma/schema.prisma` normalmente.
2. Gere o SQL apenas do que mudou comparando com uma cópia do schema anterior:
   ```bash
   npx prisma migrate diff \
     --from-schema-datamodel prisma/schema.prev.prisma \
     --to-schema-datamodel prisma/schema.prisma \
     --script > prisma/migrations/<timestamp>_<nome>/migration.sql
   ```
   (ou, para uma tabela nova do zero, `--from-empty` no lugar do `--from-schema-datamodel`).
3. **Revise o SQL gerado** — ele deve conter apenas `CREATE`/`ALTER`/`DROP` de objetos
   `leadflow_*`. Se aparecer qualquer coisa fora desse prefixo, pare e investigue.
4. Aplique manualmente, sem diffing contra o banco ao vivo:
   ```bash
   npx prisma db execute --file prisma/migrations/<timestamp>_<nome>/migration.sql --schema prisma/schema.prisma
   npx prisma migrate resolve --applied <timestamp>_<nome> --schema prisma/schema.prisma
   npx prisma generate
   ```

`prisma generate` (client) e `prisma db execute` (aplicar SQL revisado) são seguros e podem ser
usados livremente — apenas os comandos de diffing automático contra o banco ao vivo
(`migrate dev`, `migrate reset`, `db push`) é que são perigosos aqui.

## Rodando localmente

```bash
npm install
npm run dev
```

Variáveis de ambiente em `.env.local` (ver `.env.example`): `DATABASE_URL`, `DIRECT_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

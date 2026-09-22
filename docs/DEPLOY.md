# Deploy: Neon, Render e Vercel

Os arquivos de implantação estão preparados. Nenhuma conta externa ou recurso pago é criado automaticamente.

## 1. PostgreSQL no Neon

Crie um projeto PostgreSQL e copie sua connection string para o ambiente privado do Render. Use TLS na URL fornecida pelo Neon. Nunca coloque a URL no frontend ou em um NEXT_PUBLIC_*.

DATABASE_URL é lida pelo Prisma CLI e pelo adapter PostgreSQL. Caso seu ambiente exija conexão direta para migrations, execute npm run db:migrate com a URL direta em um job separado. Faça migrations apenas contra o ambiente correto.

Referência: [Prisma com Neon](https://www.prisma.io/docs/orm/overview/databases/neon).

## 2. API no Render

Conecte o repositório e use render.yaml como Blueprint, ou crie um Web Service Node com a raiz do repositório.

- Build: npm ci --include=dev && npm run build -w backend
- Start: npm run db:migrate -w backend && npm run start -w backend
- Health check: /api/health
- Instâncias: 1 (rate limiter em memória)
- NODE_ENV=production
- DATABASE_URL=URL privada do Neon com TLS
- FRONTEND_URL=https://seu-projeto.vercel.app (sem caminho)
- JWT_SECRET e JWT_REFRESH_SECRET: segredos diferentes, aleatórios, de pelo menos 32 caracteres
- PORT: fornecida pelo Render

O blueprint gera os dois segredos. Nunca reutilize valores dos exemplos. O servidor não roda o seed automaticamente em produção. Se desejar usuários fictícios, defina SEED_PASSWORD temporariamente e execute npm run db:seed de maneira controlada. Proteja e não divulgue o acesso ADMIN.

Referência: [Node/Express no Render](https://render.com/docs/deploy-node-express-app).

## 3. Frontend na Vercel

Importe o mesmo repositório, selecione Root Directory = frontend e o preset Next.js. Permita arquivos fora da raiz do frontend, pois o lockfile e os workspaces estão no diretório superior.

- Install: npm ci --include=dev
- Build: npm run build
- NEXT_PUBLIC_API_URL=/api
- API_INTERNAL_URL=https://sua-api.onrender.com

A URL pública usada pelo navegador permanece /api. O Next encaminha as requisições para o Express; os cookies pertencem à origem da Vercel. Não configure NEXT_PUBLIC_API_URL diretamente como o domínio do Render: isso exigiria outra estratégia de cookies e CSRF.

Referência: [Monorepos na Vercel](https://vercel.com/docs/monorepos).

## 4. Verificação após implantação

1. Acesse as URLs HTTPS do frontend e da API.
2. Confirme /api/health e /api/docs.
3. Crie uma conta fictícia e confira saldo zero.
4. Adicione saldo demo, cadastre chave e transfira para outra conta.
5. Confira comprovante, extrato das duas contas e saldo.
6. Confirme cookies HttpOnly, Secure e SameSite=Lax.
7. Confirme que /api/admin/users retorna 403 para USER e que chamadas sem sessão retornam 401.
8. Faça logout e confirme que a sessão anterior perdeu acesso.

Previews da Vercel não são automaticamente adicionados ao CORS. Use uma API/ambiente separado por preview ou configure uma origem de demonstração fixa. O banco de testes deve ser independente do banco demonstrativo publicado.

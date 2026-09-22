# Segurança e integridade

Cesda Bank é uma simulação de portfólio. Não existe integração com bancos, arranjos PIX, adquirentes, Open Finance ou redes de cartões.

## Autenticação

- Argon2id com memória de 64 MiB, três iterações e paralelismo 1.
- JWT HS256 com emissor, audiência e algoritmo explícitos. Access token de 15 minutos.
- Refresh JWT rotativo com validade de sete dias, armazenado no servidor apenas como SHA-256. A validade absoluta da sessão não é estendida pela rotação.
- Access e refresh em cookies HTTP-only, SameSite=Lax e Secure em produção; nenhum token no localStorage.
- Sessão consultada em toda requisição privada. Logout e reutilização do refresh invalidam o acesso.
- O navegador usa /api na mesma origem do Next, encaminhada ao Express. Essa escolha evita dependência de cookies de terceiros entre Vercel e Render.
- Mutações exigem Origin igual a FRONTEND_URL e X-Cesda-Client: web. CORS permite somente a origem configurada.
- Role administrativa obtida do banco, não de campos enviados pelo cliente.
- E-mail e CPF únicos. Não existe verificação de identidade real; use exclusivamente dados fictícios.

## Dinheiro e concorrência

Todos os valores da API são inteiros em centavos. O PostgreSQL usa INTEGER; constraints limitam saldo entre zero e 100.000.000 centavos e exigem valores positivos nas transações. Operações aceitam até 1.000.000 centavos por solicitação.

PIX, depósitos e compras passam por um único serviço financeiro:

1. Verifica o usuário, conta ativa e idempotência.
2. Revalida chave/destinatário ou cartão, valor e limite.
3. Debita usando atualização condicional de saldo.
4. Credita o destino, quando houver.
5. Insere lançamentos, idempotência, notificações e auditoria de conclusão na mesma transação.
6. Confirma somente após todas as gravações.

Isolamento SERIALIZABLE e até cinco tentativas em conflitos de serialização/unique protegem concorrência. A condição balance >= amount e a constraint são camadas adicionais. Bloqueios administrativos e alterações de cartão usam a mesma estratégia de isolamento.

O limite diário agrega PIX enviados concluídos a partir da meia-noite de São Paulo. A idempotência é composta por conta e UUID; o hash do conteúdo impede reutilizar uma confirmação com outro valor/destinatário. As chaves financeiras não são removidas automaticamente.

Cada PIX tem dois lançamentos com operationId comum e códigos únicos. O volume administrativo exclui PIX_RECEIVED para não somar as duas pontas.

A busca do destinatário retorna `pixKeyId`. A confirmação deve incluir esse identificador, que é comparado à chave atual dentro da transação SERIALIZABLE. Uma chave excluída e recadastrada invalida a confirmação anterior, evitando enviar para um destino diferente daquele consultado. Reenvios idempotentes de operações já concluídas continuam retornando o lançamento original, mesmo após exclusão da chave.

## Dados, auditoria e erros

- Respostas de usuário selecionam explicitamente os campos permitidos; CPF e telefone mascarados.
- Somente o titular acessa extrato, comprovantes, notificações, chaves e cartão.
- PAN demonstrativo contém DEMO; CVV visual fixo 000, sem uso em pagamentos nem armazenamento.
- Logging estruturado não grava bodies, query strings, cookies, tokens, CVV ou chave PIX pesquisada.
- AuditLog registra criação de usuário/conta, autenticação, PIX, depósitos, compras, chaves, cartões, perfil e administração.
- Eventos de início/falha do PIX ficam fora da transação financeira; o evento de conclusão participa do commit.
- Erros públicos não incluem stack traces ou detalhes do Prisma.
- Dados são validados com Zod, tamanho de body limitado e campos inesperados rejeitados nas mutações.

## Limites operacionais desta versão

O rate limiter usa memória de processo. A implantação preparada usa uma instância. Antes de escalar horizontalmente, usar um store compartilhado, por exemplo Redis, e revisar o número de proxies confiáveis. Reiniciar o processo zera contadores.

Login: 10 tentativas por IP a cada 15 minutos. Cadastro: 5 por hora. Operações financeiras: 20 por minuto. Busca PIX: 15 por minuto. Limite geral: 180 por minuto.

Recuperação por e-mail, MFA, verificação de titularidade e conciliação externa não estão implementadas. Trocar telefone remove atomicamente a chave PHONE anterior. E-mail/CPF são imutáveis na interface.

TLS é terminado pela Vercel/Render e a conexão Neon deve usar TLS. Nunca use as credenciais locais do Docker em produção. O PostgreSQL embutido é apenas ferramenta local de desenvolvimento.

## Testes de falha

A suíte de integração usa exclusivamente o banco cesda_test e recusa outro nome. Ela limpa esse banco antes de cada caso. O hook de falha do serviço é injeção de teste interna, nunca exposta por rota HTTP.

Há testes de rollback após débito, saldo insuficiente, conta/chave inexistente, conta bloqueada, limite diário, auto transferência, concorrência e idempotência, além de cookies, autorização, refresh e logout.

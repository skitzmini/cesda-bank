# Ponto de retomada — Cesda Bank

## Estado verificado em 22/09/2026

Os módulos de cadastro, autenticação, conta, depósito fictício, PIX, extrato,
comprovante, gráficos, cartão, compra simulada, perfil, notificações e administração
estão implementados. Há migrations, seed, documentação OpenAPI, configuração de
CI e instruções de deploy. A pasta recebida não contém histórico `.git`.

## Última alteração

A confirmação de PIX agora exige o `pixKeyId` retornado pela busca. O serviço
financeiro compara esse identificador à chave atual dentro da transação. Excluir
e cadastrar novamente uma chave invalida a confirmação antiga, inclusive quando
outra conta passa a usar aquela chave. O frontend solicita uma nova consulta.

Reenvios com a mesma chave de idempotência continuam retornando o lançamento
original depois de um PIX concluído, mesmo que a chave PIX seja removida.
Os contratos do Swagger e o exemplo do README acompanham essa alteração.

## Verificações executadas

- `npm.cmd run lint`: passou.
- `npm.cmd run typecheck`: passou.
- `npm.cmd test`: 45 testes passaram, com PostgreSQL real no banco `cesda_test`.
- `npm.cmd run build`: frontend e backend passaram.
- `npm.cmd run test:e2e`: quatro cenários passaram, incluindo PIX, compra,
  administração e responsividade entre 360 e 1440 pixels.
- `node scripts/a11y-audit.mjs`: nenhuma violação automatizada nas dez páginas
  verificadas, usando o build do frontend. Isso não substitui revisão manual.
- `npm.cmd run format:check`: passou.

O PostgreSQL estava desligado na retomada. Os testes passaram após iniciar
`db:local` e executar `db:prepare-test`. O banco demonstrativo foi preservado;
os cenários de navegador adicionaram operações fictícias, conforme o README.
Executar várias suítes de navegador seguidas pode atingir o limite de 180
requisições por minuto; aguarde a janela antes de repetir a auditoria.

## Próxima etapa externa

Versionar o projeto e configurar Neon, Render e Vercel seguindo `DEPLOY.md`.
Nenhum deploy externo foi realizado nesta retomada. Validar HTTPS, cookies,
origem autorizada e migrations no ambiente publicado antes de divulgar a URL.

Recuperação de senha por e-mail e MFA continuam fora desta versão. O rate limiter
usa memória de uma única instância. Essas limitações estão em `SECURITY.md`.

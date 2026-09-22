import {
  requestSchemas,
  bodies,
  paginationParameters,
  statementParameters,
} from './openapi.schemas.js';
const endpoints = [
  ['post', '/auth/register', 'Criar usuário e conta'],
  ['post', '/auth/login', 'Iniciar sessão'],
  ['post', '/auth/refresh', 'Rotacionar refresh token'],
  ['post', '/auth/logout', 'Revogar sessão'],
  ['get', '/auth/me', 'Usuário autenticado'],
  ['get', '/account', 'Dados da conta'],
  ['get', '/account/balance', 'Saldo em centavos'],
  ['post', '/account/demo-deposit', 'Adicionar saldo fictício'],
  ['get', '/pix/keys', 'Listar chaves'],
  ['post', '/pix/keys', 'Cadastrar chave própria'],
  ['delete', '/pix/keys/{id}', 'Excluir chave'],
  ['get', '/pix/search/{key}', 'Consultar destinatário'],
  ['post', '/pix/transfer', 'Transferir PIX fictício'],
  ['get', '/transactions', 'Extrato paginado'],
  ['get', '/transactions/{id}', 'Comprovante'],
  ['patch', '/transactions/{id}/category', 'Categorizar transação'],
  ['get', '/dashboard/summary', 'Resumo mensal'],
  ['get', '/dashboard/monthly', 'Evolução financeira'],
  ['get', '/dashboard/categories', 'Gastos por categoria'],
  ['get', '/cards', 'Cartões fictícios'],
  ['post', '/cards', 'Gerar cartão'],
  ['patch', '/cards/{id}/block', 'Bloquear cartão'],
  ['patch', '/cards/{id}/unblock', 'Desbloquear cartão'],
  ['post', '/purchases/simulate', 'Compra fictícia'],
  ['get', '/notifications', 'Notificações paginadas'],
  ['patch', '/notifications/read-all', 'Marcar todas como lidas'],
  ['patch', '/notifications/{id}/read', 'Marcar como lida'],
  ['get', '/profile', 'Perfil mascarado'],
  ['patch', '/profile', 'Atualizar nome e telefone'],
  ['get', '/admin/summary', 'Indicadores administrativos'],
  ['get', '/admin/users', 'Usuários'],
  ['get', '/admin/accounts', 'Contas'],
  ['get', '/admin/transactions', 'Transações'],
  ['get', '/admin/audit', 'Auditoria'],
  ['patch', '/admin/accounts/{id}/status', 'Bloquear ou desbloquear conta'],
];
export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Cesda Bank API',
    version: '1.0.0',
    description:
      'Banco fictício. Todos os valores estão em centavos. Para mutações, enviar Origin autorizado e X-Cesda-Client: web. A sessão usa cookies HTTP-only via proxy de mesma origem.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'cesda_access' },
    },
  },
  paths: endpoints.reduce<Record<string, Record<string, unknown>>>(
    (paths, [method, path, summary]) => {
      const financial = [
        '/pix/transfer',
        '/account/demo-deposit',
        '/purchases/simulate',
      ].includes(path);
      const parameters: Array<Record<string, unknown>> = [
        ...Array.from(path.matchAll(/\{(\w+)\}/g)).map((m) => ({
          name: m[1],
          in: 'path',
          required: true,
          schema: { type: 'string' },
        })),
      ];
      if (financial)
        parameters.push({
          name: 'Idempotency-Key',
          in: 'header',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        });
      if (method !== 'get')
        parameters.push({
          name: 'X-Cesda-Client',
          in: 'header',
          required: true,
          schema: { type: 'string', enum: ['web'] },
        });
      paths[path] ??= {};
      paths[path][method] = {
        summary,
        tags: [path.split('/')[1]],
        security:
          path.startsWith('/auth/') && path !== '/auth/me'
            ? []
            : [{ cookieAuth: [] }],
        parameters,
        responses: {
          '200': { description: 'Sucesso: { success: true, data: ... }' },
          '201': { description: 'Criado' },
          '204': { description: 'Sem conteúdo' },
          '401': { description: 'Sessão inválida' },
          '403': { description: 'Acesso negado' },
          '404': { description: 'Não encontrado' },
          '409': { description: 'Conflito' },
          '422': { description: 'Dados inválidos ou regra financeira' },
          '429': { description: 'Limite de solicitações' },
          '500': { description: 'Erro interno' },
        },
      };
      return paths;
    },
    {},
  ),
};

openapi.openapi = '3.1.0';
Object.assign(openapi.components, { schemas: requestSchemas });
const pixSearch = openapi.paths['/pix/search/{key}'].get as {
  responses: Record<string, unknown>;
};
pixSearch.responses['200'] = {
  description: 'Destinatário e referência obrigatória para confirmar o PIX.',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { const: true },
          data: {
            type: 'object',
            required: ['pixKeyId', 'name', 'institution'],
            properties: {
              pixKeyId: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              institution: { type: 'string', const: 'Cesda Bank' },
            },
          },
        },
      },
    },
  },
};
for (const [path, [method, schema]] of Object.entries(bodies)) {
  const operation = openapi.paths[path][method] as Record<string, unknown>;
  operation.requestBody = {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/' + schema },
      },
    },
  };
}
for (const path of [
  '/transactions',
  '/notifications',
  '/admin/users',
  '/admin/accounts',
  '/admin/transactions',
  '/admin/audit',
]) {
  const operation = openapi.paths[path].get as { parameters: unknown[] };
  operation.parameters.push(
    ...paginationParameters,
    ...(path === '/transactions' ? statementParameters : []),
  );
}

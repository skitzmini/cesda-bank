import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
const env = readFileSync('backend/.env', 'utf8');
const password = env.match(/^SEED_PASSWORD=(.+)$/m)![1].trim();
test('experiência desktop: login, depósito, PIX, comprovante, compra e perfil', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/login');
  await page
    .getByLabel('E-mail', { exact: true })
    .fill('enrico@cesdabank.local');
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL('/dashboard');
  await expect(
    page.getByText('Saldo disponível', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.balance-value')).not.toHaveText('R$ ••••••');
  await page.getByText('Últimas movimentações', { exact: true }).waitFor();
  mkdirSync('docs/screenshots', { recursive: true });
  await page.screenshot({
    path: 'docs/screenshots/dashboard-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Depositar', exact: true }).click();
  await page.getByRole('button', { name: 'R$ 100', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar saldo fictício' }).click();
  await expect(
    page.getByRole('heading', { name: 'Saldo fictício adicionado' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.goto('/pix');
  await page
    .getByLabel('Chave PIX do destinatário')
    .fill('lucas@cesdabank.local');
  await page.getByRole('button', { name: 'Encontrar destinatário' }).click();
  await expect(page.getByText('Lucas Almeida', { exact: true })).toBeVisible();
  await page.getByLabel('Valor (R$)', { exact: true }).fill('30,00');
  await page.getByRole('button', { name: 'Revisar PIX' }).click();
  await page.getByRole('button', { name: 'Confirmar PIX' }).click();
  await expect(
    page.getByRole('heading', { name: 'PIX enviado com sucesso' }),
  ).toBeVisible();
  await expect(page.getByText('R$ 30,00', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'docs/screenshots/comprovante.png',
    fullPage: true,
  });
  await page.goto('/cartoes');
  await page
    .getByRole('button', { name: 'Bloquear cartão', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Simular compra' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Desbloquear', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Simular compra' }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Simular compra' }).click();
  await page.getByLabel('Estabelecimento fictício').fill('Café da Praça');
  await page.getByLabel('Valor (R$)', { exact: true }).fill('12,50');
  await page
    .getByLabel('Categoria', { exact: true })
    .selectOption('ALIMENTACAO');
  await page.getByRole('button', { name: 'Revisar compra' }).click();
  await page.getByRole('button', { name: 'Confirmar compra' }).click();
  await expect(
    page.getByRole('heading', { name: 'Compra simulada com sucesso' }),
  ).toBeVisible();
  await page.goto('/extrato');
  await page.getByRole('button', { name: 'Compras', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: 'Café da Praça Compra simulada' }).first(),
  ).toBeVisible();
  await page.goto('/perfil');
  await expect(page.getByLabel('CPF fictício', { exact: true })).toHaveValue(
    '***.000.***-**',
  );
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: 'Acesso restrito.' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('desktop, tablet e celular: navegação e ausência de overflow', async ({
  page,
}) => {
  await page.goto('/login');
  await page
    .getByLabel('E-mail', { exact: true })
    .fill('enrico@cesdabank.local');
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL('/dashboard');
  for (const width of [1440, 1024, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/dashboard');
    await page.getByText('Últimas movimentações', { exact: true }).waitFor();
    await expect(page.locator('.balance-value')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      'viewport ' + width,
    ).toBe(true);
    if (width === 390) {
      await page.screenshot({
        path: 'docs/screenshots/dashboard-mobile.png',
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      await page
        .getByRole('link', { name: 'Meus cartões', exact: true })
        .click();
      await expect(page).toHaveURL('/cartoes');
    }
  }
});
test('admin: visualização e bloqueio auditável', async ({ page }) => {
  await page.goto('/login');
  await page
    .getByLabel('E-mail', { exact: true })
    .fill('admin@cesdabank.local');
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL('/dashboard');
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Contas', exact: true }).click();
  const row = page.getByRole('row').filter({
    has: page.getByRole('cell', { name: 'Marina Costa', exact: true }),
  });
  await row.getByRole('button', { name: 'Bloquear', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar alteração' }).click();
  await expect(
    row.getByRole('button', { name: 'Desbloquear', exact: true }),
  ).toBeVisible();
  await row.getByRole('button', { name: 'Desbloquear', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar alteração' }).click();
  await expect(
    row.getByRole('button', { name: 'Bloquear', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Auditoria', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: 'ACCOUNT_UNBLOCKED', exact: true }).first(),
  ).toBeVisible();
});
test('home pública e cadastro responsivos', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Seu dinheiro. Seu controle.' }),
  ).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/home.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/cadastro');
  await expect(
    page.getByRole('heading', { name: 'Abra sua conta Cesda.' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  await expect(page.getByText('Informe seu nome completo.')).toBeVisible();
});

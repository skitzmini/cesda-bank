import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const password = readFileSync('backend/.env', 'utf8')
  .match(/^SEED_PASSWORD=(.+)$/m)[1]
  .trim();
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const results = [];
for (const path of ['/', '/login', '/cadastro']) {
  await page.goto('http://localhost:3000' + path);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  results.push({
    path,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  });
}
await page.goto('http://localhost:3000/login');
await page.getByLabel('E-mail', { exact: true }).fill('enrico@cesdabank.local');
await page.getByLabel('Senha', { exact: true }).fill(password);
await page.getByRole('button', { name: 'Entrar', exact: true }).click();
await page.waitForURL('**/dashboard');
for (const path of [
  '/dashboard',
  '/pix',
  '/cartoes',
  '/extrato',
  '/financas',
  '/perfil',
  '/notificacoes',
]) {
  await page.goto('http://localhost:3000' + path);
  await page.waitForSelector('.main-content');
  await page.waitForLoadState('networkidle');
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  results.push({
    path,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  });
}
writeFileSync('.local/a11y.json', JSON.stringify(results, null, 2));
console.log(
  JSON.stringify(
    results.map((r) => ({
      path: r.path,
      issues: r.violations.map((v) => ({ id: v.id, count: v.nodes.length })),
    })),
    null,
    2,
  ),
);
await browser.close();

if (results.some((r) => r.violations.length)) process.exitCode = 1;

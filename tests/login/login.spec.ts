import { chromium, test } from '@playwright/test';

test('login', async ({ }) => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://qacademico.ifce.edu.br/qacademico/index.asp?t=1001');
  await page.locator('#txtLogin').fill('20181135000167');
  await page.locator('#txtSenha').fill('ernesto9865');
  await page.getByRole('button', { name: 'OK' }).click();
  await page.getByText('Horário Individual').click();

  await context.storageState({ path: 'state.json' });
  await browser.close();

});

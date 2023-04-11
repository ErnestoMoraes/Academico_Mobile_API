import { chromium, test } from '@playwright/test';

//* Avaliações - Quase feito
test('Avaliações', async ({ }) => {
    const fs = require('fs');
    const cheerio = require('cheerio');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: 'state.json' });
    const page = await context.newPage();

    await page.goto('https://qacademico.ifce.edu.br/webapp/diarios');
    await page.waitForLoadState('networkidle');
    await page.selectOption('select.select', { label: '2019/1' });
    await page.waitForTimeout(1000);
    await page.click('div[class="panel diarios-aluno__disciplina__container nga-fast nga-slide-left"]');
    await page.waitForTimeout(1000);
    await page.click('div[ng-class="{\'tab-active\': diario._pagina===\'avaliacoes\'}"]');
    await page.waitForTimeout(1000);
    const html = await page.content();
    fs.writeFileSync('teste.html', html);

});

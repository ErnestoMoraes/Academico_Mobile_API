import { chromium, test } from '@playwright/test';

test('Lista de disciplinas de um semestre especifico', async ({ }) => {
    const fs = require('fs');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: 'state.json' });
    const page = await context.newPage();

    await page.goto('https://qacademico.ifce.edu.br/webapp/diarios').then(async () => {
        await page.waitForLoadState('networkidle');
        await page.selectOption('select.select', { label: '2020/2' });
        await page.waitForTimeout(1000);
        const html = await page.content();
        fs.writeFile('select_diario.html', html, (err: any) => {
            if (err) throw err;
            console.log('Arquivo salvo!');
        });
    });
    page.close();
});



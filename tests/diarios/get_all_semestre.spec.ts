import { chromium, test } from '@playwright/test';

//* Pegar todos os anos letivos e semestre - Feito!
test('Pegar todos os anos letivos e semestre', async ({ }) => {
    const fs = require('fs');
    const cheerio = require('cheerio');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: 'state.json' });
    const page = await context.newPage();

    await page.goto('https://qacademico.ifce.edu.br/webapp/diarios').then(async () => {
        await page.waitForLoadState('networkidle');
        const html = await page.content();
        const $ = cheerio.load(html);
        const select = $('select[class="select ng-pristine ng-untouched ng-valid ng-empty"]');
        const options = select.find('option');
        const optionList: string[] = [];
        options.each((i, el) => {
            optionList.push($(el).text());
            console.log($(el).text());
        });
        fs.writeFile('lista_ano_semestre.json', JSON.stringify(optionList), (err: any) => {
            if (err) throw err;
            console.log('Arquivo salvo!');
        });
    });
    page.close();
});
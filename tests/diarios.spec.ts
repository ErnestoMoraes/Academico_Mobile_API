import { chromium, test } from '@playwright/test';

test('diarios semestres', async ({ }) => {
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
            optionList.push($(el).text()); // adiciona o texto do option à lista
            console.log($(el).text());
        });
    });

    page.close();
});

test('diarios disciplina', async ({ }) => {
    const fs = require('fs');
    const cheerio = require('cheerio');

    type DisciplinaDados = {
        nomeDisciplina: string;
        numeroDisciplina: string;
        professorDisciplina: string;
    }

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: 'state.json' });
    const page = await context.newPage();

    await page.goto('https://qacademico.ifce.edu.br/webapp/diarios').then(async () => {
        await page.waitForLoadState('networkidle');
        const html = await page.content();
        const $ = cheerio.load(html);
        const select = $('div[class="panel diarios-aluno__disciplina__container nga-fast nga-slide-left"]'); //container das disciplinas
        const disciplinas = select.find('div[class="diarios-aluno__disciplina__content"]'); //disciplina
        const dados = $(disciplinas).find('div:nth-child(1)');
        const dadosdisciplina: DisciplinaDados[] = [];
        dadosdisciplina.push({
            nomeDisciplina: dados.find('div:nth-child(1)').html(),
            numeroDisciplina: dados.find('div:nth-child(2)').html(),
            professorDisciplina: dados.find('div:nth-child(3)').html()
        });
    });
    page.close();
});

test('lista de disciplina', async ({ }) => {
    const fs = require('fs');
    const cheerio = require('cheerio');

    type DisciplinaDados = {
        nomeDisciplina: string;
        numeroDisciplina: string;
        professorDisciplina: string;
    }

    const listadisciplinas: DisciplinaDados[] = [];

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: 'state.json' });
    const page = await context.newPage();

    await page.goto('https://qacademico.ifce.edu.br/webapp/diarios').then(async () => {
        await page.waitForLoadState('networkidle');
        await page.selectOption('select.select', { label: '2020/2' });
        await page.waitForTimeout(1000);
        const html = await page.content();
        fs.writeFile('listadisciplinas.html', html, (err: any) => {
            if (err) throw err;
            console.log('Arquivo salvo!');
        });
    });
    page.close();
});

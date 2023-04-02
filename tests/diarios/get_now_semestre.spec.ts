import { chromium, test } from '@playwright/test';

test('Pegar diário atual', async ({ }) => {
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
        fs.writeFile('semestre_atual.json', JSON.stringify(dadosdisciplina), (err: any) => {
            if (err) throw err;
            console.log('Arquivo salvo!');
        });
    });
    page.close();
});
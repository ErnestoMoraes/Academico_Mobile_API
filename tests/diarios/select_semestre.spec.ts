import { chromium, test } from '@playwright/test';


//* Listar disciplinas de um semestre especifico - Quase feito
test('Lista de disciplinas de um semestre especifico', async ({ }) => {
    const fs = require('fs');
    const cheerio = require('cheerio');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: 'state.json' });
    const page = await context.newPage();

    type DisciplinaDados = {
        nomeDisciplina: string;
        numeroDisciplina: string;
        professorDisciplina: string;
    }

    await page.goto('https://qacademico.ifce.edu.br/webapp/diarios').then(async () => {
        await page.waitForLoadState('networkidle');
        await page.selectOption('select.select', { label: '2019/1' });
        await page.waitForTimeout(1000);
        const html = await page.content();
        const $ = cheerio.load(html);
        const divsComClasse = $('div.panel.diarios-aluno__disciplina__container.nga-fast.nga-slide-left');
        const dadosdisciplina: DisciplinaDados[] = [];
        divsComClasse.each((i, el) => {
            const divContent = $(el).find('div.diarios-aluno__disciplina__content');
            const Disciplina = divContent.find('div');
            dadosdisciplina.push({
                nomeDisciplina: Disciplina.find('div:nth-child(1)').html(),
                numeroDisciplina: Disciplina.find('div:nth-child(2)').html(),
                professorDisciplina: Disciplina.find('div:nth-child(3)').html()
            });
        });
        for (let i = 0; i < dadosdisciplina.length; i++) {
            console.log(dadosdisciplina[i].numeroDisciplina);
        }

    });
    page.close();
});




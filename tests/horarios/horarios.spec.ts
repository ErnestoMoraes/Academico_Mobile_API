import { chromium, test } from '@playwright/test';

test('horarios', async ({ }) => {
    const cheerio = require('cheerio');
    const fs = require('fs');

    type Aula = {
        horario: string;
        disciplinas: Array<string>;
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: 'state.json' });
    const page = await context.newPage();

    await page.goto('https://qacademico.ifce.edu.br/qacademico/index.asp?t=2010').then(async () => {
        page.waitForSelector('body');
        const html = await page.content();
        const $ = cheerio.load(html);
        const tabela = $('body > table > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(2) > td:nth-child(2) > table:nth-child(5)').html();
        const aulas = Array<Aula>();
        if (tabela) {
            const linhas = $(tabela).find('tr');
            linhas.each((i, e) => {
                if (i > 0) {
                    const colunas = $(e).find('td');
                    colunas.each((j, f) => {
                        if (j == 0) {
                            const horario = $(f).find('font').text()
                            aulas.push({ horario: horario, disciplinas: [] });
                        } else {
                            const disciplina = $(f).find('font');
                            aulas[i - 1].disciplinas.push(disciplina.text().trim());
                        }
                    })
                }
            });

            fs.writeFile('horarios.json', JSON.stringify(aulas), (err: any) => {
                if (err) throw err;
                console.log('Arquivo salvo!');
            });
        }
    }).catch((err: any) => {
        fs.writeFile('horarios.json', JSON.stringify([]), (err: any) => {
            if (err) throw err;
            console.log('Arquivo vázio!');
        });
    });
});


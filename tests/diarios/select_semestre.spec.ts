import { chromium, test } from '@playwright/test';


//* Listar disciplinas de um semestre especifico - Quase feito
test('Lista de disciplinas de um semestre especifico', async ({ }) => {
    const fs = require('fs');
    const cheerio = require('cheerio');

    const browser = await chromium.launch({ headless: true });
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
        await page.waitForLoadState('networkidle');
        const html = await page.content();
        const $ = cheerio.load(html);
        const divsComClasse = $('div.panel.diarios-aluno__disciplina__container.nga-fast.nga-slide-left');
        const dadosdisciplina: DisciplinaDados[] = [];
        await divsComClasse.each(async (i, el) => {

            //! FEITO
            const divContent = $(el).find('div.diarios-aluno__disciplina__content');
            const Disciplina = divContent.find('div');
            dadosdisciplina.push({
                nomeDisciplina: Disciplina.find('div:nth-child(1)').html(),
                numeroDisciplina: Disciplina.find('div:nth-child(2)').html(),
                professorDisciplina: Disciplina.find('div:nth-child(3)').html()
            });

            const corpo = $(el).find('div.collapse').find('div:nth-child(1)').find('div:nth-child(2)').find('div');

            const divAulas = $(el).find('[ng-class="{\'tab-active\': diario._pagina===\'aulas\'}"]');
            console.log(divAulas);

            //! FEITO
            const cargaHoraria = $(corpo).find('div[class="margin-bottom-1 small"]');
            cargaHoraria.each((i, el) => {
                const dados = $(el).find('strong').first().html();
            });

            //! FEITO
            const faltas = $(corpo).find('div[class="margin-bottom-2"]');
            faltas.each((i, el) => {
                const dados = $(el).find('div').first().html();
            });

            //! FEITO
            const porcentagens = $(corpo).find('div[class="gridlex-4_xs-1 gridlex-equalHeight"]');

            const horas = $(porcentagens).find('div:nth-child(1)');
            const horasnecessarias = $(horas).find('div').find('div').find('div:nth-child(2)').find('strong').html();

            const presenca = $(porcentagens).find('div:nth-child(2)');
            const presencas = $(presenca).find('div').find('div').find('div:nth-child(2)').html();

            const ausencia = $(porcentagens).find('div:nth-child(3)');
            const ausencias = $(ausencia).find('div').find('div').find('div:nth-child(2)').html();

            const pendente = $(porcentagens).find('div:nth-child(4)');
            const pendentes = $(pendente).find('div').find('div').find('div:nth-child(2)').html();

            if (!page.isClosed()) {
                const notasElementos = await page.$$('div[ng-class="$ctrl.classeBoxNota(resumo)"]');
                const notas = await Promise.all(notasElementos.map(async elemento => {
                    const nota = await elemento.textContent() ?? "";
                    return nota;
                }));
                console.log(notas);
            } else {
                console.log('A página já foi fechada');
            }


            // const notasElementos = document.querySelectorAll('[ng-class="$ctrl.classeBoxNota(resumo)"]');
            // const notas: string[] = [];
            // notasElementos.forEach(elemento => {
            //     const nota = elemento.textContent ?? "";
            //     notas.push(nota);
            // });
            // console.log(notas);



        });
    });
    await page.close();
});

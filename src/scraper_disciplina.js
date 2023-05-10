const cheerio = require('cheerio');

async function scrapeDisciplinas(semestres, page) {
    const semestresDisciplinas = []; // Armazena todos os semestres e suas disciplinas

    for (const semestre of semestres) {
        await page.goto('https://qacademico.ifce.edu.br/webapp/diarios');
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('select[ng-model="$ctrl.periodoSelecionado"]');
        await page.selectOption('select[ng-model="$ctrl.periodoSelecionado"]', semestre);
        await page.waitForTimeout(1000);
        await page.waitForSelector('div.diarios-aluno__disciplina__content');

        const divs = await page.$$('div.diarios-aluno__disciplina__content');
        for (const div of divs) {
            await div.click();
            await page.waitForTimeout(500);
            await page.waitForLoadState('networkidle');
        }

        await page.waitForSelector('div.tab-header[ng-class*=avaliacoes]');

        async function waitForElementsWithDelay(selector, delay) {
            while (true) {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    return elements;
                }
                await page.waitForTimeout(delay);
            }
        }

        const selector = 'div.tab-header[ng-class*=avaliacoes]';
        const delay = 2000; // Atraso de 2 segundos

        const aulasDivs = await waitForElementsWithDelay(selector, delay);

        for (const div of aulasDivs) {
            await div.click();
            await page.waitForTimeout(500);
            await page.waitForLoadState('networkidle');
        }

        const html = await page.content();
        const $ = cheerio.load(html);

        const divsComClasse = $('div.panel.diarios-aluno__disciplina__container.nga-fast.nga-slide-left');

        const disciplinas = [];
        await divsComClasse.each((i, el) => {
            const divContent = $(el).find('div.diarios-aluno__disciplina__content');


            const Disciplina = divContent.find('div');

            const body = $(el).find('div.collapse').find('div:nth-child(1)').find('div:nth-child(2)').find('div');

            const horarioHTML = $(body).find('div[class="margin-bottom-1 small"]');
            const cargaHoraHTML = horarioHTML.find('strong').html();
            const cargaHoraria = cargaHoraHTML.match(/\d+/)[0];

            const faltasHTML = $(body).find('div[class="margin-bottom-2"]');
            const cargaFaltaHTML = faltasHTML.find('div').html();
            const cargaFaltas = cargaFaltaHTML.match(/\d+/)[0];

            const porcentagens = $(body).find('div[class="gridlex-4_xs-1 gridlex-equalHeight"]');

            const horas = $(porcentagens).find('div:nth-child(1)');
            const horasNecessarias = $(horas).find('div').find('div').find('div:nth-child(2)').find('strong').html();

            const presenca = $(porcentagens).find('div:nth-child(2)');
            const presencas = $(presenca).find('div').find('div').find('div:nth-child(2)').html();
            const $2 = cheerio.load(presencas);
            const presencaHora = $2('strong').first().text().trim();
            const presencaPorcent = $2('strong').last().text().trim().replace('%', '');
            const presencaLista = [
                presencaHora,
                presencaPorcent
            ];

            const ausencia = $(porcentagens).find('div:nth-child(3)');
            const ausencias = $(ausencia).find('div').find('div').find('div:nth-child(2)').html();
            const $3 = cheerio.load(ausencias);
            const ausenciaHora = $3('strong').first().text().trim();
            const ausenciaPorcent = $3('strong').last().text().trim().replace('%', '');;
            const ausenciaLista = [
                ausenciaHora,
                ausenciaPorcent
            ];

            const pendente = $(porcentagens).find('div:nth-child(4)');
            const pendentes = $(pendente).find('div').find('div').find('div:nth-child(2)').html();
            const $4 = cheerio.load(pendentes);
            const pendenteHora = $4('strong').first().text().trim();
            const pendentePorcent = $4('strong').last().text().trim();
            const [, porcentagem] = pendentePorcent.match(/\((\d+\,\d+)%\)/);
            const pendenteLista = [
                pendenteHora,
                porcentagem
            ];

            const divAvaliacoes = $(el).find('div[ng-show="diario._etapasAvaliacoes && diario._etapasAvaliacoes.length !== 0"]').html();
            const $5 = cheerio.load(divAvaliacoes);
            const notasLista = [];
            $5('.flex.column.items-center').each((i, el) => {
                const nota = $5(el).children().eq(0).text().trim();
                notasLista.push(nota);
            });

            const disciplina = {
                id: Disciplina.find('div:nth-child(1)').html(),
                nome: Disciplina.find('div:nth-child(2)').html(),
                professor: Disciplina.find('div:nth-child(3)').html(),
                resumo: {
                    carga_horaria: cargaHoraria,
                    faltas: cargaFaltas,
                    aulas_futuras: horasNecessarias,
                    presencas: presencaLista,
                    ausencias: ausenciaLista,
                    pendentes: pendenteLista
                },
                avaliacoes: notasLista
            };
            disciplinas.push(disciplina);
        });

        semestresDisciplinas.push({
            semestre: semestre,
            disciplinas: disciplinas
        });
    }

    return semestresDisciplinas;
}

module.exports = { scrapeDisciplinas };

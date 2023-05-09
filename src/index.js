const express = require('express');
const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');
const scraper_disciplinas = require('./scraper_disciplina');
const find_all_semestres = require('./find_all_semestres');

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/login', async (req, res) => {
    const { matricula, password } = req.body;
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        await page.goto('https://qacademico.ifce.edu.br/qacademico/index.asp?t=1001');
        await page.fill('#txtLogin', matricula);
        await page.fill('#txtSenha', password);
        await page.click('#btnOk');

        await page.waitForURL("https://qacademico.ifce.edu.br/qacademico/index.asp?t=2000", { waitUntil: 'domcontentloaded', timeout: 10000 });

        const state = await context.storageState({ path: 'state.json' });
        const access_token = state.cookies[0].value;

        const beartoken = 'Bearer ' + access_token;
        console.log('Login - Sucesso');
        res.status(200).send({ 'access_token': beartoken });
        await page.close();
    } catch (error) {
        console.log(error);
        res.status(403).send('Erro ao realizar login!');
        await page.close();
    }
});

app.get('/homepage', async (req, res) => {
    try {
        console.log('Login - Sucesso');
        res.status(200).send([
            {
                "id": 1,
                "name": "Cronograma",
                "image": "assets/images/images_cards/report-card.png",
                "url": "/schedule"
            },
            {
                "id": 2,
                "name": "Diários",
                "image": "assets/images/images_cards/schedule.png",
                "url": "/daily"
            }
        ]);
    } catch (error) {
        console.log(error);
        res.status(500).send('Erro ao realizar login!');
    }
});

app.get('/horarios', async (req, res) => {
    try {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ storageState: 'state.json' });
        const page = await context.newPage();

        await page.goto('https://qacademico.ifce.edu.br/qacademico/index.asp?t=2010');
        await page.waitForSelector('body');
        const html = await page.content();
        const $ = cheerio.load(html);
        const tabela = $('body > table > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(2) > td:nth-child(2) > table:nth-child(5)').html();
        const aulas = [];
        if (tabela) {
            const linhas = $(tabela).find('tr');
            linhas.each((i, e) => {
                if (i > 0) {
                    const colunas = $(e).find('td');
                    colunas.each((j, f) => {
                        if (j === 0) {
                            const horario = $(f).find('font').text();
                            aulas.push({ horario: horario, disciplinas: [] });
                        } else {
                            const disciplina = $(f).find('font');
                            if (disciplina.text().trim() !== '') {
                                const titulo1 = disciplina.children().eq(0).attr('title');
                                const titulo2 = disciplina.children().eq(2).attr('title');
                                const texto3 = disciplina.children().eq(4).text().trim();
                                aulas[i - 1].disciplinas.push(titulo1 + ' / ' + titulo2 + ' / ' + texto3);
                            } else {
                                aulas[i - 1].disciplinas.push('');
                            }
                        }
                    });
                }
            });

            const diasDaSemana = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            const horariosPorDia = {};

            for (const dia of diasDaSemana) {
                horariosPorDia[dia] = {
                    id: diasDaSemana.indexOf(dia),
                    dia: dia,
                    horarios: []
                };
            }

            // Adiciona as disciplinas a cada dia da semana
            for (const item of aulas) {
                const horario = item.horario;
                const disciplinas = item.disciplinas;

                // Adiciona um item no início do array disciplinas - Sunday
                disciplinas.unshift("");

                // Adiciona um item no final do array disciplinas - Saturday
                disciplinas.push("");


                // Separa as horas iniciais e finais
                const [horaInicial, horaFinal] = horario.split("~");


                // Adiciona as disciplinas ao horário correspondente em cada dia da semana
                for (let i = 0; i < disciplinas.length; i++) {

                    const disciplina = disciplinas[i];

                    if (disciplina !== "") {
                        const dia = diasDaSemana[i];

                        const [disciplinaNome, sala, turma] = disciplina.split(" / ");

                        horariosPorDia[dia].horarios.push({
                            id: horariosPorDia[dia].horarios.length + 1,
                            horario: `${horaInicial} | ${horaFinal}`,
                            disciplina: disciplinaNome,
                            professor: "",
                            turma: turma,
                            sala: sala
                        });
                    }
                }
            }

            const horariosPorDiaArray = Object.values(horariosPorDia);

            res.status(200).send(JSON.stringify(horariosPorDiaArray));
            page.close();

        } else {
            fs.writeFile('horarios.json', JSON.stringify([]), (err) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error saving file');
                } else {
                    console.log('Arquivo vazio!');
                    res.status(500).send('Empty file created successfully');
                }
                page.close();
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('Erro!');
    }
});



app.get('/diario-atual', async (req, res) => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: 'state.json' });
    const page = await context.newPage();
    try {
        await page.goto('https://qacademico.ifce.edu.br/webapp/diarios').then(async () => {
            await page.waitForLoadState('networkidle', { timeout: 5000 });
            await page.waitForTimeout(500);
            await page.waitForLoadState('networkidle');
        });

        const divs = await page.$$('div.diarios-aluno__disciplina__content');
        for (const div of divs) {
            await div.click();
            await page.waitForTimeout(500);
            await page.waitForLoadState('networkidle');
        }

        const aulasDiv = await page.waitForSelector('div.tab-header[ng-class*=avaliacoes]');
        await aulasDiv.waitForElementState('stable');
        const aulasDivs = await page.$$('div.tab-header[ng-class*=avaliacoes]');
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
                console.log('nota', nota);
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

        console.log('Disciplinas Semestre Atual - Enviado');
        res.status(200).send({
            semestre: "",
            disciplinas: disciplinas
        });
        await page.close();
    } catch (error) {
        console.error(error);
        res.status(500).send('Error scraping data');
        await page.close();
    }
});

app.get('/lista-ano-semestre', async (req, res) => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: 'state.json' });
    const page = await context.newPage();
    try {
        const listaDeAnoSemestre = await find_all_semestres.findAllSemestres(page);
        console.log('Ano Semestre - Enviado');
        res.status(200).send(listaDeAnoSemestre);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error scraping data');
    } finally {
        await page.close();
    }

});

app.get('/lista-disciplinas', async (req, res) => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: 'state.json' });
    const page = await context.newPage();
    try {
        const semestres = await find_all_semestres.findAllSemestres(page);
        const listaDeDisciplinas = await scraper_disciplinas.scrapeDisciplinas(semestres, page);
        console.log('Disciplinas Semestre - Enviado');
        res.status(200).send(listaDeDisciplinas);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error scraping data');
    } finally {
        await page.close();
    }
});


app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}`);
});

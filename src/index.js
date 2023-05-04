const express = require('express');
const { chromium } = require('playwright');
const cheerio = require('cheerio');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto('https://qacademico.ifce.edu.br/qacademico/index.asp?t=1001');
        await page.fill('#txtLogin', username);
        await page.fill('#txtSenha', password);
        await page.click('#btnOk');

        await page.waitForURL("https://qacademico.ifce.edu.br/qacademico/index.asp?t=2000");

        await context.storageState({ path: 'state.json' });
        await browser.close();
        console.log('Login - Sucesso');
        res.status(200).send('Login realizado com sucesso!');
        await page.close();
    } catch (error) {
        console.log(error);
        res.status(500).send('Erro ao realizar login!');
        await page.close();
    }
});

app.get('/horarios', async (req, res) => {
    try {
        const browser = await chromium.launch({ headless: false });
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
                            aulas[i - 1].disciplinas.push(disciplina.text().trim());
                        }
                    });
                }
            });

            fs.writeFile('horarios.json', JSON.stringify(aulas), (err) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error saving file');
                    page.close();
                } else {
                    console.log('Horarios - Enviado');
                    const horarios = fs.readFileSync('horarios.json');
                    res.status(200).send(horarios);
                    page.close();
                }
            });

        } else {
            fs.writeFile('horarios.json', JSON.stringify([]), (err) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error saving file');
                    page.close();
                } else {
                    console.log('Arquivo vazio!');
                    res.send('Empty file created successfully');
                    page.close();
                }
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error scraping data');
        await page.close();
    }
});

app.get('/diario-atual', async (req, res) => {
    try {
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext({ storageState: 'state.json' });
        const page = await context.newPage();

        await page.goto('https://qacademico.ifce.edu.br/webapp/diarios');
        await page.waitForLoadState('networkidle');

        const html = await page.content();
        const $ = cheerio.load(html);

        const select = $('div[class="panel diarios-aluno__disciplina__container nga-fast nga-slide-left"]'); //container das disciplinas
        const disciplinas = select.find('div[class="diarios-aluno__disciplina__content"]'); //disciplina
        const dados = $(disciplinas).find('div:nth-child(1)');
        const dadosdisciplina = {
            nomeDisciplina: dados.find('div:nth-child(1)').html(),
            numeroDisciplina: dados.find('div:nth-child(2)').html(),
            professorDisciplina: dados.find('div:nth-child(3)').html()
        };

        fs.writeFile('semestre_atual.json', JSON.stringify(dadosdisciplina), (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error saving file');
            } else {
                console.log('Diaio Atual - Enviado');
                const semestreAtual = fs.readFileSync('semestre_atual.json');
                res.send(semestreAtual);
            }
        });

        await page.close();
    } catch (error) {
        console.error(error);
        res.status(500).send('Error scraping data');
        await page.close();
    }
});

app.get('/lista-ano-semestre', async (req, res) => {
    try {
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext({ storageState: 'state.json' });
        const page = await context.newPage();
        await page.goto('https://qacademico.ifce.edu.br/webapp/diarios');
        await page.waitForLoadState('networkidle');
        const html = await page.content();
        const $ = cheerio.load(html);
        const select = $('select[ng-model="$ctrl.periodoSelecionado"]');
        const options = select.find('option');
        const optionList = [];
        options.each((i, el) => {
            optionList.push($(el).text());
        });
        fs.writeFile('lista_ano_semestre.json', JSON.stringify(optionList), (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Erro ao salvar arquivo');
                page.close();
            } else {
                console.log('Lista de Anos e Semestres - Enviado');
                const anossemestres = fs.readFileSync('lista_ano_semestre.json');
                res.send(anossemestres);
                page.close();
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error scraping data');
        await page.close();
    }

});

app.get('/lista-disciplinas', async (req, res) => {
    const { semestre } = req.body;
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: 'state.json' });
    const page = await context.newPage();
    try {
        await page.goto('https://qacademico.ifce.edu.br/webapp/diarios').then(async () => {
            await page.waitForLoadState('networkidle', { timeout: 5000 });
            await page.selectOption('select[ng-model="$ctrl.periodoSelecionado"]', semestre);
            await page.waitForTimeout(1000);
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
            const presencaLista = {
                presencaHora,
                presencaPorcent
            }

            const ausencia = $(porcentagens).find('div:nth-child(3)');
            const ausencias = $(ausencia).find('div').find('div').find('div:nth-child(2)').html();
            const $3 = cheerio.load(ausencias);
            const ausenciaHora = $3('strong').first().text().trim();
            const ausenciaPorcent = $3('strong').last().text().trim().replace('%', '');;
            const ausenciaLista = {
                ausenciaHora,
                ausenciaPorcent
            }

            const pendente = $(porcentagens).find('div:nth-child(4)');
            const pendentes = $(pendente).find('div').find('div').find('div:nth-child(2)').html();
            const $4 = cheerio.load(pendentes);
            const pendenteHora = $4('strong').first().text().trim();
            const pendentePorcent = $4('strong').last().text().trim();
            const [, porcentagem] = pendentePorcent.match(/\((\d+\,\d+)%\)/);
            const pendenteLista = {
                pendenteHora,
                porcentagem
            }

            const disciplina = {
                id: Disciplina.find('div:nth-child(1)').html(),
                disciplina: Disciplina.find('div:nth-child(2)').html(),
                professor: Disciplina.find('div:nth-child(3)').html(),
                cargaHoraria: cargaHoraria,
                cargaFaltas: cargaFaltas,
                horasNecessarias: horasNecessarias,
                presencaLista: presencaLista,
                ausenciaLista: ausenciaLista,
                pendenteLista: pendenteLista
            };

            const divAvaliacoes = $(el).find('div[ng-show="diario._etapasAvaliacoes && diario._etapasAvaliacoes.length !== 0"]').html();
            const $5 = cheerio.load(divAvaliacoes);
            const notasLista = {};
            $5('.flex.column.items-center').each((i, el) => {
                const notas = {};
                const nota = $5(el).children().eq(0).text().trim();
                const titulo = $5(el).children().eq(1).text().trim();
                notas[titulo] = nota;
                Object.assign(notasLista, notas);
            });

            disciplina.notasLista = notasLista;
            disciplinas.push(disciplina);
        });

        console.log('Disciplinas Semestre - Enviado');
        res.status(200).send(disciplinas);
        await page.close();
    } catch (error) {
        console.error(error);
        res.status(500).send('Error scraping data');
        await page.close();
    }
});


app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}`);
});

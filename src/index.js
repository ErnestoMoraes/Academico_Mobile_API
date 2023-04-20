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
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto('https://qacademico.ifce.edu.br/qacademico/index.asp?t=1001');
        await page.fill('#txtLogin', username);
        await page.fill('#txtSenha', password);
        await page.click('#btnOk');

        // Aguarde a página carregar e retorne a resposta da sua API
        await page.waitForURL("https://qacademico.ifce.edu.br/qacademico/index.asp?t=2000");
        await context.storageState({ path: 'state.json' });
        await browser.close();
        console.log('Login realizado com sucesso!');
        res.status(200).send('Login realizado com sucesso!');
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
                            aulas[i - 1].disciplinas.push(disciplina.text().trim());
                        }
                    });
                }
            });

            fs.writeFile('horarios.json', JSON.stringify(aulas), (err) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error saving file');
                } else {
                    console.log('Arquivo Horarios Enviado!');
                    const horarios = fs.readFileSync('horarios.json');
                    res.status(200).send(horarios);
                }
            });

        } else {
            fs.writeFile('horarios.json', JSON.stringify([]), (err) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error saving file');
                } else {
                    console.log('Arquivo vazio!');
                    res.send('Empty file created successfully');
                }
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error scraping data');
    }
});

app.get('/diario-atual', async (req, res) => {
    try {
        const browser = await chromium.launch({ headless: true });
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
                console.log('Diaio Atual Enviado!');
                const semestreAtual = fs.readFileSync('semestre_atual.json');
                res.send(semestreAtual);
            }
        });

        await browser.close();
    } catch (error) {
        console.error(error);
        res.status(500).send('Error scraping data');
        await browser.close();
    }
});

app.get('/lista-ano-semestre', async (req, res) => {
    try {
        const browser = await chromium.launch({ headless: true });
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
            } else {
                console.log('Lista de Anos e Semestres Enviada!');
                const anossemestres = fs.readFileSync('lista_ano_semestre.json');
                res.send(anossemestres);
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error scraping data');
        await browser.close();
    }

});


app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}`);
});

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
                    console.log('Arquivo salvo!');
                    const horarios = fs.readFileSync('horarios.json');
                    res.send(horarios);
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

app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}`);
});

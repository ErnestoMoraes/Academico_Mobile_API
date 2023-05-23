const cheerio = require('cheerio');

async function findAllSemestres(page) {
    await page.goto('https://qacademico.ifce.edu.br/webapp/diarios');
    await page.waitForLoadState('networkidle');
    const html = await page.content();
    const $ = cheerio.load(html);

    const select = $('select[ng-model="$ctrl.periodoSelecionado"]');
    const options = select.find('option');
    const optionList = [];
    options.each((i, el) => {
        if ($(el).text() != '') {
            optionList.push($(el).text());
        }
    });
    console.log('todos os semestres: ', optionList);
    return optionList;
}

module.exports = { findAllSemestres };
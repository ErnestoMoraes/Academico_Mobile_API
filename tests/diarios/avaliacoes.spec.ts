import { chromium, test } from '@playwright/test';

//* Avaliações - Quase feito
test('Notas da avaliações', async ({ }) => {

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: 'state.json' });
    const page = await context.newPage();

    await page.goto('https://qacademico.ifce.edu.br/webapp/diarios');
    await page.waitForLoadState('networkidle');
    await page.selectOption('select.select', { label: '2019/1' });
    await page.waitForTimeout(1000);

    const gourpDivs = await page.$$('div.panel.diarios-aluno__disciplina__container.nga-fast.nga-slide-left');
    for (let botao of gourpDivs) {
        await botao.click();
        await page.waitForTimeout(100);
        const elemento = await botao.$('div[ng-class="{\'tab-active\': diario._pagina===\'avaliacoes\'}"]');
        if (elemento !== null) {
            await elemento.click();
        }
    }
    await page.waitForTimeout(100);
    const numerosAvaliacoes = await page.$$('div[ng-class="$ctrl.classeBoxNota(resumo)"]');
    const matrix: string[] = [];
    for (let i = 0; i < numerosAvaliacoes.length; i++) {
        const numero = numerosAvaliacoes[i];
        const numeroAvaliacao = await numero.textContent() ?? '';
        matrix.push(numeroAvaliacao);
    }
    const listaDeListas: string[][] = [];
    for (let i = 0; i < matrix.length; i += 5) {
        const grupoDeCinco = matrix.slice(i, i + 5);
        listaDeListas.push(grupoDeCinco);
    }
    for (let i = 0; i < listaDeListas.length; i++) {
        const lista = listaDeListas[i];
        console.log(lista);
    }
});

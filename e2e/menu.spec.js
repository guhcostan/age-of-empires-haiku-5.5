import { test, expect, openGame } from './helpers.js';

test.describe('Menu inicial', () => {
  test('mostra os botões principais e nenhum jogo em andamento', async ({ page }) => {
    await openGame(page);
    await expect(page.locator('#screen-main')).toBeVisible();
    await expect(page.locator('#btn-play')).toHaveText('Partida rápida');
    await expect(page.locator('#screen-main [data-go="help"]')).toHaveText('Como jogar');
    await expect(page.locator('#screen-main [data-go="options"]')).toHaveText('Opções');
    await expect(page.locator('#btn-continue')).toBeHidden();
    await expect(page.locator('#hud')).toBeHidden();
  });

  test('Partida rápida mostra mapa, bots e dificuldade', async ({ page }) => {
    await openGame(page);
    await page.locator('#btn-play').click();

    const setup = page.locator('#screen-setup');
    await expect(setup).toBeVisible();
    await expect(page.locator('#screen-main')).toBeHidden();

    await expect(setup.locator('legend')).toHaveText(['Tamanho do mapa', 'Adversários (bots)', 'Dificuldade', 'Semente do mapa']);
    await expect(setup.locator('input[name="size"]')).toHaveCount(3);
    await expect(setup.locator('input[name="bots"]')).toHaveCount(3);
    await expect(setup.locator('input[name="difficulty"]')).toHaveCount(3);
    await expect(page.locator('#seed')).toBeVisible();
    await expect(page.locator('#btn-start')).toHaveText('Iniciar partida');
  });

  test('Voltar no setup retorna ao menu principal', async ({ page }) => {
    await openGame(page);
    await page.locator('#btn-play').click();
    await expect(page.locator('#screen-setup')).toBeVisible();

    await page.locator('#screen-setup [data-go="main"]').click();
    await expect(page.locator('#screen-main')).toBeVisible();
    await expect(page.locator('#screen-setup')).toBeHidden();
    await expect(page.locator('#btn-play')).toBeVisible();
  });

  test('Como jogar mostra os controles e Voltar retorna', async ({ page }) => {
    await openGame(page);
    await page.locator('#screen-main [data-go="help"]').click();

    const help = page.locator('#screen-help');
    await expect(help).toBeVisible();
    await expect(help.locator('h2')).toHaveText('Como jogar');
    await expect(help.locator('h3')).toContainText(['Objetivo', 'Mouse', 'Teclado']);
    await expect(help).toContainText('Clique esquerdo');
    await expect(help).toContainText('Esc');
    await expect(help).toContainText('Ctrl + 0–9');

    await help.locator('[data-go="main"]').click();
    await expect(page.locator('#screen-main')).toBeVisible();
    await expect(help).toBeHidden();
  });

  test('Opções mostra o controle de volume', async ({ page }) => {
    await openGame(page);
    await page.locator('#screen-main [data-go="options"]').click();
    await expect(page.locator('#screen-options')).toBeVisible();
    await expect(page.locator('#volume')).toBeVisible();
    await page.locator('#screen-options [data-go="main"]').click();
    await expect(page.locator('#screen-main')).toBeVisible();
  });
});

// Ponto de entrada: liga o jogo aos menus.
import { Game } from './game.js';
import { Menus } from './ui/menus.js';

const canvas = document.getElementById('game-canvas');
let menus = null;

const game = new Game({
  canvas,
  hooks: {
    onPause: (paused) => menus?.onPause(paused),
    onEnd: (info) => menus?.onEnd(info),
    onQuit: () => menus?.onQuit(),
  },
});

menus = new Menus(game);

// Exposto para depuração e para os testes end-to-end.
window.aoe = { game, menus };

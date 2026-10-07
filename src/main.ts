// Ponto de entrada: liga o jogo aos menus.
import './styles/style.css';
import { Game } from './game.ts';
import { Menus } from './ui/menus.ts';
import { $ } from './ui/dom.ts';

declare global {
  interface Window {
    // Exposto para depuração e para os testes end-to-end.
    aoe?: { game: Game; menus: Menus };
  }
}

const canvas = $<HTMLCanvasElement>('game-canvas');
let menus: Menus | null = null;

const game = new Game({
  canvas,
  hooks: {
    onPause: (paused) => menus?.onPause(paused),
    onEnd: (info) => menus?.onEnd(info),
    onQuit: () => menus?.onQuit(),
  },
});

menus = new Menus(game);

window.aoe = { game, menus };

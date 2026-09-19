import './style.css';
import { parseText, parseFile } from './parse.js';
import { Wheel, colorFor, randomInt } from './wheel.js';
import { confetti } from './confetti.js';
import { pickWinner } from './pick.js';

const STORAGE_KEY = 'select-random:names';
const MODE_KEY = 'select-random:mode';

const MODES = {
  select: {
    hint: 'Sale un nombre al azar. Puedes quitarlo de la lista y seguir girando.',
    label: 'Resultado',
    last: 'Último resultado: ',
  },
  winner: {
    hint: 'El nombre que salga es el ganador.',
    label: '¡Ganador!',
    last: 'Ganador: ',
  },
};
const $ = (id) => document.getElementById(id);

const els = {
  input: $('names-input'),
  add: $('add'),
  file: $('file'),
  msg: $('msg'),
  list: $('list'),
  count: $('count'),
  shuffle: $('shuffle'),
  clear: $('clear'),
  removeWinner: $('remove-winner'),
  removeWinnerWrap: $('remove-winner-wrap'),
  modeRadios: document.querySelectorAll('input[name="mode"]'),
  modeHint: $('mode-hint'),
  winnerTrophy: $('winner-trophy'),
  winnerLabel: $('winner-label'),
  winnerAgain: $('winner-again'),
  spin: $('spin'),
  spinCenter: $('spin-center'),
  canvas: $('wheel'),
  lastWinner: $('last-winner'),
  dialog: $('winner-dialog'),
  winnerName: $('winner-name'),
  winnerRemove: $('winner-remove'),
  winnerClose: $('winner-close'),
  confetti: $('confetti'),
};

let names = load();
let mode = loadMode();
let pendingWinner = null;
let highlighted = null; // índice del ganador marcado en la rueda (modo ganador)
const wheel = new Wheel(els.canvas);

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function loadMode() {
  try {
    const m = localStorage.getItem(MODE_KEY);
    return m in MODES ? m : 'select';
  } catch {
    return 'select';
  }
}

function setMode(m) {
  mode = m;
  highlighted = null;
  els.lastWinner.textContent = '';
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    /* sin persistencia */
  }
  render();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    /* modo privado / storage bloqueado: seguimos sin persistir */
  }
}

function setMsg(text, error = false) {
  els.msg.textContent = text;
  els.msg.classList.toggle('error', error);
}

function render() {
  wheel.setNames(names);
  wheel.setHighlight(mode === 'winner' ? highlighted : null);
  els.count.textContent = names.length;
  els.list.replaceChildren();

  if (!names.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Aún no hay nombres.';
    els.list.append(li);
  }

  names.forEach((name, i) => {
    const li = document.createElement('li');
    li.style.setProperty('--chip', colorFor(i, names.length));
    if (mode === 'winner' && i === highlighted) li.classList.add('is-winner');
    const span = document.createElement('span');
    span.textContent = name;
    span.title = name;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '×';
    btn.setAttribute('aria-label', `Quitar ${name}`);
    btn.addEventListener('click', () => removeAt(i));
    li.append(span, btn);
    els.list.append(li);
  });

  const disabled = wheel.spinning || names.length < 2;
  els.spin.disabled = disabled;
  els.spinCenter.disabled = disabled;
  els.shuffle.disabled = wheel.spinning || names.length < 2;
  els.clear.disabled = wheel.spinning || !names.length;

  els.modeRadios.forEach((r) => {
    r.checked = r.value === mode;
    r.disabled = wheel.spinning;
  });
  els.modeHint.textContent = MODES[mode].hint;
  els.removeWinnerWrap.hidden = mode !== 'select';
  save();
}

function addNames(list) {
  if (!list.length) {
    setMsg('No se encontraron nombres.', true);
    return;
  }
  names.push(...list);
  highlighted = null;
  setMsg(`Se agregaron ${list.length} nombre${list.length === 1 ? '' : 's'}.`);
  render();
}

function removeAt(i) {
  if (wheel.spinning) return;
  names.splice(i, 1);
  highlighted = null;
  render();
}

function shuffle() {
  for (let i = names.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [names[i], names[j]] = [names[j], names[i]];
  }
  highlighted = null;
  render();
}

async function spin() {
  if (wheel.spinning || names.length < 2) return;
  setMsg('');
  highlighted = null;
  const spinPromise = wheel.spin(pickWinner(names));
  render(); // deshabilita controles durante el giro
  const idx = await spinPromise;
  if (idx == null) return render();

  const isWinner = mode === 'winner';
  pendingWinner = idx;
  if (isWinner) highlighted = idx;
  render();

  const name = names[idx];
  const cfg = MODES[mode];
  els.winnerName.textContent = name;
  els.winnerLabel.textContent = cfg.label;
  els.winnerTrophy.hidden = !isWinner;
  els.winnerRemove.hidden = isWinner;
  els.winnerAgain.hidden = !isWinner;
  els.winnerClose.textContent = isWinner ? 'Cerrar' : 'Continuar';
  els.lastWinner.replaceChildren(cfg.last, Object.assign(document.createElement('strong'), { textContent: name }));
  els.dialog.showModal();
  if (isWinner) confetti(els.confetti);
  navigator.vibrate?.(isWinner ? [80, 60, 120] : 60);
}

function closeWinner(remove) {
  if (mode === 'select' && pendingWinner != null && (remove || els.removeWinner.checked)) {
    names.splice(pendingWinner, 1);
  }
  pendingWinner = null;
  if (els.dialog.open) els.dialog.close();
  render();
}

els.add.addEventListener('click', () => {
  addNames(parseText(els.input.value));
  els.input.value = '';
});

els.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    els.add.click();
  }
});

els.file.addEventListener('change', async () => {
  const file = els.file.files?.[0];
  els.file.value = '';
  if (!file) return;
  setMsg(`Leyendo ${file.name}…`);
  try {
    addNames(await parseFile(file));
  } catch (err) {
    console.error(err);
    setMsg(err instanceof Error && err.message.startsWith('Formato') ? err.message : 'No se pudo leer el archivo.', true);
  }
});

els.shuffle.addEventListener('click', shuffle);
els.clear.addEventListener('click', () => {
  if (!names.length || !confirm('¿Borrar todos los nombres?')) return;
  names = [];
  highlighted = null;
  els.lastWinner.textContent = '';
  render();
});

els.spin.addEventListener('click', spin);
els.spinCenter.addEventListener('click', spin);
els.canvas.addEventListener('click', spin);

els.winnerClose.addEventListener('click', () => closeWinner(false));
els.winnerRemove.addEventListener('click', () => closeWinner(true));
els.winnerAgain.addEventListener('click', () => {
  closeWinner(false);
  spin();
});
els.modeRadios.forEach((r) => r.addEventListener('change', () => r.checked && setMode(r.value)));
// Esc cierra el dialog: aplicar misma lógica
els.dialog.addEventListener('close', () => {
  if (pendingWinner != null) closeWinner(false);
});

render();

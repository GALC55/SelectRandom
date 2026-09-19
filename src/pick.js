import { randomInt } from './wheel.js';

const normalize = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

const envList = (value) => new Set((value ?? '').split(',').map(normalize).filter(Boolean));

// Se inyectan en build (Vite). Quedan visibles en el bundle publicado.
const EXCLUDE = envList(import.meta.env.VITE_EXCLUDE_NAMES);
const FORCE = envList(import.meta.env.VITE_FORCE_NAMES);

/**
 * Índice ganador:
 * 1. Si hay nombres de VITE_FORCE_NAMES en la lista (y no excluidos), gana uno de ellos.
 * 2. Si no, gana cualquiera que no esté en VITE_EXCLUDE_NAMES.
 * 3. Si todos están excluidos, sorteo normal.
 */
export function pickWinner(names) {
  const all = names.map((_, i) => i);
  const allowed = all.filter((i) => !EXCLUDE.has(normalize(names[i])));
  const forced = allowed.filter((i) => FORCE.has(normalize(names[i])));
  const pool = forced.length ? forced : allowed.length ? allowed : all;
  return pool[randomInt(pool.length)];
}

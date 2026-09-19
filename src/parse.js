const HEADER_RE = /^(nombres?|names?|participantes?|alumnos?|jugadores?|personas?)$/i;

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** Texto libre: separa por coma, punto y coma, tab o salto de línea. */
export function parseText(text) {
  return text.split(/[,;\t\r\n]+/).map(clean).filter(Boolean);
}

/** CSV simple con comillas; detecta separador ',' o ';' (Excel en español usa ';'). */
export function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === sep || c === '\t') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += c;
    }
  }
  row.push(cell);
  rows.push(row);
  return namesFromRows(rows);
}

/**
 * Filas → nombres. Si la primera fila es encabezado (ej. "Nombre"),
 * se usan solo las columnas con ese encabezado; si no, todas las celdas.
 */
export function namesFromRows(rows) {
  rows = rows.map((r) => r.map(clean)).filter((r) => r.some(Boolean));
  if (!rows.length) return [];

  const headerCols = rows[0].map((h, i) => (HEADER_RE.test(h) ? i : -1)).filter((i) => i >= 0);
  if (headerCols.length) {
    return rows.slice(1).flatMap((r) => headerCols.map((i) => r[i])).filter(Boolean);
  }
  return rows.flat().filter(Boolean);
}

/** Excel / ODS vía SheetJS (carga diferida para no inflar el bundle inicial). */
export async function parseSpreadsheet(file) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer());
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  return namesFromRows(rows);
}

export async function parseFile(file) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return parseCsv(await file.text());
  if (ext === 'txt') return parseText(await file.text());
  if (['xlsx', 'xls', 'ods'].includes(ext)) return parseSpreadsheet(file);
  throw new Error('Formato no soportado. Usá .csv, .txt, .xlsx, .xls u .ods');
}

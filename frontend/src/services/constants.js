/**
 * constants.js — Constantes centralizadas do RuivoBarber RPG
 * Centraliza strings mágicas para evitar duplicação e facilitar manutenção.
 */

// ── Patentes (Níveis de RPG) ────────────────────────────
export const PATENTES = {
  1: 'Corte Iniciante',
  2: 'Barba de Respeito',
  3: 'Lenda da Navalha',
  4: 'Rei da Cadeira',
}

export const PATENTE_CORES = {
  'Corte Iniciante':   { color: '#9ba8b8', badge: '🪒' },
  'Barba de Respeito': { color: '#a0a0b8', badge: '✂️' },
  'Lenda da Navalha':  { color: '#e67e22', badge: '⚡' },
  'Rei da Cadeira':    { color: '#f1c40f', badge: '👑' },
}

// ── XP Thresholds ────────────────────────────────────────
export const XP_THRESHOLDS = {
  'Barba de Respeito': 300,
  'Lenda da Navalha':  600,
  'Rei da Cadeira':    1000,
}

// ── Recompensas do RPG ───────────────────────────────────
export const REWARDS = [
  { id: 2, name: 'Barba de Respeito', cost: 300, benefit: '5% de Desconto', icon: '✂️' },
  { id: 3, name: 'Lenda da Navalha',  cost: 600, benefit: '10% de Desconto', icon: '⚡' },
  { id: 4, name: 'Rei da Cadeira',    cost: 1000, benefit: '1 Corte Grátis', icon: '👑' },
]

// ── Cargos de Usuário ────────────────────────────────────
export const CARGOS = {
  ADMIN: 'Adm',
  BARBEIRO: 'Barbeiro',
  CLIENTE: 'Cliente',
}

// ── Status de Agendamento ────────────────────────────────
export const STATUS_AGENDAMENTO = {
  PENDENTE: 'Pendente',
  CONFIRMADO: 'Confirmado',
  CONCLUIDO: 'Concluido',
  CANCELADO: 'Cancelado',
}

// ── Badges ───────────────────────────────────────────────
export const BADGE_NAMES = {
  PRIMEIRO_SANGUE: 'Primeiro Sangue',
  FIEL_DA_NAVALHA: 'Fiel da Navalha',
  BARBA_DE_RESPEITO: 'Barba de Respeito',
  LENDA_VIVA: 'Lenda Viva',
}

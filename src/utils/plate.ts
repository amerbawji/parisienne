import type { PlateBuilderConfig } from '../store/menuStore';

/** What the customer picked on a build-your-own plate. */
export interface PlateSelection {
  /** skewer id -> how many */
  skewers: Record<string, number>;
  /** ids of included components the customer took off */
  removed: string[];
  /** ids of swap components the customer added */
  added: string[];
}

export const emptyPlateSelection = (): PlateSelection => ({ skewers: {}, removed: [], added: [] });

export const totalSkewers = (sel: PlateSelection) =>
  Object.values(sel.skewers).reduce((sum, n) => sum + n, 0);

/** Plate price is the sum of the skewers; components never change it. */
export const platePrice = (config: PlateBuilderConfig, sel: PlateSelection) =>
  config.skewers.reduce((sum, s) => sum + (sel.skewers[s.id] ?? 0) * s.price, 0);

/**
 * Flattens a selection into the `Record<string, string>` shape the cart and the
 * WhatsApp message already understand, in both languages.
 */
export function describePlate(
  config: PlateBuilderConfig,
  sel: PlateSelection
): { en: Record<string, string>; ar: Record<string, string> } {
  const en: Record<string, string> = {};
  const ar: Record<string, string> = {};

  const chosen = config.skewers.filter((s) => (sel.skewers[s.id] ?? 0) > 0);
  if (chosen.length) {
    en['Skewers'] = chosen.map((s) => `${s.en} x${sel.skewers[s.id]}`).join(', ');
    ar['الأسياخ'] = chosen.map((s) => `${s.ar} ×${sel.skewers[s.id]}`).join('، ');
  }

  const removed = config.includes.filter((c) => sel.removed.includes(c.id));
  if (removed.length) {
    en['Without'] = removed.map((c) => c.en).join(', ');
    ar['بدون'] = removed.map((c) => c.ar).join('، ');
  }

  const added = config.swaps.filter((c) => sel.added.includes(c.id));
  if (added.length) {
    en['Extra'] = added.map((c) => c.en).join(', ');
    ar['إضافة'] = added.map((c) => c.ar).join('، ');
  }

  return { en, ar };
}

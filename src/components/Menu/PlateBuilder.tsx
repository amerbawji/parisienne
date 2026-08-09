import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import type { PlateBuilderConfig } from '../../store/menuStore';
import type { PlateSelection } from '../../utils/plate';

interface Props {
  config: PlateBuilderConfig;
  value: PlateSelection;
  onChange: (next: PlateSelection) => void;
  language: 'en' | 'ar';
  /** Store-wide discount, so the per-skewer prices shown match what's charged. */
  discountPct?: number;
}

export function PlateBuilder({ config, value, onChange, language, discountPct = 0 }: Props) {
  const isAr = language === 'ar';
  const mul = 1 - discountPct / 100;

  const setSkewer = (id: string, next: number) => {
    const skewers = { ...value.skewers };
    if (next <= 0) delete skewers[id];
    else skewers[id] = next;
    onChange({ ...value, skewers });
  };

  const toggleRemoved = (id: string) => {
    const removed = value.removed.includes(id)
      ? value.removed.filter((x) => x !== id)
      : [...value.removed, id];
    onChange({ ...value, removed });
  };

  const toggleAdded = (id: string) => {
    const added = value.added.includes(id)
      ? value.added.filter((x) => x !== id)
      : [...value.added, id];
    onChange({ ...value, added });
  };

  return (
    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
      {/* ── skewers: the part that costs money ── */}
      {config.skewers.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">
            {isAr ? 'اختر الأسياخ' : 'Choose your skewers'}
          </p>
          <div className="space-y-1.5">
            {config.skewers.map((sk) => {
              const qty = value.skewers[sk.id] ?? 0;
              const atMax = sk.max != null && qty >= sk.max;
              return (
                <div
                  key={sk.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                    qty > 0 ? 'border-primary-200 bg-primary-50/60' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{isAr ? sk.ar : sk.en}</p>
                    <p className="text-[11px] text-gray-500">${(sk.price * mul).toFixed(2)} {isAr ? 'للسيخ' : 'each'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSkewer(sk.id, qty - 1)}
                      disabled={qty === 0}
                      aria-label={isAr ? 'إنقاص' : 'Decrease'}
                      className="w-7 h-7 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                    >
                      <MinusIcon className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-gray-800 tabular-nums">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setSkewer(sk.id, qty + 1)}
                      disabled={atMax}
                      aria-label={isAr ? 'زيادة' : 'Increase'}
                      className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 disabled:opacity-30 transition-colors"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── what comes with it ── */}
      {config.includes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-1">
            {isAr ? 'يأتي مع الصحن' : 'Comes with'}
          </p>
          <p className="text-[11px] text-gray-400 mb-2">
            {isAr ? 'اضغط لإزالة أي صنف — لا يتغيّر السعر' : 'Tap to remove anything — the price stays the same'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {config.includes.map((comp) => {
              const off = value.removed.includes(comp.id);
              const locked = comp.removable === false;
              return (
                <button
                  key={comp.id}
                  type="button"
                  disabled={locked}
                  onClick={() => toggleRemoved(comp.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    locked
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-default'
                      : off
                      ? 'bg-white text-gray-400 border-gray-200 line-through'
                      : 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'
                  }`}
                >
                  {isAr ? comp.ar : comp.en}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── swap in something else ── */}
      {config.swaps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">
            {isAr ? 'أضف بدلاً منها' : 'Add instead'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {config.swaps.map((comp) => {
              const on = value.added.includes(comp.id);
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => toggleAdded(comp.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    on
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                  }`}
                >
                  {comp.en === comp.ar ? comp.en : isAr ? comp.ar : comp.en}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

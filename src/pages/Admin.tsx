import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useMenuStore, type Category, type MenuItem, type MenuOption } from '../store/menuStore';
import { usePromoStore } from '../store/promoStore';
import { useStoreConfigStore } from '../store/storeConfigStore';
import { uploadImage, supabase } from '../lib/supabase';

const ADMIN_PASSWORD = 'parisienne2025';
const SESSION_KEY = 'parisienne_admin_auth';

// ─── Empty item factory ──────────────────────────────────────────────────────

function emptyItem(): MenuItem {
  return {
    id: '',
    name_en: '',
    name_ar: '',
    price: 0,
    unit: 'piece',
    weight_step: undefined,
    min_quantity: undefined,
    description_en: '',
    description_ar: '',
    image: '',
    options: [],
    presets: [],
  };
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
  dir,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        dir={dir}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
      />
    </div>
  );
}

function ImageUploadField({
  label,
  currentImage,
  onImage,
  onRemove,
  folder = 'misc',
}: {
  label: string;
  currentImage: string;
  onImage: (url: string) => void;
  onRemove?: () => void;
  folder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${folder}/${Date.now()}-${file.name}`;
      const url = await uploadImage(file, path);
      onImage(url);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      {currentImage ? (
        <div className="relative w-fit">
          <img
            src={currentImage}
            alt="preview"
            className="h-28 w-44 object-cover rounded-lg border border-gray-200"
          />
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 rounded-lg transition text-white text-xs font-semibold"
          >
            Change
          </button>
        </div>
      ) : (
        <div
          onClick={() => ref.current?.click()}
          className="h-28 w-44 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition"
        >
          <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-gray-400">Click to upload</span>
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : currentImage ? 'Replace Image' : 'Upload Image'}
        </button>
        {currentImage && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 text-red-600 transition"
          >
            Remove
          </button>
        )}
      </div>
      <input type="file" accept="image/*" ref={ref} onChange={handleChange} className="hidden" />
    </div>
  );
}

// ─── Options Editor ──────────────────────────────────────────────────────────

function OptionsEditor({
  options,
  onChange,
}: {
  options: MenuOption[];
  onChange: (opts: MenuOption[]) => void;
}) {
  const addOption = () =>
    onChange([...options, { name: '', choices: [], price_additions: {} }]);

  const removeOption = (i: number) =>
    onChange(options.filter((_, idx) => idx !== i));

  const updateOptionName = (i: number, name: string) => {
    const next = options.map((o, idx) => (idx === i ? { ...o, name } : o));
    onChange(next);
  };

  const addChoice = (i: number) => {
    const next = options.map((o, idx) =>
      idx === i ? { ...o, choices: [...o.choices, ''] } : o
    );
    onChange(next);
  };

  const updateChoice = (optIdx: number, choiceIdx: number, val: string) => {
    const next = options.map((o, idx) => {
      if (idx !== optIdx) return o;
      const choices = o.choices.map((c, ci) => (ci === choiceIdx ? val : c));
      return { ...o, choices };
    });
    onChange(next);
  };

  const removeChoice = (optIdx: number, choiceIdx: number) => {
    const next = options.map((o, idx) => {
      if (idx !== optIdx) return o;
      const choices = o.choices.filter((_, ci) => ci !== choiceIdx);
      const pa = { ...(o.price_additions || {}) };
      delete pa[o.choices[choiceIdx]];
      return { ...o, choices, price_additions: pa };
    });
    onChange(next);
  };

  const updatePriceAddition = (optIdx: number, choice: string, val: string) => {
    const next = options.map((o, idx) => {
      if (idx !== optIdx) return o;
      const pa = { ...(o.price_additions || {}) };
      const num = parseFloat(val);
      if (isNaN(num) || num === 0) {
        delete pa[choice];
      } else {
        pa[choice] = num;
      }
      return { ...o, price_additions: pa };
    });
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Options</span>
        <button
          type="button"
          onClick={addOption}
          className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition"
        >
          + Add Option
        </button>
      </div>
      {options.map((opt, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={opt.name}
              placeholder="Option name (e.g. Cooking Level)"
              onChange={(e) => updateOptionName(i, e.target.value)}
              className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-300"
            />
            <button
              type="button"
              onClick={() => removeOption(i)}
              className="text-red-500 hover:text-red-700 text-xs px-2 py-1 border border-red-200 rounded transition"
            >
              Remove
            </button>
          </div>
          <div className="flex flex-col gap-1 pl-2">
            {opt.choices.map((choice, ci) => (
              <div key={ci} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={choice}
                  placeholder="Choice"
                  onChange={(e) => updateChoice(i, ci, e.target.value)}
                  className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-300"
                />
                <input
                  type="number"
                  step="0.01"
                  value={opt.price_additions?.[choice] ?? ''}
                  placeholder="+price"
                  onChange={(e) => updatePriceAddition(i, choice, e.target.value)}
                  className="w-20 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-300"
                />
                <button
                  type="button"
                  onClick={() => removeChoice(i, ci)}
                  className="text-red-400 hover:text-red-600 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addChoice(i)}
              className="text-xs text-primary-600 hover:underline w-fit mt-1"
            >
              + Add Choice
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Presets Editor ──────────────────────────────────────────────────────────

function PresetsEditor({
  presets,
  onChange,
}: {
  presets: string[];
  onChange: (p: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...presets, trimmed]);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Presets</span>
      <div className="flex flex-wrap gap-2">
        {presets.map((p, i) => (
          <span
            key={i}
            className="flex items-center gap-1 bg-secondary-100 text-secondary-800 text-xs px-2 py-1 rounded-full"
          >
            {p}
            <button
              type="button"
              onClick={() => onChange(presets.filter((_, idx) => idx !== i))}
              className="text-secondary-600 hover:text-red-600 leading-none"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="e.g. No pickles"
          className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-300"
        />
        <button
          type="button"
          onClick={add}
          className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 transition"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Item Form ───────────────────────────────────────────────────────────────

interface ItemFormProps {
  initial: MenuItem;
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
}

function ItemForm({ initial, onSave, onCancel }: ItemFormProps) {
  const [form, setForm] = useState<MenuItem>(initial);

  const set = <K extends keyof MenuItem>(key: K, value: MenuItem[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name_en.trim() || !form.name_ar.trim()) return;
    onSave(form);
  };

  const unitOptions = ['piece', 'kg', 'plate', 'box'];

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="Name (English)"
          value={form.name_en}
          onChange={(v) => set('name_en', v)}
          required
          placeholder="e.g. Orfali Grilled"
        />
        <InputField
          label="Name (Arabic)"
          value={form.name_ar}
          onChange={(v) => set('name_ar', v)}
          required
          placeholder="مثال: اورفلي مشوي"
          dir="rtl"
        />
        <InputField
          label="Price ($)"
          value={form.price}
          onChange={(v) => set('price', parseFloat(v) || 0)}
          type="number"
          placeholder="0.00"
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Unit</label>
          <select
            value={unitOptions.includes(form.unit) ? form.unit : '__custom__'}
            onChange={(e) => {
              if (e.target.value !== '__custom__') set('unit', e.target.value);
            }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
          >
            {unitOptions.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
            {!unitOptions.includes(form.unit) && (
              <option value="__custom__">{form.unit}</option>
            )}
          </select>
          {!unitOptions.includes(form.unit) && (
            <input
              type="text"
              value={form.unit}
              onChange={(e) => set('unit', e.target.value)}
              placeholder="Custom unit"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          )}
        </div>
        <InputField
            label="Step / Increment"
            value={form.weight_step ?? ''}
            onChange={(v) => set('weight_step', v ? parseFloat(v) : undefined)}
            type="number"
            placeholder="e.g. 0.25"
          />
        <InputField
          label="Min Quantity"
          value={form.min_quantity ?? ''}
          onChange={(v) => set('min_quantity', v ? parseInt(v) : undefined)}
          type="number"
          placeholder="e.g. 1"
        />
        <InputField
          label="Description (English)"
          value={form.description_en ?? ''}
          onChange={(v) => set('description_en', v)}
          placeholder="Optional description"
        />
        <InputField
          label="Description (Arabic)"
          value={form.description_ar ?? ''}
          onChange={(v) => set('description_ar', v)}
          placeholder="وصف اختياري"
        />
      </div>

      <ImageUploadField
        label="Item Image"
        folder="items"
        currentImage={form.image ?? ''}
        onImage={(url) => set('image', url)}
        onRemove={() => set('image', '')}
      />

      <OptionsEditor
        options={form.options ?? []}
        onChange={(opts) => set('options', opts)}
      />

      <PresetsEditor
        presets={form.presets ?? []}
        onChange={(p) => set('presets', p)}
      />

      {(!form.name_en.trim() || !form.name_ar.trim()) && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Both English and Arabic names are required.
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
          disabled={!form.name_en.trim() || !form.name_ar.trim()}
        >
          Save Item
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Tab: Settings (Promo + Opening Hours) ───────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function SettingsTab() {
  const { enabled, image, setEnabled, setImage } = usePromoStore();
  const { open_time, close_time, closed_days, whatsapp_number, loading: configLoading, fetchConfig, updateConfig } = useStoreConfigStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursError, setHoursError] = useState('');
  const [openTime, setOpenTime] = useState(open_time);
  const [closeTime, setCloseTime] = useState(close_time);
  const [closedDays, setClosedDays] = useState<number[]>(closed_days);
  const [waNumber, setWaNumber] = useState(whatsapp_number);
  const [waSaving, setWaSaving] = useState(false);
  const [waError, setWaError] = useState('');

  useEffect(() => {
    fetchConfig().then(() => {
      const s = useStoreConfigStore.getState();
      setOpenTime(s.open_time);
      setCloseTime(s.close_time);
      setClosedDays(s.closed_days);
      setWaNumber(s.whatsapp_number);
    });
  }, [fetchConfig]);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `promo/${Date.now()}-${file.name}`;
      const url = await uploadImage(file, path);
      await setImage(url);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const toggleClosedDay = (day: number) => {
    setClosedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const handleSaveHours = async () => {
    setHoursSaving(true); setHoursError('');
    try {
      await updateConfig({ open_time: openTime, close_time: closeTime, closed_days: closedDays });
    } catch {
      setHoursError('Failed to save. Please try again.');
    } finally {
      setHoursSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* Opening Hours */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-base font-bold text-gray-800">Opening Hours</h2>
        {configLoading ? (
          <div className="flex justify-center py-4"><div className="w-6 h-6 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Opens</label>
                <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Closes</label>
                <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Closed On</label>
              <div className="flex gap-1.5 flex-wrap">
                {DAY_NAMES.map((name, i) => (
                  <button key={i} type="button" onClick={() => toggleClosedDay(i)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      closedDays.includes(i) ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}>
                    {name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">Selected days are closed — customers can only schedule orders on these days.</p>
            </div>
            {hoursError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{hoursError}</p>}
            <button type="button" onClick={handleSaveHours} disabled={hoursSaving}
              className="self-start px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition disabled:opacity-50">
              {hoursSaving ? 'Saving…' : 'Save Hours'}
            </button>
          </>
        )}
      </div>

      {/* WhatsApp Number */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-base font-bold text-gray-800">WhatsApp Number</h2>
        <p className="text-xs text-gray-500">Orders are sent to this number. Include country code, no spaces or symbols (e.g. 9613502022).</p>
        <div className="flex gap-2 items-end">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Number</label>
            <input type="tel" value={waNumber} onChange={(e) => setWaNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="9613502022"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
          </div>
          <button type="button" disabled={waSaving}
            onClick={async () => { setWaSaving(true); setWaError(''); try { await updateConfig({ whatsapp_number: waNumber }); } catch { setWaError('Failed to save.'); } finally { setWaSaving(false); } }}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition disabled:opacity-50">
            {waSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {waError && <p className="text-xs text-red-600">{waError}</p>}
      </div>

      {/* Promo Popup */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-base font-bold text-gray-800">Promo Popup</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Enable promo popup</span>
          <button type="button" onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-primary-600' : 'bg-gray-300'}`}
            aria-pressed={enabled}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        {image && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Image</span>
            <img src={image} alt="Promo" className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50" />
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition disabled:opacity-50">
            {uploading ? 'Uploading…' : 'Upload New Image'}
          </button>
          <button type="button" onClick={() => setImage('/promo-ramadan.jpg')}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition">
            Reset to Default
          </button>
        </div>
        <input type="file" accept="image/*" ref={fileRef} onChange={handleFile} className="hidden" />
      </div>
    </div>
  );
}

// ─── Tab: Categories ─────────────────────────────────────────────────────────

interface CategoryFormState {
  name_en: string;
  name_ar: string;
  image: string;
}

function CategoriesTab() {
  const { categories, addCategory, updateCategory, deleteCategory, reorderCategory } = useMenuStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const emptyForm = (): CategoryFormState => ({ name_en: '', name_ar: '', image: '' });
  const [addForm, setAddForm] = useState<CategoryFormState>(emptyForm());
  const [editForm, setEditForm] = useState<CategoryFormState>(emptyForm());

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name_en.trim() || !addForm.name_ar.trim()) return;
    setSaving(true); setError('');
    try {
      await addCategory({
        id: `cat-${Date.now()}`,
        name_en: addForm.name_en.trim(),
        name_ar: addForm.name_ar.trim(),
        image: addForm.image,
        active: true,
      });
      setAddForm(emptyForm());
      setShowAddForm(false);
    } catch { setError('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditForm({ name_en: cat.name_en, name_ar: cat.name_ar, image: cat.image });
    setError('');
  };

  const handleEditSave = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!editForm.name_en.trim() || !editForm.name_ar.trim()) return;
    setSaving(true); setError('');
    try {
      await updateCategory(id, {
        name_en: editForm.name_en.trim(),
        name_ar: editForm.name_ar.trim(),
        image: editForm.image,
      });
      setEditingId(null);
    } catch { setError('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (cat: Category) => {
    if (!window.confirm(`Delete category "${cat.name_en}" and all its items?`)) return;
    try { await deleteCategory(cat.id); }
    catch { setError('Failed to delete. Please try again.'); }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-800">Categories ({categories.length})</h2>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition"
        >
          {showAddForm ? 'Cancel' : '+ Add Category'}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-3"
        >
          <h3 className="text-sm font-bold text-gray-700">New Category</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField
              label="Name (English)"
              value={addForm.name_en}
              onChange={(v) => setAddForm((f) => ({ ...f, name_en: v }))}
              required
              placeholder="e.g. Grilled"
            />
            <InputField
              label="Name (Arabic)"
              value={addForm.name_ar}
              onChange={(v) => setAddForm((f) => ({ ...f, name_ar: v }))}
              required
              placeholder="مثال: مشوي"
              dir="rtl"
            />
          </div>
          <ImageUploadField
            label="Category Image"
            folder="categories"
            currentImage={addForm.image}
            onImage={(url) => setAddForm((f) => ({ ...f, image: url }))}
            onRemove={() => setAddForm((f) => ({ ...f, image: '' }))}
          />
          {(!addForm.name_en.trim() || !addForm.name_ar.trim()) && (addForm.name_en || addForm.name_ar) && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Both English and Arabic names are required.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
              disabled={!addForm.name_en.trim() || !addForm.name_ar.trim() || saving}
            >
              {saving ? 'Saving…' : 'Save Category'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setAddForm(emptyForm()); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {categories.map((cat) => (
          <div key={cat.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            {editingId === cat.id ? (
              <form
                onSubmit={(e) => handleEditSave(e, cat.id)}
                className="p-4 flex flex-col gap-3"
              >
                <h3 className="text-sm font-bold text-gray-700">Edit: {cat.name_en}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField
                    label="Name (English)"
                    value={editForm.name_en}
                    onChange={(v) => setEditForm((f) => ({ ...f, name_en: v }))}
                    required
                  />
                  <InputField
                    label="Name (Arabic)"
                    value={editForm.name_ar}
                    onChange={(v) => setEditForm((f) => ({ ...f, name_ar: v }))}
                    required
                    dir="rtl"
                  />
                </div>
                <ImageUploadField
                  label="Category Image"
                  folder="categories"
                  currentImage={editForm.image}
                  onImage={(url) => setEditForm((f) => ({ ...f, image: url }))}
                  onRemove={() => setEditForm((f) => ({ ...f, image: '' }))}
                />
                {(!editForm.name_en.trim() || !editForm.name_ar.trim()) && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Both English and Arabic names are required.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                    disabled={!editForm.name_en.trim() || !editForm.name_ar.trim() || saving}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className={`flex items-center gap-3 p-3 sm:p-4 ${!cat.active ? 'opacity-50' : ''}`}>
                {cat.image && (
                  <img
                    src={cat.image}
                    alt={cat.name_en}
                    className="h-12 w-16 sm:h-14 sm:w-20 object-cover rounded-lg border border-gray-100 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{cat.name_en}</p>
                  <p className="text-xs text-gray-500 truncate" dir="rtl">{cat.name_ar}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{cat.items.length} items{!cat.active && <span className="ml-2 text-orange-500 font-medium">Hidden</span>}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 shrink-0">
                  <div className="flex gap-1 self-center">
                    <button type="button" onClick={() => reorderCategory(cat.id, 'up')}
                      disabled={categories.indexOf(cat) === 0}
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition"
                      title="Move up">
                      <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button type="button" onClick={() => reorderCategory(cat.id, 'down')}
                      disabled={categories.indexOf(cat) === categories.length - 1}
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition"
                      title="Move down">
                      <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateCategory(cat.id, { active: !cat.active })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none self-center ${cat.active ? 'bg-primary-600' : 'bg-gray-300'}`}
                    title={cat.active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${cat.active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(cat)}
                    className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    className="px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Quick image change (item list row) ──────────────────────────────────────

function QuickImageChange({ image, onImage }: { image: string; onImage: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `items/${Date.now()}-${file.name}`;
      const url = await uploadImage(file, path);
      onImage(url);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div
      className="relative h-14 w-14 rounded-lg border border-gray-200 shrink-0 overflow-hidden cursor-pointer group"
      onClick={() => ref.current?.click()}
      title="Click to change image"
    >
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-gray-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className={`absolute inset-0 flex items-center justify-center transition ${uploading ? 'bg-black/50 opacity-100' : 'bg-black/50 opacity-0 group-hover:opacity-100'}`}>
        {uploading ? (
          <div className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        ) : (
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" />
          </svg>
        )}
      </div>
      <input type="file" accept="image/*" ref={ref} onChange={handleChange} className="hidden" />
    </div>
  );
}

// ─── Tab: Items ───────────────────────────────────────────────────────────────

function ItemsTab() {
  const { categories, addItem, updateItem, deleteItem, reorderItem } = useMenuStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id ?? ''
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const items = selectedCategory?.items ?? [];

  const handleAddItem = async (item: MenuItem) => {
    const newItem: MenuItem = { ...item, id: item.id || `prod-${Date.now()}` };
    await addItem(selectedCategoryId, newItem);
    setShowAddForm(false);
  };

  const handleUpdateItem = async (item: MenuItem) => {
    await updateItem(selectedCategoryId, item.id, item);
    setEditingItemId(null);
  };

  const handleDelete = async (item: MenuItem) => {
    if (!window.confirm(`Delete item "${item.name_en}"?`)) return;
    await deleteItem(selectedCategoryId, item.id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="text-base font-bold text-gray-800 shrink-0">Items</h2>
        <select
          value={selectedCategoryId}
          onChange={(e) => {
            setSelectedCategoryId(e.target.value);
            setShowAddForm(false);
            setEditingItemId(null);
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_en}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => { setShowAddForm(!showAddForm); setEditingItemId(null); }}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition sm:ml-auto"
        >
          {showAddForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {showAddForm && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-gray-700">New Item</h3>
          <ItemForm
            initial={{ ...emptyItem(), id: `prod-${Date.now()}` }}
            onSave={handleAddItem}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {!selectedCategoryId && (
        <p className="text-sm text-gray-500">Select a category to manage its items.</p>
      )}

      <div className="flex flex-col gap-3">
        {items.map((item) =>
          editingItemId === item.id ? (
            <div key={item.id} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-gray-700">Edit: {item.name_en}</h3>
              <ItemForm
                initial={item}
                onSave={handleUpdateItem}
                onCancel={() => setEditingItemId(null)}
              />
            </div>
          ) : (
            <div
              key={item.id}
              className={`border border-gray-200 rounded-xl bg-white p-3 sm:p-4 flex items-center gap-3 ${item.active === false ? 'opacity-50' : ''}`}
            >
              <QuickImageChange
                image={item.image ?? ''}
                onImage={(url) => updateItem(selectedCategoryId, item.id, { image: url })}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{item.name_en}</p>
                <p className="text-xs text-gray-500 truncate" dir="rtl">{item.name_ar}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  ${item.price.toFixed(2)} / {item.unit}
                  {item.options && item.options.length > 0 && (
                    <span className="ml-2 text-primary-500">{item.options.length} option(s)</span>
                  )}
                  {item.in_stock === false && <span className="ml-2 text-orange-500 font-medium">Out of stock</span>}
                  {item.active === false && <span className="ml-2 text-red-500 font-medium">Hidden</span>}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 shrink-0">
                <div className="flex gap-1 self-center">
                  <button type="button" onClick={() => reorderItem(selectedCategoryId, item.id, 'up')}
                    disabled={items.indexOf(item) === 0}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition"
                    title="Move up">
                    <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button type="button" onClick={() => reorderItem(selectedCategoryId, item.id, 'down')}
                    disabled={items.indexOf(item) === items.length - 1}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition"
                    title="Move down">
                    <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => updateItem(selectedCategoryId, item.id, { in_stock: item.in_stock === false ? true : false })}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition ${item.in_stock === false ? 'bg-orange-100 text-orange-700 border-orange-200' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  title={item.in_stock === false ? 'Out of stock — click to mark in stock' : 'In stock — click to mark out of stock'}
                >
                  {item.in_stock === false ? 'Out of stock' : 'In stock'}
                </button>
                <button
                  type="button"
                  onClick={() => updateItem(selectedCategoryId, item.id, { active: item.active === false ? true : false })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none self-center ${item.active !== false ? 'bg-primary-600' : 'bg-gray-300'}`}
                  title={item.active !== false ? 'Active — click to hide' : 'Hidden — click to show'}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${item.active !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingItemId(item.id); setShowAddForm(false); }}
                  className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}
        {items.length === 0 && !showAddForm && (
          <p className="text-sm text-gray-400 text-center py-8">
            No items in this category yet.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Password Gate ────────────────────────────────────────────────────────────

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      onSuccess();
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary-600">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-1">Enter the admin password to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Password"
            autoFocus
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition"
          >
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Tab: Orders ─────────────────────────────────────────────────────────────

interface OrderItem { name_en: string; name_ar: string; quantity: number; price: number; unit: string; selected_options: Record<string, string> }
interface Order {
  id: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  service_type: string;
  timing: string | null;
  scheduled_time: string | null;
  payment_method: string | null;
  delivery_area: string | null;
  delivery_street: string | null;
  delivery_building: string | null;
  delivery_floor: string | null;
  delivery_details: string | null;
  location_url: string | null;
  items: OrderItem[];
  total: number;
  status: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:       { label: 'New',       color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmed', color: 'bg-yellow-100 text-yellow-700' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

function OrderCard({ order, expanded, onToggle, onUpdateStatus, updatingStatus }: {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  updatingStatus: string | null;
}) {
  const date = new Date(order.created_at);
  const badge = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-600' };
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">
              {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' '}<span className="text-gray-500 font-normal">{date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.color}`}>{badge.label}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{order.service_type}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {[order.customer_name, order.customer_phone, `${order.items.length} item${order.items.length !== 1 ? 's' : ''}`, `$${Number(order.total).toFixed(2)}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status:</span>
            {Object.entries(STATUS_LABELS).map(([key, val]) => (
              <button key={key} type="button" disabled={updatingStatus === order.id} onClick={() => onUpdateStatus(order.id, key)}
                className={`text-xs px-3 py-1 rounded-full font-semibold border transition ${order.status === key ? val.color + ' border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                {val.label}
              </button>
            ))}
          </div>
          {(order.customer_name || order.customer_phone) && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {order.customer_name  && <span><span className="text-gray-500">Name: </span><span className="font-medium">{order.customer_name}</span></span>}
              {order.customer_phone && <span><span className="text-gray-500">Phone: </span><span className="font-medium">{order.customer_phone}</span></span>}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
            {order.service_type === 'delivery' && (<>
              {order.delivery_area    && <><span className="text-gray-500">Area</span><span className="font-medium">{order.delivery_area}</span></>}
              {order.delivery_street  && <><span className="text-gray-500">Street</span><span className="font-medium">{order.delivery_street}</span></>}
              {order.delivery_building && <><span className="text-gray-500">Building</span><span className="font-medium">{order.delivery_building}</span></>}
              {order.delivery_floor   && <><span className="text-gray-500">Floor</span><span className="font-medium">{order.delivery_floor}</span></>}
              {order.delivery_details && <><span className="text-gray-500">Details</span><span className="font-medium">{order.delivery_details}</span></>}
              {order.location_url     && <><span className="text-gray-500">Location</span><a href={order.location_url} target="_blank" rel="noreferrer" className="text-primary-600 underline font-medium">Open map</a></>}
            </>)}
            {order.timing === 'scheduled' && order.scheduled_time && <><span className="text-gray-500">Scheduled</span><span className="font-medium">{order.scheduled_time}</span></>}
            {order.payment_method && <><span className="text-gray-500">Payment</span><span className="font-medium capitalize">{order.payment_method}</span></>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900">{item.name_en}</span>
                    {item.name_ar && <span className="text-gray-400 text-xs ml-1">· {item.name_ar}</span>}
                    {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                      <div className="text-xs text-gray-500 mt-0.5">{Object.entries(item.selected_options).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-gray-500">×{item.quantity}</span>
                    <span className="ml-2 font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-bold">
              <span>Total</span><span>${Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersTab({ orders, loading, onUpdateStatus, onRefresh }: {
  orders: Order[];
  loading: boolean;
  onUpdateStatus: (id: string, status: string) => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(1);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = carouselRef.current.offsetWidth;
    }
  }, []);

  const statusTabs = [{ key: 'all', label: 'All' }, ...Object.entries(STATUS_LABELS).map(([k, v]) => ({ key: k, label: v.label }))];

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdatingStatus(id);
    await supabase.from('orders').update({ status }).eq('id', id);
    onUpdateStatus(id, status);
    setUpdatingStatus(null);
  };

  const goToTab = (index: number) => {
    setActiveTab(index);
    setExpanded(null);
    if (carouselRef.current) {
      isScrolling.current = true;
      carouselRef.current.scrollTo({ left: index * carouselRef.current.offsetWidth, behavior: 'smooth' });
      setTimeout(() => { isScrolling.current = false; }, 400);
    }
  };

  const handleCarouselScroll = () => {
    if (isScrolling.current || !carouselRef.current) return;
    const index = Math.round(carouselRef.current.scrollLeft / carouselRef.current.offsetWidth);
    if (index !== activeTab) { setActiveTab(index); setExpanded(null); }
  };

  const todayStr = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === todayStr);
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);
  const pending = orders.filter(o => o.status === 'new' || o.status === 'confirmed').length;
  const deliveredToday = todayOrders.filter(o => o.status === 'delivered').length;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toDateString();
    const label = d.toLocaleDateString('en-GB', { weekday: 'short' });
    const count = orders.filter(o => new Date(o.created_at).toDateString() === ds).length;
    const isToday = ds === todayStr;
    return { label, count, isToday };
  });
  const maxDay = Math.max(...last7.map(d => d.count), 1);

  const statusTotals = Object.keys(STATUS_LABELS).map(k => ({ key: k, count: orders.filter(o => o.status === k).length }));
  const totalOrders = orders.length || 1;

  if (loading) return (
    <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin" /></div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-800">Orders</h2>
        <button type="button" onClick={onRefresh} disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition">
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Today's Orders", value: todayOrders.length, sub: 'orders placed today', color: 'text-primary-600' },
          { label: "Today's Revenue", value: `$${todayRevenue.toFixed(2)}`, sub: 'from today\'s orders', color: 'text-green-600' },
          { label: 'Needs Attention', value: pending, sub: 'new + confirmed', color: pending > 0 ? 'text-amber-600' : 'text-gray-400' },
          { label: 'Delivered Today', value: deliveredToday, sub: 'completed today', color: 'text-emerald-600' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 flex flex-col gap-0.5">
            <span className="text-xs text-gray-500 font-medium">{label}</span>
            <span className={`text-2xl font-bold ${color}`}>{value}</span>
            <span className="text-xs text-gray-400">{sub}</span>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Status breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">All-time by Status</span>
          <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
            {statusTotals.map(({ key, count }) => {
              const pct = (count / totalOrders) * 100;
              const bg = { new: 'bg-blue-400', confirmed: 'bg-yellow-400', delivered: 'bg-green-400', cancelled: 'bg-red-400' }[key] ?? 'bg-gray-300';
              return pct > 0 ? <div key={key} className={`${bg} transition-all`} style={{ width: `${pct}%` }} /> : null;
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {statusTotals.map(({ key, count }) => {
              const dot = { new: 'bg-blue-400', confirmed: 'bg-yellow-400', delivered: 'bg-green-400', cancelled: 'bg-red-400' }[key] ?? 'bg-gray-300';
              return (
                <span key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                  {STATUS_LABELS[key]?.label} <span className="font-semibold text-gray-800">{count}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* 7-day bar chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last 7 Days</span>
          <div className="flex items-end gap-1.5 h-16">
            {last7.map(({ label, count, isToday }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500 font-medium leading-none">{count > 0 ? count : ''}</span>
                <div className="w-full rounded-t-sm transition-all" style={{ height: `${(count / maxDay) * 44}px`, minHeight: count > 0 ? '4px' : '2px' }}
                  title={`${count} order${count !== 1 ? 's' : ''}`}
                >
                  <div className={`w-full h-full rounded-t-sm ${isToday ? 'bg-primary-500' : 'bg-primary-200'}`} />
                </div>
                <span className={`text-[10px] leading-none font-medium ${isToday ? 'text-primary-600' : 'text-gray-400'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {statusTabs.map((t, i) => {
          const count = t.key === 'all' ? orders.length : orders.filter(o => o.status === t.key).length;
          return (
            <button key={t.key} type="button" onClick={() => goToTab(i)}
              className={`flex-1 flex flex-col items-center gap-0.5 px-1 py-2 text-xs font-semibold border-b-2 transition -mb-px ${
                activeTab === i ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <span>{t.label}</span>
              {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold leading-none ${activeTab === i ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Carousel */}
      <div ref={carouselRef} onScroll={handleCarouselScroll}
        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ scrollSnapType: 'x mandatory' }}>
        {statusTabs.map((t) => {
          const list = t.key === 'all' ? orders : orders.filter(o => o.status === t.key);
          return (
            <div key={t.key} className="flex-shrink-0 w-full snap-start space-y-3 pr-0.5">
              {list.length === 0
                ? <p className="text-center py-16 text-gray-400 text-sm">No {t.key === 'all' ? '' : t.label.toLowerCase()} orders.</p>
                : list.map((order) => (
                    <OrderCard key={order.id} order={order} expanded={expanded === order.id}
                      onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                      onUpdateStatus={handleUpdateStatus} updatingStatus={updatingStatus} />
                  ))
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── Order Notification Toast ─────────────────────────────────────────────────

function OrderNotification({ order, onDismiss }: { order: Order; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const date = new Date(order.created_at);
  return (
    <div className="w-64 sm:w-72 bg-white border border-primary-200 rounded-xl shadow-lg p-3 sm:p-4 flex gap-3 animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="shrink-0 w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900">New Order!</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {order.items.length} item{order.items.length !== 1 ? 's' : ''} · ${Number(order.total).toFixed(2)} · <span className="capitalize">{order.service_type}</span>
        </p>
        <p className="text-xs text-gray-400">{date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      <button type="button" onClick={onDismiss} className="shrink-0 text-gray-400 hover:text-gray-600 mt-0.5">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

// ─── Admin Shell ──────────────────────────────────────────────────────────────

type Tab = 'orders' | 'settings' | 'categories' | 'items';

function AdminShell() {
  const [tab, setTab] = useState<Tab>('orders');
  const fetchMenu = useMenuStore((s) => s.fetchMenu);
  const fetchPromo = usePromoStore((s) => s.fetchPromo);
  const fetchConfig = useStoreConfigStore((s) => s.fetchConfig);

  // ── Orders state (lives here so realtime persists across tab switches) ──
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [notifications, setNotifications] = useState<Order[]>([]);

  useState(() => { Promise.all([fetchMenu(), fetchPromo(), fetchConfig()]); });

  const refreshOrders = async () => {
    setOrdersLoading(true);
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) console.error('[Orders fetch failed]', error);
    if (data) setOrders(data as Order[]);
    setOrdersLoading(false);
  };

  useEffect(() => {
    refreshOrders();

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        console.log('[Realtime] new order:', payload.new);
        const order = payload.new as Order;
        setOrders((prev) => [order, ...prev]);
        setNotifications((prev) => [...prev, order]);
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start(); osc.stop(ctx.currentTime + 0.4);
        } catch { /* audio blocked */ }
      })
      .subscribe((status) => console.log('[Realtime] subscription status:', status));

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleUpdateStatus = (id: string, status: string) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
  };

  const dismissNotification = (id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id));

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'orders', label: 'Orders' },
    { key: 'categories', label: 'Categories' },
    { key: 'items', label: 'Items' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-primary-600 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          <h1 className="text-sm sm:text-base font-bold tracking-wide truncate">Admin Panel</h1>
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href="/"
              className="text-xs px-2 sm:px-3 py-1.5 border border-white/30 rounded-lg hover:bg-white/10 transition whitespace-nowrap"
            >
              ← Menu
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs px-2 sm:px-3 py-1.5 border border-white/30 rounded-lg hover:bg-white/10 transition"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-14 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 py-2 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 sm:px-4 py-2 text-sm font-semibold rounded-lg transition whitespace-nowrap ${
                tab === t.key
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {tab === 'orders' && <OrdersTab orders={orders} loading={ordersLoading} onUpdateStatus={handleUpdateStatus} onRefresh={refreshOrders} />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'items' && <ItemsTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>

      {/* Live order notifications — bottom right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
        {notifications.map((n) => (
          <OrderNotification key={n.id} order={n} onDismiss={() => dismissNotification(n.id)} />
        ))}
      </div>
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export const Admin = () => {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1'
  );

  if (!authed) return <PasswordGate onSuccess={() => setAuthed(true)} />;
  return <AdminShell />;
};

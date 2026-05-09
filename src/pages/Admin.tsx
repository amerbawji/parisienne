import { useState, useRef, type ChangeEvent } from 'react';
import { useMenuStore, type Category, type MenuItem, type MenuOption } from '../store/menuStore';
import { usePromoStore } from '../store/promoStore';
import { uploadImage } from '../lib/supabase';

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
        {form.unit === 'kg' && (
          <InputField
            label="Weight Step (kg)"
            value={form.weight_step ?? ''}
            onChange={(v) => set('weight_step', v ? parseFloat(v) : undefined)}
            type="number"
            placeholder="e.g. 0.1"
          />
        )}
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

// ─── Tab: Promo ──────────────────────────────────────────────────────────────

function PromoTab() {
  const { enabled, image, setEnabled, setImage } = usePromoStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-base font-bold text-gray-800">Promo Popup</h2>

        {/* Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Enable promo popup</span>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              enabled ? 'bg-primary-600' : 'bg-gray-300'
            }`}
            aria-pressed={enabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Current image */}
        {image && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Image</span>
            <img
              src={image}
              alt="Promo"
              className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50"
            />
          </div>
        )}

        {/* Upload */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload New Image'}
          </button>
          <button
            type="button"
            onClick={() => setImage('/promo-ramadan.jpg')}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition"
          >
            Reset to Default
          </button>
        </div>
        <input
          type="file"
          accept="image/*"
          ref={fileRef}
          onChange={handleFile}
          className="hidden"
        />
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
  const { categories, addCategory, updateCategory, deleteCategory } = useMenuStore();
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
              <div className="flex items-center gap-4 p-4">
                {cat.image && (
                  <img
                    src={cat.image}
                    alt={cat.name_en}
                    className="h-14 w-20 object-cover rounded-lg border border-gray-100 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{cat.name_en}</p>
                  <p className="text-xs text-gray-500 truncate" dir="rtl">{cat.name_ar}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{cat.items.length} items</p>
                </div>
                <div className="flex gap-2 shrink-0">
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
  const { categories, addItem, updateItem, deleteItem } = useMenuStore();
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
              className="border border-gray-200 rounded-xl bg-white p-4 flex items-center gap-4"
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
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
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

// ─── Admin Shell ──────────────────────────────────────────────────────────────

type Tab = 'promo' | 'categories' | 'items';

function AdminShell() {
  const [tab, setTab] = useState<Tab>('promo');
  const fetchMenu = useMenuStore((s) => s.fetchMenu);
  const fetchPromo = usePromoStore((s) => s.fetchPromo);

  useState(() => { Promise.all([fetchMenu(), fetchPromo()]); });

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'promo', label: 'Promo' },
    { key: 'categories', label: 'Categories' },
    { key: 'items', label: 'Items' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-primary-600 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <h1 className="text-base font-bold tracking-wide">Parisienne Admin Panel</h1>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 border border-white/30 rounded-lg hover:bg-white/10 transition"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-14 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 py-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {tab === 'promo' && <PromoTab />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'items' && <ItemsTab />}
      </main>
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

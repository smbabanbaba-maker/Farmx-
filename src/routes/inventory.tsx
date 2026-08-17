import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  createInventory,
  deleteInventory,
  listInventory,
  updateInventory,
} from "@/lib/operations.functions";
import { Package, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory")({ component: Inventory });

type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  price?: number;
  lowStockThreshold: number;
  lowStock: boolean;
};

type InventoryForm = Omit<InventoryItem, "id" | "lowStock">;
const emptyForm: InventoryForm = {
  name: "",
  quantity: 0,
  unit: "",
  category: "",
  price: 0,
  lowStockThreshold: 0,
};

function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState<InventoryForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems((await listInventory()) as InventoryItem[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    if (!form.name.trim() || !form.unit.trim()) return toast.error("Enter an item name and unit.");
    setSaving(true);
    try {
      if (editingId) await updateInventory({ data: { id: editingId, ...form } });
      else await createInventory({ data: form });
      toast.success(editingId ? "Inventory updated." : "Inventory item added.");
      setForm(emptyForm);
      setEditingId(null);
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save inventory item.");
    } finally {
      setSaving(false);
    }
  };

  const edit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      price: item.price ?? 0,
      lowStockThreshold: item.lowStockThreshold,
    });
    setOpen(true);
  };

  const remove = async (id: string) => {
    try {
      await deleteInventory({ data: { id } });
      toast.success("Inventory item deleted.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete item.");
    }
  };

  return (
    <AppShell title="Inventory">
      <div className="space-y-4 pb-10">
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setOpen(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-brand-foreground"
        >
          <Plus className="h-4 w-4" /> Add inventory item
        </button>
        {open && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">
                {editingId ? "Edit inventory item" : "New inventory item"}
              </h2>
              <button type="button" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <Field
              label="Item name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />
            <Field
              label="Quantity"
              type="number"
              value={String(form.quantity)}
              onChange={(v) => setForm({ ...form, quantity: Number(v) || 0 })}
            />
            <Field
              label="Unit"
              value={form.unit}
              onChange={(v) => setForm({ ...form, unit: v })}
              placeholder="kg, bags, litres"
            />
            <Field
              label="Category"
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
            />
            <Field
              label="Low-stock threshold"
              type="number"
              value={String(form.lowStockThreshold)}
              onChange={(v) => setForm({ ...form, lowStockThreshold: Number(v) || 0 })}
            />
            <Field
              label="Price/cost (optional)"
              type="number"
              value={String(form.price ?? 0)}
              onChange={(v) => setForm({ ...form, price: Number(v) || 0 })}
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-xs font-bold text-brand-foreground disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save item"}
            </button>
          </div>
        )}
        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Loading inventory...</p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            No inventory items yet.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <Package className="h-5 w-5 text-brand" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity.toLocaleString()} {item.unit}
                    {item.category ? ` · ${item.category}` : ""}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium ${item.lowStock ? "text-brand" : "text-green-600"}`}
                >
                  {item.lowStock ? "Low stock" : "In stock"}
                </span>
                <button
                  type="button"
                  onClick={() => edit(item)}
                  className="text-xs font-bold text-brand"
                >
                  Edit
                </button>
                <button type="button" onClick={() => void remove(item.id)} aria-label="Delete item">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal"
      />
    </label>
  );
}

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  createFleetVehicle,
  deleteFleetVehicle,
  listFleet,
  updateFleetVehicle,
} from "@/lib/operations.functions";
import { MapPin, Plus, Save, Truck, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/fleet")({ component: Fleet });

type Vehicle = {
  id: string;
  name: string;
  type: string;
  referenceNumber: string;
  status: "active" | "idle" | "maintenance" | "inactive";
  driver?: string;
  location: string;
  notes?: string;
  lastServiceAt?: string;
  nextServiceAt?: string;
};
type VehicleForm = Omit<Vehicle, "id">;
const emptyForm: VehicleForm = {
  name: "",
  type: "",
  referenceNumber: "",
  status: "active",
  driver: "",
  location: "",
  notes: "",
  lastServiceAt: "",
  nextServiceAt: "",
};

function Fleet() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<VehicleForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setVehicles((await listFleet()) as Vehicle[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load fleet.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    if (!form.name.trim() || !form.type.trim())
      return toast.error("Enter a vehicle name and type.");
    setSaving(true);
    try {
      if (editingId) await updateFleetVehicle({ data: { id: editingId, ...form } });
      else await createFleetVehicle({ data: form });
      toast.success(editingId ? "Vehicle updated." : "Vehicle added.");
      setForm(emptyForm);
      setEditingId(null);
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save vehicle.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteFleetVehicle({ data: { id } });
      toast.success("Vehicle deleted.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete vehicle.");
    }
  };

  return (
    <AppShell title="Fleet">
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
          <Plus className="h-4 w-4" /> Add vehicle or asset
        </button>
        {open && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">
                {editingId ? "Edit vehicle" : "New vehicle or asset"}
              </h2>
              <button type="button" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <Field
              label="Vehicle/asset name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />
            <Field
              label="Type"
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v })}
              placeholder="Tractor, truck, harvester"
            />
            <Field
              label="Registration/reference number"
              value={form.referenceNumber}
              onChange={(v) => setForm({ ...form, referenceNumber: v })}
            />
            <Field
              label="Location"
              value={form.location}
              onChange={(v) => setForm({ ...form, location: v })}
            />
            <Field
              label="Driver/operator"
              value={form.driver ?? ""}
              onChange={(v) => setForm({ ...form, driver: v })}
            />
            <label className="block text-xs font-semibold">
              Status
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as VehicleForm["status"] })
                }
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="active">Active</option>
                <option value="idle">Idle</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <Field
              label="Notes"
              value={form.notes ?? ""}
              onChange={(v) => setForm({ ...form, notes: v })}
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-xs font-bold text-brand-foreground disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save vehicle"}
            </button>
          </div>
        )}
        {loading ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Loading fleet...</p>
        ) : vehicles.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            No vehicles or assets yet.
          </p>
        ) : (
          <div className="space-y-2">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10">
                  <Truck className="h-5 w-5 text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {vehicle.name} · {vehicle.type}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {vehicle.location || "Location not added"}
                  </p>
                </div>
                <span className="rounded-full bg-brand/10 px-2 py-1 text-xs font-medium capitalize text-brand">
                  {vehicle.status}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(vehicle.id);
                    setForm({
                      name: vehicle.name,
                      type: vehicle.type,
                      referenceNumber: vehicle.referenceNumber,
                      status: vehicle.status,
                      driver: vehicle.driver ?? "",
                      location: vehicle.location,
                      notes: vehicle.notes ?? "",
                      lastServiceAt: vehicle.lastServiceAt ?? "",
                      nextServiceAt: vehicle.nextServiceAt ?? "",
                    });
                    setOpen(true);
                  }}
                  className="text-xs font-bold text-brand"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void remove(vehicle.id)}
                  aria-label="Delete vehicle"
                >
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal"
      />
    </label>
  );
}

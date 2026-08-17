import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeria-locations";
import {
  createProfilePhotoUpload,
  removeMyProfilePhoto,
  saveMyProfile,
  type FarmXProfile,
} from "@/lib/profile.functions";
import { useProfileData } from "@/lib/use-profile";
import { getProfileRepository } from "@/lib/profile-repository";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { useProfilePhoto } from "@/lib/use-profile-photo";

export const Route = createFileRoute("/edit-profile")({ component: EditProfile });

type ProfileDraft = Omit<FarmXProfile, "userId" | "createdAt" | "updatedAt" | "verification">;

const blankProfile: ProfileDraft = {
  fullName: "",
  username: "",
  role: "farmer",
  bio: "",
  state: "",
  location: "",
  phone: "",
  email: "",
  agriculturalInterests: [],
  skills: [],
  privacy: {
    profileVisibility: "public",
    messagePermission: "farmx_members",
    callPermission: "farmx_members",
    showFollowers: true,
    showActivity: false,
    showBusinessInfo: true,
  },
};

function EditProfile() {
  const navigate = useNavigate();
  const { status, profile, error, refresh, mode } = useProfileData();
  const existingPhotoUrl = useProfilePhoto(profile?.photoKey);
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [form, setForm] = useState<ProfileDraft>(blankProfile);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [interestText, setInterestText] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate({ to: "/login", search: { returnTo: "/edit-profile" } });
    }
  }, [authLoading, isLoggedIn, navigate]);

  useEffect(() => {
    if (!profile) return;
    const {
      userId: _userId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      verification: _verification,
      ...editable
    } = profile;
    setForm(editable);
    setInterestText(editable.agriculturalInterests.join(", "));
    setSkillsText(editable.skills.join(", "));
  }, [profile]);

  const update = <Key extends keyof ProfileDraft>(key: Key, value: ProfileDraft[Key]) => {
    setNotice(null);
    setFormError(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const uploadPhoto = async (file: File) => {
    if (!/^(image\/jpeg|image\/png|image\/webp)$/.test(file.type)) {
      setFormError("Use a JPG, PNG, or WebP profile photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Profile photo must be 5MB or less.");
      return;
    }

    setUploading(true);
    setFormError(null);
    try {
      const compressed = await compressProfilePhoto(file);
      const repository = await getProfileRepository();
      if (repository.mode === "preview") {
        const previewDataUrl = await blobToDataUrl(compressed);
        if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(previewDataUrl);
        update("photoKey", previewDataUrl);
        setNotice("Preview photo added. Save your Profile to keep it in development preview.");
      } else {
        const { objectKey, uploadUrl } = await createProfilePhotoUpload({
          data: { contentType: "image/webp" },
        });
        const response = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "content-type": "image/webp" },
          body: compressed,
        });
        if (!response.ok) throw new Error("Photo upload was not accepted by secure storage.");
        if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(URL.createObjectURL(compressed));
        update("photoKey", objectKey);
        setNotice("Profile photo uploaded. Save your profile to use it.");
      }
    } catch (uploadError) {
      setFormError(
        uploadError instanceof Error ? uploadError.message : "Unable to upload profile photo.",
      );
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    setFormError(null);
    try {
      const repository = await getProfileRepository();
      if (
        repository.mode === "production" &&
        profile?.photoKey &&
        form.photoKey === profile.photoKey
      ) {
        await removeMyProfilePhoto();
        await refresh();
      }
      if (repository.mode === "preview") {
        await repository.updatePreview((state) => {
          state.profile.photoKey = undefined;
          state.profile.updatedAt = new Date().toISOString();
        });
      }
      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
      update("photoKey", undefined);
      setNotice("Profile photo removed successfully.");
    } catch (removeError) {
      setFormError(
        removeError instanceof Error ? removeError.message : "Unable to remove profile photo.",
      );
    }
  };

  const submit = async () => {
    const interests = parseTags(interestText);
    const skills = parseTags(skillsText);
    const validUsername = /^[a-z0-9_]{3,24}$/.test(form.username);
    if (
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.state ||
      !validUsername
    ) {
      setFormError(
        "Add your full name, a valid username, email, phone number, and state before saving.",
      );
      return;
    }

    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      const repository = await getProfileRepository();
      await repository.saveProfile({
        ...form,
        username: form.username.toLowerCase(),
        agriculturalInterests: interests,
        skills,
      });
      await refresh();
      setNotice("Your FarmX Profile was saved successfully.");
      setTimeout(() => navigate({ to: "/profile" }), 700);
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : "Unable to save your Profile.");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || authLoading)
    return (
      <AppShell title="Edit Profile">
        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
      </AppShell>
    );
  if (status === "error") {
    return (
      <AppShell title="Edit Profile">
        <section className="rounded-2xl border border-border bg-card p-5 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-brand" />
          <h1 className="mt-3 font-bold">Profile access is required</h1>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Sign in with your verified FarmX Cognito account before changing personal information.
          </p>
          <p className="mt-2 text-xs text-brand">{error}</p>
          <button
            onClick={() => void refresh()}
            className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-brand-foreground"
          >
            Retry
          </button>
        </section>
      </AppShell>
    );
  }

  const initials =
    form.fullName
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "FX";

  return (
    <AppShell title="Edit Profile">
      <div className="space-y-4 pb-6">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </Link>

        {mode === "preview" && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Preview data mode — your Profile changes are stored in this browser until AWS services
            are configured.
          </p>
        )}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => photoInput.current?.click()}
              disabled={uploading}
              className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand/10 text-lg font-black text-brand disabled:opacity-60"
            >
              {photoPreview || existingPhotoUrl ? (
                <img
                  src={photoPreview ?? existingPhotoUrl ?? undefined}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
              <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-foreground">
                <Camera className="h-3.5 w-3.5" />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold">Profile photo</h1>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                JPG, PNG or WebP. Images are compressed before secure upload; maximum 5MB.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => photoInput.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1 rounded-lg border border-brand px-2.5 py-1.5 text-xs font-bold text-brand disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload"}
                </button>
                {form.photoKey && (
                  <button
                    onClick={() => void removePhoto()}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-muted-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <input
            ref={photoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadPhoto(file);
              event.target.value = "";
            }}
          />
        </section>

        <Section title="Personal information">
          <Field
            label="Full name"
            value={form.fullName}
            onChange={(value) => update("fullName", value)}
          />
          <Field
            label="Username"
            prefix="@"
            value={form.username}
            onChange={(value) => update("username", value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            hint="3–24 lowercase letters, numbers or underscores"
          />
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Role</span>
            <select
              value={form.role}
              onChange={(event) => update("role", event.target.value as ProfileDraft["role"])}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
            >
              <option value="farmer">Farmer</option>
              <option value="seller">Seller</option>
              <option value="buyer">Buyer</option>
              <option value="employer">Employer</option>
              <option value="agricultural_business">Agricultural Business</option>
            </select>
          </label>
          <TextArea
            label="Bio"
            value={form.bio}
            onChange={(value) => update("bio", value.slice(0, 280))}
            hint={`${form.bio.length}/280`}
          />
        </Section>

        <Section title="Contact & location">
          <Field
            label="Phone number"
            type="tel"
            value={form.phone}
            onChange={(value) => update("phone", value)}
          />
          <Field
            label="Email address"
            type="email"
            value={form.email}
            onChange={(value) => update("email", value)}
          />
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">State</span>
            <select
              value={form.state}
              onChange={(event) => update("state", event.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
            >
              <option value="">Select your state</option>
              {Object.keys(NIGERIA_STATES_LGAS)
                .sort()
                .map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
            </select>
          </label>
          <Field
            label="Location / town"
            value={form.location}
            onChange={(value) => update("location", value)}
            hint="For example: Sabon Gari, Kano"
          />
        </Section>

        <Section title="Professional information">
          <Field
            label="Agricultural interests"
            value={interestText}
            onChange={setInterestText}
            hint="Separate items with commas"
          />
          <Field
            label="Skills"
            value={skillsText}
            onChange={setSkillsText}
            hint="Separate items with commas"
          />
        </Section>

        <Section title="Profile privacy">
          <Choice
            label="Who can view your profile?"
            value={form.privacy.profileVisibility}
            options={["public", "farmx_members", "private"]}
            onChange={(value) =>
              update("privacy", {
                ...form.privacy,
                profileVisibility: value as ProfileDraft["privacy"]["profileVisibility"],
              })
            }
          />
          <Choice
            label="Who can message you?"
            value={form.privacy.messagePermission}
            options={["everyone", "farmx_members", "followers"]}
            onChange={(value) =>
              update("privacy", {
                ...form.privacy,
                messagePermission: value as ProfileDraft["privacy"]["messagePermission"],
              })
            }
          />
          <Choice
            label="Who can call you?"
            value={form.privacy.callPermission}
            options={["everyone", "farmx_members", "nobody"]}
            onChange={(value) =>
              update("privacy", {
                ...form.privacy,
                callPermission: value as ProfileDraft["privacy"]["callPermission"],
              })
            }
          />
          <Toggle
            label="Show followers publicly"
            on={form.privacy.showFollowers}
            set={(value) => update("privacy", { ...form.privacy, showFollowers: value })}
          />
          <Toggle
            label="Show profile activity publicly"
            on={form.privacy.showActivity}
            set={(value) => update("privacy", { ...form.privacy, showActivity: value })}
          />
          <Toggle
            label="Show business information publicly"
            on={form.privacy.showBusinessInfo}
            set={(value) => update("privacy", { ...form.privacy, showBusinessInfo: value })}
          />
        </Section>

        <section className="flex gap-2 rounded-2xl border border-brand/20 bg-brand/5 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p className="text-xs leading-5 text-muted-foreground">
            Profile data is validated and written through the authenticated FarmX Profile service.
            Privacy settings must also be enforced by backend authorization.
          </p>
        </section>
        {formError && (
          <p className="rounded-xl bg-brand/5 px-3 py-2 text-xs font-semibold text-brand">
            {formError}
          </p>
        )}
        {notice && (
          <p className="rounded-xl bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-700 dark:text-green-400">
            {notice}
          </p>
        )}
        <button
          onClick={() => void submit()}
          disabled={saving || uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-brand-foreground disabled:opacity-50"
        >
          {saving ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {saving ? "Saving Profile…" : "Save Profile"}
        </button>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  hint,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel";
  hint?: string;
  prefix?: string;
}) {
  return (
    <label className="block">
      <span className="flex justify-between gap-2 text-xs font-semibold text-muted-foreground">
        <span>{label}</span>
        {hint && <span className="font-normal">{hint}</span>}
      </span>
      <span className="relative mt-1 block">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-xl border border-border bg-background py-2.5 pr-3 text-sm outline-none focus:border-brand ${prefix ? "pl-7" : "px-3"}`}
        />
      </span>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="flex justify-between gap-2 text-xs font-semibold text-muted-foreground">
        <span>{label}</span>
        {hint && <span className="font-normal">{hint}</span>}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="mt-1 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
    </label>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (value: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-xs font-semibold text-muted-foreground">{label}</span>
      <button
        onClick={() => set(!on)}
        aria-pressed={on}
        className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-brand" : "bg-muted-foreground/30"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${on ? "left-5.5" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

function parseTags(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ].slice(0, 10);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to prepare preview image."));
    reader.readAsDataURL(blob);
  });
}

async function compressProfilePhoto(file: File): Promise<Blob> {
  const source = await createImageBitmap(file);
  const ratio = Math.min(1, 1200 / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * ratio));
  canvas.height = Math.max(1, Math.round(source.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare this image.");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  const compressed = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82),
  );
  if (!compressed) throw new Error("Unable to compress this image.");
  return compressed;
}

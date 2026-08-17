import { getS3ViewUrl, uploadFileToS3 } from "@/lib/s3-client";
import { MAX_LISTING_PHOTOS } from "@/lib/listing-media";
import { publishListing } from "@/lib/listing.functions";

export type ListingPhoto = {
  id: string;
  url: string;
  name: string;
  objectKey?: string;
  uploading?: boolean;
  error?: string;
  verified?: boolean;
  file?: File;
};

export type ListingFormState = {
  categoryId: string;
  subcategoryId: string;
  photos: ListingPhoto[];
  videoLink?: string;
  title: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dynamicFields: Record<string, any>;
  price: number | null;
  priceType: "fixed" | "negotiable" | "request" | "free";
  priceUnit?: string;
  negotiation: "Yes" | "No" | "Not sure";
  availability: "available" | "out_of_stock" | "pre_order" | "busy" | "appointment";
  quantity?: number;
  unit?: string;
  state: string;
  city: string;
  lga?: string;
  contactName: string;
  contactPhone: string;
  promoId: "none" | "top" | "premium";
};

export type ListingRepository = {
  mode: "preview" | "production";
  uploadPhoto: (file: File) => Promise<{ objectKey: string }>;
  publish: (data: ListingFormState) => Promise<{ id: string }>;
  saveDraft: (data: Partial<ListingFormState>) => void;
  getDraft: () => Partial<ListingFormState> | null;
  hydrateDraft: (draft: Partial<ListingFormState>) => Promise<Partial<ListingFormState>>;
  clearDraft: () => void;
};

const DRAFT_KEY = "farmx-ad-draft-v1";

type StoredPhoto = Pick<ListingPhoto, "id" | "name" | "objectKey">;

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
}

function normalizeDraft(raw: Partial<ListingFormState> | null): Partial<ListingFormState> | null {
  if (!raw) return null;
  return {
    ...raw,
    photos: Array.isArray(raw.photos)
      ? raw.photos.slice(0, MAX_LISTING_PHOTOS).map((photo, index) => ({
          ...photo,
          id: photo.id || `draft_photo_${index}`,
          uploading: false,
          file: undefined,
        }))
      : [],
  };
}

function readDraft(): Partial<ListingFormState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? normalizeDraft(JSON.parse(raw) as Partial<ListingFormState>) : null;
  } catch {
    window.localStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

function saveDraftToStorage(data: Partial<ListingFormState>) {
  if (typeof window === "undefined") return;
  const storedPhotos: StoredPhoto[] = (data.photos ?? [])
    .filter((photo) => Boolean(photo.objectKey) && !photo.error)
    .map(({ id, name, objectKey }) => ({ id, name, objectKey }));
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, photos: storedPhotos }));
}

async function hydrateProductionDraft(draft: Partial<ListingFormState>) {
  const photos = await Promise.all(
    (draft.photos ?? []).slice(0, MAX_LISTING_PHOTOS).map(async (photo, index) => {
      const normalized = {
        ...photo,
        id: photo.id || `draft_photo_${index}`,
        uploading: false,
        file: undefined,
      };
      if (!photo.objectKey) {
        return { ...normalized, url: "", error: "Upload this photo again.", verified: false };
      }
      try {
        return {
          ...normalized,
          url: await getS3ViewUrl(photo.objectKey),
          error: undefined,
          verified: true,
        };
      } catch {
        return {
          ...normalized,
          url: "",
          error: "Stored image could not be loaded. Try again.",
          verified: false,
        };
      }
    }),
  );
  return { ...draft, photos };
}

function createPreviewRepository(): ListingRepository {
  return {
    mode: "preview",
    uploadPhoto: async (file) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return { objectKey: `preview-${Date.now()}-${file.name}` };
    },
    publish: async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return { id: `listing-${Date.now()}` };
    },
    saveDraft: saveDraftToStorage,
    getDraft: readDraft,
    hydrateDraft: async (draft) => normalizeDraft(draft) ?? {},
    clearDraft: () => {
      if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
    },
  };
}

function createProductionRepository(): ListingRepository {
  return {
    mode: "production",
    uploadPhoto: (file) => uploadFileToS3("listings", file),
    publish: async (data) => {
      const promoDays = data.promoId === "premium" ? 30 : data.promoId === "top" ? 7 : 0;
      const result = await publishListing({
        data: {
          title: data.title,
          category: data.categoryId,
          subcategory: data.subcategoryId,
          photos: data.photos
            .map((photo) => photo.objectKey)
            .filter((key): key is string => Boolean(key)),
          videoLink: data.videoLink,
          location: [data.city, data.lga, data.state].filter(Boolean).join(", "),
          description: data.description,
          price: data.price,
          promoDays,
          metadata: {
            ...data.dynamicFields,
            priceType: data.priceType,
            priceUnit: data.priceUnit,
            negotiation: data.negotiation,
            availability: data.availability,
            quantity: data.quantity,
            unit: data.unit,
            lga: data.lga,
            contactName: data.contactName,
            contactPhone: data.contactPhone,
          },
        },
      });
      return { id: result.listingId };
    },
    saveDraft: saveDraftToStorage,
    getDraft: readDraft,
    hydrateDraft: hydrateProductionDraft,
    clearDraft: () => {
      if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
    },
  };
}

let repositoryPromise: Promise<ListingRepository> | undefined;

export async function getListingRepository(): Promise<ListingRepository> {
  if (!repositoryPromise) {
    const isProductionBuild =
      import.meta.env.PROD || import.meta.env.VITE_LISTING_PREVIEW === "false";
    repositoryPromise = Promise.resolve(
      isProductionBuild ? createProductionRepository() : createPreviewRepository(),
    );
  }
  return repositoryPromise;
}

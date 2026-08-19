import { MAX_LISTING_PHOTOS } from "@/lib/listing-media";
import { uploadFileToS3 } from "@/lib/s3-client";
import { publishListing } from "@/lib/listing.functions";
import { getS3ViewUrl } from "@/lib/s3-client";

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
  uploadPhoto: (file: File) => Promise<{ objectKey: string }>;
  publish: (data: ListingFormState) => Promise<{ id: string }>;
  saveDraft: (data: Partial<ListingFormState>) => void;
  getDraft: () => Partial<ListingFormState> | null;
  hydrateDraft: (draft: Partial<ListingFormState>) => Promise<Partial<ListingFormState>>;
  clearDraft: () => void;
};

let inMemoryDraft: Partial<ListingFormState> | null = null;
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
function readDraft() {
  return normalizeDraft(inMemoryDraft);
}
function saveDraft(data: Partial<ListingFormState>) {
  inMemoryDraft = normalizeDraft(data);
}

async function hydrateDraft(draft: Partial<ListingFormState>) {
  const photos = await Promise.all(
    (draft.photos ?? []).slice(0, MAX_LISTING_PHOTOS).map(async (photo, index) => {
      const normalized = {
        ...photo,
        id: photo.id || `draft_photo_${index}`,
        uploading: false,
        file: undefined,
      };
      if (!photo.objectKey)
        return { ...normalized, url: "", error: "Upload this photo again.", verified: false };
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

const productionRepository: ListingRepository = {
  uploadPhoto: (file) => uploadFileToS3("listings", file),
  async publish(data) {
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
  saveDraft,
  getDraft: readDraft,
  hydrateDraft,
  clearDraft: () => {
    inMemoryDraft = null;
  },
};

let repositoryPromise: Promise<ListingRepository> | undefined;
export async function getListingRepository(): Promise<ListingRepository> {
  repositoryPromise ??= Promise.resolve(productionRepository);
  return repositoryPromise;
}

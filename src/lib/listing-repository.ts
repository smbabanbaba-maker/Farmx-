import { uploadFileToS3 } from "@/lib/s3-client";
import { publishListing } from "@/lib/listing.functions";

export type ListingFormState = {
  categoryId: string;
  subcategoryId: string;
  photos: { url: string; name: string; objectKey?: string; uploading?: boolean; error?: string }[];
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
  clearDraft: () => void;
};

const DRAFT_KEY = "farmx-ad-draft-v1";

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
}

function createPreviewRepository(): ListingRepository {
  return {
    mode: "preview",
    uploadPhoto: async (file) => {
      await new Promise((r) => setTimeout(r, 1000));
      return { objectKey: `preview-${Date.now()}-${file.name}` };
    },
    publish: async (data) => {
      console.log("Preview Publish:", data);
      await new Promise((r) => setTimeout(r, 1500));
      return { id: `listing-${Date.now()}` };
    },
    saveDraft: (data) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      }
    },
    getDraft: () => {
      if (typeof window === "undefined") return null;
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    },
    clearDraft: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem(DRAFT_KEY);
      }
    },
  };
}

function createProductionRepository(): ListingRepository {
  return {
    mode: "production",
    uploadPhoto: async (file) => {
      return uploadFileToS3("listings", file);
    },
    publish: async (data) => {
      const promoDays = data.promoId === "premium" ? 30 : data.promoId === "top" ? 7 : 0;

      const result = await publishListing({
        data: {
          title: data.title,
          category: data.categoryId,
          subcategory: data.subcategoryId,
          photos: data.photos.map((p) => p.objectKey!).filter(Boolean),
          videoLink: data.videoLink,
          location: `${data.city}, ${data.state}`,
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
    saveDraft: (data) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      }
    },
    getDraft: () => {
      if (typeof window === "undefined") return null;
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    },
    clearDraft: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem(DRAFT_KEY);
      }
    },
  };
}

let repositoryPromise: Promise<ListingRepository> | undefined;

export async function getListingRepository(): Promise<ListingRepository> {
  if (!repositoryPromise) {
    const apiBaseUrl = getApiBaseUrl();
    const preview = import.meta.env.VITE_LISTING_PREVIEW !== "false" || !apiBaseUrl;
    repositoryPromise = Promise.resolve(
      preview ? createPreviewRepository() : createProductionRepository(),
    );
  }
  return repositoryPromise;
}

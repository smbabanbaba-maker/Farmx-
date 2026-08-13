import {
  deleteMyAd,
  getMyAds,
  getMyProfile,
  getProfileRuntimeMode,
  saveMyProfile,
  updateMyAdStatus,
  type FarmXProfile,
  type ProfileStats,
} from "@/lib/profile.functions";
import { profilePreviewSeed, type DevProfileState } from "@/lib/profile-dev-data";
import type { MyAd } from "@/lib/use-my-ads";

export type ProfileDataMode = "preview" | "production";
export type ProfileSnapshot = DevProfileState & { mode: ProfileDataMode };

export type ProfileRepository = {
  mode: ProfileDataMode;
  getSnapshot(): Promise<ProfileSnapshot>;
  getProfile(): Promise<{ profile: FarmXProfile | null; stats: ProfileStats }>;
  saveProfile(
    profile: Omit<FarmXProfile, "userId" | "createdAt" | "updatedAt" | "verification">,
  ): Promise<FarmXProfile>;
  getAds(): Promise<MyAd[]>;
  setAdStatus(listingId: string, status: string): Promise<void>;
  deleteAd(listingId: string): Promise<void>;
  updatePreview(mutator: (state: DevProfileState) => void): Promise<void>;
};

const PREVIEW_STORAGE_KEY = "farmx.profile.preview.v1";
let previewState: DevProfileState | null = null;
let modePromise: Promise<ProfileDataMode> | null = null;

function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function loadPreviewState() {
  if (previewState) return previewState;
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(PREVIEW_STORAGE_KEY);
      if (stored) {
        previewState = JSON.parse(stored) as DevProfileState;
        return previewState;
      }
    } catch {
      window.localStorage.removeItem(PREVIEW_STORAGE_KEY);
    }
  }
  previewState = copy(profilePreviewSeed);
  return previewState;
}

function persistPreviewState() {
  if (typeof window !== "undefined" && previewState) {
    window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(previewState));
  }
}

function previewStats(state: DevProfileState): ProfileStats {
  const activeAds = state.ads.filter((ad) => ad.status === "ACTIVE").length;
  return {
    ...state.stats,
    activeAds,
    totalAds: state.ads.length,
    totalAdViews: state.ads.reduce((total, ad) => total + ad.viewCount, 0),
    buyerInquiries: state.inquiries.filter((inquiry) => inquiry.status !== "closed").length,
    savedAds: state.savedAds.length,
    followers: state.people.filter((person) => person.followsYou).length,
    following: state.people.filter((person) => person.following).length,
    rating: state.reviews.filter((review) => review.direction === "received").length
      ? Number(
          (
            state.reviews
              .filter((review) => review.direction === "received")
              .reduce((sum, review) => sum + review.rating, 0) /
            state.reviews.filter((review) => review.direction === "received").length
          ).toFixed(1),
        )
      : null,
    reviews: state.reviews.filter((review) => review.direction === "received").length,
  };
}

const previewRepository: ProfileRepository = {
  mode: "preview",
  async getSnapshot() {
    const state = loadPreviewState();
    return { ...copy(state), stats: previewStats(state), mode: "preview" };
  },
  async getProfile() {
    const state = loadPreviewState();
    return { profile: copy(state.profile), stats: previewStats(state) };
  },
  async saveProfile(profile) {
    const state = loadPreviewState();
    state.profile = { ...state.profile, ...copy(profile), updatedAt: new Date().toISOString() };
    state.activity.unshift({
      id: `act_${Date.now()}`,
      type: "profile_updated",
      title: "Profile updated",
      detail: "Profile information was saved in preview.",
      occurredAt: new Date().toISOString(),
    });
    persistPreviewState();
    return copy(state.profile);
  },
  async getAds() {
    return copy(loadPreviewState().ads);
  },
  async setAdStatus(listingId, status) {
    const state = loadPreviewState();
    const ad = state.ads.find((entry) => entry.listingId === listingId);
    if (!ad) throw new Error("Advert not found.");
    ad.status = status;
    ad.updatedAt = new Date().toISOString();
    state.activity.unshift({
      id: `act_${Date.now()}`,
      type:
        status === "PAUSED"
          ? "ad_paused"
          : status === "CLOSED" || status === "SOLD"
            ? "ad_closed"
            : "ad_updated",
      title: `Advert ${status.toLowerCase()}`,
      detail: `${ad.title} was updated in preview.`,
      occurredAt: ad.updatedAt,
    });
    persistPreviewState();
  },
  async deleteAd(listingId) {
    const state = loadPreviewState();
    state.ads = state.ads.filter((ad) => ad.listingId !== listingId);
    persistPreviewState();
  },
  async updatePreview(mutator) {
    const state = loadPreviewState();
    mutator(state);
    persistPreviewState();
  },
};

const productionRepository: ProfileRepository = {
  mode: "production",
  async getSnapshot() {
    const { profile, stats } = await getMyProfile();
    return {
      mode: "production",
      profile: profile ?? ({} as FarmXProfile),
      stats,
      ads: await getMyAds(),
      inquiries: [],
      interactions: [],
      campaigns: [],
      wallet: { balance: 0, transactions: [] },
      subscription: { plan: "FREE", startedAt: "", expiresAt: "", autoRenew: false, history: [] },
      savedAds: [],
      people: [],
      reviews: [],
      verification: [],
      business: {
        name: "",
        category: "",
        description: "",
        location: "",
        phone: "",
        email: "",
        website: "",
        socialLinks: [],
        registrationInfo: "",
        verificationStatus: "not_started",
      },
      notifications: [],
      safety: { blockedUsers: [], reports: [] },
      tickets: [],
      activity: [],
    };
  },
  async getProfile() {
    const { profile, stats } = await getMyProfile();
    return { profile, stats };
  },
  async saveProfile(profile) {
    const result = await saveMyProfile({ data: profile });
    return result.profile;
  },
  async getAds() {
    return getMyAds();
  },
  async setAdStatus(listingId, status) {
    if (!["ACTIVE", "PAUSED", "SOLD", "UNAVAILABLE", "CLOSED"].includes(status)) {
      throw new Error("This advert status requires the production moderation service.");
    }
    await updateMyAdStatus({
      data: {
        listingId,
        status: status as "ACTIVE" | "PAUSED" | "SOLD" | "UNAVAILABLE" | "CLOSED",
      },
    });
  },
  async deleteAd(listingId) {
    await deleteMyAd({ data: { listingId } });
  },
  async updatePreview() {
    throw new Error("Preview state cannot be changed in production mode.");
  },
};

async function detectMode(): Promise<ProfileDataMode> {
  const requested = import.meta.env.VITE_PROFILE_DATA_MODE;
  if (requested === "preview") return "preview";
  if (requested === "production") return "production";
  try {
    const result = await getProfileRuntimeMode();
    return result.mode;
  } catch {
    return "preview";
  }
}

export async function getProfileRepository(): Promise<ProfileRepository> {
  modePromise ??= detectMode();
  return (await modePromise) === "production" ? productionRepository : previewRepository;
}

export function resetProfilePreviewData() {
  previewState = copy(profilePreviewSeed);
  persistPreviewState();
}

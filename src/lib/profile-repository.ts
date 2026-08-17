import {
  deleteMyAd,
  getMyAds,
  getMyProfile,
  saveMyProfile,
  updateMyAdStatus,
  type FarmXProfile,
  type ProfileStats,
} from "@/lib/profile.functions";
import type { MyAd } from "@/lib/use-my-ads";
import type { ProfileDataState } from "@/lib/profile-types";

export type ProfileDataMode = "preview" | "production";
export type ProfileSnapshot = ProfileDataState & { mode: ProfileDataMode };
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
  updatePreview(mutator: (state: ProfileDataState) => void): Promise<void>;
};

const emptySnapshot = (
  profile: FarmXProfile | null,
  stats: ProfileStats,
  ads: MyAd[],
): ProfileSnapshot => ({
  mode: "production",
  profile: profile ?? ({} as FarmXProfile),
  stats,
  ads,
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
});

const productionRepository: ProfileRepository = {
  mode: "production",
  async getSnapshot() {
    const [{ profile, stats }, ads] = await Promise.all([getMyProfile(), getMyAds()]);
    return emptySnapshot(profile, stats, ads);
  },
  getProfile: getMyProfile,
  async saveProfile(profile) {
    return (await saveMyProfile({ data: profile })).profile;
  },
  getAds: getMyAds,
  async setAdStatus(listingId, status) {
    if (!["ACTIVE", "PAUSED", "SOLD", "UNAVAILABLE", "CLOSED"].includes(status))
      throw new Error("This advert status requires the production moderation service.");
    await updateMyAdStatus({
      data: {
        listingId,
        status: status as "ACTIVE" | "PAUSED" | "SOLD" | "UNAVAILABLE" | "CLOSED",
      },
    });
  },
  deleteAd: async (listingId) => {
    await deleteMyAd({ data: { listingId } });
  },
  updatePreview: async () => {
    throw new Error("Profile changes must be saved through the authenticated profile service.");
  },
};

let repositoryPromise: Promise<ProfileRepository> | null = null;
export async function getProfileRepository(): Promise<ProfileRepository> {
  repositoryPromise ??= Promise.resolve(productionRepository);
  return repositoryPromise;
}

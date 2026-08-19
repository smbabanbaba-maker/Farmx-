import {
  deleteMyAd,
  getMyAds,
  getMyProfile,
  saveMyProfile,
  updateMyAd,
  updateMyAdStatus,
  type FarmXProfile,
  type ProfileStats,
} from "@/lib/profile.functions";
import type { MyAd } from "@/lib/use-my-ads";
import type { ProfileDataState } from "@/lib/profile-types";

export type ProfileSnapshot = ProfileDataState;
export type ProfileRepository = {
  getSnapshot(): Promise<ProfileSnapshot>;
  getProfile(): Promise<{ profile: FarmXProfile | null; stats: ProfileStats }>;
  saveProfile(
    profile: Omit<FarmXProfile, "userId" | "createdAt" | "updatedAt" | "verification">,
  ): Promise<FarmXProfile>;
  getAds(): Promise<MyAd[]>;
  updateAd(
    listingId: string,
    data: { title: string; price: number; location: string; status: string },
  ): Promise<void>;
  setAdStatus(listingId: string, status: string): Promise<void>;
  deleteAd(listingId: string): Promise<void>;
};

const emptySnapshot = (
  profile: FarmXProfile | null,
  stats: ProfileStats,
  ads: MyAd[],
): ProfileSnapshot => ({
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
  async getSnapshot() {
    const [{ profile, stats }, ads] = await Promise.all([getMyProfile(), getMyAds()]);
    return emptySnapshot(profile, stats, ads);
  },
  getProfile: getMyProfile,
  async saveProfile(profile) {
    return (await saveMyProfile({ data: profile })).profile;
  },
  getAds: getMyAds,
  async updateAd(listingId, data) {
    await updateMyAd({ data: { listingId, ...data } });
  },
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
};

let repositoryPromise: Promise<ProfileRepository> | null = null;
export async function getProfileRepository(): Promise<ProfileRepository> {
  repositoryPromise ??= Promise.resolve(productionRepository);
  return repositoryPromise;
}

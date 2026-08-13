import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ProfileServicePanels } from "@/components/ProfileServicePanels";
import { ProfileTrustPanels } from "@/components/ProfileTrustPanels";
import { useProfileData } from "@/lib/use-profile";
import { useMyAds, type MyAd } from "@/lib/use-my-ads";
import { getProfileRepository } from "@/lib/profile-repository";
import { useProfileSnapshot } from "@/lib/use-profile-snapshot";
import {
  ArrowLeft,
  BarChart3,
  BellRing,
  Building2,
  CircleHelp,
  Eye,
  Heart,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Phone,
  Pause,
  Pencil,
  Play,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/profile-center/$section")({
  component: ProfileCentreSection,
});

const CONTENT: Record<
  string,
  {
    title: string;
    description: string;
    empty: string;
    icon: typeof LayoutDashboard;
    action?: { label: string; to: string };
  }
> = {
  ads: {
    title: "My ads",
    description: "Manage the adverts you created on FarmX.",
    empty: "No adverts have been created from this account yet.",
    icon: LayoutDashboard,
    action: { label: "Post an advert", to: "/post-product" },
  },
  promotions: {
    title: "Pro sales",
    description: "Manage paid FarmX boosts, featured placements and campaigns.",
    empty: "No active promotional campaigns yet.",
    icon: Sparkles,
  },
  inquiries: {
    title: "Buyer inquiries",
    description: "People who contacted you about your adverts appear here.",
    empty: "No buyer inquiries yet.",
    icon: MessageSquareText,
  },
  interactions: {
    title: "My interactions",
    description: "Your recent marketplace conversations and activity.",
    empty: "No recent marketplace interactions yet.",
    icon: UsersRound,
  },
  saved: {
    title: "Saved ads",
    description: "Listings you save will appear here with their current availability.",
    empty: "No saved ads yet.",
    icon: Heart,
    action: { label: "Browse Market", to: "/market" },
  },
  analytics: {
    title: "Ad analytics",
    description: "Views, saves, inquiries and campaign performance from your adverts.",
    empty: "Analytics will appear once your adverts receive activity.",
    icon: BarChart3,
  },
  balance: {
    title: "FarmX balance",
    description:
      "Payments and credits for FarmX services such as subscriptions and promotions. This is not a product-payment wallet.",
    empty: "No FarmX service payments or credits yet.",
    icon: WalletCards,
  },
  services: {
    title: "Premium services",
    description: "Manage subscription limits, service payments and promotion access.",
    empty: "No premium service is active on this account.",
    icon: Sparkles,
    action: { label: "View plans", to: "/subscribe" },
  },
  reviews: {
    title: "Ratings & reviews",
    description: "Reviews from eligible and verified FarmX interactions.",
    empty: "No reviews yet.",
    icon: Star,
  },
  network: {
    title: "Followers & following",
    description: "People and businesses connected to your FarmX profile.",
    empty: "No followers or followed profiles yet.",
    icon: UsersRound,
  },
  verification: {
    title: "Seller verification",
    description: "Track phone, email, identity and business verification in one place.",
    empty: "Verification has not been started yet.",
    icon: ShieldCheck,
    action: { label: "Start verification", to: "/verify" },
  },
  business: {
    title: "Business profile",
    description: "Set up professional business information for your public FarmX presence.",
    empty: "No business profile has been created yet.",
    icon: Building2,
    action: { label: "Create business profile", to: "/company" },
  },
  safety: {
    title: "Safety & trust",
    description:
      "Safety advice, reports and blocked-user controls for classified marketplace interactions.",
    empty: "You have no open safety reports.",
    icon: ShieldCheck,
  },
  support: {
    title: "Help & support",
    description: "Find answers and get help with your FarmX account, advertisements and services.",
    empty: "You have no support tickets yet.",
    icon: CircleHelp,
    action: { label: "Open Help Centre", to: "/faq" },
  },
};

function ProfileCentreSection() {
  const { section } = Route.useParams();
  const content = CONTENT[section] ?? CONTENT.ads;
  const { status, stats, refresh } = useProfileData();
  const adData = useMyAds(section === "ads");
  const snapshot = useProfileSnapshot();
  const Icon = content.icon;

  return (
    <AppShell title={content.title}>
      <div className="space-y-4 pb-6">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </Link>
        <section className="rounded-2xl border border-border bg-card p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Icon className="h-5 w-5" />
          </span>
          <h1 className="mt-3 text-lg font-black">{content.title}</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{content.description}</p>
        </section>

        {section === "ads" ? (
          <MyAdsPanel {...adData} />
        ) : section === "inquiries" ? (
          <BuyerInquiriesPanel {...snapshot} />
        ) : section === "interactions" ? (
          <InteractionsPanel {...snapshot} />
        ) : ["promotions", "analytics", "balance", "services", "saved", "network"].includes(
            section,
          ) ? (
          <ProfileServicePanels
            section={
              section as "promotions" | "analytics" | "balance" | "services" | "saved" | "network"
            }
            snapshot={snapshot}
          />
        ) : ["reviews", "verification", "business", "safety", "support", "activity"].includes(
            section,
          ) ? (
          <ProfileTrustPanels
            section={
              section as "reviews" | "verification" | "business" | "safety" | "support" | "activity"
            }
            snapshot={snapshot}
          />
        ) : (
          <StandardProfilePanel content={content} status={status} stats={stats} refresh={refresh} />
        )}
      </div>
    </AppShell>
  );
}

function BuyerInquiriesPanel({
  status,
  data,
  error,
  refresh,
}: ReturnType<typeof useProfileSnapshot>) {
  if (status === "loading") return <div className="h-52 animate-pulse rounded-2xl bg-muted" />;
  if (status === "error" || !data) return <ErrorPanel message={error} retry={refresh} />;
  if (!data.inquiries.length)
    return <EmptyPanel icon={MessageSquareText} text="No buyer inquiries yet." />;
  return (
    <section className="space-y-3">
      {data.inquiries.map((inquiry) => (
        <article key={inquiry.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-black text-brand">
              {inquiry.buyerInitials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold">{inquiry.buyerName}</h2>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    About: {inquiry.adTitle}
                  </p>
                </div>
                <Status label={inquiry.status} />
              </div>
              <p className="mt-2 text-xs leading-5 text-foreground">“{inquiry.lastMessage}”</p>
              <p className="mt-2 text-[10px] text-muted-foreground">
                {formatDate(inquiry.date)} · Last interaction in FarmX chat
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/messages"
              className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-brand-foreground"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Chat
            </Link>
            {inquiry.phoneAvailable && (
              <a
                href="tel:+2348000000000"
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold"
              >
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            )}
            <Link
              to="/product/$id"
              params={{ id: inquiry.adId }}
              className="rounded-lg border border-border px-3 py-2 text-xs font-bold"
            >
              View ad
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}

function InteractionsPanel({
  status,
  data,
  error,
  refresh,
}: ReturnType<typeof useProfileSnapshot>) {
  if (status === "loading") return <div className="h-52 animate-pulse rounded-2xl bg-muted" />;
  if (status === "error" || !data) return <ErrorPanel message={error} retry={refresh} />;
  if (!data.interactions.length)
    return <EmptyPanel icon={UsersRound} text="No recent marketplace interactions yet." />;
  return (
    <section className="space-y-3">
      {data.interactions.map((interaction) => (
        <article
          key={interaction.id}
          className="flex gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <MessageSquareText className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-bold">{interaction.title}</h2>
              <span className="text-[10px] text-muted-foreground">
                {formatDate(interaction.occurredAt)}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{interaction.detail}</p>
            {interaction.kind === "conversation" && (
              <Link
                to="/messages"
                className="mt-3 inline-flex rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
              >
                Open chats
              </Link>
            )}
            {interaction.kind === "contacted_ad" && (
              <Link
                to="/market"
                className="mt-3 inline-flex rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
              >
                Browse Market
              </Link>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

function MyAdsPanel({ status, ads, error, refresh }: ReturnType<typeof useMyAds>) {
  const [filter, setFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const filtered = useMemo(() => {
    if (filter === "ALL") return ads;
    if (filter === "CLOSED_SOLD")
      return ads.filter((ad) => ad.status === "CLOSED" || ad.status === "SOLD");
    return ads.filter((ad) => ad.status === filter);
  }, [ads, filter]);
  const tabs = ["ALL", "ACTIVE", "PENDING", "DRAFT", "EXPIRED", "REJECTED", "CLOSED_SOLD"];

  const setStatus = async (
    ad: MyAd,
    nextStatus: "ACTIVE" | "PAUSED" | "SOLD" | "UNAVAILABLE" | "CLOSED",
  ) => {
    setBusyId(ad.listingId);
    setNotice(null);
    try {
      const repository = await getProfileRepository();
      await repository.setAdStatus(ad.listingId, nextStatus);
      await refresh();
      setNotice(`${ad.title} is now ${nextStatus.toLowerCase()}.`);
    } catch (actionError) {
      setNotice(
        actionError instanceof Error ? actionError.message : "Unable to update this advert.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (ad: MyAd) => {
    if (!window.confirm(`Delete “${ad.title}”? This cannot be undone.`)) return;
    setBusyId(ad.listingId);
    setNotice(null);
    try {
      const repository = await getProfileRepository();
      await repository.deleteAd(ad.listingId);
      await refresh();
      setNotice("Advert deleted successfully.");
    } catch (actionError) {
      setNotice(
        actionError instanceof Error ? actionError.message : "Unable to delete this advert.",
      );
    } finally {
      setBusyId(null);
    }
  };

  if (status === "loading" || status === "idle")
    return <div className="h-52 animate-pulse rounded-2xl bg-muted" />;
  if (status === "error") return <ErrorPanel message={error} retry={refresh} />;

  return (
    <section className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${filter === tab ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card text-muted-foreground"}`}
          >
            {tab === "ALL"
              ? "All"
              : tab === "CLOSED_SOLD"
                ? "Closed / Sold"
                : tab[0] + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {notice && (
        <p className="rounded-xl bg-brand/5 px-3 py-2 text-xs font-semibold text-brand">{notice}</p>
      )}
      {filtered.length === 0 ? (
        <EmptyPanel
          icon={LayoutDashboard}
          text="No adverts in this status yet."
          action={{ label: "Post an advert", to: "/post-product" }}
        />
      ) : (
        filtered.map((ad) => (
          <MyAdCard
            key={ad.listingId}
            ad={ad}
            busy={busyId === ad.listingId}
            onStatus={setStatus}
            onDelete={remove}
          />
        ))
      )}
    </section>
  );
}

function MyAdCard({
  ad,
  busy,
  onStatus,
  onDelete,
}: {
  ad: MyAd;
  busy: boolean;
  onStatus: (
    ad: MyAd,
    status: "ACTIVE" | "PAUSED" | "SOLD" | "UNAVAILABLE" | "CLOSED",
  ) => Promise<void>;
  onDelete: (ad: MyAd) => Promise<void>;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-3">
      <div className="flex gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-center text-[10px] font-bold text-brand">
          {ad.imageKeys.length
            ? `${ad.imageKeys.length} photo${ad.imageKeys.length === 1 ? "" : "s"}`
            : "No photo"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="truncate text-sm font-bold">{ad.title}</h2>
            <Status label={ad.status} />
          </div>
          <p className="mt-0.5 text-sm font-black text-brand">₦{ad.price.toLocaleString()}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" /> {ad.region} ·{" "}
            {new Date(ad.createdAt).toLocaleDateString()}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
            <span>
              <Eye className="mr-0.5 inline h-3 w-3" />
              {ad.viewCount} views
            </span>
            <span>{ad.savedCount} saves</span>
            <span>{ad.inquiryCount} inquiries</span>
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/product/$id"
          params={{ id: ad.listingId }}
          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold"
        >
          View
        </Link>
        <Link
          to="/edit-ad/$id"
          params={{ id: ad.listingId }}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Link>
        {ad.status === "EXPIRED" && (
          <button
            disabled={busy}
            onClick={() => void onStatus(ad, "ACTIVE")}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold"
          >
            Renew
          </button>
        )}
        <Link
          to="/profile-center/$section"
          params={{ section: "promotions" }}
          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold"
        >
          Boost
        </Link>
        <Link
          to="/profile-center/$section"
          params={{ section: "promotions" }}
          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold"
        >
          Feature
        </Link>
        <button
          onClick={() =>
            void (navigator.share
              ? navigator.share({
                  title: ad.title,
                  url: `${window.location.origin}/product/${ad.listingId}`,
                })
              : navigator.clipboard.writeText(`${window.location.origin}/product/${ad.listingId}`))
          }
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold"
        >
          <Share2 className="h-3 w-3" />
          Share
        </button>
        {ad.status === "ACTIVE" ? (
          <button
            disabled={busy}
            onClick={() => void onStatus(ad, "PAUSED")}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold"
          >
            <Pause className="h-3 w-3" />
            Pause
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={() => void onStatus(ad, "ACTIVE")}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold"
          >
            <Play className="h-3 w-3" />
            Resume
          </button>
        )}
        {ad.status !== "SOLD" && (
          <button
            disabled={busy}
            onClick={() => void onStatus(ad, "SOLD")}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold"
          >
            Mark sold
          </button>
        )}
        {ad.status !== "UNAVAILABLE" && (
          <button
            disabled={busy}
            onClick={() => void onStatus(ad, "UNAVAILABLE")}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold"
          >
            Unavailable
          </button>
        )}
        <button
          disabled={busy}
          onClick={() => void onDelete(ad)}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-brand/30 px-2.5 py-1.5 text-xs font-bold text-brand"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>
    </article>
  );
}

function StandardProfilePanel({
  content,
  status,
  stats,
  refresh,
}: {
  content: (typeof CONTENT)[string];
  status: ReturnType<typeof useProfileData>["status"];
  stats: ReturnType<typeof useProfileData>["stats"];
  refresh: () => Promise<void>;
}) {
  const Icon = content.icon;
  if (status === "loading") return <div className="h-36 animate-pulse rounded-2xl bg-muted" />;
  if (status === "error")
    return (
      <ErrorPanel
        message="This private Profile data is not available yet. Sign in with Cognito and configure the Profile service to load your own records."
        retry={refresh}
      />
    );
  return (
    <EmptyPanel
      icon={Icon}
      text={content.empty}
      detail={
        content.title === "analytics" && stats
          ? `${stats.totalAdViews} recorded ad views`
          : undefined
      }
      action={content.action}
    />
  );
}

function ErrorPanel({ message, retry }: { message: string | null; retry: () => Promise<void> }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 text-center">
      <BellRing className="mx-auto h-7 w-7 text-brand" />
      <p className="mt-3 text-sm font-bold">This private Profile data is not available yet.</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{message}</p>
      <button
        onClick={() => void retry()}
        className="mt-4 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-brand-foreground"
      >
        Retry
      </button>
    </section>
  );
}
function EmptyPanel({
  icon: Icon,
  text,
  detail,
  action,
}: {
  icon: typeof LayoutDashboard;
  text: string;
  detail?: string;
  action?: { label: string; to: string };
}) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-card p-7 text-center">
      <Icon className="mx-auto h-8 w-8 text-brand" />
      <p className="mt-3 text-sm font-bold">{text}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        FarmX only shows activity that belongs to your authenticated account; it does not invent
        statistics.
      </p>
      {action && (
        <Link
          to={action.to}
          className="mt-4 inline-flex rounded-lg bg-brand px-3 py-2 text-xs font-bold text-brand-foreground"
        >
          {action.label}
        </Link>
      )}
    </section>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function Status({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-muted px-2 py-1 text-[9px] font-black text-muted-foreground">
      {label.replace("_", " ")}
    </span>
  );
}

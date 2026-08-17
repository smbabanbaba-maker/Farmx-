import { useEffect, useRef, useState } from "react";
import { getCommunityRepository } from "@/lib/community-repository";
import { ListingImage } from "@/components/ListingImage";
import {
  COMMUNITY_TOPICS,
  type CommunityListingReference,
  type CommunityMedia,
  type CommunityPost,
  type CommunityPostType,
  type CommunityTopic,
} from "@/lib/community.types";
import { getMarketRepository } from "@/lib/market-repository";
import type { MarketListing } from "@/lib/market-dev-data";
import {
  AlertCircle,
  Camera,
  Check,
  ChevronDown,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Play,
  Search,
  ShoppingBag,
  Sparkles,
  Video,
  X,
} from "lucide-react";

type DraftMedia = CommunityMedia & { file?: File; uploadError?: string; uploading?: boolean };
const POST_TYPES: { id: CommunityPostType; label: string; helper: string }[] = [
  { id: "text", label: "Text post", helper: "Share an update or thought" },
  { id: "question", label: "Question", helper: "Ask the Community" },
  { id: "farm_update", label: "Farm update", helper: "Share progress from your work" },
  { id: "advice", label: "Advice / Knowledge", helper: "Teach something useful" },
  { id: "discussion", label: "Discussion", helper: "Start a thoughtful conversation" },
  { id: "photo", label: "Photo post", helper: "Share one or more images" },
  { id: "video", label: "Video post", helper: "Share a short video" },
  { id: "announcement", label: "Announcement", helper: "For authorised FarmX accounts" },
];

export function CommunityComposer({
  onClose,
  onCreated,
  initialPost,
}: {
  onClose: () => void;
  onCreated: () => void;
  initialPost?: CommunityPost;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState(initialPost?.content ?? "");
  const [postType, setPostType] = useState<CommunityPostType>(initialPost?.postType ?? "text");
  const [topic, setTopic] = useState<CommunityTopic>(initialPost?.topic ?? "general");
  const [media, setMedia] = useState<DraftMedia[]>(initialPost?.media ?? []);
  const [listing, setListing] = useState<CommunityListingReference | undefined>();
  const [state, setState] = useState(initialPost?.location?.state ?? "");
  const [city, setCity] = useState(initialPost?.location?.city ?? "");
  const [area, setArea] = useState(initialPost?.location?.area ?? "");
  const [topicOpen, setTopicOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [listingOpen, setListingOpen] = useState(false);
  const [listingSearch, setListingSearch] = useState("");
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listingOpen) return;
    let active = true;
    void getMarketRepository()
      .then((repository) => repository.getListings({ query: listingSearch, page: 1, pageSize: 8 }))
      .then((page) => {
        if (active) setListings(page.listings);
      })
      .catch(() => {
        if (active) setListings([]);
      });
    return () => {
      active = false;
    };
  }, [listingOpen, listingSearch]);

  const chooseFiles = async (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).slice(0, 10 - media.length);
    if (!selected.length) return;
    setError(null);
    const repository = await getCommunityRepository();
    for (const file of selected) {
      const localId = `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const draft: DraftMedia = {
        id: localId,
        kind: file.type.startsWith("video/") ? "video" : "image",
        url: URL.createObjectURL(file),
        file,
        uploading: true,
      };
      setMedia((current) => [...current, draft]);
      try {
        const uploaded = await repository.uploadMedia(file);
        setMedia((current) =>
          current.map((item) =>
            item.id === localId
              ? { ...item, ...uploaded, file: undefined, uploading: false }
              : item,
          ),
        );
      } catch (reason) {
        setMedia((current) =>
          current.map((item) =>
            item.id === localId
              ? {
                  ...item,
                  uploading: false,
                  uploadError: reason instanceof Error ? reason.message : "Upload failed.",
                }
              : item,
          ),
        );
      }
    }
  };
  const removeMedia = (id: string) =>
    setMedia((current) =>
      current.filter((item) => {
        if (item.id === id && item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
        return item.id !== id;
      }),
    );
  const retryMedia = async (item: DraftMedia) => {
    if (!item.file) return;
    removeMedia(item.id);
    const transfer = new DataTransfer();
    transfer.items.add(item.file);
    await chooseFiles(transfer.files);
  };
  const chooseListing = (item: MarketListing) => {
    setListing({
      id: item.id,
      title: item.title,
      price: item.price,
      image: item.images[0] || item.imagePlaceholder,
      location: `${item.city}, ${item.state}`,
      status:
        item.status === "published"
          ? "published"
          : item.status === "closed"
            ? "closed"
            : "unavailable",
    });
    setListingOpen(false);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (content.trim().length < 2) {
      setError("Write a little more so the Community can understand your post.");
      return;
    }
    if (media.some((item) => item.uploading || item.uploadError)) {
      setError("Finish or remove failed media uploads before posting.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const repository = await getCommunityRepository();
      const input = {
        content: content.trim(),
        postType,
        topic,
        media: media.map(
          ({ id: _id, file: _file, uploadError: _error, uploading: _uploading, ...item }) => item,
        ),
        listing: listing ?? initialPost?.listing,
        location:
          state || city || area
            ? { state: state || undefined, city: city || undefined, area: area || undefined }
            : undefined,
      };
      if (initialPost) await repository.updatePost(initialPost.id, input);
      else await repository.createPost(input);
      onCreated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your post could not be published.");
    } finally {
      setSaving(false);
    }
  };
  const selectedType = POST_TYPES.find((item) => item.id === postType) ?? POST_TYPES[0];
  const selectedTopic =
    COMMUNITY_TOPICS.find((item) => item.id === topic) ??
    COMMUNITY_TOPICS[COMMUNITY_TOPICS.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
              FarmX Community
            </p>
            <h2 className="mt-1 text-lg font-black">
              {initialPost ? "Edit post" : "Create a post"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-accent"
            aria-label="Close composer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-3 rounded-2xl bg-brand/[0.04] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-black text-brand-foreground">
              Y
            </div>
            <div>
              <p className="text-xs font-black">Your Community post</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Share only information you are comfortable making public.
              </p>
            </div>
          </div>
          <textarea
            autoFocus
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={5000}
            rows={6}
            placeholder="What's on your mind? Ask a question, share an update, or help someone learn…"
            className="w-full resize-none rounded-2xl border border-border bg-background p-3 text-sm leading-relaxed outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          <div className="flex justify-end text-[10px] text-muted-foreground">
            {content.length.toLocaleString()} / 5,000
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Selector
              label="Post type"
              value={selectedType.label}
              detail={selectedType.helper}
              open={typeOpen}
              onToggle={() => {
                setTypeOpen((value) => !value);
                setTopicOpen(false);
              }}
            >
              <div className="grid gap-1 p-1">
                {POST_TYPES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPostType(item.id);
                      setTypeOpen(false);
                    }}
                    className={`rounded-xl px-3 py-2 text-left text-[11px] font-bold hover:bg-brand/10 ${item.id === postType ? "bg-brand/10 text-brand" : ""}`}
                  >
                    <span className="block">{item.label}</span>
                    <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                      {item.helper}
                    </span>
                  </button>
                ))}
              </div>
            </Selector>
            <Selector
              label="Topic"
              value={selectedTopic.label}
              detail="Choose one topic"
              open={topicOpen}
              onToggle={() => {
                setTopicOpen((value) => !value);
                setTypeOpen(false);
              }}
            >
              <div className="grid max-h-64 gap-1 overflow-y-auto p-1">
                {COMMUNITY_TOPICS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTopic(item.id);
                      setTopicOpen(false);
                    }}
                    className={`rounded-xl px-3 py-2 text-left text-[11px] font-bold hover:bg-brand/10 ${item.id === topic ? "bg-brand/10 text-brand" : ""}`}
                  >
                    {item.label}
                    <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                      {item.group}
                    </span>
                  </button>
                ))}
              </div>
            </Selector>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-[11px] font-black text-muted-foreground hover:border-brand hover:text-brand"
            >
              <Camera className="h-4 w-4" /> Photo / video
            </button>
            <button
              type="button"
              onClick={() => setListingOpen(true)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[11px] font-black ${listing ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground hover:border-brand hover:text-brand"}`}
            >
              <ShoppingBag className="h-4 w-4" /> {listing ? "Listing attached" : "Share listing"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              multiple
              className="hidden"
              onChange={(event) => {
                void chooseFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </div>
          {media.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {media.map((item) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-black"
                >
                  {item.kind === "video" ? (
                    <video
                      src={item.url}
                      controls
                      playsInline
                      preload="metadata"
                      className="aspect-square h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt=""
                      className="aspect-square h-full w-full object-cover"
                    />
                  )}
                  {item.uploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-white">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="mt-1 text-[10px] font-bold">Uploading…</span>
                    </div>
                  )}
                  {item.uploadError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/80 p-2 text-center text-white">
                      <AlertCircle className="h-5 w-5" />
                      <span className="mt-1 text-[10px] font-bold">{item.uploadError}</span>
                      <button
                        type="button"
                        onClick={() => void retryMedia(item)}
                        className="mt-2 rounded-lg bg-white/20 px-2 py-1 text-[10px] font-black"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(item.id)}
                    className="absolute right-1.5 top-1.5 rounded-lg bg-black/65 p-1.5 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                    aria-label="Remove media"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {listing && (
            <div className="flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand/[0.04] p-3">
              <ListingThumb image={listing.image} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black">{listing.title}</p>
                <p className="mt-1 truncate text-[10px] text-muted-foreground">
                  {listing.location ?? "FarmX Market"}
                  {listing.price != null ? ` · ₦${listing.price.toLocaleString()}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setListing(undefined)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
                aria-label="Remove listing"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <details className="rounded-2xl border border-border">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 text-[11px] font-black">
              <MapPin className="h-4 w-4 text-brand" /> Add general location{" "}
              <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
            </summary>
            <div className="grid gap-2 border-t border-border p-3 sm:grid-cols-3">
              <input
                value={state}
                onChange={(event) => setState(event.target.value)}
                placeholder="State"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-brand"
              />
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="City"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-brand"
              />
              <input
                value={area}
                onChange={(event) => setArea(event.target.value)}
                placeholder="Area (optional)"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-brand"
              />
            </div>
          </details>
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
        <div className="sticky bottom-0 flex gap-2 border-t border-border bg-card/95 p-4 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 text-xs font-black"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !content.trim()}
            className="flex-1 rounded-xl bg-brand py-3 text-xs font-black text-brand-foreground disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />{" "}
                {initialPost ? "Save changes" : "Post to Community"}
              </>
            )}
          </button>
        </div>
        {listingOpen && (
          <ListingPicker
            listings={listings}
            search={listingSearch}
            onSearch={setListingSearch}
            onSelect={chooseListing}
            onClose={() => setListingOpen(false)}
          />
        )}
      </form>
    </div>
  );
}

function Selector({
  label,
  value,
  detail,
  open,
  onToggle,
  children,
}: {
  label: string;
  value: string;
  detail: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="w-full rounded-2xl border border-border p-3 text-left transition hover:border-brand"
      >
        <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        <span className="mt-1 block truncate text-xs font-black">{value}</span>
        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{detail}</span>
        <ChevronDown
          className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-border bg-card p-1 shadow-2xl">
          {children}
        </div>
      )}
    </div>
  );
}
function ListingPicker({
  listings,
  search,
  onSearch,
  onSelect,
  onClose,
}: {
  listings: MarketListing[];
  search: string;
  onSearch: (value: string) => void;
  onSelect: (listing: MarketListing) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
              FarmX Market
            </p>
            <h3 className="mt-1 text-base font-black">Choose a listing to share</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-accent"
            aria-label="Close listing picker"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search your Market listings…"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs outline-none focus:border-brand"
          />
        </div>
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {listings.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              No matching published listings.
            </div>
          ) : (
            listings.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border p-2.5 text-left hover:border-brand"
              >
                <ListingThumb image={item.imagePlaceholder} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-black">{item.title}</span>
                  <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                    {item.city}, {item.state}
                    {item.price != null ? ` · ₦${item.price.toLocaleString()}` : ""}
                  </span>
                </span>
                <Check className="h-4 w-4 text-brand" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
function ListingThumb({ image }: { image?: string }) {
  return (
    <div className="flex h-11 w-14 items-center justify-center overflow-hidden rounded-xl bg-brand/10 text-brand">
      <ListingImage
        src={image}
        alt="Attached FarmX listing"
        placeholder=""
        className="h-full w-full object-cover"
      />
      {!image && <ShoppingBag className="h-4 w-4" />}
    </div>
  );
}

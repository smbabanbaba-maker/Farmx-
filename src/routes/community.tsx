import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useCommunity } from "@/lib/community-store";
import { CommunityComposer } from "@/components/CommunityComposer";
import { COMMUNITY_TOPICS, type CommunityPost, type CommunityTopic } from "@/lib/community.types";
import {
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Flag,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Share2,
  Sparkles,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — FarmX" },
      {
        name: "description",
        content: "Ask questions, share farming knowledge, and connect with the FarmX community.",
      },
    ],
  }),
  component: Community,
});

function Community() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const {
    feed,
    loading,
    loadingMore,
    error,
    query,
    refresh,
    loadMore,
    setTab,
    setTopic,
    setSearch,
    likePost,
    savePost,
    sharePost,
    followUser,
  } = useCommunity();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void refresh({ tab: query.tab, topic: query.topic, search: query.search });
  }, [query.tab, query.topic]);

  const activeTopic = useMemo(
    () => COMMUNITY_TOPICS.find((topic) => topic.id === query.topic),
    [query.topic],
  );

  if (pathname.startsWith("/community/")) return <Outlet />;

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    void refresh({ search: searchInput.trim() || undefined, tab: query.tab, topic: query.topic });
  };

  const handleShare = async (post: CommunityPost) => {
    try {
      const url = await sharePost(post.id);
      const absolute = typeof window === "undefined" ? url : `${window.location.origin}${url}`;
      if (typeof navigator !== "undefined" && navigator.share)
        await navigator
          .share({
            title: `${post.author.name} on FarmX Community`,
            text: post.content.slice(0, 120),
            url: absolute,
          })
          .catch(() => undefined);
      else await navigator.clipboard?.writeText(absolute);
      setNotice("Community post link copied.");
    } catch {
      setNotice("This post could not be shared right now.");
    }
    window.setTimeout(() => setNotice(null), 2400);
  };

  return (
    <AppShell title={t("community")}>
      <div className="mx-auto max-w-3xl space-y-4 pb-8">
        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
                FarmX network
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight">Community</h1>
              <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">
                Ask questions, share experience, and learn from people building better farms and
                businesses.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen((value) => !value)}
              className="rounded-xl p-2.5 text-muted-foreground transition hover:bg-accent hover:text-brand"
              aria-label="Search Community"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
          {searchOpen && (
            <form onSubmit={submitSearch} className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search posts, topics, people…"
                  className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-brand px-4 text-xs font-black text-brand-foreground"
              >
                Search
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-brand/35 bg-brand/[0.04] p-3 text-left transition hover:bg-brand/[0.08]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-foreground">
              <Plus className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black">Create a Community post</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                Share a question, farm update, advice, or discussion.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-brand" />
          </button>
        </section>

        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Community feed tabs"
        >
          {(["latest", "popular", "following"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={query.tab === tab}
              onClick={() => setTab(tab)}
              className={`shrink-0 rounded-full border px-4 py-2.5 text-[11px] font-black capitalize transition ${query.tab === tab ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-brand"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setTopic(undefined)}
            className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-black ${!query.topic ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}
          >
            All topics
          </button>
          {COMMUNITY_TOPICS.slice(0, 12).map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => setTopic(topic.id)}
              className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-bold transition ${query.topic === topic.id ? "border-brand bg-brand/10 text-brand" : "border-border bg-card text-muted-foreground hover:border-brand/30"}`}
            >
              {topic.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="shrink-0 rounded-full border border-border p-2 text-muted-foreground"
            aria-label="Find a topic"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {activeTopic && (
          <div className="flex items-center justify-between rounded-2xl border border-brand/15 bg-brand/[0.04] px-3 py-2.5">
            <span className="text-[11px] font-bold text-brand">Showing {activeTopic.label}</span>
            <button
              type="button"
              onClick={() => setTopic(undefined)}
              className="rounded-lg p-1 text-brand"
              aria-label="Clear topic"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {notice && (
          <div
            className="rounded-xl bg-foreground px-3 py-2.5 text-center text-xs font-bold text-background"
            role="status"
          >
            {notice}
          </div>
        )}

        {loading ? (
          <CommunitySkeleton />
        ) : error ? (
          <CommunityError onRetry={() => void refresh(query)} />
        ) : feed.posts.length === 0 ? (
          <CommunityEmpty
            following={query.tab === "following"}
            onCreate={() => setComposerOpen(true)}
            onDiscover={() => {
              setTab("latest");
              setTopic(undefined);
            }}
          />
        ) : (
          <div className="space-y-3">
            {feed.posts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                onLike={() =>
                  void likePost(post.id).catch(() => setNotice("Like could not be updated."))
                }
                onSave={() =>
                  void savePost(post.id).catch(() => setNotice("Save could not be updated."))
                }
                onShare={() => void handleShare(post)}
                onFollow={() => void followUser(post.author.id, post.author.username)}
              />
            ))}
            {feed.hasMore && (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="mx-auto flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-black text-muted-foreground transition hover:border-brand hover:text-brand disabled:opacity-60"
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}{" "}
                Load more
              </button>
            )}
          </div>
        )}

        <div className="flex items-start gap-2 rounded-2xl border border-border bg-card p-3">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Community is for discussion and knowledge sharing. Product listings remain in Market,
            and FarmX does not process private payments here.
          </p>
        </div>
      </div>
      {composerOpen && (
        <CommunityComposer
          onClose={() => setComposerOpen(false)}
          onCreated={() => {
            setComposerOpen(false);
            setNotice("Your Community post was published.");
            void refresh({ tab: "latest", topic: query.topic, search: query.search });
            window.setTimeout(() => setNotice(null), 2400);
          }}
        />
      )}
    </AppShell>
  );
}

function CommunityPostCard({
  post,
  onLike,
  onSave,
  onShare,
  onFollow,
}: {
  post: CommunityPost;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onFollow: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Link to="/u/$username" params={{ username: post.author.username }} className="shrink-0">
            <Avatar author={post.author} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Link
                    to="/u/$username"
                    params={{ username: post.author.username }}
                    className="truncate text-sm font-black hover:text-brand"
                  >
                    {post.author.name}
                  </Link>
                  {(post.author.verified || post.author.official) && (
                    <CheckCircle2
                      className="h-3.5 w-3.5 shrink-0 text-brand"
                      aria-label={post.author.official ? "FarmX Official" : "Verified user"}
                    />
                  )}
                </div>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  @{post.author.username} {post.author.role ? `· ${post.author.role}` : ""} ·{" "}
                  {relativeTime(post.createdAt)}
                  {post.edited ? " · Edited" : ""}
                </p>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((value) => !value)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                  aria-label="Post options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-9 z-10 w-40 rounded-xl border border-border bg-card p-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => setHidden(true)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-bold hover:bg-accent"
                    >
                      <X className="h-3.5 w-3.5" /> Hide post
                    </button>
                    <button
                      type="button"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-bold text-destructive hover:bg-destructive/5"
                    >
                      <Flag className="h-3.5 w-3.5" /> Report post
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-brand">
              {post.topic.replaceAll("-", " ")}
            </p>
          </div>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{post.content}</p>
        {post.media.length > 0 && <MediaGallery media={post.media} />}
        {post.listing && (
          <Link
            to="/product/$id"
            params={{ id: post.listing.id }}
            className="mt-4 flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand/[0.035] p-3 transition hover:border-brand/45"
          >
            <ListingImage image={post.listing.image} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black">{post.listing.title}</p>
              <p className="mt-1 truncate text-[10px] text-muted-foreground">
                {post.listing.location ?? "FarmX Market"}
                {post.listing.price != null ? ` · ₦${post.listing.price.toLocaleString()}` : ""}
              </p>
              <p className="mt-1 text-[10px] font-black text-brand">
                {post.listing.status === "sold"
                  ? "Listing sold"
                  : post.listing.status === "unavailable"
                    ? "No longer available"
                    : "View listing"}
                <ChevronRight className="ml-1 inline h-3 w-3" />
              </p>
            </div>
          </Link>
        )}
      </div>
      <div className="flex items-center gap-1 border-t border-border px-3 py-2.5">
        <button
          type="button"
          onClick={onLike}
          className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-[11px] font-bold transition hover:bg-accent ${post.likedByMe ? "text-brand" : "text-muted-foreground"}`}
          aria-label={post.likedByMe ? "Unlike post" : "Like post"}
        >
          <Heart className={`h-4 w-4 ${post.likedByMe ? "fill-current" : ""}`} />
          {post.likeCount > 0 && post.likeCount}
        </button>
        <Link
          to="/community/$id"
          params={{ id: post.id }}
          className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-[11px] font-bold text-muted-foreground transition hover:bg-accent"
          aria-label="Open comments"
        >
          <MessageCircle className="h-4 w-4" />
          {post.commentCount > 0 && post.commentCount}
        </Link>
        <button
          type="button"
          onClick={onShare}
          className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-[11px] font-bold text-muted-foreground transition hover:bg-accent"
          aria-label="Share post"
        >
          <Share2 className="h-4 w-4" />
          {post.shareCount > 0 && post.shareCount}
        </button>
        <button
          type="button"
          onClick={onSave}
          className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-[11px] font-bold transition hover:bg-accent ${post.savedByMe ? "text-brand" : "text-muted-foreground"}`}
          aria-label={post.savedByMe ? "Unsave post" : "Save post"}
        >
          <Bookmark className={`h-4 w-4 ${post.savedByMe ? "fill-current" : ""}`} />
          {post.saveCount > 0 && post.saveCount}
        </button>
        {post.author.id !== "preview-user" && !post.followingAuthor && (
          <button
            type="button"
            onClick={onFollow}
            className="hidden min-h-9 items-center gap-1 rounded-xl px-2 text-[10px] font-black text-brand hover:bg-brand/10 sm:flex"
          >
            <UserPlus className="h-3.5 w-3.5" /> Follow
          </button>
        )}
      </div>
    </article>
  );
}

function Avatar({ author }: { author: CommunityPost["author"] }) {
  return author.photo?.startsWith("http") ? (
    <img
      src={author.photo}
      alt=""
      loading="lazy"
      decoding="async"
      className="h-10 w-10 rounded-full border border-border object-cover"
    />
  ) : (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-sm font-black text-brand">
      {author.name.slice(0, 1).toUpperCase()}
    </div>
  );
}
function ListingImage({ image }: { image?: string }) {
  return image?.startsWith("http") ? (
    <img
      src={image}
      alt=""
      loading="lazy"
      decoding="async"
      className="h-12 w-16 rounded-xl object-cover"
    />
  ) : (
    <div className="flex h-12 w-16 items-center justify-center rounded-xl bg-brand/10 text-brand">
      <Sparkles className="h-5 w-5" />
    </div>
  );
}
function MediaGallery({ media }: { media: CommunityPost["media"] }) {
  return (
    <div
      className={`mt-4 grid gap-1.5 overflow-hidden rounded-2xl ${media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
    >
      {media.slice(0, 4).map((item) =>
        item.kind === "video" ? (
          <div key={item.id} className="relative aspect-video bg-black">
            <video
              src={item.url}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
              aria-label={item.alt ?? "Community video"}
            />
            <Play className="pointer-events-none absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-white opacity-70" />
          </div>
        ) : (
          <img
            key={item.id}
            src={item.url}
            alt={item.alt ?? "Community post media"}
            loading="lazy"
            className="aspect-square h-full w-full object-cover"
          />
        ),
      )}
    </div>
  );
}
function CommunitySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-3xl border border-border bg-card p-5">
          <div className="flex gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-2 w-1/4 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="mt-5 h-3 w-11/12 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-5 h-36 animate-pulse rounded-2xl bg-muted" />
        </div>
      ))}
    </div>
  );
}
function CommunityError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-destructive/20 bg-destructive/5 px-6 py-16 text-center">
      <RefreshCw className="mx-auto h-8 w-8 text-destructive" />
      <h2 className="mt-3 text-sm font-black">Unable to load Community.</h2>
      <p className="mt-1 text-xs text-muted-foreground">Check your connection and try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground"
      >
        Retry
      </button>
    </div>
  );
}
function CommunityEmpty({
  following,
  onCreate,
  onDiscover,
}: {
  following: boolean;
  onCreate: () => void;
  onDiscover: () => void;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Sparkles className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-base font-black">
        {following ? "You’re not following anyone yet" : "Welcome to FarmX Community"}
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
        {following
          ? "Follow people whose experience helps you learn and grow."
          : "Ask questions, share your farming experience, and connect with other people."}
      </p>
      <button
        type="button"
        onClick={following ? onDiscover : onCreate}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground"
      >
        {following ? <Users className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        {following ? "Discover Community" : "Create First Post"}
      </button>
    </div>
  );
}
function ComposerPlaceholder({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
              Community composer
            </p>
            <h2 className="mt-1 text-lg font-black">Create a post</h2>
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
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          The full composer will support text, topic, image/video upload, questions, and shared
          Market listings. Your feed is currently connected to the real Community data layer.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-brand py-3 text-xs font-black text-brand-foreground"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "recently";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

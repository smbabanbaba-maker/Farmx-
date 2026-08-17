import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useCommunity } from "@/lib/community-store";
import { CommunityComposer } from "@/components/CommunityComposer";
import { getCommunityRepository } from "@/lib/community-repository";
import {
  COMMUNITY_REPORT_REASONS,
  type CommunityComment,
  type CommunityPost,
  type CommunityReportReason,
} from "@/lib/community.types";
import {
  ArrowLeft,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronRight,
  Flag,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Share2,
  Shield,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";

export const Route = createFileRoute("/community/$id")({
  head: () => ({
    meta: [
      { title: "Community post — FarmX" },
      { name: "description", content: "Read and join the discussion on FarmX Community." },
    ],
  }),
  component: CommunityPostPage,
});

function CommunityPostPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { repository: sharedRepository } = useCommunity();
  const [repository, setRepository] = useState(sharedRepository);
  const [viewerId, setViewerId] = useState("");
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | undefined>();
  const [postingComment, setPostingComment] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    kind: "post" | "comment";
    commentId?: string;
  }>({ kind: "post" });
  const [reportReason, setReportReason] = useState<CommunityReportReason>("other");
  const [reportDetails, setReportDetails] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextRepository = repository ?? (await getCommunityRepository());
      const [nextPost, page, nextViewerId] = await Promise.all([
        nextRepository.getPost(id),
        nextRepository.getComments(id),
        nextRepository.getViewerId(),
      ]);
      setRepository(nextRepository);
      setViewerId(nextViewerId);
      setPost(nextPost);
      setComments(page.comments);
      if (!nextPost) setError("This post is no longer available.");
    } catch {
      setError("Unable to load this Community post.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [id]);

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!repository || !post || !commentText.trim() || postingComment) return;
    setPostingComment(true);
    try {
      const created = await repository.createComment({
        postId: post.id,
        content: commentText.trim(),
        parentId: replyingTo,
      });
      setComments((current) =>
        replyingTo
          ? current.map((comment) =>
              comment.id === replyingTo
                ? { ...comment, replies: [...(comment.replies ?? []), created] }
                : comment,
            )
          : [...current, created],
      );
      setPost((current) =>
        current ? { ...current, commentCount: current.commentCount + 1 } : current,
      );
      setCommentText("");
      setReplyingTo(undefined);
    } catch {
      setNotice("Your comment could not be posted.");
    } finally {
      setPostingComment(false);
    }
  };
  const toggleLike = async () => {
    if (!repository || !post) return;
    const liked = post.likedByMe;
    setPost({
      ...post,
      likedByMe: !liked,
      likeCount: Math.max(0, post.likeCount + (liked ? -1 : 1)),
    });
    try {
      await repository.togglePostLike(post.id);
    } catch {
      setPost({ ...post, likedByMe: liked, likeCount: post.likeCount });
    }
  };
  const toggleSave = async () => {
    if (!repository || !post) return;
    const saved = post.savedByMe;
    setPost({
      ...post,
      savedByMe: !saved,
      saveCount: Math.max(0, post.saveCount + (saved ? -1 : 1)),
    });
    try {
      await repository.togglePostSave(post.id);
    } catch {
      setPost({ ...post, savedByMe: saved, saveCount: post.saveCount });
    }
  };
  const share = async () => {
    if (!repository || !post) return;
    try {
      const result = await repository.sharePost(post.id);
      const url = `${window.location.origin}${result.url}`;
      if (navigator.share)
        await navigator
          .share({
            title: `${post.author.name} on FarmX Community`,
            text: post.content.slice(0, 120),
            url,
          })
          .catch(() => undefined);
      else await navigator.clipboard?.writeText(url);
      setPost({ ...post, shareCount: post.shareCount + (result.shared ? 1 : 0) });
      setNotice("Community post link copied.");
    } catch {
      setNotice("This post could not be shared.");
    }
    window.setTimeout(() => setNotice(null), 2200);
  };
  const follow = async () => {
    if (!repository || !post) return;
    try {
      const result = await repository.toggleFollow(post.author.id, post.author.username);
      setPost({ ...post, followingAuthor: result.following });
    } catch {
      setNotice("Follow could not be updated.");
    }
  };
  const likeComment = async (commentId: string) => {
    if (!repository || !post) return;
    try {
      const result = await repository.toggleCommentLike(post.id, commentId);
      setComments((current) =>
        updateComment(current, commentId, (comment) => ({
          ...comment,
          likedByMe: result.liked,
          likeCount: Math.max(0, comment.likeCount + (result.liked ? 1 : -1)),
        })),
      );
    } catch {
      setNotice("Comment like could not be updated.");
    }
  };
  const markBest = async (commentId: string) => {
    if (!repository || !post) return;
    try {
      await repository.markBestAnswer(post.id, commentId);
      setComments((current) =>
        current.map((comment) => ({ ...comment, accepted: comment.id === commentId })),
      );
      setNotice("Best answer saved.");
    } catch {
      setNotice("Only the question owner can choose a best answer.");
    }
  };
  const submitReport = async () => {
    if (!repository || !post) return;
    try {
      if (reportTarget.kind === "comment" && reportTarget.commentId)
        await repository.reportComment({
          postId: post.id,
          commentId: reportTarget.commentId,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        });
      else
        await repository.reportPost({
          postId: post.id,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        });
      setReportOpen(false);
      setReportDetails("");
      setNotice("Thanks. Your report was sent to FarmX moderation.");
    } catch {
      setNotice("The report could not be submitted.");
    }
  };
  const isOwner = post?.author.id === viewerId;
  const deletePost = async () => {
    if (!repository || !post || !isOwner) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this post?")) return;
    try {
      await repository.deletePost(post.id);
      await navigate({ to: "/community" });
    } catch {
      setNotice("This post could not be deleted.");
    }
  };

  return (
    <AppShell title="Community">
      <div className="mx-auto max-w-2xl space-y-4 pb-8">
        <Link
          to="/community"
          className="inline-flex items-center gap-1.5 text-xs font-black text-muted-foreground hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Community
        </Link>
        {loading ? (
          <PostDetailSkeleton />
        ) : error || !post ? (
          <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-brand" />
            <h1 className="mt-3 text-base font-black">
              {error ?? "This post is no longer available."}
            </h1>
            <p className="mt-2 text-xs text-muted-foreground">
              The post may have been deleted or is not available to your account.
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : (
          <>
            <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <Link to="/u/$username" params={{ username: post.author.username }}>
                    <Avatar post={post} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            to="/u/$username"
                            params={{ username: post.author.username }}
                            className="text-sm font-black hover:text-brand"
                          >
                            {post.author.name}
                          </Link>
                          {(post.author.verified || post.author.official) && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          @{post.author.username} {post.author.role ? `· ${post.author.role}` : ""}{" "}
                          · {relativeTime(post.createdAt)}
                          {post.edited ? " · Edited" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {isOwner && (
                          <>
                            <button
                              type="button"
                              onClick={() => setComposerOpen(true)}
                              className="rounded-lg px-2 py-1.5 text-[10px] font-black text-brand hover:bg-brand/10"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deletePost()}
                              className="rounded-lg px-2 py-1.5 text-[10px] font-black text-destructive hover:bg-destructive/5"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setReportTarget({ kind: "post" });
                            setReportOpen((value) => !value);
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                          aria-label="Post moderation options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-brand">
                      {post.topic.replaceAll("-", " ")}
                    </p>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{post.content}</p>
                {post.media.length > 0 && (
                  <div className="mt-4 grid gap-1.5 overflow-hidden rounded-2xl sm:grid-cols-2">
                    {post.media.map((item) =>
                      item.kind === "video" ? (
                        <video
                          key={item.id}
                          src={item.url}
                          controls
                          playsInline
                          preload="metadata"
                          className="aspect-video w-full rounded-xl bg-black object-cover"
                        />
                      ) : (
                        <img
                          key={item.id}
                          src={item.url}
                          alt={item.alt ?? "Community post media"}
                          className="max-h-[28rem] w-full rounded-xl object-cover"
                        />
                      ),
                    )}
                  </div>
                )}
                {post.listing && (
                  <Link
                    to="/product/$id"
                    params={{ id: post.listing.id }}
                    className="mt-4 flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand/[0.035] p-3"
                  >
                    <div className="flex h-12 w-16 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black">{post.listing.title}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {post.listing.location ?? "FarmX Market"}
                        {post.listing.price != null
                          ? ` · ₦${post.listing.price.toLocaleString()}`
                          : ""}
                      </p>
                      <p className="mt-1 text-[10px] font-black text-brand">
                        {post.listing.status === "sold"
                          ? "Listing sold"
                          : post.listing.status === "unavailable" ||
                              post.listing.status === "closed"
                            ? "No longer available"
                            : "View listing"}
                        <ChevronRight className="ml-1 inline h-3 w-3" />
                      </p>
                    </div>
                  </Link>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={toggleLike}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black ${post.likedByMe ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-accent"}`}
                  >
                    <Heart className={`h-4 w-4 ${post.likedByMe ? "fill-current" : ""}`} />{" "}
                    {post.likeCount}
                  </button>
                  <button
                    type="button"
                    onClick={share}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black text-muted-foreground hover:bg-accent"
                  >
                    <Share2 className="h-4 w-4" /> {post.shareCount}
                  </button>
                  <button
                    type="button"
                    onClick={toggleSave}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black ${post.savedByMe ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-accent"}`}
                  >
                    <Bookmark className={`h-4 w-4 ${post.savedByMe ? "fill-current" : ""}`} />{" "}
                    {post.savedByMe ? "Saved" : "Save"}
                  </button>
                  {Boolean(viewerId) && post.author.id !== viewerId && (
                    <button
                      type="button"
                      onClick={follow}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-brand/25 px-3 py-2 text-xs font-black text-brand hover:bg-brand/10"
                    >
                      <UserPlus className="h-4 w-4" />{" "}
                      {post.followingAuthor ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
                {reportOpen && (
                  <div className="mt-3 space-y-2 rounded-xl bg-destructive/5 p-3 text-[11px] font-bold text-destructive">
                    <p>
                      Report {reportTarget.kind === "comment" ? "this comment" : "this post"} if it
                      violates Community rules.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={reportReason}
                        onChange={(event) =>
                          setReportReason(event.target.value as CommunityReportReason)
                        }
                        className="rounded-lg border border-destructive/15 bg-card px-2.5 py-2 text-[11px] text-foreground outline-none"
                      >
                        <option value="spam">Spam</option>
                        <option value="scam">Scam</option>
                        <option value="harassment">Harassment</option>
                        <option value="false_information">False information</option>
                        <option value="inappropriate">Inappropriate content</option>
                        <option value="prohibited">Prohibited content</option>
                        <option value="duplicate">Duplicate</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        value={reportDetails}
                        onChange={(event) => setReportDetails(event.target.value)}
                        maxLength={1000}
                        placeholder="Optional explanation"
                        className="rounded-lg border border-destructive/15 bg-card px-2.5 py-2 text-[11px] text-foreground outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReportOpen(false)}
                        className="rounded-lg px-2.5 py-1.5 text-[10px] font-black text-muted-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitReport()}
                        className="rounded-lg bg-destructive px-3 py-1.5 text-[10px] font-black text-white"
                      >
                        Submit report
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>
            <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black">Discussion</h2>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}. Keep
                    replies helpful and respectful.
                  </p>
                </div>
                <MessageCircle className="h-5 w-5 text-brand" />
              </div>
              <form onSubmit={submitComment} className="mt-4 flex items-end gap-2">
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  rows={2}
                  placeholder={replyingTo ? "Write a reply…" : "Add a helpful comment…"}
                  className="min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background p-3 text-xs outline-none focus:border-brand"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || postingComment}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-foreground disabled:opacity-50"
                  aria-label="Post comment"
                >
                  {postingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              </form>
              {replyingTo && (
                <button
                  type="button"
                  onClick={() => setReplyingTo(undefined)}
                  className="mt-2 text-[10px] font-bold text-muted-foreground hover:text-brand"
                >
                  Cancel reply
                </button>
              )}
              <div className="mt-5 space-y-4">
                {comments.length === 0 ? (
                  <p className="rounded-2xl bg-muted/50 px-4 py-8 text-center text-xs text-muted-foreground">
                    No comments yet. Be the first to add a helpful answer.
                  </p>
                ) : (
                  comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      onLike={() => void likeComment(comment.id)}
                      onReply={() => setReplyingTo(comment.id)}
                      onBest={() => void markBest(comment.id)}
                      onReport={() => {
                        setReportTarget({ kind: "comment", commentId: comment.id });
                        setReportOpen(true);
                      }}
                      canChooseBest={
                        Boolean(viewerId) &&
                        post.author.id === viewerId &&
                        post.postType === "question"
                      }
                    />
                  ))
                )}
              </div>
            </section>
            <div className="flex items-start gap-2 rounded-2xl border border-brand/15 bg-brand/[0.04] p-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                FarmX Community is for public discussion. Do not share OTPs, private addresses,
                phone numbers, or payment details in comments.
              </p>
            </div>
          </>
        )}
        {notice && (
          <div
            className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background shadow-xl"
            role="status"
          >
            {notice}
          </div>
        )}
      </div>
      {composerOpen && post && (
        <CommunityComposer
          initialPost={post}
          onClose={() => setComposerOpen(false)}
          onCreated={() => {
            setComposerOpen(false);
            void load();
            setNotice("Your post was updated.");
          }}
        />
      )}
    </AppShell>
  );
}

function CommentItem({
  comment,
  onLike,
  onReply,
  onBest,
  onReport,
  canChooseBest,
}: {
  comment: CommunityComment;
  onLike: () => void;
  onReply: () => void;
  onBest: () => void;
  onReport: () => void;
  canChooseBest: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${comment.accepted ? "border-brand/35 bg-brand/[0.04]" : "border-border"}`}
    >
      <div className="flex gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-black text-brand">
          {comment.author.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black">{comment.author.name}</p>
            {comment.accepted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-1 text-[9px] font-black text-brand">
                <Check className="h-3 w-3" /> Best answer
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            @{comment.author.username} · {relativeTime(comment.createdAt)}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed">{comment.content}</p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onLike}
              className={`inline-flex items-center gap-1 text-[10px] font-bold ${comment.likedByMe ? "text-brand" : "text-muted-foreground"}`}
            >
              <Heart className={`h-3.5 w-3.5 ${comment.likedByMe ? "fill-current" : ""}`} />
              {comment.likeCount}
            </button>
            <button
              type="button"
              onClick={onReply}
              className="text-[10px] font-bold text-muted-foreground hover:text-brand"
            >
              Reply
            </button>
            {canChooseBest && !comment.accepted && (
              <button
                type="button"
                onClick={onBest}
                className="text-[10px] font-bold text-brand hover:underline"
              >
                Mark best
              </button>
            )}
            <button
              type="button"
              onClick={onReport}
              className="ml-auto text-muted-foreground hover:text-destructive"
              aria-label="Report comment"
            >
              <Flag className="h-3.5 w-3.5" />
            </button>
          </div>
          {comment.replies?.length ? (
            <div className="mt-3 space-y-2 border-l-2 border-brand/20 pl-3">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="rounded-xl bg-muted/35 p-2.5">
                  <p className="text-[11px] font-black">{reply.author.name}</p>
                  <p className="mt-1 text-[11px] leading-relaxed">{reply.content}</p>
                  <p className="mt-1 text-[9px] text-muted-foreground">
                    {relativeTime(reply.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
function Avatar({ post }: { post: CommunityPost }) {
  return post.author.photo?.startsWith("http") ? (
    <img src={post.author.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
  ) : (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-sm font-black text-brand">
      {post.author.name.slice(0, 1).toUpperCase()}
    </div>
  );
}
function PostDetailSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((item) => (
        <div key={item} className="rounded-3xl border border-border bg-card p-5">
          <div className="flex gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-2 w-1/4 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="mt-5 h-24 animate-pulse rounded bg-muted" />
          <div className="mt-5 h-10 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
function updateComment(
  comments: CommunityComment[],
  id: string,
  update: (comment: CommunityComment) => CommunityComment,
) {
  return comments.map((comment) =>
    comment.id === id
      ? update(comment)
      : {
          ...comment,
          replies: comment.replies?.map((reply) => (reply.id === id ? update(reply) : reply)),
        },
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

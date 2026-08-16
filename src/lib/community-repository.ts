import {
  getCommunityRuntimeMode,
  getCommunityViewer,
  createCommunityComment,
  createCommunityPost,
  deleteCommunityPost,
  getCommunityComments,
  getCommunityFeed,
  getCommunityPost,
  getSavedCommunityPosts,
  markCommunityAnswer,
  reportCommunityComment,
  reportCommunityPost,
  shareCommunityPost,
  toggleCommunityCommentLike,
  toggleCommunityFollow,
  toggleCommunityPostLike,
  toggleCommunityPostSave,
  updateCommunityPost,
} from "@/lib/community.functions";
import { getS3ViewUrl, uploadFileToS3 } from "@/lib/s3-client";
import {
  COMMUNITY_TOPICS,
  type CommunityComment,
  type CommunityFeed,
  type CommunityFeedTab,
  type CommunityMedia,
  type CommunityPost,
  type CommunityTopic,
  type CreateCommunityCommentInput,
  type CreateCommunityPostInput,
} from "@/lib/community.types";
import type { CommunityReportReason } from "@/lib/community.types";

export type CommunityQuery = {
  tab?: CommunityFeedTab;
  topic?: CommunityTopic;
  search?: string;
  cursor?: string;
  limit?: number;
};
export type CommunityRepository = {
  mode: "preview" | "production";
  getViewerId: () => Promise<string>;
  getFeed: (query?: CommunityQuery) => Promise<CommunityFeed>;
  getPost: (postId: string) => Promise<CommunityPost | null>;
  getSavedPosts: () => Promise<CommunityPost[]>;
  createPost: (input: CreateCommunityPostInput) => Promise<CommunityPost>;
  updatePost: (postId: string, input: CreateCommunityPostInput) => Promise<CommunityPost>;
  deletePost: (postId: string) => Promise<void>;
  togglePostLike: (postId: string) => Promise<{ liked: boolean }>;
  togglePostSave: (postId: string) => Promise<{ saved: boolean }>;
  sharePost: (postId: string) => Promise<{ url: string; shared: boolean }>;
  getComments: (
    postId: string,
    cursor?: string,
  ) => Promise<{ comments: CommunityComment[]; nextCursor?: string; hasMore: boolean }>;
  createComment: (input: CreateCommunityCommentInput) => Promise<CommunityComment>;
  toggleCommentLike: (postId: string, commentId: string) => Promise<{ liked: boolean }>;
  markBestAnswer: (postId: string, commentId: string) => Promise<void>;
  toggleFollow: (targetUserId: string, targetUsername: string) => Promise<{ following: boolean }>;
  reportPost: (input: {
    postId: string;
    reason: CommunityReportReason;
    details?: string;
  }) => Promise<void>;
  reportComment: (input: {
    postId: string;
    commentId: string;
    reason: CommunityReportReason;
    details?: string;
  }) => Promise<void>;
  uploadMedia: (
    file: File,
  ) => Promise<{ kind: "image" | "video"; url: string; objectKey?: string }>;
};

type PreviewState = {
  posts: CommunityPost[];
  comments: CommunityComment[];
  likedPostIds: string[];
  savedPostIds: string[];
  sharedPostIds: string[];
  followingUserIds: string[];
  reports: {
    postId: string;
    commentId?: string;
    reason: CommunityReportReason;
    details?: string;
    createdAt: string;
  }[];
};

const STORAGE_KEY = "farmx-community-v1";
const PREVIEW_ACTOR = {
  id: "preview-user",
  name: "You",
  username: "you",
  role: "FarmX member",
  verified: false,
  official: false,
} as const;
const emptyState: PreviewState = {
  posts: [],
  comments: [],
  likedPostIds: [],
  savedPostIds: [],
  sharedPostIds: [],
  followingUserIds: [],
  reports: [],
};

function readPreview(): PreviewState {
  if (typeof window === "undefined") return emptyState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<PreviewState>;
    return {
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
      likedPostIds: Array.isArray(parsed.likedPostIds) ? parsed.likedPostIds : [],
      savedPostIds: Array.isArray(parsed.savedPostIds) ? parsed.savedPostIds : [],
      sharedPostIds: Array.isArray(parsed.sharedPostIds) ? parsed.sharedPostIds : [],
      followingUserIds: Array.isArray(parsed.followingUserIds) ? parsed.followingUserIds : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
    };
  } catch {
    return emptyState;
  }
}
function writePreview(next: PreviewState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* preview storage is best effort */
  }
}
function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}
function topicLabel(topic: CommunityTopic) {
  return COMMUNITY_TOPICS.find((item) => item.id === topic)?.label ?? topic;
}
function hydratePreviewPost(post: CommunityPost, state: PreviewState): CommunityPost {
  const comments = state.comments.filter(
    (comment) => comment.postId === post.id && !comment.deleted,
  );
  return {
    ...post,
    likeCount: post.likeCount,
    commentCount: comments.length,
    shareCount: post.shareCount,
    saveCount: post.saveCount,
    likedByMe: state.likedPostIds.includes(post.id),
    savedByMe: state.savedPostIds.includes(post.id),
    followingAuthor: state.followingUserIds.includes(post.author.id),
  };
}
function buildCommentTree(comments: CommunityComment[]) {
  const roots = comments
    .filter((comment) => !comment.parentId)
    .map((comment) => ({
      ...comment,
      replies: comments.filter((reply) => reply.parentId === comment.id),
    }));
  return roots;
}
function dataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The media preview could not be created."));
    reader.readAsDataURL(file);
  });
}
function validateMedia(file: File) {
  const isVideo = file.type === "video/mp4" || file.type === "video/webm";
  const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  if (!isImage && !isVideo) throw new Error("Use JPG, PNG, WEBP, MP4, or WEBM media.");
  const max = isVideo ? 80 * 1024 * 1024 : 12 * 1024 * 1024;
  if (file.size > max)
    throw new Error(
      isVideo ? "Videos must be 80MB or smaller." : "Images must be 12MB or smaller.",
    );
  return isVideo ? ("video" as const) : ("image" as const);
}

function createPreviewRepository(): CommunityRepository {
  return {
    mode: "preview",
    getViewerId: async () => PREVIEW_ACTOR.id,
    getFeed: async (query = {}) => {
      const state = readPreview();
      let posts = state.posts.filter(
        (post) => !post.deleted && (!query.topic || post.topic === query.topic),
      );
      const term = query.search?.trim().toLowerCase();
      if (term)
        posts = posts.filter((post) =>
          `${post.content} ${post.topic} ${post.author.name} ${post.author.username}`
            .toLowerCase()
            .includes(term),
        );
      posts = posts.map((post) => hydratePreviewPost(post, state));
      if (query.tab === "following") posts = posts.filter((post) => post.followingAuthor);
      if (query.tab === "popular")
        posts.sort(
          (a, b) =>
            b.likeCount +
            b.commentCount * 2 +
            b.shareCount * 3 +
            b.saveCount -
            (a.likeCount + a.commentCount * 2 + a.shareCount * 3 + a.saveCount),
        );
      else posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const offset = Number(query.cursor ?? 0);
      const limit = Math.min(query.limit ?? 20, 30);
      const page = posts.slice(offset, offset + limit);
      return {
        posts: page,
        nextCursor: offset + limit < posts.length ? String(offset + limit) : undefined,
        hasMore: offset + limit < posts.length,
      };
    },
    getPost: async (postId) => {
      const state = readPreview();
      const post = state.posts.find((item) => item.id === postId && !item.deleted);
      return post ? hydratePreviewPost(post, state) : null;
    },
    getSavedPosts: async () => {
      const state = readPreview();
      return state.posts
        .filter((post) => state.savedPostIds.includes(post.id) && !post.deleted)
        .map((post) => ({ ...hydratePreviewPost(post, state), savedByMe: true }));
    },
    createPost: async (input) => {
      const state = readPreview();
      const now = new Date().toISOString();
      const post: CommunityPost = {
        id: `community_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        author: PREVIEW_ACTOR,
        content: input.content.trim(),
        postType: input.postType,
        topic: input.topic,
        media: (input.media ?? []).map((media) => ({
          ...media,
          id: `media_${Math.random().toString(36).slice(2, 8)}`,
        })),
        listing: input.listing,
        location: input.location,
        createdAt: now,
        updatedAt: now,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        saveCount: 0,
        likedByMe: false,
        savedByMe: false,
        followingAuthor: false,
      };
      writePreview({ ...state, posts: [post, ...state.posts] });
      return post;
    },
    updatePost: async (postId, input) => {
      const state = readPreview();
      const existing = state.posts.find((post) => post.id === postId);
      if (!existing || existing.author.id !== PREVIEW_ACTOR.id)
        throw new Error("You can only edit your own Community post.");
      const updated: CommunityPost = {
        ...existing,
        content: input.content.trim(),
        postType: input.postType,
        topic: input.topic,
        media: (input.media ?? []).map((media) => ({
          ...media,
          id: `media_${Math.random().toString(36).slice(2, 8)}`,
        })),
        listing: input.listing,
        location: input.location,
        updatedAt: new Date().toISOString(),
        edited: true,
      };
      writePreview({
        ...state,
        posts: state.posts.map((post) => (post.id === postId ? updated : post)),
      });
      return updated;
    },
    deletePost: async (postId) => {
      const state = readPreview();
      const post = state.posts.find((item) => item.id === postId);
      if (!post || post.author.id !== PREVIEW_ACTOR.id)
        throw new Error("You can only delete your own Community post.");
      writePreview({
        ...state,
        posts: state.posts.map((item) =>
          item.id === postId
            ? { ...item, deleted: true, updatedAt: new Date().toISOString() }
            : item,
        ),
      });
    },
    togglePostLike: async (postId) => {
      const state = readPreview();
      const liked = state.likedPostIds.includes(postId);
      const nextState = {
        ...state,
        likedPostIds: toggle(state.likedPostIds, postId),
        posts: state.posts.map((post) =>
          post.id === postId
            ? { ...post, likeCount: Math.max(0, post.likeCount + (liked ? -1 : 1)) }
            : post,
        ),
      };
      writePreview(nextState);
      return { liked: !liked };
    },
    togglePostSave: async (postId) => {
      const state = readPreview();
      const saved = state.savedPostIds.includes(postId);
      const nextState = {
        ...state,
        savedPostIds: toggle(state.savedPostIds, postId),
        posts: state.posts.map((post) =>
          post.id === postId
            ? { ...post, saveCount: Math.max(0, post.saveCount + (saved ? -1 : 1)) }
            : post,
        ),
      };
      writePreview(nextState);
      return { saved: !saved };
    },
    sharePost: async (postId) => {
      const state = readPreview();
      const shared = state.sharedPostIds.includes(postId);
      const nextState = shared
        ? state
        : {
            ...state,
            sharedPostIds: [...state.sharedPostIds, postId],
            posts: state.posts.map((post) =>
              post.id === postId ? { ...post, shareCount: post.shareCount + 1 } : post,
            ),
          };
      writePreview(nextState);
      return { shared: !shared, url: `/community?post=${encodeURIComponent(postId)}` };
    },
    getComments: async (postId) => {
      const state = readPreview();
      const comments = buildCommentTree(
        state.comments.filter((comment) => comment.postId === postId && !comment.deleted),
      );
      return { comments, hasMore: false };
    },
    createComment: async (input) => {
      const state = readPreview();
      const now = new Date().toISOString();
      const comment: CommunityComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        postId: input.postId,
        parentId: input.parentId,
        author: PREVIEW_ACTOR,
        content: input.content.trim(),
        createdAt: now,
        updatedAt: now,
        likeCount: 0,
        likedByMe: false,
      };
      writePreview({ ...state, comments: [...state.comments, comment] });
      return comment;
    },
    toggleCommentLike: async (postId, commentId) => {
      const state = readPreview();
      const comments = state.comments.map((comment) => {
        if (comment.id !== commentId || comment.postId !== postId) return comment;
        const liked = comment.likedByMe;
        return {
          ...comment,
          likedByMe: !liked,
          likeCount: Math.max(0, comment.likeCount + (liked ? -1 : 1)),
        };
      });
      writePreview({ ...state, comments });
      const comment = comments.find((item) => item.id === commentId);
      return { liked: Boolean(comment?.likedByMe) };
    },
    markBestAnswer: async (postId, commentId) => {
      const state = readPreview();
      const post = state.posts.find((item) => item.id === postId);
      if (!post || post.author.id !== PREVIEW_ACTOR.id || post.postType !== "question")
        throw new Error("Only the question owner can choose a best answer.");
      writePreview({
        ...state,
        comments: state.comments.map((comment) =>
          comment.postId === postId ? { ...comment, accepted: comment.id === commentId } : comment,
        ),
      });
    },
    toggleFollow: async (targetUserId) => {
      const state = readPreview();
      const following = state.followingUserIds.includes(targetUserId);
      writePreview({ ...state, followingUserIds: toggle(state.followingUserIds, targetUserId) });
      return { following: !following };
    },
    reportPost: async (input) => {
      const state = readPreview();
      writePreview({
        ...state,
        reports: [...state.reports, { ...input, createdAt: new Date().toISOString() }],
      });
    },
    reportComment: async (input) => {
      const state = readPreview();
      writePreview({
        ...state,
        reports: [...state.reports, { ...input, createdAt: new Date().toISOString() }],
      });
    },
    uploadMedia: async (file) => {
      const kind = validateMedia(file);
      return { kind, url: await dataUrl(file) };
    },
  };
}

function createProductionRepository(): CommunityRepository {
  return {
    mode: "production",
    getViewerId: async () => (await getCommunityViewer()).userId,
    getFeed: (query = {}) =>
      getCommunityFeed({
        data: {
          tab: query.tab ?? "latest",
          topic: query.topic,
          search: query.search,
          cursor: query.cursor,
          limit: query.limit ?? 20,
        },
      }),
    getPost: (postId) => getCommunityPost({ data: { postId } }),
    getSavedPosts: () => getSavedCommunityPosts({ data: { limit: 30 } }),
    createPost: (input) => createCommunityPost({ data: input }),
    updatePost: (postId, input) => updateCommunityPost({ data: { ...input, postId } }),
    deletePost: async (postId) => {
      await deleteCommunityPost({ data: { postId } });
    },
    togglePostLike: (postId) => toggleCommunityPostLike({ data: { postId } }),
    togglePostSave: (postId) => toggleCommunityPostSave({ data: { postId } }),
    sharePost: (postId) => shareCommunityPost({ data: { postId } }),
    getComments: (postId, cursor) => getCommunityComments({ data: { postId, cursor, limit: 30 } }),
    createComment: (input) => createCommunityComment({ data: input }),
    toggleCommentLike: (postId, commentId) =>
      toggleCommunityCommentLike({ data: { postId, commentId } }),
    markBestAnswer: async (postId, commentId) => {
      await markCommunityAnswer({ data: { postId, commentId } });
    },
    toggleFollow: (targetUserId, targetUsername) =>
      toggleCommunityFollow({ data: { targetUserId, targetUsername } }),
    reportPost: async (input) => {
      await reportCommunityPost({ data: input });
    },
    reportComment: async (input) => {
      await reportCommunityComment({ data: input });
    },
    uploadMedia: async (file) => {
      const kind = validateMedia(file);
      const { objectKey } = await uploadFileToS3("community", file);
      return { kind, objectKey, url: await getS3ViewUrl(objectKey) };
    },
  };
}

let repositoryPromise: Promise<CommunityRepository> | undefined;
export async function getCommunityRepository(): Promise<CommunityRepository> {
  if (!repositoryPromise)
    repositoryPromise = getCommunityRuntimeMode()
      .then(({ mode }) =>
        mode === "production" ? createProductionRepository() : createPreviewRepository(),
      )
      .catch((error) => {
        if (import.meta.env.PROD) throw error;
        return createPreviewRepository();
      });
  return repositoryPromise;
}
export function getCommunityRuntimeModeClient() {
  const isProd = import.meta.env.PROD || import.meta.env.VITE_COMMUNITY_PREVIEW === "false";
  return isProd ? ("production" as const) : ("preview" as const);
}
export { COMMUNITY_TOPICS, topicLabel };

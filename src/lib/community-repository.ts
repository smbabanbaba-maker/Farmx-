import {
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
  type CommunityPost,
  type CommunityTopic,
  type CreateCommunityCommentInput,
  type CreateCommunityPostInput,
  type CommunityReportReason,
} from "@/lib/community.types";

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
  repositoryPromise ??= Promise.resolve(createProductionRepository());
  return repositoryPromise;
}
export function getCommunityRuntimeModeClient() {
  return "production" as const;
}
export { COMMUNITY_TOPICS };
export function topicLabel(topic: CommunityTopic) {
  return COMMUNITY_TOPICS.find((item) => item.id === topic)?.label ?? topic;
}

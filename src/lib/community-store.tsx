import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  getCommunityRepository,
  type CommunityQuery,
  type CommunityRepository,
} from "@/lib/community-repository";
import type {
  CommunityComment,
  CommunityFeed,
  CommunityPost,
  CommunityTopic,
  CreateCommunityCommentInput,
} from "@/lib/community.types";

type CommunityContextValue = {
  feed: CommunityFeed;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  query: Required<Pick<CommunityQuery, "tab">> & Pick<CommunityQuery, "topic" | "search">;
  refresh: (nextQuery?: CommunityQuery) => Promise<void>;
  loadMore: () => Promise<void>;
  setTab: (tab: "latest" | "popular" | "following") => void;
  setTopic: (topic?: CommunityTopic) => void;
  setSearch: (search: string) => void;
  likePost: (postId: string) => Promise<void>;
  savePost: (postId: string) => Promise<void>;
  sharePost: (postId: string) => Promise<string>;
  followUser: (userId: string, username: string) => Promise<void>;
  getComments: (postId: string) => Promise<CommunityComment[]>;
  comment: (input: CreateCommunityCommentInput) => Promise<CommunityComment>;
  repository: CommunityRepository | null;
};

const CommunityContext = createContext<CommunityContextValue | null>(null);

export function CommunityProvider({ children }: { children: ReactNode }) {
  const [repository, setRepository] = useState<CommunityRepository | null>(null);
  const [feed, setFeed] = useState<CommunityFeed>({ posts: [], hasMore: false });
  const [query, setQuery] = useState<{
    tab: "latest" | "popular" | "following";
    topic?: CommunityTopic;
    search?: string;
  }>({ tab: "latest" });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (nextQuery?: CommunityQuery) => {
      const next = { ...query, ...nextQuery, tab: nextQuery?.tab ?? query.tab };
      setQuery(next);
      setLoading(true);
      setError(null);
      try {
        const nextRepository = repository ?? (await getCommunityRepository());
        const result = await nextRepository.getFeed({ ...next, cursor: undefined });
        setRepository(nextRepository);
        setFeed(result);
      } catch {
        setError("Unable to load Community.");
        setFeed({ posts: [], hasMore: false });
      } finally {
        setLoading(false);
      }
    },
    [query, repository],
  );

  const loadMore = useCallback(async () => {
    if (!repository || !feed.hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await repository.getFeed({ ...query, cursor: feed.nextCursor });
      setFeed((current) => ({ ...next, posts: [...current.posts, ...next.posts] }));
    } catch {
      setError("Unable to load more Community posts.");
    } finally {
      setLoadingMore(false);
    }
  }, [feed, loadingMore, query, repository]);

  const updatePost = useCallback(
    (postId: string, update: (post: CommunityPost) => CommunityPost) =>
      setFeed((current) => ({
        ...current,
        posts: current.posts.map((post) => (post.id === postId ? update(post) : post)),
      })),
    [],
  );

  const likePost = useCallback(
    async (postId: string) => {
      if (!repository) return;
      const current = feed.posts.find((post) => post.id === postId);
      if (!current) return;
      updatePost(postId, (post) => ({
        ...post,
        likedByMe: !post.likedByMe,
        likeCount: Math.max(0, post.likeCount + (post.likedByMe ? -1 : 1)),
      }));
      try {
        await repository.togglePostLike(postId);
      } catch {
        updatePost(postId, () => current);
        throw new Error("Like could not be updated.");
      }
    },
    [feed.posts, repository, updatePost],
  );

  const savePost = useCallback(
    async (postId: string) => {
      if (!repository) return;
      const current = feed.posts.find((post) => post.id === postId);
      if (!current) return;
      updatePost(postId, (post) => ({
        ...post,
        savedByMe: !post.savedByMe,
        saveCount: Math.max(0, post.saveCount + (post.savedByMe ? -1 : 1)),
      }));
      try {
        await repository.togglePostSave(postId);
      } catch {
        updatePost(postId, () => current);
        throw new Error("Save could not be updated.");
      }
    },
    [feed.posts, repository, updatePost],
  );

  const sharePost = useCallback(
    async (postId: string) => {
      if (!repository) throw new Error("Community is still loading.");
      const result = await repository.sharePost(postId);
      updatePost(postId, (post) => ({
        ...post,
        shareCount: post.shareCount + (result.shared ? 1 : 0),
      }));
      return result.url;
    },
    [repository, updatePost],
  );

  const followUser = useCallback(
    async (userId: string, username: string) => {
      if (!repository) return;
      const result = await repository.toggleFollow(userId, username);
      setFeed((current) => ({
        ...current,
        posts: current.posts.map((post) =>
          post.author.id === userId ? { ...post, followingAuthor: result.following } : post,
        ),
      }));
    },
    [repository],
  );

  const getComments = useCallback(
    async (postId: string) => {
      if (!repository) return [];
      return (await repository.getComments(postId)).comments;
    },
    [repository],
  );

  const comment = useCallback(
    async (input: CreateCommunityCommentInput) => {
      if (!repository) throw new Error("Community is still loading.");
      const created = await repository.createComment(input);
      updatePost(input.postId, (post) => ({ ...post, commentCount: post.commentCount + 1 }));
      return created;
    },
    [repository, updatePost],
  );

  const value = useMemo<CommunityContextValue>(
    () => ({
      feed,
      loading,
      loadingMore,
      error,
      query: { tab: query.tab, topic: query.topic, search: query.search },
      refresh,
      loadMore,
      setTab: (tab) => setQuery((current) => ({ ...current, tab })),
      setTopic: (topic) => setQuery((current) => ({ ...current, topic })),
      setSearch: (search) => setQuery((current) => ({ ...current, search })),
      likePost,
      savePost,
      sharePost,
      followUser,
      getComments,
      comment,
      repository,
    }),
    [
      comment,
      error,
      feed,
      followUser,
      getComments,
      likePost,
      loadMore,
      loading,
      loadingMore,
      query,
      refresh,
      repository,
      savePost,
      sharePost,
    ],
  );
  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) throw new Error("useCommunity must be used inside CommunityProvider");
  return context;
}

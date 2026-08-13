import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Clock3, MapPin, Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  clearGlobalSearches,
  getRecentSearches,
  getSearchSuggestions,
  recordGlobalSearch,
  type SearchSuggestion,
} from "@/lib/global-search";

type FarmXSearchBarProps = {
  compact?: boolean;
  initialQuery?: string;
  location?: string;
  placeholder?: string;
  className?: string;
};

export function FarmXSearchBar({
  compact = false,
  initialQuery = "",
  location,
  placeholder,
  className = "",
}: FarmXSearchBarProps) {
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t("home.search.placeholder");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!focused) return;
    let cancelled = false;
    const timer = window.setTimeout(
      async () => {
        setLoading(true);
        try {
          const [nextSuggestions, recentSearches] = await Promise.all([
            getSearchSuggestions(query),
            getRecentSearches(),
          ]);
          if (!cancelled) {
            setSuggestions(nextSuggestions);
            setRecent(recentSearches);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      query.trim() ? 220 : 0,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [focused, query]);

  const submit = async (value = query) => {
    const nextQuery = value.trim();
    if (!nextQuery) return;
    await recordGlobalSearch(nextQuery);
    setFocused(false);
    await navigate({ to: "/search", search: { q: nextQuery, tab: "all" } });
  };

  const chooseSuggestion = async (suggestion: SearchSuggestion) => {
    setFocused(false);
    if (suggestion.type === "listing" && suggestion.listingId) {
      await navigate({ to: "/product/$id", params: { id: suggestion.listingId } });
      return;
    }
    if (suggestion.type === "business") {
      await navigate({ to: "/search", search: { q: suggestion.label, tab: "businesses" } });
      return;
    }
    if (suggestion.type === "community" && suggestion.postId) {
      await navigate({ to: "/community/$id", params: { id: suggestion.postId } });
      return;
    }
    await submit(suggestion.label);
  };

  const visibleRecent = !query.trim() && recent.length > 0;
  const visibleSuggestions = query.trim() && suggestions.length > 0;

  return (
    <div className={`relative ${className}`}>
      <form
        className="relative"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 160)}
          placeholder={resolvedPlaceholder}
          aria-label={resolvedPlaceholder}
          className={`w-full rounded-2xl border border-border bg-card py-3 pl-10 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 ${compact ? "pr-20" : "pr-24"}`}
        />
        {location && (
          <span className="pointer-events-none absolute right-16 top-1/2 hidden -translate-y-1/2 items-center gap-1 text-[10px] font-bold text-muted-foreground sm:flex">
            <MapPin className="h-3 w-3 text-brand" /> {location}
          </span>
        )}
        {query && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-14 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
            aria-label={t("home.search.clear")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl bg-brand px-3 py-2 text-xs font-black text-brand-foreground transition active:scale-[0.97]"
        >
          {t("search")}
        </button>
      </form>
      {focused && (visibleRecent || visibleSuggestions || loading) && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {visibleRecent ? t("home.search.recent") : t("home.search.suggestions")}
            </p>
            {visibleRecent && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  void clearGlobalSearches();
                  setRecent([]);
                }}
                className="text-[10px] font-bold text-brand"
              >
                {t("home.search.clearAll")}
              </button>
            )}
          </div>
          {loading ? (
            <div className="space-y-2 p-2">
              <div className="h-8 animate-pulse rounded-xl bg-muted" />
              <div className="h-8 animate-pulse rounded-xl bg-muted" />
            </div>
          ) : visibleRecent ? (
            recent.slice(0, 8).map((item) => (
              <button
                type="button"
                key={item}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void submit(item)}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left text-xs font-semibold hover:bg-muted"
              >
                <Clock3 className="h-3.5 w-3.5 text-brand" /> {item}
              </button>
            ))
          ) : (
            suggestions.map((suggestion) => (
              <button
                type="button"
                key={`${suggestion.type}-${suggestion.label}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void chooseSuggestion(suggestion)}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left text-xs font-semibold hover:bg-muted"
              >
                <Search className="h-3.5 w-3.5 text-brand" />
                <span className="min-w-0 flex-1 truncate">{suggestion.label}</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                  {suggestion.type}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

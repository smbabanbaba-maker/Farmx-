import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { posts } from "@/lib/mock-data";
import { Heart, MessageCircle, Share2, Image as ImageIcon, Send } from "lucide-react";

export const Route = createFileRoute("/community")({ component: Community });

function Community() {
  const { t } = useI18n();
  return (
    <AppShell title={t("community")}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-card border border-border">
          <textarea
            placeholder="Share an update…"
            className="w-full bg-transparent text-sm resize-none focus:outline-none"
            rows={2}
          />
          <div className="flex items-center justify-between mt-2">
            <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
            </button>
            <button className="px-4 py-1.5 rounded-lg bg-brand text-brand-foreground text-sm font-semibold flex items-center gap-1">
              <Send className="h-3.5 w-3.5" /> Post
            </button>
          </div>
        </div>

        {posts.map((p) => (
          <article key={p.id} className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-brand/20 flex items-center justify-center font-bold text-brand">
                {p.author.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-sm">{p.author}</p>
                <p className="text-xs text-muted-foreground">
                  {p.handle} · {p.time}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm">{p.content}</p>
            <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
              <button className="flex items-center gap-1.5 hover:text-brand">
                <Heart className="h-4 w-4" />
                {p.likes}
              </button>
              <button className="flex items-center gap-1.5 hover:text-brand">
                <MessageCircle className="h-4 w-4" />
                {p.comments}
              </button>
              <button className="flex items-center gap-1.5 hover:text-brand">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}

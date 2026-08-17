import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Users, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CommunityComposer } from "@/components/CommunityComposer";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import { useEffect } from "react";

export const Route = createFileRoute("/post-community")({ component: PostCommunity });

function PostCommunity() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { isLoggedIn, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate({ to: "/login", search: { returnTo: "/post-community" } });
    }
  }, [isLoggedIn, loading, navigate]);

  return (
    <AppShell title="Post to Community">
      <div className="mx-auto max-w-2xl space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Link to="/post" className="rounded-full p-2 hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-black tracking-tight">Create Community Post</h1>
        </div>

        <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
          <CommunityComposer
            onClose={() => navigate({ to: "/community" })}
            onCreated={() => navigate({ to: "/community" })}
          />
        </div>
      </div>
    </AppShell>
  );
}

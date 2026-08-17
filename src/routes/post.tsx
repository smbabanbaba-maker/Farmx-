import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Briefcase, Users, ArrowLeft, ChevronRight, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import { useEffect } from "react";

export const Route = createFileRoute("/post")({ component: PostSelector });

function PostSelector() {
  const { t } = useI18n();
  const { isLoggedIn, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate({ to: "/login", search: { returnTo: "/post" } });
    }
  }, [isLoggedIn, loading, navigate]);

  const options = [
    {
      to: "/post-product",
      icon: ShoppingBag,
      title: "Market Listing",
      description: "Sell crops, livestock, equipment or services",
      color: "bg-brand/10 text-brand",
      border: "border-brand/20",
    },
    {
      to: "/post-job",
      icon: Briefcase,
      title: "Job Opening",
      description: "Hire skilled farm workers, drivers or technicians",
      color: "bg-blue-500/10 text-blue-600",
      border: "border-blue-500/20",
    },
    {
      to: "/post-community",
      icon: Users,
      title: "Community Post",
      description: "Share knowledge, ask questions or give updates",
      color: "bg-purple-500/10 text-purple-600",
      border: "border-purple-500/20",
    },
  ];

  return (
    <AppShell title={t("post")}>
      <div className="space-y-6 pb-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="rounded-full p-2 hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-black tracking-tight">What would you like to post?</h1>
        </div>

        <div className="grid gap-4">
          {options.map((opt) => (
            <Link
              key={opt.to}
              to={opt.to}
              className={`group flex items-center gap-4 rounded-3xl border ${opt.border} bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-lg`}
            >
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${opt.color} transition-transform group-hover:scale-110`}
              >
                <opt.icon className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black tracking-tight">{opt.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">{opt.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-3xl bg-gradient-to-br from-brand/5 via-brand/10 to-transparent p-6 border border-brand/10">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-brand p-2 text-brand-foreground shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-black text-brand">Reach thousands of farmers</h4>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Whether you're selling produce, hiring talent, or sharing expertise, FarmX connects
                you with the right audience across Nigeria.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

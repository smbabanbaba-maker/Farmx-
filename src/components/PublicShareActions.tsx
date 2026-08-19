import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Globe2, MessageCircle, Send, Share2, X } from "lucide-react";
import { absoluteUrl } from "@/lib/seo";

type PublicShareActionsProps = {
  title: string;
  text: string;
  path: string;
};

export function PublicShareActions({ title, text, path }: PublicShareActionsProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => absoluteUrl(path), [path]);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${text}\n${url}`);

  const copyLink = async () => {
    if (typeof navigator === "undefined") return;
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const nativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    await navigator.share({ title, text, url }).catch(() => undefined);
  };

  const openTarget = (target: string) => {
    if (typeof window !== "undefined") window.open(target, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-brand/25 bg-card px-3 py-2 text-xs font-bold text-brand transition hover:border-brand hover:bg-brand/5"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Share2 className="h-3.5 w-3.5" /> Share
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-40 w-64 overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-xl"
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <div>
              <p className="text-xs font-black">Share on Goall26</p>
              <p className="text-[10px] text-muted-foreground">Use the public listing link.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close share options"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            <ShareTarget
              icon={MessageCircle}
              label="WhatsApp"
              onClick={() => openTarget(`https://wa.me/?text=${encodedText}`)}
            />
            <ShareTarget
              icon={Globe2}
              label="Facebook"
              onClick={() =>
                openTarget(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)
              }
            />
            <ShareTarget
              icon={X}
              label="X / Twitter"
              onClick={() =>
                openTarget(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodedUrl}`,
                )
              }
            />
            <ShareTarget
              icon={Send}
              label="Telegram"
              onClick={() =>
                openTarget(
                  `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(text)}`,
                )
              }
            />
            <ShareTarget
              icon={copied ? Check : Copy}
              label={copied ? "Copied" : "Copy link"}
              onClick={() => void copyLink()}
            />
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <ShareTarget
                icon={ExternalLink}
                label="More options"
                onClick={() => void nativeShare()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ShareTarget({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Share2;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-2 text-left text-[10px] font-bold transition hover:border-brand/40 hover:bg-brand/5"
    >
      <Icon className="h-3.5 w-3.5 text-brand" />
      <span>{label}</span>
    </button>
  );
}

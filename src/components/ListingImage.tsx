import { useEffect, useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { getS3ViewUrl } from "@/lib/s3-client";

function isGoall26ObjectKey(value: string) {
  return /^(listings|products|community|messages|profiles|business)\/[a-z0-9][a-z0-9._/-]*$/i.test(
    value,
  );
}

function isRenderableUrl(value: string) {
  return value.startsWith("blob:") || value.startsWith("data:") || /^https?:\/\//i.test(value);
}

export function ListingImage({
  src,
  alt,
  className,
  placeholder = "",
  priority = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  placeholder?: string;
  priority?: boolean;
}) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    setResolvedUrl(null);
    if (!src) return;
    if (isRenderableUrl(src)) {
      setResolvedUrl(src);
      return;
    }
    if (!isGoall26ObjectKey(src)) {
      setFailed(true);
      return;
    }
    setLoading(true);
    void getS3ViewUrl(src)
      .then((url) => {
        if (active) setResolvedUrl(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [src]);

  if (resolvedUrl && !failed) {
    return (
      <img
        src={resolvedUrl}
        alt={alt}
        className={className}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  if (placeholder && !loading && failed) {
    return (
      <span className={className} aria-label={alt} role="img">
        {placeholder}
      </span>
    );
  }
  return (
    <span className={`flex items-center justify-center ${className ?? ""}`} aria-label={alt}>
      {loading ? (
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/40" />
      ) : (
        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
      )}
    </span>
  );
}

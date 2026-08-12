import { useEffect, useState } from "react";
import { getMyProfilePhotoUrl } from "@/lib/profile.functions";

export function useProfilePhoto(objectKey?: string) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!objectKey) {
      setUrl(null);
      return () => {
        active = false;
      };
    }

    void getMyProfilePhotoUrl({ data: { objectKey } })
      .then((result) => {
        if (active) setUrl(result.downloadUrl);
      })
      .catch(() => {
        if (active) setUrl(null);
      });

    return () => {
      active = false;
    };
  }, [objectKey]);

  return url;
}

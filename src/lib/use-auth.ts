import { useState, useEffect } from "react";
import { getCurrentSession, signOut as authSignOut } from "./auth";

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const session = await getCurrentSession();
        const active = !!session;
        setIsLoggedIn(active);
        if (typeof window !== "undefined") {
          if (active) localStorage.setItem("goall26-session-active", "true");
          else localStorage.removeItem("goall26-session-active");
        }
      } catch {
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const signOut = () => {
    authSignOut();
    setIsLoggedIn(false);
  };

  return { isLoggedIn, loading, signOut };
}

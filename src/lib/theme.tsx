import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Mode = "light" | "dark";
type Ctx = {
  mode: Mode;
  setMode: (m: Mode) => void;
  fontScale: number;
  setFontScale: (n: number) => void;
};
const ThemeCtx = createContext<Ctx>({
  mode: "light",
  setMode: () => {},
  fontScale: 1,
  setFontScale: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("light");
  const [fontScale, setFontScaleState] = useState<number>(1);

  useEffect(() => {
    const m = (localStorage.getItem("farmx-mode") as Mode) || "light";
    const f = parseFloat(localStorage.getItem("farmx-font") || "1");
    setModeState(m);
    setFontScaleState(f);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    document.documentElement.style.setProperty("--font-scale", String(fontScale));
  }, [mode, fontScale]);

  const setMode = (m: Mode) => {
    setModeState(m);
    localStorage.setItem("farmx-mode", m);
  };
  const setFontScale = (n: number) => {
    setFontScaleState(n);
    localStorage.setItem("farmx-font", String(n));
  };

  return (
    <ThemeCtx.Provider value={{ mode, setMode, fontScale, setFontScale }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);

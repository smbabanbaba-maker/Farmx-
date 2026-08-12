import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LOCATIONS, type LocationName } from "./mock-data";

type Ctx = {
  location: LocationName;
  setLocation: (l: LocationName) => void;
  all: readonly LocationName[];
};
const LocationCtx = createContext<Ctx>({ location: "Kano", setLocation: () => {}, all: LOCATIONS });

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLoc] = useState<LocationName>("Kano");
  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? (localStorage.getItem("farmx-loc") as LocationName | null)
        : null;
    if (saved && (LOCATIONS as readonly string[]).includes(saved)) setLoc(saved);
  }, []);
  const setLocation = (l: LocationName) => {
    setLoc(l);
    if (typeof window !== "undefined") localStorage.setItem("farmx-loc", l);
  };
  return (
    <LocationCtx.Provider value={{ location, setLocation, all: LOCATIONS }}>
      {children}
    </LocationCtx.Provider>
  );
}

export const useLocation = () => useContext(LocationCtx);

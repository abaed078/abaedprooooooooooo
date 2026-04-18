import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark", setTheme: () => {}, toggleTheme: () => {}
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("autel-theme") as Theme) || "dark";
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("autel-theme", t);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.style.setProperty("--bg-primary",   "#f0f4f8");
      root.style.setProperty("--bg-secondary", "#e2e8f0");
      root.style.setProperty("--bg-card",      "#ffffff");
      root.style.setProperty("--text-primary", "#0f172a");
      root.style.setProperty("--text-muted",   "#64748b");
      root.style.setProperty("--border",       "rgba(0,0,0,0.08)");
      root.setAttribute("data-theme", "light");
    } else {
      root.style.setProperty("--bg-primary",   "#080b12");
      root.style.setProperty("--bg-secondary", "#0d1117");
      root.style.setProperty("--bg-card",      "rgba(255,255,255,0.02)");
      root.style.setProperty("--text-primary", "#ffffff");
      root.style.setProperty("--text-muted",   "#64748b");
      root.style.setProperty("--border",       "rgba(255,255,255,0.07)");
      root.setAttribute("data-theme", "dark");
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

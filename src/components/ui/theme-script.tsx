const themeScript = `
(() => {
  const systemTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  try {
    const storedTheme = window.sessionStorage.getItem("tradehub-theme");
    document.documentElement.setAttribute("data-theme", storedTheme || systemTheme);
  } catch (error) {
    document.documentElement.setAttribute("data-theme", systemTheme);
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}

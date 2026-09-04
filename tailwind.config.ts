import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        glass: "var(--glass)",
        "glass-hi": "var(--glass-hi)",
        line: "var(--line)",
        label: "var(--label)",
        label2: "var(--label2)",
        label3: "var(--label3)",
        accent: "var(--accent)",
        "accent-bg": "var(--accent-bg)",
        green: "var(--green)",
        "green-bg": "var(--green-bg)",
        red: "var(--red)",
        "red-bg": "var(--red-bg)",
        amber: "var(--amber)",
        "amber-bg": "var(--amber-bg)"
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Inter",
          "sans-serif"
        ]
      },
      backgroundImage: {
        card: "var(--card)"
      },
      boxShadow: {
        card: "var(--card-shadow)"
      }
    }
  },
  plugins: []
};

export default config;

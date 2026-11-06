import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export statique pour déploiement O2Switch (fichiers HTML/CSS/JS purs)
  output: "export",
  trailingSlash: true,

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

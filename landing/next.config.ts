import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Export statique pour déploiement O2Switch (fichiers HTML/CSS/JS purs)
  output: "export",
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(process.cwd()),
    };
    return config;
  },
};

export default nextConfig;

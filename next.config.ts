import type { NextConfig } from "next";

// A GitHub Pages kiadĂˇs statikus export, az /alexandra alkĂ¶nyvtĂˇrban. Helyben (dev, start) vĂˇltozatlan marad.
const pages = process.env.GITHUB_PAGES === "true";
const basePath = "/alexandra";

const nextConfig: NextConfig = pages
  ? {
      output: "export",
      basePath,
      trailingSlash: true,
      images: { unoptimized: true },
      env: { NEXT_PUBLIC_BASE_PATH: basePath },
    }
  : {};

export default nextConfig;

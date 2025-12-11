/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // Required for GitHub Pages
  images: {
    unoptimized: true, // Required for GitHub Pages (no Next.js Image Optimization API)
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

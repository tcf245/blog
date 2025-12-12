/** @type {import('next').NextConfig} */
const nextConfig = {
  /* output: "export", // Removed for ISR */
  images: {
    // unoptimized: true, // Removed for ISR to use Vercel Image Optimization
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

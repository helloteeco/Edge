/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // TypeScript type checking handles correctness; skip ESLint during build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

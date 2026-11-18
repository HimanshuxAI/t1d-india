/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@t1d-india/shared'],
  experimental: {
    optimizePackageImports: ['@t1d-india/shared', 'lucide-react'],
  },
  images: {
    domains: ['localhost', 'api.t1d-india.example.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.t1d-india.example.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
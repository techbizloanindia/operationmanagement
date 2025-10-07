/** @type {import('next').NextConfig} */

import path from 'path';

const nextConfig = {
  reactStrictMode: true,
  
  // Webpack configuration for Windows compatibility and memory optimization
  webpack: (config: any, { dev, isServer }: any) => {
    // Reduce file system pressure on Windows
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
    }
    
    // Optimize for Windows file system with absolute path
    config.cache = {
      type: 'filesystem',
      cacheDirectory: path.resolve(process.cwd(), '.next/cache'),
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    };
    
    // Memory optimizations for production
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              maxSize: 244000, // ~240KB chunks
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  
  // Output optimization for smaller bundle size
  output: 'standalone',
  
  // Explicitly set the output file tracing root to avoid lockfile conflicts
  outputFileTracingRoot: path.join(__dirname),
  
  // Only ignore errors in development
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV !== 'production',
  },
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV !== 'production',
  },
  
  // Image optimization with memory limits
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200], // Reduced device sizes
    imageSizes: [16, 32, 48, 64, 96], // Reduced image sizes
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // Environment variables validation
  env: {
    PORT: process.env.PORT,
  },
  
  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Experimental features for better performance and Windows compatibility
  experimental: {
    optimizePackageImports: ['react-icons'],
  },
};

export default nextConfig;

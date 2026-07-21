/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const cspHeader = `
      default-src 'self' https: http: data: blob: 'unsafe-inline';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:;
      style-src 'self' 'unsafe-inline' https: http:;
      img-src 'self' data: blob: https: http:;
      font-src 'self' data: https: http:;
      frame-src 'self' https: http:;
      connect-src 'self' https: http:;
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader
          }
        ],
      },
    ];
  },
};

export default nextConfig;

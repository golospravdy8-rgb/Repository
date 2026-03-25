/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "http://localhost:3006/uploads/:path*",
      },
    ];
  },
};
module.exports = nextConfig;

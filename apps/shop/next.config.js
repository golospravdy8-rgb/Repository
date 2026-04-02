/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  basePath: "/shop",
  assetPrefix: "/shop",
  transpilePackages: ["@basket-lviv/ui"],
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

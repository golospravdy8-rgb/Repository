/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  basePath: "/news-app",
  assetPrefix: "/news-app",
  transpilePackages: ["@basket-lviv/ui"],
};
module.exports = nextConfig;

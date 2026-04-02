/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  basePath: "/marketplace",
  assetPrefix: "/marketplace",
  transpilePackages: ["@basket-lviv/ui"],
};
module.exports = nextConfig;

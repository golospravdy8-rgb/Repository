/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  basePath: "/courses",
  assetPrefix: "/courses",
  transpilePackages: ["@basket-lviv/ui"],
};
module.exports = nextConfig;

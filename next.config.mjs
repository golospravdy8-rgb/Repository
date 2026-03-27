/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    dirs: ["app", "lib", "src", "actions", "components", "types"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async redirects() {
    return [
      { source: "/admin/login", destination: "/login", permanent: false },
      { source: "/%D1%80%D0%BE%D0%B7%D0%BA%D0%BB%D0%B0%D0%B4", destination: "/schedule", permanent: true },
      { source: "/%D0%BD%D0%BE%D0%B2%D0%B8%D0%BD%D0%B8", destination: "/news", permanent: true },
      { source: "/%D0%BD%D0%BE%D0%B2%D0%B8%D0%BD%D0%B8/:slug", destination: "/news/:slug", permanent: true },
      { source: "/%D0%B7%D0%BC%D0%B0%D0%B3%D0%B0%D0%BD%D0%BD%D1%8F", destination: "/standings", permanent: true },
      { source: "/%D0%BB%D1%96%D0%B4%D0%B5%D1%80%D0%B8", destination: "/leaders", permanent: true },
      { source: "/%D0%BA%D0%BE%D0%BC%D0%B0%D0%BD%D0%B4%D0%B8", destination: "/teams", permanent: true },
      { source: "/%D0%B3%D1%80%D0%B0%D0%B2%D1%86%D1%96", destination: "/players", permanent: true },
      { source: "/%D0%BA%D0%BE%D0%BD%D1%82%D0%B0%D0%BA%D1%82%D0%B8", destination: "/contacts", permanent: true },
    ];
  },
};

export default nextConfig;

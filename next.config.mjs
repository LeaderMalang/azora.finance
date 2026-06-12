import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: { domains: [] },
  webpack: (config) => {
    // Stub optional wallet connector dependencies not installed
    const optionalPkgs = [
      "porto/internal",
      "@coinbase/wallet-sdk",
      "@metamask/connect-evm",
      "@safe-global/safe-apps-sdk",
      "@safe-global/safe-apps-provider",
      "@base-org/account",
      "accounts",
      "pino-pretty",
    ];
    for (const pkg of optionalPkgs) {
      config.resolve.alias[pkg] = false;
    }
    return config;
  },
};

export default withNextIntl(nextConfig);

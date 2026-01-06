import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    position: 'top-right',
  },
  allowedDevOrigins: ["raspgorkpi.drake-halosaur.ts.net", "100.73.125.61"],
};

export default nextConfig;

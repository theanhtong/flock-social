import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "192.168.2.179",
    "192.168.2.179:3000",
    "localhost:3000",
    "0.0.0.0:3000",
  ],
};

export default nextConfig;

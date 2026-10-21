import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  devIndicators: false,
};

export default nextConfig;

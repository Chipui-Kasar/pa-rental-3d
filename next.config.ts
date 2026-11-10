import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
};
module.exports = {
  allowedDevOrigins: ["192.168.29.96"],
};

export default nextConfig;

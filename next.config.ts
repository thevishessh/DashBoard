import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs is a Node library; keep it out of the client bundle.
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;

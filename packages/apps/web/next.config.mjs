import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMDX } from "fumadocs-mdx/next";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const withMDX = createMDX({
  configPath: path.join(packageDir, "source.config.ts"),
});

const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(packageDir, "../../.."),
  },
};

export default withMDX(nextConfig);

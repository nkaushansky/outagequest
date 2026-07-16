import { defineConfig } from "vite";

// Static build, relative paths so dist/ drops onto DreamHost as-is.
export default defineConfig({
  base: "./",
});

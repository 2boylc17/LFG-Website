import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const enableCoverageInstrumentation = process.env.NODE_ENV !== "production";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: enableCoverageInstrumentation ? ["istanbul"] : [],
      },
    }),
  ],
});
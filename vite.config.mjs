// Vite frontend bundler configuration
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Add Istanbul plugin for code coverage when not in production
const enableCoverageInstrumentation = process.env.NODE_ENV !== "production";

// Configure React plugin with optional coverage instrumentation
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: enableCoverageInstrumentation ? ["istanbul"] : [],
      },
    }),
  ],
});
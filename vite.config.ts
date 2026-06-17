import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { goalCoachDevPlugin } from "./vite/goalCoachDevPlugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of ["GOAL_COACH_API_KEY", "GEMINI_API_KEY", "GOAL_COACH_MODEL"]) {
    if (env[key]) process.env[key] = env[key];
  }

  const apiProxyTarget = env.VITE_API_PROXY_TARGET ?? process.env.VITE_API_PROXY_TARGET;

  return {
    server: {
      host: "0.0.0.0",
      port: 5000,
      strictPort: false,
      allowedHosts: true,
      ...(apiProxyTarget
        ? {
            proxy: {
              "/api": {
                target: apiProxyTarget,
                changeOrigin: true,
              },
            },
          }
        : {}),
    },
    plugins: [react(), goalCoachDevPlugin()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
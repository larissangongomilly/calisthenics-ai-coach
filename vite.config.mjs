// Vite configuration.
// `npm run dev`       → normal dev server on this computer (http://localhost:5173)
// `npm run dev:phone` → dev server in the local Wi-Fi with HTTPS, so a phone can
//                       open it and use the camera (browsers only allow the camera
//                       on HTTPS or localhost). Uses a self-signed certificate, so
//                       the phone shows a warning once that has to be accepted.
import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }) => ({
  plugins: mode === "phone" ? [basicSsl()] : [],
  server: {
    port: 5173,
    host: mode === "phone" ? true : "localhost",
  },
}));

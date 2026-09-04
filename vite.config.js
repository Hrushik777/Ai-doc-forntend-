import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The backend's @CrossOrigin allows localhost:5173 and localhost:5174, so
    // Vite may use either. Prefer 5173 and fall back to 5174 if it is busy.
    // A drift past 5174 is no longer silent: the app compares its own origin
    // against the allowed list and names the mismatch in the error message.
    port: 5173,
  },
})

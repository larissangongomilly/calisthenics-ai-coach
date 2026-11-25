// Runs before the rest of the app (first import in main.js): in demo mode it
// swaps the browser storage for a memory storage with the sample user, so
// every module reads the demo data and the real data stays untouched.
import { fillDemoStorage, isDemoUrl, memoryStorage } from "./demo.js";

function startDemo() {
  if (!isDemoUrl(globalThis.location?.search ?? "")) {
    return false;
  }
  try {
    const storage = fillDemoStorage(memoryStorage());
    Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
    return globalThis.localStorage === storage;
  } catch (error) {
    // The browser does not allow it: open the normal app instead.
    console.warn("Demo mode is not available in this browser:", error);
    return false;
  }
}

export const DEMO = startDemo();

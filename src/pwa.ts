import { registerSW } from "virtual:pwa-register";

interface PwaLifecycleOptions {
  onNeedRefresh: () => void;
  onOfflineReady: () => void;
  onError: () => void;
}

export interface PwaLifecycle {
  applyUpdate: () => Promise<void>;
  destroy: () => void;
}

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

export const setupPwaLifecycle = (options: PwaLifecycleOptions): PwaLifecycle => {
  let registration: ServiceWorkerRegistration | undefined;
  let intervalId: number | undefined;

  const checkForUpdate = (): void => {
    if (!registration || !navigator.onLine) return;
    void registration.update().catch(() => undefined);
  };

  const handleVisibility = (): void => {
    if (document.visibilityState === "visible") checkForUpdate();
  };

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: options.onNeedRefresh,
    onOfflineReady: options.onOfflineReady,
    onRegisterError: options.onError,
    onRegisteredSW: (_swUrl, currentRegistration) => {
      registration = currentRegistration;
      if (!registration) return;
      window.addEventListener("online", checkForUpdate);
      document.addEventListener("visibilitychange", handleVisibility);
      intervalId = window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
    }
  });

  return {
    applyUpdate: () => updateSW(true),
    destroy: () => {
      window.removeEventListener("online", checkForUpdate);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    }
  };
};

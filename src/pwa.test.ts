import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ registerSW: vi.fn() }));
vi.mock("virtual:pwa-register", () => ({ registerSW: mocks.registerSW }));

import { setupPwaLifecycle } from "./pwa";

class FakeEvents {
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    const event = new Event(type);
    for (const listener of this.listeners.get(type) ?? []) {
      if (typeof listener === "function") listener(event);
      else listener.handleEvent(event);
    }
  }
}

class FakeWindow extends FakeEvents {
  interval?: () => void;
  readonly clearInterval = vi.fn();

  setInterval(handler: TimerHandler): number {
    this.interval = handler as () => void;
    return 1;
  }
}

class FakeDocument extends FakeEvents {
  visibilityState: DocumentVisibilityState = "visible";
}

interface MockRegisterOptions {
  onRegisteredSW?: (swUrl: string, registration?: ServiceWorkerRegistration) => void;
}

describe("PWA lifecycle", () => {
  let fakeWindow: FakeWindow;
  let fakeDocument: FakeDocument;
  let fakeNavigator: { onLine: boolean };
  let registrationUpdate: ReturnType<typeof vi.fn>;
  let updateSW: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fakeWindow = new FakeWindow();
    fakeDocument = new FakeDocument();
    fakeNavigator = { onLine: true };
    registrationUpdate = vi.fn().mockResolvedValue(undefined);
    updateSW = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal("window", fakeWindow);
    vi.stubGlobal("document", fakeDocument);
    vi.stubGlobal("navigator", fakeNavigator);

    mocks.registerSW.mockReset();
    mocks.registerSW.mockImplementation((options: MockRegisterOptions) => {
      options.onRegisteredSW?.(
        "/sw.js",
        { update: registrationUpdate } as unknown as ServiceWorkerRegistration
      );
      return updateSW;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("checks for updates on reconnect, foreground, and the periodic timer", () => {
    const lifecycle = setupPwaLifecycle({
      onNeedRefresh: vi.fn(),
      onOfflineReady: vi.fn(),
      onError: vi.fn()
    });

    fakeWindow.emit("online");
    expect(registrationUpdate).toHaveBeenCalledTimes(1);

    fakeNavigator.onLine = false;
    fakeWindow.emit("online");
    expect(registrationUpdate).toHaveBeenCalledTimes(1);

    fakeNavigator.onLine = true;
    fakeDocument.visibilityState = "hidden";
    fakeDocument.emit("visibilitychange");
    expect(registrationUpdate).toHaveBeenCalledTimes(1);

    fakeDocument.visibilityState = "visible";
    fakeDocument.emit("visibilitychange");
    expect(registrationUpdate).toHaveBeenCalledTimes(2);

    fakeWindow.interval?.();
    expect(registrationUpdate).toHaveBeenCalledTimes(3);

    lifecycle.destroy();
    fakeWindow.emit("online");
    fakeDocument.emit("visibilitychange");
    expect(registrationUpdate).toHaveBeenCalledTimes(3);
    expect(fakeWindow.clearInterval).toHaveBeenCalledWith(1);
  });

  it("applies a waiting update only through the explicit lifecycle action", async () => {
    const lifecycle = setupPwaLifecycle({
      onNeedRefresh: vi.fn(),
      onOfflineReady: vi.fn(),
      onError: vi.fn()
    });

    expect(updateSW).not.toHaveBeenCalled();
    await lifecycle.applyUpdate();
    expect(updateSW).toHaveBeenCalledWith(true);
    lifecycle.destroy();
  });
});

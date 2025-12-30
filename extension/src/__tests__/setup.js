import { vi } from "vitest";

// Mock Chrome API
global.chrome = {
  storage: {
    sync: {
      get: vi.fn((defaults, callback) => {
        if (callback) callback(defaults);
        return Promise.resolve(defaults);
      }),
      set: vi.fn((data, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
    },
    local: {
      get: vi.fn((keys, callback) => {
        if (callback) callback({});
        return Promise.resolve({});
      }),
      set: vi.fn((data, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    openOptionsPage: vi.fn(),
    onInstalled: {
      addListener: vi.fn(),
    },
  },
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

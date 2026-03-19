/**
 * Test entry point for DingTalk OpenClaw Connector
 * 
 * This file exports lightweight, self-contained test utilities.
 *
 * Note: keep this file dependency-free (no missing re-exports), so importing it
 * never breaks the test build.
 */

import { vi } from 'vitest';

/**
 * Test configuration
 */
export const testConfig = {
  timeout: 10000,
  retries: 3,
  logLevel: 'info',
};

/**
 * Create a mock config for testing
 */
export function createMockConfig(overrides: Partial<{
  clientId: string;
  clientSecret: string;
  webhook?: string;
}> = {}) {
  return {
    clientId: overrides.clientId || 'test-client-id',
    clientSecret: overrides.clientSecret || 'test-client-secret',
    webhook: overrides.webhook,
  };
}

/**
 * Create a mock logger for testing
 */
export function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

/**
 * Create mock axios response
 */
export function createMockAxiosResponse(data: any, status = 200) {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {},
  };
}

/**
 * Create mock file info
 */
export function createMockFileInfo(overrides: Partial<{
  path: string;
  fileName: string;
  fileType: string;
}> = {}) {
  return {
    path: overrides.path || '/tmp/test-file.pdf',
    fileName: overrides.fileName || 'test-file.pdf',
    fileType: overrides.fileType || 'pdf',
  };
}

/**
 * Create mock video metadata
 */
export function createMockVideoMetadata() {
  return {
    duration: 60,
    width: 1920,
    height: 1080,
  };
}

/**
 * Create mock target
 */
export function createMockUserTarget(userId = 'user123') {
  return {
    type: 'user' as const,
    userId,
  };
}

export function createMockGroupTarget(openConversationId = 'conv123') {
  return {
    type: 'group' as const,
    openConversationId,
  };
}

/**
 * Wait for condition
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Intentionally no re-exports here: this repo doesn't maintain a shared
// `tests/helpers` / `tests/mocks` layer yet.
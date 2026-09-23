/**
 * State Token Utilities
 *
 * Provides functions for generating and verifying state tokens
 * used in the OAuth-like browser login flow for CSRF protection.
 *
 * @satisfies Requirements 1.2, 2.2
 */

import * as crypto from 'node:crypto';

/**
 * Generates a cryptographically secure state token.
 *
 * The token consists of 32 bytes of random data encoded as hexadecimal,
 * resulting in a 64-character string. This is used for CSRF protection
 * during the browser login flow.
 *
 * @returns A 64-character hexadecimal string
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verifies that a received state token matches the expected value.
 *
 * Performs an exact string comparison to ensure the state token
 * received in the callback matches the one originally generated.
 *
 * @param received - The state token received in the callback
 * @param expected - The state token that was originally generated
 * @returns True if the tokens match exactly, false otherwise
 */
export function verifyState(received: string, expected: string): boolean {
  return received === expected;
}

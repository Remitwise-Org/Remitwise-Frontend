import { describe, it, expect } from 'vitest';
import {
  createValidationError,
  createAuthenticationError,
  handleUnexpectedError,
} from '@/lib/errors/api-errors';

/**
 * Integration Tests for API Error Handling
 * Feature: savings-goals-transactions
 * 
 * These tests verify that error handling functions create proper responses.
 */

describe('API Error Handling - Integration Tests', () => {
  /**
   * Property 8: Invalid input returns 400 with error details
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4
   */
  it('createValidationError returns 400 with error structure', async () => {
    const response = createValidationError('Invalid input', 'Amount must be positive');
    
    expect(response.status).toBe(400);
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('details');
    expect(body.error).toBe('Invalid input');
    expect(body.details).toBe('Amount must be positive');
  });

  it('createValidationError works without details', async () => {
    const response = createValidationError('Missing field');
    
    expect(response.status).toBe(400);
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('Missing field');
  });

  /**
   * Property 6: Unauthenticated requests return 401
   * Validates: Requirements 6.1, 6.2
   */
  it('createAuthenticationError returns 401 with error structure', async () => {
    const response = createAuthenticationError('Authentication required', 'Please provide a valid session');
    
    expect(response.status).toBe(401);
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('details');
    expect(body.error).toBe('Authentication required');
    expect(body.details).toBe('Please provide a valid session');
  });

  it('createAuthenticationError uses default message', async () => {
    const response = createAuthenticationError();
    
    expect(response.status).toBe(401);
    
    const body = await response.json();
    expect(body.error).toBe('Authentication required');
  });

  /**
   * Property 9: Error responses have consistent structure
   * Validates: Requirements 8.2
   */
  it('handleUnexpectedError returns 500 with error structure', async () => {
    const error = new Error('Something went wrong');
    const response = handleUnexpectedError(error);
    
    expect(response.status).toBe(500);
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('An unexpected error occurred');
    expect(body.details).toBe('Something went wrong');
  });

  it('handleUnexpectedError handles non-Error objects', async () => {
    const response = handleUnexpectedError('string error');
    
    expect(response.status).toBe(500);
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('An unexpected error occurred');
  });

  it('all error responses have consistent structure', async () => {
    const errors = [
      createValidationError('test'),
      createAuthenticationError('test'),
      handleUnexpectedError(new Error('test')),
    ];

    for (const response of errors) {
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(typeof body.error).toBe('string');
      expect(body.error.length).toBeGreaterThan(0);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { processPayment } from '../src/payments/payment.js';

describe('payment', () => {
  it('processes payment successfully', () => {
    const res = processPayment(99.99);
    expect(res.status).toBe('success');
  });

  it('rejects non-positive payment', () => {
    expect(() => processPayment(-10)).toThrow('Invalid amount');
  });
});

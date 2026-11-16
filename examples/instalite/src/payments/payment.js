export function processPayment(amount, currency = 'USD') {
  if (amount <= 0) throw new Error('Invalid amount');
  return { status: 'success', transactionId: 'tx_12345' };
}

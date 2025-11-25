const { maskPII } = require('../utils/sanitize');

describe('Security Tests', () => {
  describe('PII Masking', () => {
    test('should mask email addresses', () => {
      const text = 'Contact me at test@example.com';
      expect(maskPII(text)).toBe('Contact me at [email]');
    });

    test('should mask phone numbers', () => {
      const text = 'My number is 555-123-4567';
      expect(maskPII(text)).toBe('My number is [phone]');
    });

    test('should mask names', () => {
      const text = 'Hello John Doe';
      expect(maskPII(text)).toBe('Hello [name]');
    });

    test('should not mask safe words', () => {
      const text = 'This is a Test Email';
      expect(maskPII(text)).toBe('This is a Test Email');
    });

    test('should not mask regular sentences', () => {
      const text = 'The quick brown fox jumps over the lazy dog.';
      expect(maskPII(text)).toBe('The quick brown fox jumps over the lazy dog.');
    });
  });
});

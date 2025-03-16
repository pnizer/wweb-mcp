import { timestampToIso } from '../../src/whatsapp-service';

describe('Utility Functions', () => {
  describe('timestampToIso', () => {
    it('should convert Unix timestamp to ISO string', () => {
      const timestamp = 1615000000; // March 6, 2021
      const isoString = timestampToIso(timestamp);
      // Use a more flexible assertion that doesn't depend on timezone
      expect(new Date(isoString).getTime()).toBe(timestamp * 1000);
    });

    it('should handle current timestamp', () => {
      const now = Math.floor(Date.now() / 1000);
      const isoString = timestampToIso(now);

      // Create a date from the ISO string and compare with now
      const date = new Date(isoString);
      const nowDate = new Date(now * 1000);

      // Allow for a small difference due to processing time
      expect(Math.abs(date.getTime() - nowDate.getTime())).toBeLessThan(1000);
    });

    it('should handle zero timestamp', () => {
      const timestamp = 0; // January 1, 1970 00:00:00 GMT
      const isoString = timestampToIso(timestamp);
      // Use a more flexible assertion that doesn't depend on timezone
      expect(new Date(isoString).getTime()).toBe(0);
    });

    it('should handle negative timestamp', () => {
      const timestamp = -1000000; // Before January 1, 1970
      const isoString = timestampToIso(timestamp);
      // Use a more flexible assertion that doesn't depend on timezone
      expect(new Date(isoString).getTime()).toBe(-1000000 * 1000);
    });
  });
});

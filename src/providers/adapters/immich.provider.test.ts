// src/providers/adapters/immich.provider.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ImmichProvider } from './immich.provider';
import { createMockUserContext } from './test-helpers';

describe('ImmichProvider', () => {
  let provider: ImmichProvider;
  let mockContext: any;

  beforeEach(() => {
    provider = new ImmichProvider();
    mockContext = createMockUserContext({ fetch: vi.fn() as any, credentials: { immich: { url: 'http://test-immich', apiKey: 'test-key' } } });
  });

  it('should have correct metadata', () => {
    expect(provider.id).toBe('immich');
    expect(provider.name).toBe('Immich');
    expect(provider.category).toBe('photos');
    expect(provider.icon).toBe('image');
    expect(provider.authMethod).toBe('api-key');
    expect(provider.capabilities).toEqual([
      'read.photos.albums',
      'read.photos.recent',
      'search.photos'
    ]);
  });

  describe('health', () => {
    it('should return healthy when server responds with 200', async () => {
      mockContext.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      const result = await provider.health(mockContext);
      expect(result).toEqual({ status: 'healthy' });
    });

    it('should return degraded when server responds with non-200', async () => {
      mockContext.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await provider.health(mockContext);
      expect(result).toEqual({
        status: 'degraded',
        message: 'Immich returned status 500'
      });
    });

    it('should return down when fetch throws', async () => {
      mockContext.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.health(mockContext);
      expect(result).toEqual({
        status: 'down',
        message: 'Network error'
      });
    });
  });

  describe('query.getAlbums', () => {

    it('should throw when fetch fails', async () => {
      mockContext.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      await expect(provider.query.getAlbums({}, mockContext)).rejects.toThrow('Immich API error: 401');
    });
  });

  describe('query.getRecentAssets', () => {

    it('should throw when fetch fails', async () => {
      mockContext.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      await expect(provider.query.getRecentAssets({}, mockContext)).rejects.toThrow('Immich API error: 401');
    });
  });

  describe('query.search', () => {

    it('should throw when fetch fails', async () => {
      mockContext.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      await expect(provider.query.search({ query: 'vacation' }, mockContext)).rejects.toThrow('Immich API error: 401');
    });

    it('should throw when query parameter is missing', async () => {
      await expect(provider.query.search({}, mockContext)).rejects.toThrow('Invalid parameters: query is required and must be a string');
    });

    it('should throw when query parameter is not a string', async () => {
      await expect(provider.query.search({ query: 123 }, mockContext)).rejects.toThrow('Invalid parameters: query is required and must be a string');
    });
  });
});
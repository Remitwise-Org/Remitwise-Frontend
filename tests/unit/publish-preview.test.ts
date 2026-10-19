import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { publishPreview } from '../../scripts/publish-preview.js';

describe('publish-preview script', () => {
  let tempDir: string;
  let eventFilePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-test-'));
    eventFilePath = path.join(tempDir, 'event.json');
    
    // Stub global fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('fails if GITHUB_REPOSITORY is missing', async () => {
    await expect(publishPreview({
      repo: '',
      prNumber: 1224,
      token: 'dummy-token'
    })).rejects.toThrow('Missing GITHUB_REPOSITORY environment variable.');
  });

  it('fails if GITHUB_TOKEN is missing', async () => {
    await expect(publishPreview({
      repo: 'owner/repo',
      prNumber: 1224,
      token: ''
    })).rejects.toThrow('Missing GITHUB_TOKEN environment variable.');
  });

  it('fails if PR number cannot be resolved from args or event file', async () => {
    fs.writeFileSync(eventFilePath, JSON.stringify({}), 'utf8');

    await expect(publishPreview({
      repo: 'owner/repo',
      token: 'dummy-token',
      eventPath: eventFilePath
    })).rejects.toThrow('Could not identify the Pull Request number.');
  });

  it('resolves PR number from GITHUB_EVENT_PATH if not explicitly provided', async () => {
    fs.writeFileSync(eventFilePath, JSON.stringify({
      pull_request: { number: 42 }
    }), 'utf8');

    // Mock fetch GET (no comments found)
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as any);

    // Mock fetch POST (create comment)
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 100 })
    } as any);

    const result = await publishPreview({
      repo: 'owner/repo',
      token: 'dummy-token',
      eventPath: eventFilePath
    });

    expect(result.prNumber).toBe(42);
    expect(result.previewUrl).toBe('https://preview-pr-42.remitwise.org');

    // Check fetch calls
    expect(global.fetch).toHaveBeenCalledTimes(2);
    // First call: GET comments
    expect(global.fetch).toHaveBeenNthCalledWith(1, 
      'https://api.github.com/repos/owner/repo/issues/42/comments',
      expect.objectContaining({ headers: expect.any(Object) })
    );
    // Second call: POST comments
    expect(global.fetch).toHaveBeenNthCalledWith(2,
      'https://api.github.com/repos/owner/repo/issues/42/comments',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('https://preview-pr-42.remitwise.org')
      })
    );
  });

  it('happy path: creates a new comment when no existing comment matches the marker', async () => {
    // Mock fetch GET returns other comments
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 1, body: 'Some general comment' },
        { id: 2, body: 'Another feedback comment' }
      ]
    } as any);

    // Mock fetch POST returns new comment
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1234 })
    } as any);

    const result = await publishPreview({
      repo: 'owner/repo',
      prNumber: 1224,
      token: 'dummy-token'
    });

    expect(result.prNumber).toBe(1224);
    expect(result.previewUrl).toBe('https://preview-pr-1224.remitwise.org');

    expect(global.fetch).toHaveBeenCalledTimes(2);
    // POST request is made to create comment
    expect(global.fetch).toHaveBeenNthCalledWith(2,
      'https://api.github.com/repos/owner/repo/issues/1224/comments',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('<!-- remitwise-preview-marker -->')
      })
    );
  });

  it('happy path: updates the existing comment when one with the marker is found', async () => {
    // Mock fetch GET returns existing preview comment
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 1, body: 'Some general comment' },
        { id: 999, body: '🚀 **Preview deployment is ready!**\n\n<!-- remitwise-preview-marker -->' }
      ]
    } as any);

    // Mock fetch PATCH returns updated comment
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 999 })
    } as any);

    const result = await publishPreview({
      repo: 'owner/repo',
      prNumber: 1224,
      token: 'dummy-token'
    });

    expect(result.prNumber).toBe(1224);
    expect(result.previewUrl).toBe('https://preview-pr-1224.remitwise.org');

    expect(global.fetch).toHaveBeenCalledTimes(2);
    // PATCH request is made to comment ID 999
    expect(global.fetch).toHaveBeenNthCalledWith(2,
      'https://api.github.com/repos/owner/repo/issues/comments/999',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('<!-- remitwise-preview-marker -->')
      })
    );
  });

  it('handles explicit GitHub API failure when fetching comments', async () => {
    // Mock fetch GET returns 403 Forbidden
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Rate limit exceeded'
    } as any);

    await expect(publishPreview({
      repo: 'owner/repo',
      prNumber: 1224,
      token: 'dummy-token'
    })).rejects.toThrow('GitHub API error while fetching comments (status 403): Rate limit exceeded');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('handles explicit GitHub API failure when posting comments', async () => {
    // Mock fetch GET returns empty array of comments
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as any);

    // Mock fetch POST returns 401 Unauthorized
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Bad credentials'
    } as any);

    await expect(publishPreview({
      repo: 'owner/repo',
      prNumber: 1224,
      token: 'dummy-token'
    })).rejects.toThrow('GitHub API error while creating comment (status 401): Bad credentials');

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

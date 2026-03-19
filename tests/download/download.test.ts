import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios
const mockAxiosGet = vi.hoisted(() => vi.fn());
const mockAxiosPost = vi.hoisted(() => vi.fn());
vi.mock('axios', () => ({
  default: {
    get: mockAxiosGet,
    post: mockAxiosPost,
  },
}));

// Mock fs
const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  statSync: vi.fn().mockReturnValue({ size: 1024 }),
}));
vi.mock('fs', () => mockFs);

// Mock path and os
vi.mock('path', () => ({
  join: (...args: string[]) => args.join('/'),
  basename: (p: string) => p.split('/').pop() || '',
  extname: (p: string) => {
    const idx = p.lastIndexOf('.');
    return idx >= 0 ? p.slice(idx) : '';
  },
  dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
}));

vi.mock('os', () => ({
  homedir: () => '/fake-home',
  tmpdir: () => '/tmp',
}));

const log = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('download helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('downloadImageToFile', () => {
    it('should download image and return local path', async () => {
      const { __testables } = await import('../../plugin');
      const { downloadImageToFile } = __testables as any;

      const mockBuffer = Buffer.from('fake-image-data');
      mockAxiosGet.mockResolvedValue({
        data: mockBuffer,
        headers: { 'content-type': 'image/jpeg' },
      });

      const result = await downloadImageToFile('https://example.com/image.jpg', log);

      expect(result).toMatch(/\/fake-home\/\.openclaw\/workspace\/media\/inbound\/openclaw-media-.*\.jpg/);
      expect(log.info).toHaveBeenCalled();
    });

    it('should detect png content type', async () => {
      const { __testables } = await import('../../plugin');
      const { downloadImageToFile } = __testables as any;

      const mockBuffer = Buffer.from('fake-png-data');
      mockAxiosGet.mockResolvedValue({
        data: mockBuffer,
        headers: { 'content-type': 'image/png' },
      });

      const result = await downloadImageToFile('https://example.com/image.png', log);

      expect(result).toMatch(/\.png$/);
    });

    it('should detect gif content type', async () => {
      const { __testables } = await import('../../plugin');
      const { downloadImageToFile } = __testables as any;

      const mockBuffer = Buffer.from('fake-gif-data');
      mockAxiosGet.mockResolvedValue({
        data: mockBuffer,
        headers: { 'content-type': 'image/gif' },
      });

      const result = await downloadImageToFile('https://example.com/image.gif', log);

      expect(result).toMatch(/\.gif$/);
    });

    it('should detect webp content type', async () => {
      const { __testables } = await import('../../plugin');
      const { downloadImageToFile } = __testables as any;

      const mockBuffer = Buffer.from('fake-webp-data');
      mockAxiosGet.mockResolvedValue({
        data: mockBuffer,
        headers: { 'content-type': 'image/webp' },
      });

      const result = await downloadImageToFile('https://example.com/image.webp', log);

      expect(result).toMatch(/\.webp$/);
    });

    it('should default to jpg for unknown content type', async () => {
      const { __testables } = await import('../../plugin');
      const { downloadImageToFile } = __testables as any;

      const mockBuffer = Buffer.from('fake-data');
      mockAxiosGet.mockResolvedValue({
        data: mockBuffer,
        headers: { 'content-type': 'application/octet-stream' },
      });

      const result = await downloadImageToFile('https://example.com/image', log);

      expect(result).toMatch(/\.jpg$/);
    });

    it('should return null on download failure', async () => {
      const { __testables } = await import('../../plugin');
      const { downloadImageToFile } = __testables as any;

      mockAxiosGet.mockRejectedValue(new Error('Network error'));

      const result = await downloadImageToFile('https://example.com/image.jpg', log);

      expect(result).toBeNull();
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('downloadMediaByCode', () => {
    it('should download media using downloadCode', async () => {
      const { __testables } = await import('../../plugin');
      const { downloadMediaByCode } = __testables as any;

      mockAxiosPost.mockResolvedValue({
        data: { downloadUrl: 'https://example.com/download.jpg' },
      });

      const mockBuffer = Buffer.from('fake-image-data');
      mockAxiosGet.mockResolvedValue({
        data: mockBuffer,
        headers: { 'content-type': 'image/jpeg' },
      });

      const config = { clientId: 'test', clientSecret: 'secret' };
      const result = await downloadMediaByCode('code123', config, log);

      expect(result).toMatch(/\.jpg$/);
      expect(log.info).toHaveBeenCalled();
    });

    it('should return null when no downloadUrl in response', async () => {
      const { __testables } = await import('../../plugin');
      const { downloadMediaByCode } = __testables as any;

      mockAxiosPost.mockResolvedValue({
        data: { errcode: 1, errmsg: 'error' },
      });

      const config = { clientId: 'test', clientSecret: 'secret' };
      const result = await downloadMediaByCode('code123', config, log);

      expect(result).toBeNull();
      expect(log.warn).toHaveBeenCalled();
    });

    it('should return null on API error', async () => {
      const { __testables } = await import('../../plugin');
      const { downloadMediaByCode } = __testables as any;

      mockAxiosPost.mockRejectedValue(new Error('API error'));

      const config = { clientId: 'test', clientSecret: 'secret' };
      const result = await downloadMediaByCode('code123', config, log);

      expect(result).toBeNull();
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('downloadFileByCode', () => {
    it('should download file and preserve original filename', async () => {
      const { __testables } = await import('../../plugin');
      const { downloadFileByCode } = __testables as any;

      mockAxiosPost.mockResolvedValue({
        data: { downloadUrl: 'https://example.com/download' },
      });

      const mockBuffer = Buffer.from('fake-file-data');
      mockAxiosGet.mockResolvedValue({
        data: mockBuffer,
      });

      const config = { clientId: 'test', clientSecret: 'secret' };
      const result = await downloadFileByCode('code123', 'report.pdf', config, log);

      expect(result).toMatch(/report\.pdf$/);
      expect(log.info).toHaveBeenCalled();
    });

    it('should sanitize filename with special characters', async () => {
      const { __testables } = await import('../../plugin');
      const { downloadFileByCode } = __testables as any;

      mockAxiosPost.mockResolvedValue({
        data: { downloadUrl: 'https://example.com/download' },
      });

      const mockBuffer = Buffer.from('fake-file-data');
      mockAxiosGet.mockResolvedValue({
        data: mockBuffer,
      });

      const config = { clientId: 'test', clientSecret: 'secret' };
      const result = await downloadFileByCode('code123', 'file/with:invalid*chars.pdf', config, log);

      // 只校验文件名本身被清理；完整路径一定会包含 '/'。
      const fileName = result?.split('/').pop() || '';
      expect(fileName).not.toMatch(/[\\:*?"<>|]/);
      expect(fileName).toContain('file_with_invalid_chars');
    });

    it('should return null when no downloadUrl in response', async () => {
      const { __testables } = await import('../../plugin');
      const { downloadFileByCode } = __testables as any;

      mockAxiosPost.mockResolvedValue({
        data: {},
      });

      const config = { clientId: 'test', clientSecret: 'secret' };
      const result = await downloadFileByCode('code123', 'file.pdf', config, log);

      expect(result).toBeNull();
      expect(log.warn).toHaveBeenCalled();
    });

    it('should return null on download failure', async () => {
      const { __testables } = await import('../../plugin');
      const { downloadFileByCode } = __testables as any;

      mockAxiosPost.mockRejectedValue(new Error('API error'));

      const config = { clientId: 'test', clientSecret: 'secret' };
      const result = await downloadFileByCode('code123', 'file.pdf', config, log);

      expect(result).toBeNull();
      expect(log.error).toHaveBeenCalled();
    });
  });
});
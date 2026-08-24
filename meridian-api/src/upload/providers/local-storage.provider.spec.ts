import { LocalStorageProvider } from './local-storage.provider';
import * as fs from 'fs';

describe('LocalStorageProvider', () => {
  let provider: LocalStorageProvider;

  beforeEach(() => {
    provider = new LocalStorageProvider();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeFile(
    originalname: string,
    overrides?: Partial<Express.Multer.File>,
  ): Express.Multer.File {
    return {
      originalname,
      mimetype: 'image/png',
      buffer: Buffer.from('fake image content'),
      size: 18,
      ...overrides,
    } as Express.Multer.File;
  }

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('returns a /uploads/ path after a successful write', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);

    const result = await provider.uploadFile(makeFile('photo.png'));
    expect(result).toMatch(/^\/uploads\/\d+-photo\.png$/);
  });

  it('creates the uploads directory when it does not exist', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const mkdirSpy = jest
      .spyOn(fs, 'mkdirSync')
      .mockImplementation(() => undefined);
    jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);

    await provider.uploadFile(makeFile('photo.png'));
    expect(mkdirSpy).toHaveBeenCalledWith(
      expect.stringContaining('uploads'),
      expect.objectContaining({ recursive: true, mode: 0o755 }),
    );
  });

  it('sanitizes path traversal sequences in the filename', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);

    const result = await provider.uploadFile(makeFile('../../unsafe.png'));
    expect(result).not.toContain('..');
    expect(result).not.toContain('/uploads/../');
  });

  it('sanitizes special characters from the filename', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);

    const result = await provider.uploadFile(
      makeFile('../../unsafe-name#$.png'),
    );
    expect(result).not.toContain('#');
    expect(result).not.toContain('$');
    expect(result).not.toContain('..');
    expect(result).toMatch(/\.png$/);
  });

  it('strips double extensions from the filename', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);

    const result = await provider.uploadFile(makeFile('malware.php.png'));
    expect(result).toMatch(/\.png$/);
    expect(result).not.toContain('.php.');
  });

  it('wraps unexpected write errors in InternalServerErrorException', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest
      .spyOn(fs.promises, 'writeFile')
      .mockRejectedValue(new Error('disk full'));

    await expect(provider.uploadFile(makeFile('test.png'))).rejects.toThrow(
      'Local file storage failed: disk full',
    );
  });
});

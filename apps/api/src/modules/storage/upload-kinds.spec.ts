import { UPLOAD_KIND_VALUES, uploadRules } from './upload-kinds';

describe('upload rules', () => {
  it('keeps audio private and images public', () => {
    expect(uploadRules('audio-chapter').visibility).toBe('private');
    for (const kind of ['book-cover', 'book-image', 'audiobook-cover', 'category-image'] as const) {
      expect(uploadRules(kind).visibility).toBe('public');
    }
  });

  it('limits images to 5 MB of jpeg/png/webp and audio to 500 MB', () => {
    expect(uploadRules('book-cover')).toMatchObject({
      maxBytes: 5 * 1024 * 1024,
      contentTypes: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' },
    });
    expect(uploadRules('audio-chapter').maxBytes).toBe(500 * 1024 * 1024);
    expect(uploadRules('audio-chapter').contentTypes['audio/mpeg']).toBe('mp3');
    expect(uploadRules('book-cover').contentTypes['image/svg+xml']).toBeUndefined();
  });

  it('uses a distinct folder for every kind', () => {
    const prefixes = UPLOAD_KIND_VALUES.map((kind) => uploadRules(kind).prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });
});

import { describe, expect, it } from 'vitest';
import { FEATURED_COVERS, featuredCoverFor, normalizeTitle } from './featured-covers';

describe('featured covers', () => {
  it('matches titles regardless of case, spaces and dash style', () => {
    expect(featuredCoverFor('МЕНИН АДЕП – АХЛАГЫМ')?.key).toBe('menin-adep-akhlagym');
    expect(featuredCoverFor('  жомоктор   кемеси ')?.key).toBe('zhomoktor-kemesi');
    expect(featuredCoverFor('«Билимпоз»')?.key).toBe('bilimpoz');
  });

  it('returns null for other books', () => {
    expect(featuredCoverFor('Жамийла')).toBeNull();
  });

  it('has a unique normalized title for every cover', () => {
    const titles = FEATURED_COVERS.map((cover) => normalizeTitle(cover.title));
    expect(new Set(titles).size).toBe(titles.length);
  });
});

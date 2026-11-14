import { useFavorites } from './favorites';

const book = {
  type: 'BOOK' as const,
  id: 'b1',
  slug: 'jamila',
  title: 'Джамиля',
  author: 'Айтматов',
  coverUrl: null,
  price: 65_000,
};

describe('guest favorites', () => {
  beforeEach(() => useFavorites.setState({ items: [], mode: 'guest' }));

  it('toggles a product and keeps its data for the favorites page', () => {
    useFavorites.getState().toggle(book);
    expect(useFavorites.getState().items).toEqual([book]);
    expect(useFavorites.getState().has('BOOK', 'b1')).toBe(true);
    useFavorites.getState().toggle(book);
    expect(useFavorites.getState().items).toEqual([]);
  });

  it('does not keep account favorites after sign-out', () => {
    useFavorites.setState({ items: [book], mode: 'server' });
    useFavorites.getState().detach();
    expect(useFavorites.getState()).toMatchObject({ items: [], mode: 'guest' });
  });
});

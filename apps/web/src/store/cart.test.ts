import { cartCount, useCart } from './cart';

const book = {
  type: 'BOOK' as const,
  id: 'b1',
  slug: 'jamila',
  title: 'Джамиля',
  author: 'Айтматов',
  coverUrl: null,
  price: 65_000,
};
const audiobook = { ...book, type: 'AUDIOBOOK' as const, id: 'a1', slug: 'jamila-audio' };

describe('guest cart', () => {
  beforeEach(() => useCart.getState().clear());

  it('accumulates book copies and caps the quantity', () => {
    useCart.getState().add(book);
    useCart.getState().add(book, 2);
    expect(useCart.getState().items).toEqual([{ ...book, quantity: 3 }]);

    useCart.getState().add(book, 500);
    expect(useCart.getState().items[0].quantity).toBe(99);
  });

  it('keeps a single copy of an audiobook', () => {
    useCart.getState().add(audiobook, 3);
    useCart.getState().add(audiobook);
    useCart.getState().setQuantity('AUDIOBOOK', 'a1', 5);
    expect(useCart.getState().items).toEqual([{ ...audiobook, quantity: 1 }]);
  });

  it('counts, updates and removes items', () => {
    useCart.getState().add(book, 2);
    useCart.getState().add(audiobook);
    expect(cartCount(useCart.getState().items)).toBe(3);

    useCart.getState().setQuantity('BOOK', 'b1', 0);
    expect(useCart.getState().items[0].quantity).toBe(1);

    useCart.getState().remove('BOOK', 'b1');
    expect(useCart.getState().items.map((i) => i.id)).toEqual(['a1']);
  });

  it('persists to localStorage', () => {
    useCart.getState().add(book);
    expect(JSON.parse(localStorage.getItem('oku24-cart')!).state.items).toHaveLength(1);
  });
});

describe('stock limits', () => {
  beforeEach(() => useCart.getState().clear());

  it('never puts more copies than in stock', () => {
    const book = {
      type: 'BOOK' as const,
      id: 's1',
      slug: 's',
      title: 'T',
      author: 'A',
      coverUrl: null,
      price: 100,
      stock: 3,
    };
    useCart.getState().add(book, 2);
    useCart.getState().add(book, 5);
    expect(useCart.getState().items[0].quantity).toBe(3);
    useCart.getState().setQuantity('BOOK', 's1', 10);
    expect(useCart.getState().items[0].quantity).toBe(3);
  });
});

const TRANSLIT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  // кыргызские буквы
  ң: 'n',
  ө: 'o',
  ү: 'u',
};

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 80;

/** «Белый пароход» → «belyi-parohod». Кириллица (русская и кыргызская) транслитерируется. */
export function slugify(input: string): string {
  const slug = [...input.toLowerCase()]
    .map((char) => TRANSLIT[char] ?? char)
    .join('')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, '');
  return slug || 'item';
}

/** Первый свободный slug: base, base-2, base-3, ... */
export async function uniqueSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base)
    .slice(0, SLUG_MAX_LENGTH - 4)
    .replace(/-+$/, '');
  if (!(await isTaken(root))) {
    return root;
  }
  for (let suffix = 2; suffix < 1000; suffix++) {
    const candidate = `${root}-${suffix}`;
    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }
  throw new Error(`Could not find a free slug for "${base}"`);
}

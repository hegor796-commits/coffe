/** Подбор кофейного глифа для «плиты» товара (фото в демо нет). */
export function productGlyph(name: string): string {
  const n = name.toLowerCase();
  if (/лат|latte/.test(n)) return '◐';
  if (/капуч|cappu/.test(n)) return '◑';
  if (/америк|americano|блэк|black/.test(n)) return '●';
  if (/эспрессо|espresso|ристрет/.test(n)) return '◉';
  if (/флэт|flat/.test(n)) return '◒';
  if (/раф|raf|мокка|mocha/.test(n)) return '❋';
  if (/чай|tea|матч|matcha/.test(n)) return '❉';
  if (/какао|cocoa|шокол|choc/.test(n)) return '◍';
  if (/лимонад|сок|juice|вода|water|колд|cold|айс|iced/.test(n)) return '❉';
  if (/круасс|croiss|булоч|bun|печен|cookie|десерт|торт|cake/.test(n)) return '✿';
  return '☕';
}

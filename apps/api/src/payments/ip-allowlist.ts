import { BlockList, isIPv4, isIPv6 } from 'node:net';

/**
 * Проверка адреса отправителя по списку разрешённых IP и подсетей.
 * Пустой список означает «проверка выключена» (например, при отладке).
 */
export function ipAllowed(source: string, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  const ip = normalize(source);
  if (!ip) return false;

  const list = new BlockList();
  for (const entry of allowed) {
    const [addr, prefix] = entry.split('/');
    const family = isIPv4(addr) ? 'ipv4' : isIPv6(addr) ? 'ipv6' : null;
    if (!family) continue;
    try {
      if (prefix) list.addSubnet(addr, parseInt(prefix, 10), family);
      else list.addAddress(addr, family);
    } catch {
      // Некорректная запись в списке не должна ронять обработку уведомления.
    }
  }

  if (isIPv4(ip)) return list.check(ip, 'ipv4');
  if (isIPv6(ip)) return list.check(ip, 'ipv6');
  return false;
}

/** ::ffff:1.2.3.4 → 1.2.3.4; всё остальное отдаём как есть. */
function normalize(source: string): string | null {
  if (!source) return null;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(source);
  return mapped ? mapped[1] : source;
}

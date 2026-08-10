import { useState } from 'react';
import { useAdminLocations, useAdminStaff, useCreateInvite } from '../../api/hooks';
import { haptic } from '../../telegram';

const ROLE_LABEL: Record<string, string> = {
  owner: 'Владелец',
  manager: 'Менеджер',
  barista: 'Бариста',
};

export function StaffTab() {
  const { data: staff } = useAdminStaff();
  const { data: locations } = useAdminLocations();
  const createInvite = useCreateInvite();
  const [role, setRole] = useState<'barista' | 'manager'>('barista');
  const [locationId, setLocationId] = useState<string>('');
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const invite = async () => {
    const loc = locationId || locations?.[0]?.id;
    if (!loc) return;
    const res = await createInvite.mutateAsync({ role, locationId: loc });
    setLink(res.link);
    setCopied(false);
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      haptic('success');
    } catch {
      /* clipboard недоступен — ссылку можно выделить вручную */
    }
  };

  return (
    <>
      <div className="h2">Пригласить сотрудника</div>
      <div className="card">
        <div className="chips-wrap" style={{ gap: 8, alignItems: 'center' }}>
          <select
            className="select"
            value={role}
            onChange={(e) => setRole(e.target.value as 'barista' | 'manager')}
          >
            <option value="barista">Бариста</option>
            <option value="manager">Менеджер</option>
          </select>
          <select
            className="select"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">Точка по умолчанию</option>
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button className="btn" style={{ padding: '9px 14px' }} onClick={invite} disabled={createInvite.isPending}>
            Создать ссылку
          </button>
        </div>
        {link && (
          <div style={{ marginTop: 12 }}>
            <div className="hint">Отправьте сотруднику эту ссылку — он откроет её в Telegram:</div>
            <div
              className="card"
              style={{ wordBreak: 'break-all', marginTop: 6, fontSize: 12.5, gap: 8 }}
            >
              {link}
              <button className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={copy}>
                {copied ? 'Скопировано ✓' : 'Скопировать ссылку'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="h2">Команда</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {staff?.map((s) => (
          <div
            key={s.id}
            className="card"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>
              <span className="serif" style={{ fontSize: 16, display: 'block' }}>
                {s.name ?? s.tgUserId}
              </span>
              <span className="hint">
                {ROLE_LABEL[s.role] ?? s.role}
                {!s.isActive && ' · отключён'}
              </span>
            </span>
            <span className={`tag ${s.role === 'owner' ? 'tag-accent' : 'tag-neutral'}`}>
              {ROLE_LABEL[s.role] ?? s.role}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

import { useState } from 'react';
import { useAdminLocations, useAdminStaff, useCreateInvite } from '../../api/hooks';

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

  const invite = async () => {
    const loc = locationId || locations?.[0]?.id;
    if (!loc) return;
    const res = await createInvite.mutateAsync({ role, locationId: loc });
    setLink(res.link);
  };

  return (
    <>
      <div className="h2">Пригласить сотрудника</div>
      <div className="card">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <select value={role} onChange={(e) => setRole(e.target.value as 'barista' | 'manager')}>
            <option value="barista">Бариста</option>
            <option value="manager">Менеджер</option>
          </select>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Точка по умолчанию</option>
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button className="btn sm" onClick={invite} disabled={createInvite.isPending}>
            Создать ссылку
          </button>
        </div>
        {link && (
          <div style={{ marginTop: 10 }}>
            <div className="hint">Отправьте сотруднику эту ссылку — он откроет её в Telegram:</div>
            <div className="card" style={{ wordBreak: 'break-all', marginTop: 6 }}>{link}</div>
          </div>
        )}
      </div>

      <div className="h2">Команда</div>
      {staff?.map((s) => (
        <div key={s.id} className="card row between">
          <span>
            <b>{s.name ?? s.tgUserId}</b>
            <div className="hint">
              {ROLE_LABEL[s.role] ?? s.role}
              {!s.isActive && ' · отключён'}
            </div>
          </span>
        </div>
      ))}
    </>
  );
}

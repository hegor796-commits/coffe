import { useState } from 'react';
import { StaffTab } from './StaffTab';
import { LocationsTab } from './LocationsTab';
import { StopListTab } from './StopListTab';

type Tab = 'staff' | 'locations' | 'stop';

const TABS: { key: Tab; label: string }[] = [
  { key: 'staff', label: 'Сотрудники' },
  { key: 'locations', label: 'Точки' },
  { key: 'stop', label: 'Стоп-лист' },
];

export function AdminApp() {
  const [tab, setTab] = useState<Tab>('staff');

  return (
    <div className="app">
      <div className="kicker">Управление</div>
      <h2 className="h1" style={{ fontSize: 26, margin: '2px 0 14px' }}>
        Кофейня
      </h2>
      <div className="chips-wrap" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <span
            key={t.key}
            className={`chip ${tab === t.key ? 'on' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </span>
        ))}
      </div>

      {tab === 'staff' && <StaffTab />}
      {tab === 'locations' && <LocationsTab />}
      {tab === 'stop' && <StopListTab />}
    </div>
  );
}

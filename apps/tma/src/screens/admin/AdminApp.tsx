import { useState } from 'react';
import { StaffTab } from './StaffTab';
import { LocationsTab } from './LocationsTab';
import { StopListTab } from './StopListTab';

type Tab = 'staff' | 'locations' | 'stop';

export function AdminApp() {
  const [tab, setTab] = useState<Tab>('staff');

  return (
    <div className="app">
      <div className="h1">Управление</div>
      <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button className={`btn sm ${tab === 'staff' ? '' : 'secondary'}`} onClick={() => setTab('staff')}>
          Сотрудники
        </button>
        <button className={`btn sm ${tab === 'locations' ? '' : 'secondary'}`} onClick={() => setTab('locations')}>
          Точки
        </button>
        <button className={`btn sm ${tab === 'stop' ? '' : 'secondary'}`} onClick={() => setTab('stop')}>
          Стоп-лист
        </button>
      </div>

      {tab === 'staff' && <StaffTab />}
      {tab === 'locations' && <LocationsTab />}
      {tab === 'stop' && <StopListTab />}
    </div>
  );
}

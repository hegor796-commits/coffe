import { useAdminLocations, usePauseLocation } from '../../api/hooks';

export function LocationsTab() {
  const { data: locations } = useAdminLocations();

  return (
    <>
      <div className="h2">Точки</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {locations?.map((l) => <LocationRow key={l.id} location={l} />)}
      </div>
      {(!locations || locations.length === 0) && <div className="hint">Точек пока нет.</div>}
    </>
  );
}

function LocationRow({
  location,
}: {
  location: { id: string; name: string; address: string | null; isAcceptingOrders: boolean };
}) {
  const pause = usePauseLocation(location.id);
  return (
    <div
      className="card"
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <span>
        <span className="serif" style={{ fontSize: 16, display: 'block' }}>
          {location.name}
        </span>
        <span className="hint">{location.address}</span>
      </span>
      <button
        className={`btn sm ${location.isAcceptingOrders ? 'secondary' : 'danger'}`}
        onClick={() => pause.mutate(!location.isAcceptingOrders)}
        disabled={pause.isPending}
      >
        {location.isAcceptingOrders ? 'Принимает' : 'На паузе'}
      </button>
    </div>
  );
}

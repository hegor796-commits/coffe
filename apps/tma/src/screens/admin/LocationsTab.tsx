import { useAdminLocations, usePauseLocation } from '../../api/hooks';

export function LocationsTab() {
  const { data: locations } = useAdminLocations();

  return (
    <>
      <div className="h2">Точки</div>
      {locations?.map((l) => <LocationRow key={l.id} location={l} />)}
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
    <div className="card row between">
      <span>
        <b>{location.name}</b>
        <div className="hint">{location.address}</div>
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

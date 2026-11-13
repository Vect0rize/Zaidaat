import { useEffect, useId, useState } from 'react';
import { MapPin } from 'lucide-react';
import { api } from '../../lib/api';

interface LocationSelectorProps {
  stateValue: string;
  cityValue: string;
  localityValue?: string;
  onChange: (next: { state: string; city: string; locality: string }) => void;
  includeLocality?: boolean;
  allowCustom?: boolean;
  compact?: boolean;
  stacked?: boolean;
}

export function LocationSelector({
  stateValue,
  cityValue,
  localityValue = '',
  onChange,
  includeLocality = true,
  allowCustom = false,
  compact = false,
  stacked = false,
}: LocationSelectorProps) {
  const uid = useId();
  const citiesListId = `${uid}-cities`;
  const localitiesListId = `${uid}-localities`;
  const [states, setStates] = useState<Array<{ state: string; region_zone: string }>>([]);
  const [cities, setCities] = useState<Array<{ city: string; state: string }>>([]);
  const [localities, setLocalities] = useState<Array<{ locality: string; pincode: string | null }>>([]);
  const [isCustomCity, setIsCustomCity] = useState(false);

  useEffect(() => {
    api
      .get<{ states: Array<{ state: string; region_zone: string }> }>('/api/locations/states')
      .then((res) => setStates(res.states))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setIsCustomCity(false);
    const query = stateValue ? `?state=${encodeURIComponent(stateValue)}` : '';
    api
      .get<{ cities: Array<{ city: string; state: string }> }>(`/api/locations/cities${query}`)
      .then((res) => setCities(res.cities))
      .catch(() => {});
  }, [stateValue]);

  useEffect(() => {
    if (!includeLocality || !cityValue) {
      setLocalities([]);
      return;
    }
    const params = new URLSearchParams({ city: cityValue });
    if (stateValue) params.set('state', stateValue);
    api
      .get<{ localities: Array<{ locality: string; pincode: string | null }> }>(
        `/api/locations/localities?${params.toString()}`
      )
      .then((res) => setLocalities(res.localities))
      .catch(() => {});
  }, [stateValue, cityValue, includeLocality]);

  return (
    <div
      className={
        stacked
          ? 'grid grid-cols-1 gap-2.5'
          : `grid gap-3 ${includeLocality ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`
      }
    >
      <div>
        {!compact && <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">State / UT</label>}
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={stateValue}
            onChange={(e) => onChange({ state: e.target.value, city: '', locality: '' })}
            className="input-field pl-9"
            aria-label="Select State or Union Territory"
          >
            <option value="">All India States & UTs</option>
            {states.map((s) => (
              <option key={s.state} value={s.state}>
                {s.state}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        {!compact && <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">City</label>}
        {allowCustom ? (
          <div>
            <select
              value={
                isCustomCity
                  ? '__custom__'
                  : cities.some((c) => c.city.toLowerCase() === (cityValue || '').toLowerCase())
                    ? cityValue
                    : cityValue
                      ? '__custom__'
                      : ''
              }
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setIsCustomCity(true);
                  onChange({ state: stateValue, city: '', locality: '' });
                } else {
                  setIsCustomCity(false);
                  onChange({ state: stateValue, city: e.target.value, locality: '' });
                }
              }}
              className="input-field"
              aria-label="Select City"
            >
              <option value="">{stateValue ? `Select Famous City in ${stateValue}` : 'Select City'}</option>
              {cities.map((c) => (
                <option key={`${c.state}-${c.city}`} value={c.city}>
                  {c.city}
                </option>
              ))}
              <option value="__custom__">+ Other / Type Custom City</option>
            </select>
            {(isCustomCity || (cityValue && !cities.some((c) => c.city.toLowerCase() === cityValue.toLowerCase()))) && (
              <input
                type="text"
                value={cityValue}
                onChange={(e) => onChange({ state: stateValue, city: e.target.value, locality: '' })}
                placeholder="Type city or town name..."
                className="input-field mt-2"
                aria-label="Custom City Name"
                autoFocus
              />
            )}
          </div>
        ) : (
          <select
            value={cityValue}
            onChange={(e) => onChange({ state: stateValue, city: e.target.value, locality: '' })}
            className="input-field"
            aria-label="Select City"
          >
            <option value="">{stateValue ? `All Cities in ${stateValue}` : 'All Cities'}</option>
            {cities.map((c) => (
              <option key={`${c.state}-${c.city}`} value={c.city}>
                {c.city}
              </option>
            ))}
          </select>
        )}
      </div>

      {includeLocality && (
        <div>
          {!compact && <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Locality / Area</label>}
          {allowCustom ? (
            <>
              <input
                list={localitiesListId}
                value={localityValue}
                onChange={(e) => onChange({ state: stateValue, city: cityValue, locality: e.target.value })}
                placeholder="Type or pick locality..."
                className="input-field"
                aria-label="Locality"
              />
              <datalist id={localitiesListId}>
                {localities.map((l) => (
                  <option key={l.locality} value={l.locality} />
                ))}
              </datalist>
            </>
          ) : (
            <select
              value={localityValue}
              onChange={(e) => onChange({ state: stateValue, city: cityValue, locality: e.target.value })}
              className="input-field"
              aria-label="Select Locality"
              disabled={!cityValue}
            >
              <option value="">{cityValue ? 'All Localities' : 'Select city first'}</option>
              {localities.map((l) => (
                <option key={l.locality} value={l.locality}>
                  {l.locality}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

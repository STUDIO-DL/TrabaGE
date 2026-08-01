import { useMemo, useState } from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import {
  CITY_OTHER_LABEL,
  CITY_OTHER_VALUE,
  COUNTRIES,
  getCitiesForCountry,
  getCitySelectValue,
  isKnownCountry,
  isListedCity,
} from '../../constants/locations';

/**
 * Country → city dependent selectors.
 * Add countries/cities in `constants/locations.js` only.
 */
export default function LocationFields({
  country = '',
  city = '',
  onCountryChange,
  onCityChange,
  errors = {},
  required = false,
  allowOtherCity = true,
  countryLabel = 'País',
  cityLabel = 'Ciudad',
  disabled = false,
}) {
  const [forceOtherCity, setForceOtherCity] = useState(false);

  const countryOptions = useMemo(() => {
    const options = [
      { value: '', label: 'Seleccionar país' },
      ...COUNTRIES.map((name) => ({ value: name, label: name })),
    ];
    const current = String(country || '').trim();
    if (current && !isKnownCountry(current)) {
      options.push({ value: current, label: current });
    }
    return options;
  }, [country]);

  const cities = useMemo(() => getCitiesForCountry(country), [country]);
  const countrySelected = Boolean(String(country || '').trim());
  const citySelectValue = getCitySelectValue(city, country, forceOtherCity);
  const showCustomCity = allowOtherCity && citySelectValue === CITY_OTHER_VALUE;

  const cityOptions = useMemo(() => {
    const options = [
      { value: '', label: countrySelected ? 'Seleccionar ciudad' : 'Primero selecciona un país' },
      ...cities.map((name) => ({ value: name, label: name })),
    ];
    if (allowOtherCity) {
      options.push({ value: CITY_OTHER_VALUE, label: CITY_OTHER_LABEL });
    }
    return options;
  }, [allowOtherCity, cities, countrySelected]);

  const handleCountryChange = (event) => {
    const nextCountry = event.target.value;
    setForceOtherCity(false);
    onCountryChange?.(nextCountry);
    onCityChange?.('');
  };

  const handleCitySelectChange = (event) => {
    const value = event.target.value;
    if (value === CITY_OTHER_VALUE) {
      setForceOtherCity(true);
      onCityChange?.(isListedCity(city, country) ? '' : city);
      return;
    }
    setForceOtherCity(false);
    onCityChange?.(value);
  };

  return (
    <div className="space-y-space-md">
      <Select
        label={countryLabel}
        name="country"
        id="country"
        value={country || ''}
        onChange={handleCountryChange}
        error={errors.country}
        required={required}
        disabled={disabled}
        options={countryOptions}
      />
      <Select
        label={cityLabel}
        name="city-select"
        id="city-select"
        value={countrySelected ? citySelectValue : ''}
        onChange={handleCitySelectChange}
        error={showCustomCity ? undefined : errors.city}
        required={required && !showCustomCity}
        disabled={disabled || !countrySelected}
        options={cityOptions}
      />
      {showCustomCity && countrySelected ? (
        <Input
          label="Escribe tu ciudad"
          name="city"
          id="city"
          value={city || ''}
          onChange={(event) => onCityChange?.(event.target.value)}
          error={errors.city}
          required={required}
          disabled={disabled}
          placeholder="Ciudad no listada"
        />
      ) : null}
    </div>
  );
}

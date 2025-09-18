import React from 'react';
import { Globe } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';

const TimezoneSettingsView = () => {
  const { state, dispatch } = useBudget();
  const { settings } = state;

  const handleTimezoneChange = (value) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { ...settings, timezoneOffset: parseInt(value, 10) }
    });
    dispatch({ type: 'ADD_TOAST', payload: { message: 'Fuseau horaire mis à jour.', type: 'success' } });
  };

  const timezones = Array.from({ length: 27 }, (_, i) => i - 12); // GMT-12 to GMT+14

  return (
    <div className="space-y-6 max-w-md">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyan-500" />
          Définir votre fuseau horaire
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Sélectionnez votre décalage par rapport à l'heure GMT pour que les calculs basés sur la date (comme la distinction passé/futur) soient corrects.
        </p>
        <select
          value={settings.timezoneOffset || 0}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          className="w-full text-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 py-2"
        >
          {timezones.map(offset => (
            <option key={offset} value={offset}>
              GMT{offset >= 0 ? `+${offset}` : offset}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default TimezoneSettingsView;

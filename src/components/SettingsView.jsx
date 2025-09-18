import React, { useState, useEffect } from 'react';
import { Save, Globe } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';

const SettingsView = () => {
  const { state, dispatch } = useBudget();
  const { settings } = state;

  const [currency, setCurrency] = useState(settings.currency);
  const [customCurrency, setCustomCurrency] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const predefinedCurrencies = ['€', '$', '£'];

  useEffect(() => {
    if (predefinedCurrencies.includes(settings.currency)) {
      setCurrency(settings.currency);
      setIsCustom(false);
    } else {
      setCurrency('custom');
      setCustomCurrency(settings.currency);
      setIsCustom(true);
    }
  }, [settings.currency]);
  
  const handleUpdateSettings = (newSettings) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
  };

  const handleCurrencyChange = (e) => {
    const value = e.target.value;
    setCurrency(value);
    if (value === 'custom') {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      handleUpdateSettings({ ...settings, currency: value });
    }
  };

  const handleCustomCurrencyChange = (e) => setCustomCurrency(e.target.value);
  const handleSaveCustomCurrency = () => { if (customCurrency.trim()) { handleUpdateSettings({ ...settings, currency: customCurrency.trim() }); } };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-blue-600" />Paramètres de la devise</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Choisissez une devise ou personnalisez</label>
          <select value={currency} onChange={handleCurrencyChange} className="w-full md:w-1/2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
            {predefinedCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="custom">Personnalisé...</option>
          </select>
        </div>
        {isCustom && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Symbole monétaire personnalisé</label>
            <div className="flex items-center gap-2">
              <input type="text" value={customCurrency} onChange={handleCustomCurrencyChange} placeholder="Ex: Ar" className="w-full md:w-1/2 px-3 py-2 border rounded-lg" maxLength="5" />
              <button onClick={handleSaveCustomCurrency} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"><Save className="w-4 h-4" /> Appliquer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;

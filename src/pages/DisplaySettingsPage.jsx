import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { Eye, Save } from 'lucide-react';
import { updateSettings } from '../context/actions';

const DisplaySettingsPage = () => {
    const { state, dispatch } = useBudget();
    const { settings, session } = state;

    const [currency, setCurrency] = useState(settings.currency);
    const [customCurrency, setCustomCurrency] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [displayUnit, setDisplayUnit] = useState(settings.displayUnit);
    const [decimalPlaces, setDecimalPlaces] = useState(settings.decimalPlaces);

    const predefinedCurrencies = ['€', '$', '£', 'Ar'];

    useEffect(() => {
        if (predefinedCurrencies.includes(settings.currency)) {
            setCurrency(settings.currency);
            setIsCustom(false);
        } else {
            setCurrency('custom');
            setCustomCurrency(settings.currency);
            setIsCustom(true);
        }
        setDisplayUnit(settings.displayUnit);
        setDecimalPlaces(settings.decimalPlaces);
    }, [settings]);

    const handleSave = () => {
        const finalCurrency = currency === 'custom' ? customCurrency.trim() : currency;
        if (!finalCurrency) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'La devise ne peut pas être vide.', type: 'error' } });
            return;
        }
        const newSettings = {
            currency: finalCurrency,
            displayUnit,
            decimalPlaces,
        };
        updateSettings(dispatch, session.user, newSettings);
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Eye className="w-8 h-8 text-green-600" />
                    Affichage et Devise
                </h1>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border space-y-8">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Devise</h2>
                    <div className="max-w-md space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Devise principale globale</label>
                            <select value={currency} onChange={(e) => { setCurrency(e.target.value); setIsCustom(e.target.value === 'custom'); }} className="w-full px-3 py-2 border rounded-lg">
                                {predefinedCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                                <option value="custom">Autre...</option>
                            </select>
                        </div>
                        {isCustom && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Symbole personnalisé</label>
                                <input type="text" value={customCurrency} onChange={(e) => setCustomCurrency(e.target.value)} placeholder="Ex: Ar" className="w-full px-3 py-2 border rounded-lg" maxLength="5" />
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Unité d'affichage</h2>
                    <div className="max-w-md">
                        <select value={displayUnit} onChange={(e) => setDisplayUnit(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                            <option value="standard">Standard</option>
                            <option value="thousands">Milliers (K)</option>
                            <option value="millions">Millions (M)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Nombre de décimales</h2>
                    <div className="max-w-md">
                        <select value={decimalPlaces} onChange={(e) => setDecimalPlaces(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg">
                            <option value={0}>0</option>
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                        </select>
                    </div>
                </div>

                <div className="pt-6 border-t flex justify-end">
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Enregistrer les préférences
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DisplaySettingsPage;

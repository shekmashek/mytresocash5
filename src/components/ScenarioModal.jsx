import React, { useState, useEffect } from 'react';
import { X, Save, Layers } from 'lucide-react';

const ScenarioModal = ({ isOpen, onClose, onSave, scenario }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (scenario) {
      setName(scenario.name);
      setDescription(scenario.description);
    } else {
      setName('');
      setDescription('');
    }
  }, [scenario]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSave({ name, description });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            {scenario ? 'Modifier le scénario' : 'Nouveau Scénario'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du scénario *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Ex: Achat voiture, Embauche..."
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows="3"
              placeholder="Décrivez l'objectif de cette simulation..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">
              Annuler
            </button>
            <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
              <Save className="w-4 h-4" /> Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScenarioModal;

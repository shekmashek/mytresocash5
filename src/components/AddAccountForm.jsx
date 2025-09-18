import React, { useState, useMemo } from 'react';
import { Save, X } from 'lucide-react';
import { useBudget, mainCashAccountCategories } from '../context/BudgetContext';

const AddAccountForm = ({ onSave, onCancel }) => {
  const { state } = useBudget();
  const { settings, projects, activeProjectId } = state;
  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

  const [formData, setFormData] = useState({
    mainCategoryId: mainCashAccountCategories[0]?.id || '',
    name: '',
    initialBalance: '',
    initialBalanceDate: new Date().toISOString().split('T')[0],
  });

  const handleSave = () => {
    if (!formData.mainCategoryId || !formData.name.trim()) {
      alert("Veuillez sélectionner un type et entrer un nom pour le nouveau compte.");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg border border-dashed mt-6">
      <h3 className="font-bold text-lg text-gray-700 mb-4">Ajouter un nouveau compte</h3>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">Type de compte *</label>
          <select
            value={formData.mainCategoryId}
            onChange={(e) => setFormData(prev => ({ ...prev, mainCategoryId: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
          >
            {mainCashAccountCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">Nom du nouveau compte *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Compte Courant Pro"
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">Solde initial ({settings.currency})</label>
            <input
              type="number"
              value={formData.initialBalance}
              onChange={(e) => setFormData(prev => ({ ...prev, initialBalance: e.target.value }))}
              placeholder="0.00"
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">Date du solde</label>
            <input
              type="date"
              value={formData.initialBalanceDate}
              onChange={(e) => setFormData(prev => ({ ...prev, initialBalanceDate: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
              min={activeProject?.startDate}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
        <button onClick={onCancel} className="text-sm bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-300 flex items-center gap-1">
          <X className="w-4 h-4" /> Annuler
        </button>
        <button onClick={handleSave} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 flex items-center gap-1">
          <Save className="w-4 h-4" /> Enregistrer le compte
        </button>
      </div>
    </div>
  );
};

export default AddAccountForm;

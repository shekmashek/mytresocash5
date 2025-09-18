import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, User } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../utils/formatting';
import { saveActual, deleteActual } from '../context/actions';

const ActualTransactionModal = ({ isOpen, onClose, editingData, type }) => {
  const { state, dispatch } = useBudget();
  const { categories, tiers, settings, session } = state;

  const getInitialFormData = (transactionType) => ({
    category: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    thirdParty: '',
    description: '',
    status: 'pending',
    type: transactionType || 'payable',
    isOffBudget: true,
  });

  const [formData, setFormData] = useState(getInitialFormData(type));

  const config = {
    payable: { title: 'Sortie Hors Budget', thirdPartyLabel: 'Fournisseur' },
    receivable: { title: 'Entrée Hors Budget', thirdPartyLabel: 'Client' }
  };
  const currentConfig = config[formData.type];
  
  const availableCategories = formData.type === 'payable' ? categories.expense : categories.revenue;
  const availableTiers = tiers.filter(t => t.type === (formData.type === 'payable' ? 'fournisseur' : 'client'));

  useEffect(() => {
    if (isOpen) {
      if (editingData && editingData.id) {
        setFormData({ ...editingData });
      } else {
        setFormData(getInitialFormData(editingData?.type || type));
      }
    }
  }, [isOpen, editingData, type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.category || !formData.thirdParty || !formData.amount || !formData.date) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    saveActual(dispatch, {
      actualData: { ...formData, amount: parseFloat(formData.amount) },
      editingActual: editingData,
      user: session.user,
      tiers,
    });
  };

  const handleDeleteClick = () => {
    if (editingData) {
      dispatch({
        type: 'OPEN_CONFIRMATION_MODAL',
        payload: {
          title: `Supprimer cette transaction ?`,
          message: 'Cette action est irréversible.',
          onConfirm: () => {
            deleteActual(dispatch, editingData.id);
            onClose();
          },
        }
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{editingData && editingData.id ? `Modifier la ${currentConfig.title}` : `Nouvelle ${currentConfig.title}`}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Date *</label><input type="date" value={formData.date || ''} onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Montant ({settings.currency}) *</label><input type="number" value={formData.amount || ''} onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0.00" step="0.01" min="0" required /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
            <select value={formData.category || ''} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
              <option value="">Sélectionner une catégorie</option>
              {availableCategories.map(mainCat => (<optgroup key={mainCat.id} label={mainCat.name}>{mainCat.subCategories.map(subCat => (<option key={subCat.id} value={subCat.name}>{subCat.name}</option>))}</optgroup>))}
            </select>
          </div>
          <div>
            <label htmlFor="actual-tier-input" className="block text-sm font-medium text-gray-700 mb-2"><User className="w-4 h-4 inline mr-1" /> {currentConfig.thirdPartyLabel} *</label>
            <input id="actual-tier-input" type="text" list="actual-tiers-list" value={formData.thirdParty || ''} onChange={(e) => setFormData(prev => ({ ...prev, thirdParty: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Saisir ou sélectionner..." required />
            <datalist id="actual-tiers-list">{availableTiers.map(tier => (<option key={tier.id} value={tier.name} />))}</datalist>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Description (optionnel)</label><textarea value={formData.description || ''} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows="2" placeholder="Détails supplémentaires..." /></div>
          <div className="flex justify-between items-center pt-4 border-t">
            <div>{editingData && editingData.id && (<button type="button" onClick={handleDeleteClick} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"><Trash2 className="w-4 h-4" /> Supprimer</button>)}</div>
            <div className="flex gap-3"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Annuler</button><button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"><Save className="w-4 h-4" /> {editingData && editingData.id ? 'Modifier' : 'Enregistrer'}</button></div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActualTransactionModal;

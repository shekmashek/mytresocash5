import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, User, Building, Trash2, Edit, Clock, Repeat, AlertCircle, ListChecks, PlusCircle, PiggyBank } from 'lucide-react';
import { formatCurrency } from '../utils/formatting';
import AddCategoryModal from './AddCategoryModal';
import { useBudget } from '../context/BudgetContext';

const BudgetModal = ({ isOpen, onClose, onSave, onDelete, editingData }) => {
  const { state, dispatch } = useBudget();
  const { categories, tiers, settings, allCashAccounts, activeProjectId, projects } = state;
  const isConsolidated = activeProjectId === 'consolidated';

  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

  const userCashAccounts = useMemo(() => {
    if (isConsolidated) return [];
    return allCashAccounts[activeProjectId] || [];
  }, [allCashAccounts, activeProjectId, isConsolidated]);

  const getInitialFormData = () => ({
    type: 'revenu',
    category: '',
    frequency: 'ponctuel',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    supplier: '',
    description: '',
    payments: [{ date: new Date().toISOString().split('T')[0], amount: '' }],
    totalProvisionAmount: '',
    numProvisions: '',
    provisionDetails: {
        finalPaymentDate: '',
        provisionAccountId: ''
    }
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState('');
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);

  const frequencyOptions = [
    { value: 'ponctuel', label: 'Ponctuel', icon: Calendar },
    { value: 'journalier', label: 'Journalier', icon: Clock },
    { value: 'hebdomadaire', label: 'Hebdomadaire', icon: Clock },
    { value: 'mensuel', label: 'Mensuel', icon: Repeat },
    { value: 'bimestriel', label: 'Bimestriel', icon: Repeat },
    { value: 'trimestriel', label: 'Trimestriel', icon: Repeat },
    { value: 'annuel', label: 'Annuel', icon: Calendar },
    { value: 'irregulier', label: 'Paiements Irréguliers', icon: ListChecks },
    { value: 'provision', label: 'À Provisionner', icon: PiggyBank, type: 'depense' }
  ];

  useEffect(() => {
    if (isOpen && editingData && editingData.id) { // Editing existing entry
      const mainCategoryType = categories.revenue.some(mc => mc.subCategories.some(sc => sc.name === editingData.category)) ? 'revenu' : 'depense';
      const availableCategories = mainCategoryType === 'revenu' ? categories.revenue : categories.expense;
      const mainCat = availableCategories.find(mc => mc.subCategories.some(sc => sc.name === editingData.category));
      
      setSelectedMainCategoryId(mainCat ? mainCat.id : '');

      setFormData({
        ...getInitialFormData(),
        type: mainCategoryType,
        ...editingData,
        payments: editingData.payments && editingData.payments.length > 0
          ? editingData.payments.map(p => ({ date: p.date || '', amount: p.amount || '' }))
          : [{ date: new Date().toISOString().split('T')[0], amount: '' }],
      });
    }
  }, [isOpen, editingData, categories.revenue, categories.expense]);

  useEffect(() => {
    if (isOpen && (!editingData || !editingData.id)) { // New entry
      const newFormData = editingData && editingData.type ? { ...getInitialFormData(), type: editingData.type } : getInitialFormData();
      setFormData(newFormData);
      setSelectedMainCategoryId('');
    }
  }, [isOpen, editingData]);
  
  useEffect(() => {
    if (formData.frequency === 'provision') {
      setFormData(prev => ({ ...prev, type: 'depense' }));
    }
  }, [formData.frequency]);

  const handlePaymentChange = (index, field, value) => {
    const newPayments = [...formData.payments];
    newPayments[index][field] = value;
    setFormData(prev => ({ ...prev, payments: newPayments }));
  };

  const addPayment = () => setFormData(prev => ({ ...prev, payments: [...prev.payments, { date: new Date().toISOString().split('T')[0], amount: '' }] }));
  const removePayment = (index) => setFormData(prev => ({ ...prev, payments: formData.payments.filter((_, i) => i !== index) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.category || !formData.supplier) {
      dispatch({ type: 'ADD_TOAST', payload: { message: 'Veuillez remplir tous les champs obligatoires.', type: 'error' } });
      return;
    }
    let entryData = { ...formData };
    if (entryData.frequency === 'irregulier' || entryData.frequency === 'provision') {
      const validPayments = entryData.payments.filter(p => p.date && p.amount);
      if (validPayments.length === 0) {
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Veuillez ajouter au moins un paiement.', type: 'error' } });
        return;
      }
      entryData.payments = validPayments;
      entryData.amount = validPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    } else {
      if (!formData.amount) {
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Veuillez remplir le montant.', type: 'error' } });
        return;
      }
      entryData.amount = parseFloat(formData.amount);
      entryData.payments = [];
    }
    if (formData.frequency === 'ponctuel' && !formData.date) {
      dispatch({ type: 'ADD_TOAST', payload: { message: 'Veuillez sélectionner une date pour une transaction ponctuelle.', type: 'error' } });
      return;
    }
    if (formData.frequency !== 'ponctuel' && formData.frequency !== 'irregulier' && formData.frequency !== 'provision' && !formData.startDate) {
      dispatch({ type: 'ADD_TOAST', payload: { message: 'Veuillez sélectionner une date de début pour une transaction récurrente.', type: 'error' } });
      return;
    }
    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      dispatch({ type: 'ADD_TOAST', payload: { message: 'La date de fin ne peut pas être antérieure à la date de début.', type: 'error' } });
      return;
    }
    if (formData.frequency === 'provision') {
        if (!formData.provisionDetails.finalPaymentDate || !formData.provisionDetails.provisionAccountId) {
            dispatch({ type: 'ADD_TOAST', payload: { message: "Pour une provision, veuillez spécifier la date du paiement final et le compte de provision.", type: 'error' } });
            return;
        }
    }
    onSave({ ...entryData, endDate: entryData.endDate || null });
  };

  const handleGenerateProvisions = () => {
    const total = parseFloat(formData.totalProvisionAmount);
    const num = parseInt(formData.numProvisions, 10);
    if (!total || !num || total <= 0 || num <= 0) {
      dispatch({ type: 'ADD_TOAST', payload: { message: "Veuillez entrer un montant total et un nombre de provisions valides.", type: 'error' } });
      return;
    }
    const provisionAmount = total / num;
    const provisions = Array.from({ length: num }, (_, i) => ({
      date: new Date(new Date().setMonth(new Date().getMonth() + i)).toISOString().split('T')[0],
      amount: provisionAmount.toFixed(2)
    }));
    setFormData(prev => ({ ...prev, payments: provisions }));
  };

  const handleDeleteClick = () => {
    if (editingData) {
      dispatch({
        type: 'OPEN_CONFIRMATION_MODAL',
        payload: {
          title: 'Supprimer cette entrée ?',
          message: 'Cette action est irréversible.',
          onConfirm: () => onDelete(editingData.id),
        }
      });
    }
  };

  const getAvailableCategories = () => formData.type === 'revenu' ? categories.revenue : categories.expense;
  const getAvailableTiers = () => tiers.filter(t => t.type === (formData.type === 'revenu' ? 'client' : 'fournisseur'));
  const getFrequencyDescription = (frequency, amount) => {
    if (!amount) return '';
    const formattedAmount = formatCurrency(amount, settings);
    switch (frequency) {
      case 'journalier': return `${formattedAmount} chaque jour`;
      case 'hebdomadaire': return `${formattedAmount} par semaine`;
      case 'mensuel': return `${formattedAmount} chaque mois`;
      case 'bimestriel': return `${formattedAmount} tous les 2 mois`;
      case 'trimestriel': return `${formattedAmount} tous les 3 mois`;
      case 'annuel': return `${formattedAmount} chaque année`;
      case 'ponctuel': return `${formattedAmount} une seule fois`;
      default: return '';
    }
  };
  const handleSaveNewCategory = (subCategoryName) => { 
    dispatch({ type: 'ADD_SUB_CATEGORY', payload: { type: formData.type, mainCategoryId: selectedMainCategoryId, subCategoryName } }); 
    setFormData(prev => ({ ...prev, category: subCategoryName })); 
    setIsAddCategoryModalOpen(false); 
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">{editingData ? "Modifier l'entrée prévisionnelle" : 'Nouvelle entrée budgétaire prévisionnelle'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-6 h-6" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
              <div className="flex gap-4">
                <label className="flex items-center"><input type="radio" name="type" value="revenu" checked={formData.type === 'revenu'} onChange={(e) => { setFormData(prev => ({ ...prev, type: e.target.value, category: '' })); setSelectedMainCategoryId(''); }} className="mr-2" disabled={formData.frequency === 'provision'} /><Building className="w-4 h-4 mr-1 text-green-600" /> Entrée</label>
                <label className="flex items-center"><input type="radio" name="type" value="depense" checked={formData.type === 'depense'} onChange={(e) => { setFormData(prev => ({ ...prev, type: e.target.value, category: '' })); setSelectedMainCategoryId(''); }} className="mr-2" /><Calendar className="w-4 h-4 mr-1 text-red-600" /> Sortie</label>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie Principale *</label>
                    <select 
                        value={selectedMainCategoryId} 
                        onChange={(e) => {
                            setSelectedMainCategoryId(e.target.value);
                            setFormData(prev => ({ ...prev, category: '' }));
                        }} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                        required
                    >
                        <option value="">Sélectionner</option>
                        {getAvailableCategories().map(mainCat => (
                            <option key={mainCat.id} value={mainCat.id}>{mainCat.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sous-catégorie *</label>
                    <div className="flex gap-2">
                        <select 
                            value={formData.category || ''} 
                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                            required 
                            disabled={!selectedMainCategoryId}
                        >
                            <option value="">Sélectionner</option>
                            {selectedMainCategoryId && 
                                getAvailableCategories().find(mc => mc.id === selectedMainCategoryId)?.subCategories.map(subCat => (
                                    <option key={subCat.id} value={subCat.name}>{subCat.name}</option>
                                ))
                            }
                        </select>
                        <button 
                            type="button" 
                            onClick={() => setIsAddCategoryModalOpen(true)} 
                            className="p-2 border rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!selectedMainCategoryId}
                            title="Ajouter une nouvelle sous-catégorie"
                        >
                            <PlusCircle className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Fréquence *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {frequencyOptions.filter(opt => formData.type === 'depense' || opt.type !== 'depense').map(opt => { const Icon = opt.icon; return (<label key={opt.value} className={`flex items-center p-3 border rounded-lg cursor-pointer ${formData.frequency === opt.value ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}`}><input type="radio" name="frequency" value={opt.value} checked={formData.frequency === opt.value} onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))} className="mr-3" /><Icon className="w-4 h-4 mr-2 text-blue-600" /><span className="font-medium">{opt.label}</span></label>); })}
              </div>
            </div>
            {formData.frequency === 'ponctuel' && (<div><label className="block text-sm font-medium text-gray-700 mb-2">Date du paiement *</label><input type="date" value={formData.date || ''} onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required min={activeProject?.startDate} /></div>)}
            {formData.frequency !== 'ponctuel' && formData.frequency !== 'irregulier' && formData.frequency !== 'provision' && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50"><div><label className="block text-sm font-medium text-gray-700 mb-2">Date de début *</label><input type="date" value={formData.startDate || ''} onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required min={activeProject?.startDate} /></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Date de fin (optionnel)</label><input type="date" value={formData.endDate || ''} onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" min={formData.startDate || activeProject?.startDate} /></div></div>)}
            
            {formData.frequency === 'provision' && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium text-gray-800">Détails de la provision</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date du paiement final *</label>
                    <input type="date" value={formData.provisionDetails.finalPaymentDate || ''} onChange={e => setFormData(prev => ({ ...prev, provisionDetails: { ...prev.provisionDetails, finalPaymentDate: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required min={activeProject?.startDate} />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Compte de provision *</label>
                    <select value={formData.provisionDetails.provisionAccountId || ''} onChange={e => setFormData(prev => ({ ...prev, provisionDetails: { ...prev.provisionDetails, provisionAccountId: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                      <option value="">Sélectionner un compte</option>
                      {userCashAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Montant Total ({settings.currency})</label>
                    <input type="number" value={formData.totalProvisionAmount || ''} onChange={e => setFormData(prev => ({ ...prev, totalProvisionAmount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="100000" />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nb. de provisions</label>
                    <input type="number" value={formData.numProvisions || ''} onChange={e => setFormData(prev => ({ ...prev, numProvisions: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="10" />
                  </div>
                  <div className="sm:col-span-1 flex items-end">
                    <button type="button" onClick={handleGenerateProvisions} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm">Générer</button>
                  </div>
                </div>
              </div>
            )}
            
            {(formData.frequency === 'irregulier' || formData.frequency === 'provision') && (<div className="space-y-4 p-4 border rounded-lg bg-gray-50"><h4 className="font-medium text-gray-800">Liste des paiements</h4>{formData.payments.map((payment, index) => (<div key={index} className="flex items-center gap-2"><input type="date" value={payment.date || ''} onChange={(e) => handlePaymentChange(index, 'date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required min={activeProject?.startDate} /><input type="number" value={payment.amount || ''} onChange={(e) => handlePaymentChange(index, 'amount', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder={`Montant (${settings.currency})`} min="0" step="0.01" required readOnly={formData.frequency === 'provision'} />{formData.payments.length > 1 && (<button type="button" onClick={() => removePayment(index)} className="p-2 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>)}</div>))}{formData.frequency === 'irregulier' && <button type="button" onClick={addPayment} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"><PlusCircle className="w-4 h-4" />Ajouter un paiement</button>}</div>)}
            
            <div><label htmlFor="tier-input" className="block text-sm font-medium text-gray-700 mb-2"><User className="w-4 h-4 inline mr-1" /> {formData.type === 'revenu' ? 'Client' : 'Fournisseur'} *</label><input id="tier-input" type="text" list="tiers-list" value={formData.supplier || ''} onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Saisir ou sélectionner..." required /><datalist id="tiers-list">{getAvailableTiers().map(tier => (<option key={tier.id} value={tier.name} />))}</datalist></div>
            
            {formData.frequency !== 'irregulier' && formData.frequency !== 'provision' && (<div><label className="block text-sm font-medium text-gray-700 mb-2">Montant ({settings.currency}) *</label><input type="number" value={formData.amount || ''} onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0.00" step="0.01" min="0" required />{formData.amount && (<p className="mt-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg flex items-start gap-2"><AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /><span><strong>Aperçu:</strong> {getFrequencyDescription(formData.frequency, formData.amount)} {formData.frequency !== 'ponctuel' && ` du ${new Date(formData.startDate).toLocaleDateString('fr-FR')} ${formData.endDate ? `au ${new Date(formData.endDate).toLocaleDateString('fr-FR')}` : 'indéfiniment'}.`}</span></p>)}</div>)}
            
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Description (optionnel)</label><textarea value={formData.description || ''} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows="3" placeholder="Détails supplémentaires..." /></div>
            
            <div className="flex justify-between items-center pt-4 border-t">
              <div>{editingData && (<button type="button" onClick={handleDeleteClick} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"><Trash2 className="w-4 h-4" /> Supprimer</button>)}</div>
              <div className="flex gap-3"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Annuler</button><button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"><Edit className="w-4 h-4" /> {editingData ? 'Modifier' : 'Enregistrer'}</button></div>
            </div>
          </form>
        </div>
      </div>
      {isAddCategoryModalOpen && (
        <AddCategoryModal 
            isOpen={isAddCategoryModalOpen} 
            onClose={() => setIsAddCategoryModalOpen(false)} 
            onSave={handleSaveNewCategory} 
            mainCategoryName={getAvailableCategories().find(mc => mc.id === selectedMainCategoryId)?.name || ''}
        />
      )}
    </>
  );
};

export default BudgetModal;

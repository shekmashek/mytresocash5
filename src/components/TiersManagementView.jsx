import React, { useState, useMemo } from 'react';
import { Users, UserPlus, Edit, Trash2, Save, X, Plus, Search, Banknote } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../utils/formatting';
import EmptyState from './EmptyState';

const TiersManagementView = () => {
  const { state, dispatch } = useBudget();
  const { tiers, allEntries, allActuals, settings, loans } = state;

  const [newTierName, setNewTierName] = useState('');
  const [newTierType, setNewTierType] = useState('fournisseur');
  const [editingTier, setEditingTier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleTierClick = (tier) => {
    const targetView = tier.type === 'fournisseur' ? 'payables' : 'receivables';
    dispatch({ type: 'SET_ACTUALS_SEARCH_TERM', payload: tier.name });
    dispatch({ type: 'SET_CURRENT_VIEW', payload: targetView });
    dispatch({ type: 'SET_ACTIVE_SETTINGS_DRAWER', payload: null });
  };

  const handleAddTier = (e) => {
    e.preventDefault();
    if (newTierName.trim()) {
      dispatch({ type: 'ADD_TIER', payload: { name: newTierName.trim(), type: newTierType } });
      setNewTierName('');
    }
  };
  const handleStartEdit = (tier) => setEditingTier({ ...tier });
  const handleCancelEdit = () => setEditingTier(null);
  const handleSaveEdit = () => {
    if (editingTier.name.trim()) {
      dispatch({ type: 'UPDATE_TIER', payload: { tierId: editingTier.id, newName: editingTier.name.trim() } });
      handleCancelEdit();
    }
  };
  
  const isTierUsed = (tierName) => {
    const entries = Object.values(allEntries).flat() || [];
    const actuals = Object.values(allActuals).flat() || [];
    return entries.some(e => e.supplier === tierName) || actuals.some(a => a.thirdParty === tierName);
  };

  const handleDeleteTier = (tierId) => {
    const tierToDelete = tiers.find(t => t.id === tierId);
    if (!tierToDelete) return;

    if (isTierUsed(tierToDelete.name)) {
      dispatch({ type: 'ADD_TOAST', payload: { message: `Suppression impossible: le tiers "${tierToDelete.name}" est utilisé.`, type: 'error' } });
      return;
    }

    dispatch({
      type: 'OPEN_CONFIRMATION_MODAL',
      payload: {
        title: `Supprimer "${tierToDelete.name}" ?`,
        message: 'Cette action est irréversible.',
        onConfirm: () => dispatch({ type: 'DELETE_TIER', payload: tierId }),
      }
    });
  };

  const calculateUnpaidAmount = (tierName) => {
    const unpaidStatuses = ['pending', 'partially_paid', 'partially_received'];
    
    const totalUnpaid = Object.values(allActuals)
        .flat()
        .filter(actual => 
            actual.thirdParty === tierName && 
            unpaidStatuses.includes(actual.status)
        )
        .reduce((sum, actual) => {
            const totalPaid = (actual.payments || []).reduce((pSum, p) => pSum + p.paidAmount, 0);
            const remaining = actual.amount - totalPaid;
            return sum + (remaining > 0 ? remaining : 0);
        }, 0);

    return totalUnpaid;
  };

  const financialTiers = useMemo(() => {
    const financialTiersSet = new Set();
    (loans || []).forEach(loan => financialTiersSet.add(loan.thirdParty));
    return Array.from(financialTiersSet).map(name => ({
      name,
      type: 'financial',
      unpaid: calculateUnpaidAmount(name)
    })).filter(tier => tier.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [loans, searchTerm, allActuals]);

  const renderTiersList = (type, title) => {
    const filteredTiers = tiers
      .filter(t => t.type === type && t.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
      
    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
        {filteredTiers.length > 0 ? (
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b">
                        <th className="py-2 text-left font-medium text-gray-500">Nom</th>
                        <th className="py-2 text-right font-medium text-gray-500">Impayés</th>
                        <th className="py-2 text-right font-medium text-gray-500 w-24">Actions</th>
                    </tr>
                </thead>
                <tbody>
                {filteredTiers.map(tier => {
                    const unpaidAmount = calculateUnpaidAmount(tier.name);
                    return (
                        <tr key={tier.id} className="group border-b last:border-b-0 hover:bg-gray-50">
                            <td className="py-3">
                                {editingTier?.id === tier.id ? (
                                    <input 
                                        type="text" 
                                        value={editingTier.name} 
                                        onChange={(e) => setEditingTier(prev => ({...prev, name: e.target.value}))} 
                                        className="w-full px-2 py-1 border rounded-md text-sm" 
                                        autoFocus
                                    />
                                ) : (
                                    <button onClick={() => handleTierClick(tier)} className="text-gray-800 text-left hover:underline hover:text-blue-600 transition-colors">
                                        {tier.name}
                                    </button>
                                )}
                            </td>
                            <td className={`py-3 text-right font-semibold ${unpaidAmount > 0 ? (type === 'fournisseur' ? 'text-red-600' : 'text-yellow-600') : 'text-gray-500'}`}>
                                {unpaidAmount > 0 ? formatCurrency(unpaidAmount, settings) : '-'}
                            </td>
                            <td className="py-3 text-right">
                                {editingTier?.id === tier.id ? (
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:text-green-800"><Save className="w-4 h-4" /></button>
                                        <button onClick={handleCancelEdit} className="p-1 text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleStartEdit(tier)} className="p-1 text-blue-600 hover:text-blue-800"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteTier(tier.id)} className="p-1 text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed" title={isTierUsed(tier.name) ? "Suppression impossible: tiers utilisé" : "Supprimer"}><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        ) : (
          <EmptyState
            icon={Users}
            title={searchTerm ? 'Aucun tiers trouvé' : 'Aucun tiers de ce type'}
            message={searchTerm ? "Essayez d'affiner votre recherche." : "Ajoutez un nouveau client ou fournisseur pour commencer."}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2"><UserPlus className="w-5 h-5 text-blue-600" /> Ajouter un nouveau tiers commercial</h2>
        <form onSubmit={handleAddTier} className="flex flex-wrap gap-3 items-end">
            <div className="flex-grow">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nom du Tiers</label>
                <input type="text" value={newTierName} onChange={(e) => setNewTierName(e.target.value)} placeholder="Ex: Client A, Fournisseur B..." className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div className="flex-shrink-0">
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select value={newTierType} onChange={(e) => setNewTierType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                    <option value="fournisseur">Fournisseur</option>
                    <option value="client">Client</option>
                </select>
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> Ajouter
            </button>
        </form>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
        <div className="relative">
          <label htmlFor="search-tier" className="sr-only">Rechercher un tiers</label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            id="search-tier"
            name="search-tier"
            className="block w-full rounded-md border-gray-300 py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
            placeholder="Rechercher un tiers..."
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <hr/>
        {renderTiersList('fournisseur', 'Fournisseurs')}
        <hr/>
        {renderTiersList('client', 'Clients')}
        <hr/>
        <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Prêteurs / Emprunteurs</h3>
            {financialTiers.length > 0 ? (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="py-2 text-left font-medium text-gray-500">Nom</th>
                            <th className="py-2 text-right font-medium text-gray-500">Impayés</th>
                        </tr>
                    </thead>
                    <tbody>
                        {financialTiers.map(tier => (
                            <tr key={tier.name} className="group border-b last:border-b-0 hover:bg-gray-50">
                                <td className="py-3 text-gray-800">{tier.name}</td>
                                <td className={`py-3 text-right font-semibold ${tier.unpaid > 0 ? 'text-gray-600' : 'text-gray-500'}`}>
                                    {tier.unpaid > 0 ? formatCurrency(tier.unpaid, settings) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                 <EmptyState
                    icon={Banknote}
                    title="Aucun prêteur ou emprunteur"
                    message="Les tiers liés à vos prêts et emprunts apparaîtront ici."
                />
            )}
        </div>
      </div>
    </div>
  );
};

export default TiersManagementView;

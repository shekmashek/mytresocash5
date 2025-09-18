import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Edit, Trash2, Plus, AlertTriangle, HandCoins, ArrowDownUp, DollarSign, Clock, PiggyBank } from 'lucide-react';
import { formatCurrency } from '../utils/formatting';
import { useBudget } from '../context/BudgetContext';
import EmptyState from './EmptyState';
import { getTodayInTimezone } from '../utils/budgetCalculations';

const ActualsView = ({ type }) => {
  const { state, dispatch } = useBudget();
  const { projects, activeProjectId, allActuals, settings, actualsSearchTerm, actualsViewFilter } = state;

  const { activeProject, actualTransactions } = useMemo(() => {
    const project = projects.find(p => p.id === activeProjectId);
    return {
      activeProject: project,
      actualTransactions: project ? (allActuals[project.id] || []) : [],
    };
  }, [activeProjectId, projects, allActuals]);
  
  const currencySettings = settings;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('unpaid');
  const [timeHorizon, setTimeHorizon] = useState(1);

  useEffect(() => {
    if (actualsSearchTerm) {
      setSearchTerm(actualsSearchTerm);
      dispatch({ type: 'SET_ACTUALS_SEARCH_TERM', payload: '' });
    }
  }, [actualsSearchTerm, dispatch]);

  useEffect(() => {
    if (actualsViewFilter?.status === 'overdue') {
      setFilterStatus('overdue');
      dispatch({ type: 'SET_ACTUALS_VIEW_FILTER', payload: null });
    }
  }, [actualsViewFilter, dispatch]);

  const config = {
    payable: { title: 'Gestion des Sorties', noun: 'sortie', icon: <ArrowDownUp className="w-8 h-8 text-red-600" />, statuses: { pending: 'À payer', partially_paid: 'Partiellement Payé', paid: 'Payée' }, color: 'red', addBtnText: 'Sortie Hors Budget', actionBtnText: 'Payer' },
    receivable: { title: 'Gestion des Entrées', noun: 'entrée', icon: <HandCoins className="w-8 h-8 text-green-600" />, statuses: { pending: 'À recevoir', partially_received: 'Partiellement Reçu', received: 'Reçue' }, color: 'green', addBtnText: 'Entrée Hors Budget', actionBtnText: 'Encaisser' }
  };
  const currentConfig = config[type];
  const unpaidLabel = type === 'payable' ? 'À Payer / Partiels' : 'À Recevoir / Partiels';

  const handleAddNew = () => dispatch({ type: 'OPEN_ACTUAL_TRANSACTION_MODAL', payload: { type, isOffBudget: true } });
  const handleEdit = (actual) => dispatch({ type: 'OPEN_ACTUAL_TRANSACTION_MODAL', payload: actual });
  const handleOpenPaymentModal = (actual) => dispatch({ type: 'OPEN_PAYMENT_MODAL', payload: actual });
  
  const handleDelete = (id) => {
    dispatch({
      type: 'OPEN_CONFIRMATION_MODAL',
      payload: {
        title: `Supprimer cette ${currentConfig.noun} ?`,
        message: 'Cette action est irréversible.',
        onConfirm: () => dispatch({ type: 'DELETE_ACTUAL', payload: id }),
      }
    });
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('fr-FR');

  const filteredAndSorted = useMemo(() => {
    return (actualTransactions || []).filter(t => {
      if (t.type !== type) return false;
      
      const matchesSearch = t.thirdParty.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase()) || (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const unpaidStatuses = ['pending', 'partially_paid', 'partially_received'];
      const today = getTodayInTimezone(settings.timezoneOffset);

      if (filterStatus === 'overdue') {
        const isOverdue = new Date(t.date) < today && unpaidStatuses.includes(t.status);
        return matchesSearch && isOverdue;
      }

      const matchesStatus = filterStatus === 'all' ? true : (filterStatus === 'unpaid' ? unpaidStatuses.includes(t.status) : t.status === filterStatus);
      let matchesTime = true;
      if (timeHorizon !== -1) {
        const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const transactionDate = new Date(t.date);
        const isArrear = transactionDate < startOfCurrentMonth && !['paid', 'received'].includes(t.status);
        const limitDate = new Date(today.getFullYear(), today.getMonth() + timeHorizon + 1, 0); limitDate.setHours(23, 59, 59, 999);
        const isInHorizon = transactionDate >= startOfCurrentMonth && transactionDate <= limitDate;
        matchesTime = isArrear || isInHorizon;
      }
      return matchesSearch && matchesStatus && matchesTime;
    }).sort((a, b) => {
        const today = getTodayInTimezone(settings.timezoneOffset);
        const unpaidStatuses = ['pending', 'partially_paid', 'partially_received'];

        const aIsProvision = !!a.isProvision;
        const bIsProvision = !!b.isProvision;
        if (aIsProvision !== bIsProvision) return aIsProvision ? -1 : 1;

        const aIsOffBudget = !!a.isOffBudget;
        const bIsOffBudget = !!b.isOffBudget;
        if (aIsOffBudget !== bIsOffBudget) return aIsOffBudget ? -1 : 1;

        const aIsArriere = new Date(a.date) < today && unpaidStatuses.includes(a.status);
        const bIsArriere = new Date(b.date) < today && unpaidStatuses.includes(b.status);
        if (aIsArriere !== bIsArriere) return aIsArriere ? -1 : 1;

        return new Date(a.date) - new Date(b.date);
    });
  }, [actualTransactions, type, searchTerm, filterStatus, timeHorizon, settings.timezoneOffset]);

  const totals = (actualTransactions || []).filter(t => t.type === type).reduce((acc, t) => {
    const totalPaid = (t.payments || []).reduce((sum, p) => sum + p.paidAmount, 0);
    acc.total += t.amount;
    acc.settled += totalPaid;
    acc.pending += (t.amount - totalPaid);
    return acc;
  }, { total: 0, pending: 0, settled: 0 });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid': case 'received': return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">{currentConfig.statuses[status] || status}</span>;
      case 'partially_paid': case 'partially_received': return <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">{currentConfig.statuses[status] || status}</span>;
      case 'pending': default: return <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">{currentConfig.statuses[status] || status}</span>;
    }
  };

  if (!activeProject) {
    return <div className="p-6">Chargement du projet...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-full">
      <div className="mb-8 flex justify-between items-start">
        <div className="flex items-center gap-4">{currentConfig.icon}<div><h1 className="text-3xl font-bold text-gray-900">{currentConfig.title}</h1></div></div>
        <button onClick={handleAddNew} className={`bg-${currentConfig.color}-600 hover:bg-${currentConfig.color}-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2`}>
          <Plus className="w-5 h-5" /> {currentConfig.addBtnText}
        </button>
      </div>
      {filterStatus === 'overdue' && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-r-lg flex justify-between items-center" role="alert">
            <div>
              <p className="font-bold">Filtre Actif : Arriérés</p>
              <p className="text-sm">Affichage de toutes les transactions échues non réglées.</p>
            </div>
            <button onClick={() => setFilterStatus('unpaid')} className="text-sm font-semibold text-yellow-900 hover:bg-yellow-200 p-2 rounded-lg">
              Retour aux filtres standards
            </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border"><div className="text-sm text-gray-600">Total Dû</div><div className="text-2xl font-bold">{formatCurrency(totals.total, currencySettings)}</div></div>
        <div className={`bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200`}><div className="text-sm text-yellow-600">Total Restant</div><div className="text-2xl font-bold text-yellow-700">{formatCurrency(totals.pending, currencySettings)}</div></div>
        <div className={`bg-green-50 p-4 rounded-lg shadow border border-green-200`}><div className="text-sm text-green-600">Total Réglé</div><div className="text-2xl font-bold text-green-700">{formatCurrency(totals.settled, currencySettings)}</div></div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-2"><Search className="w-4 h-4 inline mr-1" />Rechercher</label><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tiers, catégorie..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2"><Filter className="w-4 h-4 inline mr-1" />Statut</label><select value={filterStatus === 'overdue' ? 'unpaid' : filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"><option value="unpaid">{unpaidLabel}</option><option value="all">Tous (y compris réglés)</option>{Object.entries(currentConfig.statuses).map(([key, value]) => (<option key={key} value={key}>{value}</option>))}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2"><Clock className="w-4 h-4 inline mr-1" />Horizon</label><select value={timeHorizon} onChange={(e) => setTimeHorizon(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" disabled={filterStatus === 'overdue'}><option value={0}>Arriérés + Mois en cours</option><option value={1}>+ 1 Mois</option><option value={2}>+ 2 Mois</option><option value={3}>+ 3 Mois</option><option value={-1}>Tout afficher</option></select></div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {filteredAndSorted.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title={`Aucune ${currentConfig.noun} trouvée`}
              message="Essayez de modifier vos filtres de recherche ou d'ajuster l'horizon temporel pour trouver ce que vous cherchez."
            />
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr className="text-xs font-medium text-gray-500 uppercase tracking-wider"><th className="px-6 py-4 text-left">Date Échéance</th><th className="px-6 py-4 text-left">Tiers</th><th className="px-6 py-4 text-left">Catégorie</th><th className="px-6 py-4 text-right">Montant</th><th className="px-6 py-4 text-center">Statut</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSorted.map((t) => {
                  const totalPaid = (t.payments || []).reduce((sum, p) => sum + p.paidAmount, 0);
                  const isSettled = t.status === 'paid' || t.status === 'received';
                  const isOffBudget = t.isOffBudget;
                  const isProvision = t.isProvision;
                  return (
                    <tr key={t.id} className={`group hover:bg-gray-50 ${isOffBudget ? 'bg-purple-50' : isProvision ? 'bg-indigo-50' : ''}`}>
                      <td className="px-6 py-4 font-medium">{formatDate(t.date)}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{t.thirdParty}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{t.description}</div>
                        {isProvision && (<span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-indigo-800 bg-indigo-200 rounded-full"><PiggyBank className="w-3 h-3" />Provision</span>)}
                        {isOffBudget && !isProvision && (<span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-purple-800 bg-purple-200 rounded-full"><AlertTriangle className="w-3 h-3" />Hors Budget</span>)}
                      </td>
                      <td className="px-6 py-4 text-sm">{t.category}</td>
                      <td className={`px-6 py-4 text-right font-semibold text-lg text-gray-800`}><div>{formatCurrency(t.amount, currencySettings)}</div><div className="text-xs font-normal text-gray-500">{formatCurrency(totalPaid, currencySettings)} réglé</div></td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(t.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-1 justify-end">
                            {!isSettled && <button onClick={() => handleOpenPaymentModal(t)} className={`bg-${currentConfig.color}-500 hover:bg-${currentConfig.color}-600 text-white rounded-md p-2 flex items-center gap-1 text-sm`}><DollarSign className="w-4 h-4" /> {currentConfig.actionBtnText}</button>}
                            {isOffBudget && (
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(t)} className="p-2 text-blue-600 hover:text-blue-800"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(t.id)} className="p-2 text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActualsView;

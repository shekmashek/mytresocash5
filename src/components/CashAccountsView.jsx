import React, { useState, useMemo } from 'react';
import { Wallet, Edit, Plus, Trash2, AlertTriangle, Archive, ArchiveRestore, X, Save, ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from '../utils/formatting';
import { useBudget, mainCashAccountCategories } from '../context/BudgetContext';
import AddAccountForm from './AddAccountForm';
import EmptyState from './EmptyState';

const CashAccountsView = () => {
  const { state, dispatch } = useBudget();
  const { allCashAccounts, settings, allActuals, activeProjectId, projects } = state;
  const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);
  const isConsolidated = activeProjectId === 'consolidated';

  const userCashAccounts = useMemo(() => {
    if (isConsolidated) return [];
    return allCashAccounts[activeProjectId] || [];
  }, [allCashAccounts, activeProjectId, isConsolidated]);

  const accountTypeMap = useMemo(() => 
    new Map(mainCashAccountCategories.map(cat => [cat.id, cat.name])), 
  []);

  const [editingAccount, setEditingAccount] = useState(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  const isAccountUsed = (accountId) => {
    const projectActuals = allActuals[activeProjectId] || [];
    return projectActuals.flatMap(a => a.payments || []).some(p => p.cashAccount === accountId);
  };

  const handleStartEdit = (account) => {
    setEditingAccount({
      id: account.id,
      name: account.name || '',
      initialBalance: account.initialBalance || '',
      initialBalanceDate: account.initialBalanceDate || new Date().toISOString().split('T')[0]
    });
  };

  const handleCancelEdit = () => {
    setEditingAccount(null);
  };

  const handleSaveEdit = () => {
    if (!editingAccount.name.trim()) {
      dispatch({ type: 'ADD_TOAST', payload: { message: "Le nom du compte ne peut pas être vide.", type: 'error' } });
      return;
    }
    dispatch({
      type: 'UPDATE_USER_CASH_ACCOUNT',
      payload: {
        projectId: activeProjectId,
        accountId: editingAccount.id,
        accountData: {
          name: editingAccount.name.trim(),
          initialBalance: parseFloat(editingAccount.initialBalance) || 0,
          initialBalanceDate: editingAccount.initialBalanceDate
        }
      }
    });
    handleCancelEdit();
  };

  const handleAddAccount = (formData) => {
    dispatch({
      type: 'ADD_USER_CASH_ACCOUNT',
      payload: {
        projectId: activeProjectId,
        mainCategoryId: formData.mainCategoryId,
        name: formData.name.trim(),
        initialBalance: parseFloat(formData.initialBalance) || 0,
        initialBalanceDate: formData.initialBalanceDate || new Date().toISOString().split('T')[0]
      }
    });
    setIsAddingAccount(false);
  };

  const handleDeleteAccount = (accountId) => {
    if (isAccountUsed(accountId)) {
      dispatch({ type: 'ADD_TOAST', payload: { message: "Suppression impossible: ce compte est utilisé dans des transactions.", type: 'error' } });
      return;
    }
    dispatch({
      type: 'OPEN_CONFIRMATION_MODAL',
      payload: {
        title: 'Supprimer ce compte ?',
        message: 'Cette action est irréversible.',
        onConfirm: () => dispatch({ type: 'DELETE_USER_CASH_ACCOUNT', payload: { projectId: activeProjectId, accountId } }),
      }
    });
  };

  const handleStartClose = (account) => {
    dispatch({ type: 'OPEN_CLOSE_ACCOUNT_MODAL', payload: account });
  };

  const handleReopen = (accountId) => {
    dispatch({ type: 'REOPEN_CASH_ACCOUNT', payload: { projectId: activeProjectId, accountId } });
  };
  
  if (isConsolidated) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold">Vue Consolidée</h4>
          <p className="text-sm">La gestion des comptes de trésorerie se fait par projet. Veuillez sélectionner un projet spécifique pour ajouter ou modifier des comptes.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gray-800">Vos Comptes</h3>
            <button 
              onClick={() => dispatch({ type: 'OPEN_TRANSFER_MODAL' })}
              className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1.5 rounded-md font-medium flex items-center gap-2 text-sm"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Transfert entre comptes
            </button>
          </div>
          {userCashAccounts.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {userCashAccounts.map(account => (
                <li key={account.id} className={`py-4 ${account.isClosed ? 'opacity-60' : ''}`}>
                  {editingAccount?.id === account.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Nom du compte</label>
                          <input type="text" value={editingAccount.name || ''} onChange={(e) => setEditingAccount(d => ({ ...d, name: e.target.value }))} className="w-full px-3 py-1 border rounded-md font-medium" autoFocus />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Solde initial</label>
                          <input type="number" value={editingAccount.initialBalance || ''} onChange={(e) => setEditingAccount(d => ({ ...d, initialBalance: e.target.value }))} className="w-full px-3 py-1 border rounded-md" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Date du solde</label>
                          <input type="date" value={editingAccount.initialBalanceDate || ''} onChange={(e) => setEditingAccount(d => ({ ...d, initialBalanceDate: e.target.value }))} className="w-full px-3 py-1 border rounded-md" min={activeProject?.startDate} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={handleCancelEdit} className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-300">Annuler</button>
                        <button onClick={handleSaveEdit} className="text-sm bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700">Enregistrer</button>
                      </div>
                    </div>
                  ) : (
                    <div className="group flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <Wallet className="w-5 h-5 text-teal-600" />
                          <div>
                            <span className="font-medium text-gray-800">{account.name}</span>
                            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{accountTypeMap.get(account.mainCategoryId) || 'N/A'}</span>
                            {account.isClosed && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Clôturé le {new Date(account.closureDate).toLocaleDateString('fr-FR')}</span>}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 ml-8 mt-1">
                          Solde initial: <span className="font-semibold">{formatCurrency(account.initialBalance || 0, settings)}</span> le {new Date(account.initialBalanceDate).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {account.isClosed ? (
                          <button onClick={() => handleReopen(account.id)} className="p-1 text-green-600 hover:text-green-800" title="Ré-ouvrir le compte"><ArchiveRestore className="w-4 h-4" /></button>
                        ) : (
                          <>
                            <button onClick={() => handleStartEdit(account)} className="p-1 text-blue-600 hover:text-blue-800"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleStartClose(account)} className="p-1 text-yellow-600 hover:text-yellow-800" title="Clôturer le compte"><Archive className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteAccount(account.id)} className="p-1 text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed" title={isAccountUsed(account.id) ? "Suppression impossible: compte utilisé" : "Supprimer"}><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            !isAddingAccount && (
              <EmptyState icon={Wallet} title="Aucun compte de trésorerie" message="Créez votre premier compte (bancaire, caisse, etc.) pour commencer à suivre vos soldes." actionText="Ajouter un compte" onActionClick={() => setIsAddingAccount(true)} />
            )
          )}
        </div>

        {isAddingAccount ? (
          <AddAccountForm onSave={handleAddAccount} onCancel={() => setIsAddingAccount(false)} />
        ) : userCashAccounts.length > 0 ? (
          <div className="text-center">
            <button onClick={() => setIsAddingAccount(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center gap-2">
              <Plus className="w-5 h-5" /> Ajouter un autre compte
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default CashAccountsView;

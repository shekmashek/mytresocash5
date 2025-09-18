import React, { useMemo } from 'react';
import { X, Wallet, Lock, CheckCircle, Landmark, PiggyBank, Smartphone, Edit, Archive, ArrowUp, ArrowDown } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../utils/formatting';
import { mainCashAccountCategories } from '../context/BudgetContext';

const ActionableBalanceDrawer = ({ isOpen, onClose, balances, selectedAccountId, currency }) => {
  const { state, dispatch } = useBudget();
  const { settings, allActuals, projects } = state;

  const displayedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    return balances.find(acc => acc.id === selectedAccountId);
  }, [balances, selectedAccountId]);

  const accountProject = useMemo(() => {
    if (!displayedAccount) return null;
    return projects.find(p => p.id === displayedAccount.projectId);
  }, [displayedAccount, projects]);

  const recentTransactions = useMemo(() => {
    if (!displayedAccount || !accountProject) return [];

    const projectActuals = allActuals[accountProject.id] || [];
    
    return projectActuals
      .flatMap(actual => 
        (actual.payments || []).map(p => ({ ...p, actual }))
      )
      .filter(payment => payment.cashAccount === selectedAccountId)
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
      .slice(0, 10);

  }, [displayedAccount, accountProject, allActuals, selectedAccountId]);

  const groupIcons = {
      bank: Landmark,
      cash: Wallet,
      mobileMoney: Smartphone,
      savings: PiggyBank,
      provisions: Lock,
  };

  if (!isOpen || !displayedAccount) return null;

  const groupInfo = mainCashAccountCategories.find(g => g.id === displayedAccount.mainCategoryId);
  const Icon = groupIcons[groupInfo?.id] || Wallet;
  const currencySettings = { ...settings, currency };

  const handleManageAccount = () => {
    dispatch({ type: 'SET_ACTIVE_SETTINGS_DRAWER', payload: 'cashAccounts' });
    onClose();
  };

  const handleCloseAccount = () => {
    dispatch({ type: 'OPEN_CLOSE_ACCOUNT_MODAL', payload: displayedAccount });
    onClose();
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black z-40 transition-opacity ${isOpen ? 'bg-opacity-60' : 'bg-opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      ></div>
      <div 
        className={`fixed top-0 right-0 bottom-0 w-full max-w-lg bg-gray-50 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between p-4 border-b bg-white">
            <div className="flex items-center gap-3">
              <Icon className="w-6 h-6 text-teal-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Détail - {displayedAccount.name}
                </h2>
                <p className="text-sm text-gray-500">{accountProject?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={handleManageAccount} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-blue-600" title="Gérer le compte (renommer, solde initial)">
                  <Edit className="w-5 h-5" />
                </button>
                {!displayedAccount.isClosed && (
                    <button onClick={handleCloseAccount} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-yellow-600" title="Clôturer le compte">
                      <Archive className="w-5 h-5" />
                    </button>
                )}
                <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
            </div>
          </div>
          <div className="flex-grow p-4 overflow-y-auto">
            <div className="p-4 bg-white rounded-lg border text-sm mb-6">
              <div className="font-semibold text-gray-800 mb-2">Synthèse du Solde</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-gray-600"><Wallet className="w-4 h-4" /> Solde Total Actuel</span>
                  <span className="font-medium text-gray-800">{formatCurrency(displayedAccount.balance, currencySettings)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2 text-orange-600"><Lock className="w-4 h-4" /> Provisions Bloquées</span>
                  <span className="font-medium text-orange-700">-{formatCurrency(displayedAccount.blockedForProvision, currencySettings)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t mt-2">
                  <span className="flex items-center gap-2 font-bold text-green-600"><CheckCircle className="w-4 h-4" /> Solde Actionnable</span>
                  <span className="font-bold text-lg text-green-700">{formatCurrency(displayedAccount.actionableBalance, currencySettings)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-700 mb-3">Dernières Écritures</h3>
              {recentTransactions.length > 0 ? (
                <ul className="space-y-2">
                  {recentTransactions.map(tx => {
                    const isIncome = tx.actual.type === 'receivable';
                    return (
                      <li key={tx.id} className="p-3 bg-white rounded-lg border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
                            {isIncome ? <ArrowUp className="w-4 h-4 text-green-600" /> : <ArrowDown className="w-4 h-4 text-red-600" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{tx.actual.thirdParty}</p>
                            <p className="text-xs text-gray-500">{new Date(tx.paymentDate).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>
                        <div className={`font-semibold text-sm ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                          {isIncome ? '+' : '-'} {formatCurrency(tx.paidAmount, currencySettings)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-center text-gray-500 text-sm py-4">Aucune transaction récente pour ce compte.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ActionableBalanceDrawer;

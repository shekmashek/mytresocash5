import React, { useMemo } from 'react';
import { X, ArrowUp, ArrowDown, CheckCircle, Clock } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../utils/formatting';

const LoanDetailDrawer = ({ isOpen, onClose, loan }) => {
  const { state } = useBudget();
  const { allEntries, allActuals, settings } = state;

  const transactionsWithBalance = useMemo(() => {
    if (!loan) return [];

    const projectEntries = allEntries[loan.projectId] || [];
    const projectActuals = allActuals[loan.projectId] || [];
    const currencySettings = settings;

    const repaymentEntry = projectEntries.find(e => e.loanId === loan.id && e.frequency === 'mensuel');
    const repaymentActuals = repaymentEntry ? projectActuals.filter(a => a.budgetId === repaymentEntry.id) : [];

    const principalTransaction = {
      id: `principal-${loan.id}`,
      date: loan.principalDate,
      description: loan.type === 'borrowing' ? 'Réception du principal' : 'Octroi du prêt',
      type: loan.type === 'borrowing' ? 'revenu' : 'depense',
      amount: loan.principal,
      status: 'realized',
    };

    const repaymentTransactions = repaymentActuals.map(actual => {
      const payment = (actual.payments || [])[0];
      return {
        id: actual.id,
        date: actual.date,
        description: loan.type === 'borrowing' ? 'Remboursement de l\'emprunt' : 'Réception du remboursement',
        type: loan.type === 'borrowing' ? 'depense' : 'revenu',
        amount: actual.amount,
        status: payment ? 'realized' : 'pending',
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    const allTransactions = [principalTransaction, ...repaymentTransactions];

    let remainingPrincipal = loan.principal;
    const totalRepaymentAmount = loan.monthlyPayment * loan.term;
    const principalRatio = totalRepaymentAmount > 0 ? loan.principal / totalRepaymentAmount : 0;

    return allTransactions.map((tx, index) => {
      if (index > 0) { // Skip principal transaction for balance reduction
        const principalPortion = tx.amount * principalRatio;
        remainingPrincipal -= principalPortion;
      }
      return {
        ...tx,
        remainingBalance: Math.max(0, remainingPrincipal),
        currencySettings
      };
    });

  }, [loan, allEntries, allActuals, settings]);

  if (!isOpen || !loan) return null;

  const { currencySettings } = (transactionsWithBalance && transactionsWithBalance.length > 0) ? transactionsWithBalance[0] : { settings };

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
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Échéancier - {loan.thirdParty}
              </h2>
              <p className="text-sm text-gray-500">
                {loan.type === 'borrowing' ? 'Emprunt' : 'Prêt'} de {formatCurrency(loan.principal, currencySettings)}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-grow p-4 overflow-y-auto">
            {transactionsWithBalance.length > 0 ? (
              <ul className="space-y-2">
                {transactionsWithBalance.map((tx) => {
                  const isIncome = tx.type === 'revenu';
                  const isRealized = tx.status === 'realized';
                  return (
                    <li key={tx.id} className={`p-3 bg-white rounded-lg border flex items-start gap-4 ${!isRealized ? 'opacity-70' : ''}`}>
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full mt-1 ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isIncome ? <ArrowUp className="w-4 h-4 text-green-600" /> : <ArrowDown className="w-4 h-4 text-red-600" />}
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{tx.description}</p>
                            <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <div className={`font-semibold text-sm ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                            {isIncome ? '+' : '-'} {formatCurrency(tx.amount, tx.currencySettings)}
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t text-xs flex justify-between items-center">
                          <div className="flex items-center gap-1.5 font-medium text-gray-600">
                            {isRealized ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Clock className="w-3.5 h-3.5 text-yellow-500" />}
                            <span>{isRealized ? 'Réalisé' : 'Prévu'}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-500">Restant dû : </span>
                            <span className="font-bold text-blue-700">{formatCurrency(tx.remainingBalance, tx.currencySettings)}</span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-center text-gray-500 py-4">Aucun échéancier trouvé pour ce prêt.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoanDetailDrawer;

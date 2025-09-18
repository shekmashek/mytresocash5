import React, { useState, useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { Plus, Banknote, Coins, Edit, Trash2, List } from 'lucide-react';
import LoanModal from './LoanModal';
import EmptyState from './EmptyState';
import { formatCurrency } from '../utils/formatting';
import LoanDetailDrawer from './LoanDetailDrawer';

const LoansView = ({ type }) => {
    const { state, dispatch } = useBudget();
    const { loans, activeProjectId, projects, settings, allActuals, allEntries } = state;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLoan, setEditingLoan] = useState(null);
    const [detailLoan, setDetailLoan] = useState(null);

    const isConsolidated = activeProjectId === 'consolidated';

    const projectLoans = useMemo(() => {
        const calculateRemainingBalance = (loan) => {
            const repaymentEntry = (allEntries[loan.projectId] || []).find(e => e.loanId === loan.id && e.type !== (loan.type === 'borrowing' ? 'revenu' : 'depense'));
            if (!repaymentEntry) return loan.principal;

            const repaymentActuals = (allActuals[loan.projectId] || []).filter(a => a.budgetId === repaymentEntry.id);
            const totalPaid = repaymentActuals.reduce((sum, actual) => {
                return sum + (actual.payments || []).reduce((pSum, p) => pSum + p.paidAmount, 0);
            }, 0);
            
            if (!loan.monthlyPayment || !loan.term || loan.monthlyPayment <= 0 || loan.term <= 0) {
                return Math.max(0, loan.principal - totalPaid);
            }
            
            const totalLoanCost = loan.monthlyPayment * loan.term;
            
            if (totalLoanCost < loan.principal) {
                return Math.max(0, loan.principal - totalPaid);
            }

            const principalRatio = loan.principal / totalLoanCost;
            const principalPaid = totalPaid * principalRatio;
            
            const remaining = loan.principal - principalPaid;

            return Math.max(0, remaining);
        };

        if (isConsolidated) {
            return (loans || []).filter(loan => loan.type === type).map(loan => ({...loan, remainingBalance: calculateRemainingBalance(loan)}));
        }
        return (loans || []).filter(loan => loan.projectId === activeProjectId && loan.type === type).map(loan => ({...loan, remainingBalance: calculateRemainingBalance(loan)}));
    }, [loans, activeProjectId, type, isConsolidated, allEntries, allActuals]);

    const uniqueProjectLoans = useMemo(() => {
        const seen = new Set();
        return projectLoans.filter(loan => {
            if (!loan || !loan.id) {
                return false;
            }
            if (seen.has(loan.id)) {
                return false;
            }
            seen.add(loan.id);
            return true;
        });
    }, [projectLoans]);

    const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);
    const projectCurrency = isConsolidated ? settings.currency : activeProject?.currency || settings.currency;
    const currencySettings = { ...settings, currency: projectCurrency };

    const config = type === 'borrowing' 
        ? { title: 'Vos Emprunts', icon: Banknote, color: 'text-danger-700', noun: 'emprunt' }
        : { title: 'Vos Prêts', icon: Coins, color: 'text-success-700', noun: 'prêt' };

    const handleAdd = () => {
        setEditingLoan(null);
        setIsModalOpen(true);
    };

    const handleEdit = (loan) => {
        setEditingLoan(loan);
        setIsModalOpen(true);
    };

    const handleDelete = (loanId) => {
        dispatch({
            type: 'OPEN_CONFIRMATION_MODAL',
            payload: {
                title: `Supprimer cet ${config.noun} ?`,
                message: 'Cette action est irréversible et supprimera toutes les transactions associées.',
                onConfirm: () => dispatch({ type: 'DELETE_LOAN', payload: loanId }),
            }
        });
    };

    const handleSave = (loanData) => {
        const actionType = editingLoan ? 'UPDATE_LOAN' : 'ADD_LOAN';
        dispatch({
            type: actionType,
            payload: {
                ...loanData,
                id: editingLoan ? editingLoan.id : undefined,
                projectId: activeProjectId,
                type: type,
            }
        });
        setIsModalOpen(false);
    };

    const handleOpenDetails = (loan) => {
        setDetailLoan(loan);
    };

    return (
        <div className="container mx-auto p-6 max-w-full">
            <div className="mb-8 flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <config.icon className={`w-8 h-8 ${config.color}`} />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{config.title}</h1>
                    </div>
                </div>
                {!isConsolidated && (
                    <button onClick={handleAdd} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                        <Plus className="w-5 h-5" /> Ajouter un {config.noun}
                    </button>
                )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                {uniqueProjectLoans.length === 0 ? (
                    <EmptyState
                        icon={config.icon}
                        title={`Aucun ${config.noun} enregistré`}
                        message={`Ajoutez votre premier ${config.noun} pour commencer le suivi.`}
                        actionText={!isConsolidated ? `Ajouter un ${config.noun}` : undefined}
                        onActionClick={!isConsolidated ? handleAdd : undefined}
                    />
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <th className="px-6 py-4 text-left">{type === 'borrowing' ? 'Prêteur' : 'Emprunteur'}</th>
                                <th className="px-6 py-4 text-right">Montant Initial</th>
                                <th className="px-6 py-4 text-right">Durée (mois)</th>
                                <th className="px-6 py-4 text-right">Mensualité</th>
                                <th className="px-6 py-4 text-right">Restant Dû</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {uniqueProjectLoans.map(loan => (
                                <tr key={loan.id} className="group hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{loan.thirdParty}</td>
                                    <td className="px-6 py-4 text-right font-semibold">{formatCurrency(loan.principal, currencySettings)}</td>
                                    <td className="px-6 py-4 text-right">{loan.term} mois</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(loan.monthlyPayment, currencySettings)}</td>
                                    <td className="px-6 py-4 text-right font-bold">{formatCurrency(loan.remainingBalance, currencySettings)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex gap-1 justify-end">
                                            <button onClick={() => handleOpenDetails(loan)} className="p-2 text-gray-500 hover:text-green-600" title="Voir l'échéancier">
                                                <List className="w-4 h-4" />
                                            </button>
                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(loan)} className="p-2 text-blue-600 hover:text-blue-800" title="Modifier"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(loan.id)} className="p-2 text-red-600 hover:text-red-800" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {isModalOpen && (
                <LoanModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    editingLoan={editingLoan}
                    type={type}
                />
            )}
            
            <LoanDetailDrawer 
                isOpen={!!detailLoan}
                onClose={() => setDetailLoan(null)}
                loan={detailLoan}
            />
        </div>
    );
};

export default LoansView;

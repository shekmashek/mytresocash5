import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Banknote, HandCoins, Calendar, Wallet, Check, AlertTriangle } from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency } from '../utils/formatting';
import { getTodayInTimezone } from '../utils/budgetCalculations';

const DirectPaymentModal = ({ isOpen, onClose, onSave, type }) => {
    const { state, dispatch } = useBudget();
    const { tiers, allActuals, allCashAccounts, settings, activeProjectId, projects } = state;

    const [selectedTiersId, setSelectedTiersId] = useState('');
    const [selectedActualIds, setSelectedActualIds] = useState(new Set());
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [cashAccountId, setCashAccountId] = useState('');
    
    const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

    const config = useMemo(() => ({
        payable: { title: 'Nouvelle Sortie Payée', thirdPartyLabel: 'Fournisseur', icon: Banknote, color: 'red' },
        receivable: { title: 'Nouvelle Entrée Reçue', thirdPartyLabel: 'Client', icon: HandCoins, color: 'green' }
    }[type]), [type]);

    const availableTiers = useMemo(() => {
        const tierType = type === 'payable' ? 'fournisseur' : 'client';
        return tiers.filter(t => t.type === tierType);
    }, [tiers, type]);

    const unsettledActuals = useMemo(() => {
        if (!selectedTiersId) return [];
        const selectedTier = tiers.find(t => t.id === selectedTiersId);
        if (!selectedTier) return [];

        const projectActuals = allActuals[activeProjectId] || [];
        const today = getTodayInTimezone(settings.timezoneOffset);

        const allUnsettled = projectActuals
            .filter(a => a.thirdParty === selectedTier.name && a.type === type && ['pending', 'partially_paid', 'partially_received'].includes(a.status))
            .map(a => ({
                ...a,
                remaining: a.amount - (a.payments || []).reduce((sum, p) => sum + p.paidAmount, 0)
            }));

        const overdue = allUnsettled
            .filter(a => new Date(a.date) < today)
            .map(a => ({
                ...a,
                isOverdue: true,
                daysOverdue: Math.floor((today - new Date(a.date)) / (1000 * 60 * 60 * 24))
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const upcoming = allUnsettled
            .filter(a => new Date(a.date) >= today)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
            
        const nextUpcoming = upcoming.length > 0 ? [{ ...upcoming[0], isNextUpcoming: true }] : [];
        
        return [...overdue, ...nextUpcoming];
    }, [selectedTiersId, tiers, allActuals, activeProjectId, type, settings.timezoneOffset]);
    
    const userCashAccounts = useMemo(() => (allCashAccounts[activeProjectId] || []).filter(acc => !acc.isClosed), [allCashAccounts, activeProjectId]);

    useEffect(() => {
        if (isOpen) {
            setSelectedTiersId('');
            setSelectedActualIds(new Set());
            setPaymentAmount('');
            setPaymentDate(new Date().toISOString().split('T')[0]);
            setCashAccountId(userCashAccounts.length > 0 ? userCashAccounts[0].id : '');
        }
    }, [isOpen, userCashAccounts]);

    useEffect(() => {
        const totalSelectedRemaining = unsettledActuals
            .filter(a => selectedActualIds.has(a.id))
            .reduce((sum, a) => sum + a.remaining, 0);
        setPaymentAmount(totalSelectedRemaining > 0 ? totalSelectedRemaining.toFixed(2) : '');
    }, [selectedActualIds, unsettledActuals]);

    const handleToggleActual = (actualId) => {
        const newSelection = new Set(selectedActualIds);
        if (newSelection.has(actualId)) {
            newSelection.delete(actualId);
        } else {
            newSelection.add(actualId);
        }
        setSelectedActualIds(newSelection);
    };
    
    const handleSelectAll = () => {
        if (selectedActualIds.size === unsettledActuals.length) {
            setSelectedActualIds(new Set());
        } else {
            setSelectedActualIds(new Set(unsettledActuals.map(a => a.id)));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedActualIds.size === 0 || !paymentAmount || !paymentDate || !cashAccountId) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Veuillez sélectionner au moins une facture et remplir tous les champs.', type: 'error' } });
            return;
        }
        onSave({
            paymentDetails: {
                amount: parseFloat(paymentAmount),
                date: paymentDate,
                cashAccount: cashAccountId,
            },
            actualsToPayIds: Array.from(selectedActualIds)
        });
        onClose();
    };

    if (!isOpen) return null;
    const Icon = config.icon;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Icon className={`w-6 h-6 text-${config.color}-600`} />
                        {config.title}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2"><User className="w-4 h-4 inline mr-1" /> {config.thirdPartyLabel}</label>
                        <select value={selectedTiersId} onChange={e => setSelectedTiersId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                            <option value="">Sélectionner un {config.thirdPartyLabel.toLowerCase()}</option>
                            {availableTiers.map(tier => <option key={tier.id} value={tier.id}>{tier.name}</option>)}
                        </select>
                    </div>

                    {selectedTiersId && (
                        <div className="space-y-4">
                            <h3 className="text-md font-semibold text-gray-800 border-b pb-2">Factures à régler</h3>
                            {unsettledActuals.length > 0 ? (
                                <div className="max-h-60 overflow-y-auto border rounded-lg p-2 bg-gray-50 space-y-2">
                                    <div className="flex items-center px-2">
                                        <input type="checkbox" onChange={handleSelectAll} checked={selectedActualIds.size > 0 && selectedActualIds.size === unsettledActuals.length} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                        <label className="ml-3 text-sm font-medium text-gray-700">Tout sélectionner</label>
                                    </div>
                                    <hr/>
                                    {unsettledActuals.map(actual => (
                                        <div key={actual.id} className="flex items-center p-2 rounded-md hover:bg-gray-100">
                                            <input type="checkbox" checked={selectedActualIds.has(actual.id)} onChange={() => handleToggleActual(actual.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                            <div className="ml-3 flex-grow flex justify-between items-center text-sm">
                                                <div className="text-gray-700">
                                                    Échéance du {new Date(actual.date).toLocaleDateString('fr-FR')}
                                                    {actual.isOverdue && (
                                                        <span className="ml-2 text-xs font-bold text-red-600">
                                                            ({actual.daysOverdue} jour{actual.daysOverdue > 1 ? 's' : ''} de retard)
                                                        </span>
                                                    )}
                                                    {actual.isNextUpcoming && (
                                                        <span className="ml-2 text-xs font-bold text-blue-600">
                                                            (Prochaine échéance)
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-gray-500 block truncate max-w-xs">{actual.description}</span>
                                                </div>
                                                <div className="font-semibold text-gray-800">{formatCurrency(actual.remaining, settings)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-center text-gray-500 py-4">Aucune facture en retard ou à venir pour ce {config.thirdPartyLabel.toLowerCase()}.</p>
                            )}
                        </div>
                    )}

                    {selectedActualIds.size > 0 && (
                         <div className="space-y-4 pt-4 border-t">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Montant du paiement</label>
                                    <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="0.00" step="0.01" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2"><Calendar className="w-4 h-4 inline mr-1" /> Date</label>
                                    <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required min={activeProject?.startDate} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2"><Wallet className="w-4 h-4 inline mr-1" /> Compte de trésorerie</label>
                                <select value={cashAccountId} onChange={e => setCashAccountId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                                    <option value="">Sélectionner un compte</option>
                                    {userCashAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                            {parseFloat(paymentAmount) > unsettledActuals.filter(a => selectedActualIds.has(a.id)).reduce((sum, a) => sum + a.remaining, 0) && (
                                <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>Le montant du paiement est supérieur au total des factures sélectionnées. Le surplus sera enregistré comme un paiement en avance.</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Annuler</button>
                        <button type="submit" className={`bg-${config.color}-600 hover:bg-${config.color}-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:bg-gray-300`} disabled={selectedActualIds.size === 0}>
                            <Check className="w-4 h-4" /> {type === 'payable' ? 'Payer' : 'Encaisser'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DirectPaymentModal;

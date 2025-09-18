import React, { useMemo, useState, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useBudget } from '../context/BudgetContext';
import Header from '../components/Header';
import SubHeader from '../components/SubHeader';
import SettingsDrawerWrapper from '../components/SettingsDrawerWrapper';
import BudgetModal from '../components/BudgetModal';
import InfoModal from '../components/InfoModal';
import ConfirmationModal from '../components/ConfirmationModal';
import InlinePaymentDrawer from '../components/InlinePaymentDrawer';
import TransferModal from '../components/TransferModal';
import CloseAccountModal from '../components/CloseAccountModal';
import ScenarioModal from '../components/ScenarioModal';
import ActualTransactionModal from '../components/ActualTransactionModal';
import PaymentModal from '../components/PaymentModal';
import DirectPaymentModal from '../components/DirectPaymentModal';
import StickyNote from '../components/StickyNote';
import GuidedTour from '../components/GuidedTour';
import TransactionActionMenu from '../components/TransactionActionMenu';
import FocusView from '../components/FocusView';
import { saveEntry, saveActual, deleteActual, recordPayment, writeOffActual } from '../context/actions';

import { AnimatePresence } from 'framer-motion';
import { Loader } from 'lucide-react';
import { getTodayInTimezone, getStartOfWeek, getEntryAmountForPeriod, getActualAmountForPeriod } from '../utils/budgetCalculations';
import { formatCurrency } from '../utils/formatting';

const AppLayout = () => {
    const { state, dispatch } = useBudget();
    const location = useLocation();

    const { 
        projects, activeProjectId, activeSettingsDrawer, isBudgetModalOpen, editingEntry, 
        infoModal, confirmationModal, inlinePaymentDrawer, isTransferModalOpen, focusView, 
        isCloseAccountModalOpen, accountToClose, isScenarioModalOpen, editingScenario, 
        isActualTransactionModalOpen, editingActual, isPaymentModalOpen, payingActual, 
        isDirectPaymentModalOpen, directPaymentType, notes, timeUnit, horizonLength, periodOffset, 
        allCashAccounts, allEntries, allActuals, settings, activeQuickSelect, isTourActive, 
        transactionMenu, isLoading 
    } = state;
    
    const dragConstraintsRef = useRef(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const isConsolidated = activeProjectId === 'consolidated';

    const { activeEntries, activeActuals } = useMemo(() => {
        if (isConsolidated) {
            return {
                activeEntries: Object.entries(allEntries).flatMap(([projectId, entries]) => entries.map(entry => ({ ...entry, projectId }))),
                activeActuals: Object.entries(allActuals).flatMap(([projectId, actuals]) => actuals.map(actual => ({ ...actual, projectId }))),
            };
        } else {
            const project = projects.find(p => p.id === activeProjectId);
            return {
                activeEntries: project ? (allEntries[project.id] || []) : [],
                activeActuals: project ? (allActuals[project.id] || []) : [],
            };
        }
    }, [activeProjectId, projects, allEntries, allActuals, isConsolidated]);

    const periods = useMemo(() => {
        const today = getTodayInTimezone(settings.timezoneOffset);
        let baseDate;
        switch (timeUnit) {
            case 'day': baseDate = new Date(today); baseDate.setHours(0,0,0,0); break;
            case 'week': baseDate = getStartOfWeek(today); break;
            case 'fortnightly': const day = today.getDate(); baseDate = new Date(today.getFullYear(), today.getMonth(), day <= 15 ? 1 : 16); break;
            case 'month': baseDate = new Date(today.getFullYear(), today.getMonth(), 1); break;
            case 'bimonthly': const bimonthStartMonth = Math.floor(today.getMonth() / 2) * 2; baseDate = new Date(today.getFullYear(), bimonthStartMonth, 1); break;
            case 'quarterly': const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3; baseDate = new Date(today.getFullYear(), quarterStartMonth, 1); break;
            case 'semiannually': const semiAnnualStartMonth = Math.floor(today.getMonth() / 6) * 6; baseDate = new Date(today.getFullYear(), semiAnnualStartMonth, 1); break;
            case 'annually': baseDate = new Date(today.getFullYear(), 0, 1); break;
            default: baseDate = getStartOfWeek(today);
        }
        const periodList = [];
        for (let i = 0; i < horizonLength; i++) {
            const periodIndex = i + periodOffset;
            const periodStart = new Date(baseDate);
            switch (timeUnit) {
                case 'day': periodStart.setDate(periodStart.getDate() + periodIndex); break;
                case 'week': periodStart.setDate(periodStart.getDate() + periodIndex * 7); break;
                case 'fortnightly': { const d = new Date(baseDate); let numFortnights = periodIndex; let currentMonth = d.getMonth(); let isFirstHalf = d.getDate() === 1; const monthsToAdd = Math.floor(((isFirstHalf ? 0 : 1) + numFortnights) / 2); d.setMonth(currentMonth + monthsToAdd); const newIsFirstHalf = (((isFirstHalf ? 0 : 1) + numFortnights) % 2 + 2) % 2 === 0; d.setDate(newIsFirstHalf ? 1 : 16); periodStart.setTime(d.getTime()); break; }
                case 'month': periodStart.setMonth(periodStart.getMonth() + periodIndex); break;
                case 'bimonthly': periodStart.setMonth(periodStart.getMonth() + periodIndex * 2); break;
                case 'quarterly': periodStart.setMonth(periodStart.getMonth() + periodIndex * 3); break;
                case 'semiannually': periodStart.setMonth(periodStart.getMonth() + periodIndex * 6); break;
                case 'annually': periodStart.setFullYear(periodStart.getFullYear() + periodIndex); break;
            }
            periodList.push(periodStart);
        }
        return periodList.map((periodStart) => {
            const periodEnd = new Date(periodStart);
            switch (timeUnit) {
                case 'day': periodEnd.setDate(periodEnd.getDate() + 1); break;
                case 'week': periodEnd.setDate(periodEnd.getDate() + 7); break;
                case 'fortnightly': if (periodStart.getDate() === 1) { periodEnd.setDate(16); } else { periodEnd.setMonth(periodEnd.getMonth() + 1); periodEnd.setDate(1); } break;
                case 'month': periodEnd.setMonth(periodEnd.getMonth() + 1); break;
                case 'bimonthly': periodEnd.setMonth(periodEnd.getMonth() + 2); break;
                case 'quarterly': periodEnd.setMonth(periodEnd.getMonth() + 3); break;
                case 'semiannually': periodEnd.setMonth(periodEnd.getMonth() + 6); break;
                case 'annually': periodEnd.setFullYear(periodEnd.getFullYear() + 1); break;
            }
            const year = periodStart.toLocaleDateString('fr-FR', { year: '2-digit' });
            const monthsShort = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
            let label = '';
            switch (timeUnit) {
                case 'day':
                    if (activeQuickSelect === 'week') {
                        const dayLabel = periodStart.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
                        label = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
                    } else {
                        label = periodStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                    }
                    break;
                case 'week': label = `S ${periodStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`; break;
                case 'fortnightly': const fortnightNum = periodStart.getDate() === 1 ? '1' : '2'; label = `${fortnightNum}Q-${monthsShort[periodStart.getMonth()]}'${year}`; break;
                case 'month': label = `${periodStart.toLocaleString('fr-FR', { month: 'short' })} '${year}`; break;
                case 'bimonthly': const startMonthB = monthsShort[periodStart.getMonth()]; const endMonthB = monthsShort[(periodStart.getMonth() + 1) % 12]; label = `${startMonthB}-${endMonthB}`; break;
                case 'quarterly': const quarter = Math.floor(periodStart.getMonth() / 3) + 1; label = `T${quarter} '${year}`; break;
                case 'semiannually': const semester = Math.floor(periodStart.getMonth() / 6) + 1; label = `S${semester} '${year}`; break;
                case 'annually': label = String(periodStart.getFullYear()); break;
            }
            return { label, startDate: periodStart, endDate: periodEnd };
        });
    }, [timeUnit, horizonLength, periodOffset, settings.timezoneOffset, activeQuickSelect]);

    const periodPositions = useMemo(() => {
        if (periods.length === 0) return [];
        
        const userCashAccounts = isConsolidated ? Object.values(allCashAccounts).flat() : allCashAccounts[activeProjectId] || [];
        const groupedData = (() => {
            const entriesToGroup = activeEntries.filter(e => !e.isOffBudget);
            const groupByType = (type) => {
              const catType = type === 'revenu' ? 'revenue' : 'expense';
              if (!state.categories || !state.categories[catType]) return [];
              return state.categories[catType].map(mainCat => {
                if (!mainCat.subCategories) return null;
                const entriesForMainCat = entriesToGroup.filter(entry => mainCat.subCategories.some(sc => sc.name === entry.category));
                return entriesForMainCat.length > 0 ? { ...mainCat, entries: entriesForMainCat } : null;
              }).filter(Boolean);
            };
            return { entree: groupByType('revenu'), sortie: groupByType('depense') };
        })();

        const hasOffBudgetRevenues = activeEntries.some(e => e.isOffBudget && e.type === 'revenu');
        const hasOffBudgetExpenses = activeEntries.some(e => e.isOffBudget && e.type === 'depense');

        const calculateOffBudgetTotalsForPeriod = (type, period) => {
          const offBudgetEntries = activeEntries.filter(e => e.isOffBudget && e.type === type);
          const budget = offBudgetEntries.reduce((sum, entry) => sum + getEntryAmountForPeriod(entry, period.startDate, period.endDate), 0);
          const actual = offBudgetEntries.reduce((sum, entry) => sum + getActualAmountForPeriod(entry, activeActuals, period.startDate, period.endDate), 0);
          return { budget, actual, reste: budget - actual };
        };

        const calculateMainCategoryTotals = (entries, period) => {
            const budget = entries.reduce((sum, entry) => sum + getEntryAmountForPeriod(entry, period.startDate, period.endDate), 0);
            const actual = entries.reduce((sum, entry) => sum + getActualAmountForPeriod(entry, activeActuals, period.startDate, period.endDate), 0);
            return { budget, actual, reste: budget - actual };
        };

        const calculateGeneralTotals = (mainCategories, period, type) => {
            const totals = mainCategories.reduce((acc, mainCategory) => {
              const categoryTotals = calculateMainCategoryTotals(mainCategory.entries, period);
              acc.budget += categoryTotals.budget;
              acc.actual += categoryTotals.actual;
              return acc;
            }, { budget: 0, actual: 0 });
            if (type === 'entree' && hasOffBudgetRevenues) {
                const offBudgetTotals = calculateOffBudgetTotalsForPeriod('revenu', period);
                totals.budget += offBudgetTotals.budget;
                totals.actual += offBudgetTotals.actual;
            } else if (type === 'sortie' && hasOffBudgetExpenses) {
                const offBudgetTotals = calculateOffBudgetTotalsForPeriod('depense', period);
                totals.budget += offBudgetTotals.budget;
                totals.actual += offBudgetTotals.actual;
            }
            return totals;
        };

        const today = getTodayInTimezone(settings.timezoneOffset);
        let todayIndex = periods.findIndex(p => today >= p.startDate && today < p.endDate);
        if (todayIndex === -1) {
            if (periods.length > 0 && today < periods[0].startDate) todayIndex = -1;
            else if (periods.length > 0 && today >= periods[periods.length - 1].endDate) todayIndex = periods.length - 1;
        }

        const firstPeriodStart = periods[0].startDate;
        const initialBalanceSum = userCashAccounts.reduce((sum, acc) => sum + (parseFloat(acc.initialBalance) || 0), 0);
        const netFlowBeforeFirstPeriod = activeActuals
          .flatMap(actual => actual.payments || [])
          .filter(p => new Date(p.paymentDate) < firstPeriodStart)
          .reduce((sum, p) => {
            const actual = activeActuals.find(a => (a.payments || []).some(payment => payment.id === p.id));
            if (!actual) return sum;
            return actual.type === 'receivable' ? sum + p.paidAmount : sum - p.paidAmount;
          }, 0);
        const startingBalance = initialBalanceSum + netFlowBeforeFirstPeriod;

        const positions = [];
        let lastPeriodFinalPosition = startingBalance;
        for (let i = 0; i <= todayIndex; i++) {
            if (!periods[i]) continue;
            const period = periods[i];
            const revenueTotals = calculateGeneralTotals(groupedData.entree || [], period, 'entree');
            const expenseTotals = calculateGeneralTotals(groupedData.sortie || [], period, 'sortie');
            const netActual = revenueTotals.actual - expenseTotals.actual;
            const initialPosition = lastPeriodFinalPosition;
            const finalPosition = initialPosition + netActual;
            positions.push({ initial: initialPosition, final: finalPosition });
            lastPeriodFinalPosition = finalPosition;
        }
        if (todayIndex < periods.length - 1) {
            const unpaidStatuses = ['pending', 'partially_paid', 'partially_received'];
            const impayes = activeActuals.filter(a => new Date(a.date) < today && unpaidStatuses.includes(a.status));
            const netImpayes = impayes.reduce((sum, actual) => {
                const totalPaid = (actual.payments || []).reduce((pSum, p) => pSum + p.paidAmount, 0);
                const remaining = actual.amount - totalPaid;
                return actual.type === 'receivable' ? sum + remaining : sum - remaining;
            }, 0);
            lastPeriodFinalPosition += netImpayes;
            for (let i = todayIndex + 1; i < periods.length; i++) {
                if (!periods[i]) continue;
                const period = periods[i];
                const revenueTotals = calculateGeneralTotals(groupedData.entree || [], period, 'entree');
                const expenseTotals = calculateGeneralTotals(groupedData.sortie || [], period, 'sortie');
                const netPlanned = revenueTotals.budget - expenseTotals.budget;
                const initialPosition = lastPeriodFinalPosition;
                const finalPosition = initialPosition + netPlanned;
                positions.push({ initial: initialPosition, final: finalPosition });
                lastPeriodFinalPosition = finalPosition;
            }
        }
        return positions;
    }, [periods, allCashAccounts, activeProjectId, isConsolidated, activeEntries, activeActuals, state.categories, settings.timezoneOffset]);
    
    if (isLoading) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="text-gray-600">Chargement de vos données...</p>
                </div>
            </div>
        );
    }

    const onOpenSettingsDrawer = (drawer) => {
        dispatch({ type: 'SET_ACTIVE_SETTINGS_DRAWER', payload: drawer });
    };
    
    const handleSaveEntryWrapper = (entryData) => {
        const user = state.session?.user;
        if (!user) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Vous devez être connecté.', type: 'error' } });
            return;
        }
        const cashAccounts = state.allCashAccounts[activeProjectId] || [];
        saveEntry(dispatch, { 
            entryData: { ...entryData, user_id: user.id }, 
            editingEntry, 
            activeProjectId, 
            tiers: state.tiers,
            user,
            cashAccounts
        });
    };
    
    const handleDeleteEntryWrapper = (entryId) => {
        const entryToDelete = editingEntry || activeEntries.find(e => e.id === entryId);
        dispatch({ type: 'DELETE_ENTRY', payload: { entryId, entryProjectId: entryToDelete?.projectId } });
    };

    const handleNewBudgetEntry = () => dispatch({ type: 'OPEN_BUDGET_MODAL', payload: null });
    const handleNewScenario = () => dispatch({ type: 'OPEN_SCENARIO_MODAL', payload: null });

    const handleConfirm = () => {
        if (confirmationModal.onConfirm) {
            confirmationModal.onConfirm();
        }
        dispatch({ type: 'CLOSE_CONFIRMATION_MODAL' });
    };
    
    const handleCancel = () => {
        dispatch({ type: 'CLOSE_CONFIRMATION_MODAL' });
    };

    const handleConfirmCloseAccount = (closureDate) => {
        if (accountToClose) {
            dispatch({
                type: 'CLOSE_CASH_ACCOUNT',
                payload: {
                    projectId: accountToClose.projectId,
                    accountId: accountToClose.id,
                    closureDate,
                },
            });
        }
    };

    const handleSaveScenario = (scenarioData) => {
        if (editingScenario) {
            dispatch({ type: 'UPDATE_SCENARIO', payload: { ...editingScenario, ...scenarioData } });
        } else {
            dispatch({ type: 'ADD_SCENARIO', payload: { ...scenarioData, projectId: activeProjectId } });
        }
        dispatch({ type: 'CLOSE_SCENARIO_MODAL' });
    };

    const handlePayAction = (transaction) => {
        dispatch({ type: 'OPEN_PAYMENT_MODAL', payload: transaction });
    };

    const handleWriteOffAction = (transaction) => {
        const remainingAmount = transaction.amount - (transaction.payments || []).reduce((sum, p) => sum + p.paidAmount, 0);
        dispatch({
            type: 'OPEN_CONFIRMATION_MODAL',
            payload: {
                title: 'Confirmer le Write-off',
                message: `Êtes-vous sûr de vouloir annuler le montant restant de ${formatCurrency(remainingAmount, state.settings)} ? Cette action est irréversible.`,
                onConfirm: () => writeOffActual(dispatch, transaction.id),
            }
        });
    };

    return (
        <div ref={dragConstraintsRef} className="flex min-h-screen bg-background">
            <AnimatePresence>{isTourActive && <GuidedTour />}</AnimatePresence>
            <AnimatePresence>
                {notes.map((note, index) => (
                    <StickyNote key={note.id} note={note} index={index} constraintsRef={dragConstraintsRef} />
                ))}
            </AnimatePresence>
            
            <Header 
                isCollapsed={isSidebarCollapsed} 
                onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
                periodPositions={periodPositions}
                periods={periods}
            />
            
            <div className="flex-1 flex flex-col overflow-y-auto">
                <SubHeader 
                    onOpenSettingsDrawer={onOpenSettingsDrawer}
                    onNewBudgetEntry={handleNewBudgetEntry}
                    onNewScenario={handleNewScenario}
                    isConsolidated={isConsolidated}
                />
                <main className="flex-grow bg-gray-50">
                    <Outlet />
                </main>
            </div>
            
            <AnimatePresence>
                {focusView !== 'none' && <FocusView />}
            </AnimatePresence>

            <SettingsDrawerWrapper activeDrawer={activeSettingsDrawer} onClose={() => dispatch({ type: 'SET_ACTIVE_SETTINGS_DRAWER', payload: null })} />
            
            {isBudgetModalOpen && (
                <BudgetModal 
                    isOpen={isBudgetModalOpen} 
                    onClose={() => dispatch({ type: 'CLOSE_BUDGET_MODAL' })} 
                    onSave={handleSaveEntryWrapper} 
                    onDelete={handleDeleteEntryWrapper} 
                    editingData={editingEntry} 
                />
            )}

            {isActualTransactionModalOpen && (
                <ActualTransactionModal
                    isOpen={isActualTransactionModalOpen}
                    onClose={() => dispatch({ type: 'CLOSE_ACTUAL_TRANSACTION_MODAL' })}
                    onSave={(data) => saveActual(dispatch, { actualData: data, editingActual, user: state.session.user, tiers: state.tiers })}
                    onDelete={(id) => {
                        dispatch({
                            type: 'OPEN_CONFIRMATION_MODAL',
                            payload: {
                                title: `Supprimer cette transaction ?`,
                                message: 'Cette action est irréversible.',
                                onConfirm: () => {
                                    deleteActual(dispatch, id);
                                    dispatch({ type: 'CLOSE_ACTUAL_TRANSACTION_MODAL' });
                                },
                            }
                        });
                    }}
                    editingData={editingActual}
                    type={editingActual?.type}
                />
            )}

            {isPaymentModalOpen && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => dispatch({ type: 'CLOSE_PAYMENT_MODAL' })}
                    onSave={(paymentData) => recordPayment(dispatch, { actualId: payingActual.id, paymentData, allActuals: state.allActuals })}
                    actualToPay={payingActual}
                    type={payingActual?.type}
                />
            )}

            {isDirectPaymentModalOpen && (
                <DirectPaymentModal
                    isOpen={isDirectPaymentModalOpen}
                    onClose={() => dispatch({ type: 'CLOSE_DIRECT_PAYMENT_MODAL' })}
                    onSave={(data) => dispatch({ type: 'RECORD_BATCH_PAYMENT', payload: data })}
                    type={directPaymentType}
                />
            )}

            {isScenarioModalOpen && (
                <ScenarioModal
                    isOpen={isScenarioModalOpen}
                    onClose={() => dispatch({ type: 'CLOSE_SCENARIO_MODAL' })}
                    onSave={handleSaveScenario}
                    scenario={editingScenario}
                />
            )}
            {infoModal.isOpen && (
                <InfoModal
                    isOpen={infoModal.isOpen}
                    onClose={() => dispatch({ type: 'CLOSE_INFO_MODAL' })}
                    title={infoModal.title}
                    message={infoModal.message}
                />
            )}
            <ConfirmationModal
                isOpen={confirmationModal.isOpen}
                onClose={handleCancel}
                onConfirm={handleConfirm}
                title={confirmationModal.title}
                message={confirmationModal.message}
            />
            <InlinePaymentDrawer
                isOpen={inlinePaymentDrawer.isOpen}
                onClose={() => dispatch({ type: 'CLOSE_INLINE_PAYMENT_DRAWER' })}
                actuals={inlinePaymentDrawer.actuals}
                entry={inlinePaymentDrawer.entry}
                period={inlinePaymentDrawer.period}
                periodLabel={inlinePaymentDrawer.periodLabel}
            />
            <TransferModal
                isOpen={isTransferModalOpen}
                onClose={() => dispatch({ type: 'CLOSE_TRANSFER_MODAL' })}
                onSave={(data) => dispatch({ type: 'TRANSFER_FUNDS', payload: data })}
            />
            <CloseAccountModal
                isOpen={isCloseAccountModalOpen}
                onClose={() => dispatch({ type: 'CLOSE_CLOSE_ACCOUNT_MODAL' })}
                onConfirm={handleConfirmCloseAccount}
                accountName={accountToClose?.name}
                minDate={projects.find(p => p.id === accountToClose?.projectId)?.startDate}
            />
            <TransactionActionMenu
                menuState={transactionMenu}
                onClose={() => dispatch({ type: 'CLOSE_TRANSACTION_ACTION_MENU' })}
                onPay={handlePayAction}
                onWriteOff={handleWriteOffAction}
            />
        </div>
    );
};

export default AppLayout;

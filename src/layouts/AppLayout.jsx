import React, { useState, useRef } from 'react';
import { Outlet } from 'react-router-dom';
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
import ConsolidatedViewModal from '../components/ConsolidatedViewModal';
import { saveEntry, saveActual, deleteActual, recordPayment, writeOffActual, saveConsolidatedView, deleteConsolidatedView, closeCashAccount } from '../context/actions';
import { AnimatePresence } from 'framer-motion';

const AppLayout = () => {
    const { state, dispatch } = useBudget();
    const { 
        activeProjectId, activeSettingsDrawer, isBudgetModalOpen, editingEntry, 
        infoModal, confirmationModal, inlinePaymentDrawer, isTransferModalOpen, focusView, 
        isCloseAccountModalOpen, accountToClose, isScenarioModalOpen, editingScenario, 
        isActualTransactionModalOpen, editingActual, isPaymentModalOpen, payingActual, 
        isDirectPaymentModalOpen, directPaymentType, notes, isTourActive, 
        transactionMenu, isConsolidatedViewModalOpen, editingConsolidatedView, session
    } = state;
    
    const dragConstraintsRef = useRef(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const isConsolidated = !activeProjectId || state.consolidatedViews.some(v => v.id === activeProjectId);

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
        const entryToDelete = editingEntry || Object.values(state.allEntries).flat().find(e => e.id === entryId);
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
            closeCashAccount(dispatch, {
                projectId: accountToClose.projectId,
                accountId: accountToClose.id,
                closureDate,
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
            />
            
            <div className="flex-1 flex flex-col overflow-y-auto">
                <SubHeader 
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
            {isConsolidatedViewModalOpen && (
                <ConsolidatedViewModal
                    isOpen={isConsolidatedViewModalOpen}
                    onClose={() => dispatch({ type: 'CLOSE_CONSOLIDATED_VIEW_MODAL' })}
                    onSave={(data) => saveConsolidatedView(dispatch, { viewData: data, editingView: editingConsolidatedView, user: session.user })}
                    editingView={editingConsolidatedView}
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
                minDate={state.projects.find(p => p.id === accountToClose?.projectId)?.startDate}
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

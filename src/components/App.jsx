import React, { useMemo, useState, useEffect } from 'react';
import { useBudget } from './context/BudgetContext';
import BudgetTracker from './components/BudgetTracker';
import Header from './components/Header';
import SubHeader from './components/SubHeader';
import SettingsDrawerWrapper from './components/SettingsDrawerWrapper';
import ActualsView from './components/ActualsView';
import ExpenseAnalysisView from './components/ExpenseAnalysisView';
import JournalsView from './components/JournalsView';
import LoansView from './components/LoansView';
import ScheduleView from './components/ScheduleView';
import CashflowView from './components/CashflowView';
import ScenarioView from './components/ScenarioView';
import BudgetModal from './components/BudgetModal';
import InfoModal from './components/InfoModal';
import OnboardingView from './components/OnboardingView';
import ConfirmationModal from './components/ConfirmationModal';
import InlinePaymentDrawer from './components/InlinePaymentDrawer';
import TransferModal from './components/TransferModal';
import CloseAccountModal from './components/CloseAccountModal';
import UnderConstructionView from './components/UnderConstructionView';
import ScenarioModal from './components/ScenarioModal';
import ActualTransactionModal from './components/ActualTransactionModal';
import PaymentModal from './components/PaymentModal';
import DirectPaymentModal from './components/DirectPaymentModal';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// --- Toast Components (defined inside App.jsx for simplicity) ---

const toastIcons = {
  success: <CheckCircle className="w-5 h-5" />,
  error: <XCircle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
  warning: <AlertCircle className="w-5 h-5" />,
};

const toastColors = {
  success: 'bg-success-500',
  error: 'bg-danger-500',
  info: 'bg-info-500',
  warning: 'bg-warning-500',
};

const Toast = ({ toast, onRemove }) => {
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`relative flex items-start w-full max-w-sm p-4 text-white rounded-lg shadow-lg ${toastColors[toast.type]}`}
    >
      <div className="flex-shrink-0 mr-3">{toastIcons[toast.type]}</div>
      <div className="flex-1 text-sm font-medium">{toast.message}</div>
      <button onClick={() => onRemove(toast.id)} className="ml-4 p-1 rounded-full hover:bg-white/20">
        <X className="w-4 h-4" />
      </button>
      {toast.duration && (
        <motion.div
          className={`absolute bottom-0 left-0 h-1 bg-white/50`}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
};

const ToastContainer = () => {
  const { state, dispatch } = useBudget();
  const { toasts } = state;

  const handleRemove = (id) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  };

  return (
    <div className="fixed top-5 right-5 z-[100] space-y-2">
      <AnimatePresence>
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onRemove={handleRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
};


function App() {
  const { state, dispatch } = useBudget();
  const { projects, activeProjectId, currentView, activeSettingsDrawer, isBudgetModalOpen, editingEntry, infoModal, isOnboarding, confirmationModal, inlinePaymentDrawer, isTransferModalOpen, focusView, isCloseAccountModalOpen, accountToClose, underConstructionTitle, isScenarioModalOpen, editingScenario, isActualTransactionModalOpen, editingActual, isPaymentModalOpen, payingActual, isDirectPaymentModalOpen, directPaymentType } = state;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (projects.length === 0 && !isOnboarding) {
      dispatch({ type: 'START_ONBOARDING' });
    }
  }, [projects.length, isOnboarding, dispatch]);

  const activeProjects = useMemo(() => projects.filter(p => !p.isArchived), [projects]);
  const isConsolidated = activeProjectId === 'consolidated';

  const { activeProject, activeEntries, activeActuals } = useMemo(() => {
    const { allEntries, allActuals } = state;
    if (isConsolidated) {
      return {
        activeProject: { id: 'consolidated', name: 'Projet consolidé' },
        activeEntries: Object.entries(allEntries).flatMap(([projectId, entries]) => entries.map(entry => ({ ...entry, projectId }))),
        activeActuals: Object.entries(allActuals).flatMap(([projectId, actuals]) => actuals.map(actual => ({ ...actual, projectId }))),
      };
    } else {
      const project = activeProjects.find(p => p.id === activeProjectId);
      return {
        activeProject: project,
        activeEntries: project ? (allEntries[project.id] || []) : [],
        activeActuals: project ? (allActuals[project.id] || []) : [],
      };
    }
  }, [activeProjectId, activeProjects, state.allEntries, state.allActuals, isConsolidated]);

  if (isOnboarding || projects.length === 0) {
    return <OnboardingView />;
  }

  const onOpenSettingsDrawer = (drawer) => {
    dispatch({ type: 'SET_ACTIVE_SETTINGS_DRAWER', payload: drawer });
  };
  
  const handleSaveEntryWrapper = (entryData) => {
    dispatch({ type: 'SAVE_ENTRY', payload: { entryData, editingEntry } });
  };
  
  const handleDeleteEntryWrapper = (entryId) => {
    const entryToDelete = editingEntry || activeEntries.find(e => e.id === entryId);
    dispatch({ type: 'DELETE_ENTRY', payload: { entryId, entryProjectId: entryToDelete?.projectId } });
  };

  const handleNewBudgetEntry = () => dispatch({ type: 'OPEN_BUDGET_MODAL', payload: null });
  const handleNewScenario = () => dispatch({ type: 'OPEN_SCENARIO_MODAL', payload: null });

  const renderCurrentView = () => {
    switch (currentView) {
      case 'budget':
        return activeProject ? <BudgetTracker activeProject={activeProject} budgetEntries={activeEntries} actualTransactions={activeActuals} /> : <div>Chargement...</div>;
      case 'cashflow':
        return <CashflowView isFocusMode={false} />;
      case 'schedule':
        return <ScheduleView />;
      case 'scenarios':
        return <ScenarioView />;
      case 'budgetJournal':
        return <JournalsView type="budget" />;
      case 'paymentJournal':
        return <JournalsView type="payment" />;
      case 'payables':
        return <ActualsView type="payable" />;
      case 'receivables':
        return <ActualsView type="receivable" />;
      case 'expenseAnalysis':
        return <ExpenseAnalysisView />;
      case 'borrowings':
        return <LoansView type="borrowing" />;
      case 'loans':
        return <LoansView type="loan" />;
      case 'underConstruction':
        return <UnderConstructionView title={underConstructionTitle} />;
      default:
        return <div>Vue non trouvée</div>;
    }
  };
  
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

  return (
    <div className={`min-h-screen bg-background ${focusView === 'none' ? 'flex' : ''}`}>
      <ToastContainer />
      {focusView === 'none' && (
        <Header 
          isCollapsed={isSidebarCollapsed} 
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          activeProject={activeProject}
          budgetEntries={activeEntries}
          actualTransactions={activeActuals}
        />
      )}
      <div className={`flex-1 flex flex-col ${focusView === 'none' ? 'overflow-y-auto' : ''}`}>
        {focusView === 'none' && 
            <SubHeader 
                onOpenSettingsDrawer={onOpenSettingsDrawer}
                onNewBudgetEntry={handleNewBudgetEntry}
                onNewScenario={handleNewScenario}
                isConsolidated={isConsolidated}
            />
        }
        <main className={`flex-grow ${focusView === 'none' ? 'bg-gray-50' : 'bg-surface'}`}>
            {focusView !== 'none' 
                ? <BudgetTracker activeProject={activeProject} budgetEntries={activeEntries} actualTransactions={activeActuals} />
                : renderCurrentView()
            }
        </main>
      </div>
      
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
            onSave={(data) => dispatch({ type: 'SAVE_ACTUAL', payload: { actualData: data, editingActual } })}
            onDelete={(id) => {
                dispatch({
                    type: 'OPEN_CONFIRMATION_MODAL',
                    payload: {
                        title: `Supprimer cette transaction ?`,
                        message: 'Cette action est irréversible.',
                        onConfirm: () => {
                            dispatch({ type: 'DELETE_ACTUAL', payload: id });
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
            onSave={(paymentData) => dispatch({ type: 'RECORD_PAYMENT', payload: { actualId: payingActual.id, paymentData } })}
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
    </div>
  );
}

export default App;

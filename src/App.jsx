import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useBudget } from './context/BudgetContext';
import { supabase } from './utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X, Loader } from 'lucide-react';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AppLayout from './layouts/AppLayout';

// Public Pages
import HomePage from './pages/HomePage';
import LegalPage from './pages/LegalPage';
import AboutPage from './pages/AboutPage';

// App Pages & Views
import OnboardingView from './components/OnboardingView';
import AuthView from './components/AuthView';
import DashboardView from './components/DashboardView';
import BudgetTracker from './components/BudgetTracker';
import CashflowView from './components/CashflowView';
import ScheduleView from './components/ScheduleView';
import ScenarioView from './components/ScenarioView';
import ExpenseAnalysisView from './components/ExpenseAnalysisView';
import JournalsView from './components/JournalsView';
import UnderConstructionView from './components/UnderConstructionView';
import ProfilePage from './pages/ProfilePage';
import SecurityPage from './pages/SecurityPage';
import SubscriptionPage from './pages/SubscriptionPage';
import ReferralPage from './pages/ReferralPage';
import DisplaySettingsPage from './pages/DisplaySettingsPage';
import DeleteAccountPage from './pages/DeleteAccountPage';
import CollaborationPage from './pages/CollaborationPage';

// --- Toast Components ---
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
      const timer = setTimeout(() => onRemove(toast.id), toast.duration);
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
      <button onClick={() => onRemove(toast.id)} className="ml-4 p-1 rounded-full hover:bg-white/20"><X className="w-4 h-4" /></button>
      {toast.duration && <motion.div className="absolute bottom-0 left-0 h-1 bg-white/50" initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: toast.duration / 1000, ease: 'linear' }} />}
    </motion.div>
  );
};
const ToastContainer = () => {
  const { state, dispatch } = useBudget();
  const { toasts } = state;
  const handleRemove = (id) => dispatch({ type: 'REMOVE_TOAST', payload: id });
  return (
    <div className="fixed top-5 right-5 z-[100] space-y-2">
      <AnimatePresence>{toasts.map(toast => <Toast key={toast.id} toast={toast} onRemove={handleRemove} />)}</AnimatePresence>
    </div>
  );
};

// --- Protected Route Wrapper ---
const ProtectedRoute = ({ children }) => {
  const { state } = useBudget();
  const location = useLocation();
  const { session, isOnboarding, projects } = state;

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (isOnboarding || projects.length === 0) {
    return <OnboardingView />;
  }

  return children;
};

function App() {
  const { state, dispatch } = useBudget();
  const { session, isLoading } = state;

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch({ type: 'SET_SESSION', payload: session });
      if (!session) {
        dispatch({ type: 'RESET_STATE' });
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="a-propos" element={<AboutPage />} />
          <Route path="cgu" element={<LegalPage type="cgu" />} />
          <Route path="rgpd" element={<LegalPage type="rgpd" />} />
          <Route path="cookies" element={<LegalPage type="cookies" />} />
          <Route path="mentions-legales" element={<LegalPage type="mentions" />} />
          <Route path="politique-de-confidentialite" element={<LegalPage type="privacy" />} />
        </Route>

        {/* Auth Route */}
        <Route path="/auth" element={<AuthView />} />

        {/* Protected App Routes */}
        <Route 
          path="/app" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardView />} />
          <Route path="trezo" element={<BudgetTracker />} />
          <Route path="flux" element={<CashflowView />} />
          <Route path="echeancier" element={<ScheduleView />} />
          <Route path="scenarios" element={<ScenarioView />} />
          <Route path="analyse" element={<ExpenseAnalysisView />} />
          <Route path="journal-budget" element={<JournalsView type="budget" />} />
          <Route path="journal-paiements" element={<JournalsView type="payment" />} />
          <Route path="profil" element={<ProfilePage />} />
          <Route path="securite" element={<SecurityPage />} />
          <Route path="abonnement" element={<SubscriptionPage />} />
          <Route path="parrainage" element={<ReferralPage />} />
          <Route path="display-settings" element={<DisplaySettingsPage />} />
          <Route path="delete-account" element={<DeleteAccountPage />} />
          <Route path="collaborateurs" element={<CollaborationPage />} />
          <Route path="factures" element={<UnderConstructionView title="Factures" />} />
          <Route path="aide" element={<UnderConstructionView title="Centre d'aide" />} />
        </Route>

        {/* Redirect any other path */}
        <Route path="*" element={<Navigate to={session ? "/app/dashboard" : "/"} replace />} />
      </Routes>
    </>
  );
}

export default App;

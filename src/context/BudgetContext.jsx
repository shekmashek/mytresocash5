import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../utils/supabase';
import { saveEntry, updateSettings, updateUserCashAccount } from '../context/actions';

// --- Helper Functions & Constants ---

// --- Initial State Definition ---
const getDefaultExpenseTargets = () => ({
  'exp-main-1': 20, // Exploitation (le reste, calculé)
  'exp-main-2': 35, // Masse Salariale
  'exp-main-3': 10, // Investissement
  'exp-main-4': 0,  // Financement
  'exp-main-5': 10, // Épargne et Provision
  'exp-main-6': 5,  // Exceptionnel
  'exp-main-7': 10, // Impôts et Taxes
  'exp-main-8': 5,  // Formation
  'exp-main-9': 5,  // Innovation, Recherche et développement
  'exp-main-10': 0, // Personnel
});

const createDefaultCashAccount = (projectId) => ({
    id: uuidv4(),
    projectId,
    mainCategoryId: 'cash',
    name: 'Caisse Espèce',
    initialBalance: 0,
    initialBalanceDate: new Date().toISOString().split('T')[0],
    isClosed: false,
    closureDate: null,
});

const initialCategories = {
  revenue: [
    { id: 'rev-main-1', name: 'Entrées des Ventes', isFixed: false, subCategories: [{ id: uuidv4(), name: 'Ventes de produits' }, { id: uuidv4(), name: 'Ventes de services' }] },
    { id: 'rev-main-2', name: 'Entrées Financières', isFixed: false, subCategories: [
        { id: uuidv4(), name: 'Intérêts perçus' }, 
        { id: uuidv4(), name: 'Réception Emprunt' },
        { id: uuidv4(), name: 'Remboursement de prêt reçu' },
        { id: uuidv4(), name: 'Intérêts de prêt reçus' },
    ] },
    { id: 'rev-main-3', name: 'Autres Entrées', isFixed: false, subCategories: [{ id: uuidv4(), name: 'Subventions' }, { id: uuidv4(), name: 'Revenus Exceptionnels'}] },
  ],
  expense: [
    { id: 'exp-main-1', name: 'Exploitation', isFixed: true, subCategories: [
        { id: uuidv4(), name: 'Loyer et charges' }, 
        { id: uuidv4(), name: 'Fournitures de bureau' }, 
        { id: uuidv4(), name: 'Marketing et publicité' }, 
        { id: uuidv4(), name: 'Frais de déplacement' },
        { id: uuidv4(), name: 'Frais administratives et de gestion' },
        { id: uuidv4(), name: 'Frais de transport' },
        { id: uuidv4(), name: 'Entretien, réparation et maintenance' },
        { id: uuidv4(), name: 'Recherche et développement' },
        { id: uuidv4(), name: 'Petit équipement' }
    ] },
    { id: 'exp-main-2', name: 'Masse Salariale', isFixed: true, subCategories: [{ id: uuidv4(), name: 'Salaires et traitements' }, { id: uuidv4(), name: 'Charges sociales' }] },
    { id: 'exp-main-3', name: 'Investissement', isFixed: true, subCategories: [
        { id: uuidv4(), name: 'Investissements financiers' },
        { id: uuidv4(), name: 'Investissements immobiliers' },
        { id: uuidv4(), name: 'Investissement dans sa propre entreprise' },
        { id: uuidv4(), name: 'Autres investissements' }
    ] },
    { id: 'exp-main-4', name: 'Financement', isFixed: true, subCategories: [
        { id: uuidv4(), name: 'Octroi de Prêt' },
        { id: uuidv4(), name: "Remboursement d'emprunt" }, 
        { id: uuidv4(), name: "Intérêts d'emprunt" },
    ] },
    { id: 'exp-main-5', name: 'Épargne et Provision', isFixed: true, subCategories: [
        { id: uuidv4(), name: 'Provision pour risques' },
        { id: uuidv4(), name: "Fond d'urgence" },
        { id: uuidv4(), name: 'Epargne Projet à court et moyen termes' },
        { id: uuidv4(), name: 'Epargne retraite' },
    ] },
    { id: 'exp-main-6', name: 'Exceptionnel', isFixed: true, subCategories: [{ id: uuidv4(), name: 'Amendes' }] },
    { id: 'exp-main-7', name: 'Impôts et Taxes', isFixed: true, subCategories: [{ id: uuidv4(), name: 'Impôt sur les sociétés' }, { id: uuidv4(), name: 'TVA' }, { id: uuidv4(), name: 'Autres taxes'}] },
    { id: 'exp-main-8', name: 'Formation', isFixed: true, subCategories: [
        { id: uuidv4(), name: 'Matériel' },
        { id: uuidv4(), name: 'Livres' },
        { id: uuidv4(), name: 'Logiciels' },
        { id: uuidv4(), name: 'Abonnement' },
        { id: uuidv4(), name: 'Ateliers pratiques' },
        { id: uuidv4(), name: 'Formations certifiantes' },
        { id: uuidv4(), name: 'Stage' },
    ] },
    { id: 'exp-main-9', name: 'Innovation, Recherche et développement', isFixed: true, subCategories: [] },
    { id: 'exp-main-10', name: 'Personnel', isFixed: true, subCategories: [
        { id: uuidv4(), name: 'Logement' },
        { id: uuidv4(), name: 'Eau et Electricité' },
        { id: uuidv4(), name: 'Frais de réparation et entretien' },
        { id: uuidv4(), name: 'Décoration et ameublement' },
        { id: uuidv4(), name: 'Frais de nettoyage' },
        { id: uuidv4(), name: 'Nourriture & alimentation' },
        { id: uuidv4(), name: 'Transports et déplacement' },
        { id: uuidv4(), name: 'Santé et bien etre' },
        { id: uuidv4(), name: 'Communication et divertissement' },
        { id: uuidv4(), name: 'Enfant et education' },
        { id: uuidv4(), name: 'Habillement & Textile' },
        { id: uuidv4(), name: 'Assurance divers' },
        { id: uuidv4(), name: 'Impots & obligation fiscales' },
        { id: uuidv4(), name: 'DIvers et imprévus' },
    ] },
    { id: 'exp-main-11', name: 'Loisirs et plaisirs', isFixed: true, subCategories: [
        { id: uuidv4(), name: 'Sorties et restaurants' },
        { id: uuidv4(), name: 'Abonnement digitaux' },
        { id: uuidv4(), name: 'Hobbies et passion' },
        { id: uuidv4(), name: 'Shopping' },
        { id: uuidv4(), name: 'Soins personnel' },
    ]},
    { id: 'exp-main-12', name: 'Dons et cadeaux', isFixed: true, subCategories: [
        { id: uuidv4(), name: 'Cadeaux pour occasions' },
        { id: uuidv4(), name: 'Célébration' },
        { id: uuidv4(), name: 'Charité' },
    ]},
    { id: 'exp-main-13', name: 'Achat pour revente', isFixed: true, subCategories: [
        { id: uuidv4(), name: 'Matière premiere' },
        { id: uuidv4(), name: 'Marchandises' },
        { id: uuidv4(), name: 'Emballage' },
        { id: uuidv4(), name: 'Etude et prestation de service' },
        { id: uuidv4(), name: 'Equipement et travaux' },
    ]},
  ]
};

const initialSettings = { 
  displayUnit: 'standard',
  decimalPlaces: 2,
  currency: '€',
  exchangeRates: {},
  language: 'fr',
  timezoneOffset: 0,
};

export const mainCashAccountCategories = [
  { id: 'bank', name: 'Comptes Bancaires' },
  { id: 'cash', name: 'Cash / Espèce' },
  { id: 'mobileMoney', name: 'Mobile Money' },
  { id: 'savings', name: 'Épargne' },
  { id: 'provisions', name: 'Provisions' },
];

const CONSOLIDATED_PROJECT_ID = 'consolidated';
const SCENARIO_COLORS = ['#8b5cf6', '#f97316', '#d946ef']; // violet, orange, fuchsia

const getInitialState = () => ({
    session: null,
    profile: null,
    projects: [],
    categories: initialCategories,
    allEntries: {},
    allActuals: {},
    allCashAccounts: {},
    tiers: [],
    settings: initialSettings,
    scenarios: [],
    scenarioEntries: {},
    loans: [],
    notes: [],
    infoModal: { isOpen: false, title: '', message: '' },
    confirmationModal: { isOpen: false, title: '', message: '', onConfirm: () => {} },
    inlinePaymentDrawer: { isOpen: false, actuals: [], entry: null, period: null, periodLabel: '' },
    toasts: [],
    isTransferModalOpen: false,
    isCloseAccountModalOpen: false,
    accountToClose: null,
    isActualTransactionModalOpen: false,
    editingActual: null,
    isPaymentModalOpen: false,
    payingActual: null,
    isDirectPaymentModalOpen: false,
    directPaymentType: null,
    isActionPriorityModalOpen: false,
    actionPriorityTransaction: null,
    transactionMenu: { isOpen: false, x: 0, y: 0, transaction: null },
    activeProjectId: null,
    displayYear: new Date().getFullYear(),
    timeUnit: 'week',
    horizonLength: 6,
    periodOffset: 0,
    activeSettingsDrawer: null,
    isBudgetModalOpen: false,
    editingEntry: null,
    isOnboarding: false,
    actualsSearchTerm: '',
    actualsViewFilter: null,
    activeQuickSelect: null,
    focusView: 'none',
    isScenarioModalOpen: false,
    editingScenario: null,
    isTourActive: false,
    tourHighlightId: null,
    isLoading: true,
});

// --- Reducer Function ---
const budgetReducer = (state, action) => {
  switch (action.type) {
    case 'SET_SESSION':
      if (!action.payload) { // If session is null (logout)
        return { ...getInitialState(), isLoading: false, session: null };
      }
      return { ...state, session: action.payload };
    case 'SET_PROFILE':
      return { ...state, profile: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'RESET_STATE':
        return { ...getInitialState(), isLoading: false };
    case 'SET_INITIAL_DATA':
        return {
            ...state,
            ...action.payload,
            isLoading: false,
            isOnboarding: action.payload.projects.length === 0,
            activeProjectId: state.activeProjectId || (action.payload.projects.length > 0 ? 'consolidated' : null),
        };
    case 'OPEN_TRANSACTION_ACTION_MENU':
      return { ...state, transactionMenu: { isOpen: true, ...action.payload } };
    case 'CLOSE_TRANSACTION_ACTION_MENU':
      return { ...state, transactionMenu: { ...state.transactionMenu, isOpen: false } };
    case 'OPEN_ACTION_PRIORITY_MODAL':
      return { ...state, isActionPriorityModalOpen: true, actionPriorityTransaction: action.payload };
    case 'CLOSE_ACTION_PRIORITY_MODAL':
      return { ...state, isActionPriorityModalOpen: false, actionPriorityTransaction: null };
    case 'START_TOUR':
      return { ...state, isTourActive: true };
    case 'END_TOUR':
      return { ...state, isTourActive: false, tourHighlightId: null };
    case 'SET_TOUR_HIGHLIGHT':
      return { ...state, tourHighlightId: action.payload };
    case 'ADD_NOTE_SUCCESS': {
        return {
            ...state,
            notes: [...state.notes, action.payload]
        };
    }
    case 'UPDATE_NOTE_SUCCESS': {
      const updatedNote = action.payload;
      return {
        ...state,
        notes: state.notes.map(note =>
          note.id === updatedNote.id ? updatedNote : note
        )
      };
    }
    case 'TOGGLE_NOTE_MINIMIZE': {
      return {
        ...state,
        notes: state.notes.map(note =>
          note.id === action.payload ? { ...note, isMinimized: !note.isMinimized } : note
        )
      };
    }
    case 'DELETE_NOTE_SUCCESS': {
      return {
        ...state,
        notes: state.notes.filter(note => note.id !== action.payload),
      };
    }
    case 'OPEN_DIRECT_PAYMENT_MODAL':
      return { ...state, isDirectPaymentModalOpen: true, directPaymentType: action.payload };
    case 'CLOSE_DIRECT_PAYMENT_MODAL':
      return { ...state, isDirectPaymentModalOpen: false, directPaymentType: null };
    case 'RECORD_BATCH_PAYMENT_SUCCESS': {
        const updatedActuals = action.payload;
        const newAllActuals = JSON.parse(JSON.stringify(state.allActuals));

        updatedActuals.forEach(updatedActual => {
            const projectActuals = newAllActuals[updatedActual.project_id];
            if (projectActuals) {
                const index = projectActuals.findIndex(a => a.id === updatedActual.id);
                if (index > -1) {
                    projectActuals[index].status = updatedActual.status;
                    projectActuals[index].payments = updatedActual.payments;
                }
            }
        });
        
        return {
            ...state,
            allActuals: newAllActuals,
        };
    }
    case 'OPEN_ACTUAL_TRANSACTION_MODAL':
      return { ...state, isActualTransactionModalOpen: true, editingActual: action.payload };
    case 'CLOSE_ACTUAL_TRANSACTION_MODAL':
      return { ...state, isActualTransactionModalOpen: false, editingActual: null };
    case 'OPEN_PAYMENT_MODAL':
      return { ...state, isPaymentModalOpen: true, payingActual: action.payload };
    case 'CLOSE_PAYMENT_MODAL':
      return { ...state, isPaymentModalOpen: false, payingActual: null };
    case 'WRITE_OFF_ACTUAL_SUCCESS': {
        const updatedActual = action.payload;
        const newAllActuals = JSON.parse(JSON.stringify(state.allActuals));
        const projectActuals = newAllActuals[updatedActual.project_id];
        if(projectActuals) {
            const index = projectActuals.findIndex(a => a.id === updatedActual.id);
            if (index > -1) {
                projectActuals[index] = {
                    ...projectActuals[index],
                    status: updatedActual.status,
                    description: updatedActual.description,
                };
            }
        }
        return { ...state, allActuals: newAllActuals };
    }
    case 'OPEN_SCENARIO_MODAL':
      return { ...state, isScenarioModalOpen: true, editingScenario: action.payload };
    case 'CLOSE_SCENARIO_MODAL':
      return { ...state, isScenarioModalOpen: false, editingScenario: null };
    case 'SET_ACTUALS_VIEW_FILTER':
      return { ...state, actualsViewFilter: action.payload };
    case 'ADD_LOAN_SUCCESS': {
        const { newLoan, principalEntry, repaymentEntry, principalActuals, repaymentActuals, newTier } = action.payload;
        const projectId = newLoan.projectId;

        const newAllEntries = JSON.parse(JSON.stringify(state.allEntries));
        if (!newAllEntries[projectId]) newAllEntries[projectId] = [];
        newAllEntries[projectId].push(principalEntry, repaymentEntry);
        
        const newAllActuals = JSON.parse(JSON.stringify(state.allActuals));
        if (!newAllActuals[projectId]) newAllActuals[projectId] = [];
        newAllActuals[projectId].push(...principalActuals, ...repaymentActuals);

        let newTiers = state.tiers;
        if (newTier) {
            newTiers = [...state.tiers, newTier];
        }

        return {
            ...state,
            loans: [...state.loans, newLoan],
            allEntries: newAllEntries,
            allActuals: newAllActuals,
            tiers: newTiers,
        };
    }
    case 'UPDATE_LOAN_SUCCESS': {
        const { updatedLoan, principalEntry, repaymentEntry, principalActuals, repaymentActuals } = action.payload;
        const projectId = updatedLoan.projectId;

        const tempLoans = state.loans.filter(l => l.id !== updatedLoan.id);
        
        const tempAllEntries = { ...state.allEntries };
        tempAllEntries[projectId] = (tempAllEntries[projectId] || []).filter(e => e.loanId !== updatedLoan.id);
        tempAllEntries[projectId].push(principalEntry, repaymentEntry);

        const tempAllActuals = { ...state.allActuals };
        tempAllActuals[projectId] = (tempAllActuals[projectId] || []).filter(a => {
            const entry = (state.allEntries[projectId] || []).find(e => e.id === a.budgetId);
            return !entry || entry.loanId !== updatedLoan.id;
        });
        tempAllActuals[projectId].push(...principalActuals, ...repaymentActuals);

        return {
            ...state,
            loans: [...tempLoans, updatedLoan],
            allEntries: tempAllEntries,
            allActuals: tempAllActuals,
        };
    }
    case 'DELETE_LOAN_SUCCESS': {
        const loanId = action.payload;
        const loanToDelete = state.loans.find(l => l.id === loanId);
        if (!loanToDelete) return state;

        const projectId = loanToDelete.projectId;
        const newLoans = state.loans.filter(l => l.id !== loanId);
        
        const newAllEntries = { ...state.allEntries };
        newAllEntries[projectId] = (newAllEntries[projectId] || []).filter(e => e.loanId !== loanId);

        const newAllActuals = { ...state.allActuals };
        newAllActuals[projectId] = (newAllActuals[projectId] || []).filter(a => {
            const entry = (state.allEntries[projectId] || []).find(e => e.id === a.budgetId);
            return !entry || entry.loanId !== loanId;
        });

        return {
            ...state,
            loans: newLoans,
            allEntries: newAllEntries,
            allActuals: newAllActuals,
        };
    }
    case 'OPEN_CLOSE_ACCOUNT_MODAL':
      return { ...state, isCloseAccountModalOpen: true, accountToClose: action.payload };
    case 'CLOSE_CLOSE_ACCOUNT_MODAL':
      return { ...state, isCloseAccountModalOpen: false, accountToClose: null };
    case 'OPEN_TRANSFER_MODAL':
      return { ...state, isTransferModalOpen: true };
    case 'CLOSE_TRANSFER_MODAL':
      return { ...state, isTransferModalOpen: false };
    case 'TRANSFER_FUNDS_SUCCESS': {
      const { debitActual, creditActual } = action.payload;
      const newAllActuals = JSON.parse(JSON.stringify(state.allActuals));

      if (!newAllActuals[debitActual.projectId]) newAllActuals[debitActual.projectId] = [];
      newAllActuals[debitActual.projectId].push(debitActual);

      if (!newAllActuals[creditActual.projectId]) newAllActuals[creditActual.projectId] = [];
      newAllActuals[creditActual.projectId].push(creditActual);

      return {
        ...state,
        allActuals: newAllActuals,
        isTransferModalOpen: false,
      };
    }
    case 'SET_FOCUS_VIEW':
      return { ...state, focusView: action.payload };
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, { ...action.payload, id: action.payload.id || uuidv4() }],
      };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload),
      };
    case 'SET_ACTUALS_SEARCH_TERM':
      return { ...state, actualsSearchTerm: action.payload };
    case 'SET_ACTIVE_PROJECT': {
      const newProjectId = action.payload;
      return { 
        ...state, 
        activeProjectId: newProjectId, 
        periodOffset: 0,
      };
    }
    case 'SET_ACTIVE_SETTINGS_DRAWER':
      return { ...state, activeSettingsDrawer: action.payload };
    case 'OPEN_BUDGET_MODAL':
      return { ...state, isBudgetModalOpen: true, editingEntry: action.payload };
    case 'CLOSE_BUDGET_MODAL':
      return { ...state, isBudgetModalOpen: false, editingEntry: null };
    case 'SET_DISPLAY_YEAR':
      return { ...state, displayYear: action.payload, periodOffset: 0 };
    case 'SET_TIME_UNIT':
      return { ...state, timeUnit: action.payload, periodOffset: 0, activeQuickSelect: null };
    case 'SET_HORIZON_LENGTH':
      return { ...state, horizonLength: action.payload, activeQuickSelect: null };
    case 'SET_PERIOD_OFFSET':
      return { ...state, periodOffset: action.payload, activeQuickSelect: null };
    case 'SET_QUICK_PERIOD': {
      const { timeUnit, horizonLength, periodOffset, activeQuickSelect } = action.payload;
      return { ...state, timeUnit, horizonLength, periodOffset, activeQuickSelect };
    }
    
    // --- Onboarding ---
    case 'START_ONBOARDING':
      return { ...state, isOnboarding: true };
    case 'CANCEL_ONBOARDING':
      return { ...state, isOnboarding: false };

    // --- Info Modal ---
    case 'OPEN_INFO_MODAL':
      return { ...state, infoModal: { isOpen: true, ...action.payload } };
    case 'CLOSE_INFO_MODAL':
      return { ...state, infoModal: { isOpen: false, title: '', message: '' } };

    // --- Confirmation Modal ---
    case 'OPEN_CONFIRMATION_MODAL':
      return {
        ...state,
        confirmationModal: {
          isOpen: true,
          title: action.payload.title,
          message: action.payload.message,
          onConfirm: action.payload.onConfirm,
        },
      };
    case 'CLOSE_CONFIRMATION_MODAL':
      return {
        ...state,
        confirmationModal: {
          isOpen: false,
          title: '',
          message: '',
          onConfirm: () => {},
        },
      };

    // --- Scenarios ---
    case 'ADD_SCENARIO_SUCCESS': {
        const newScenario = action.payload;
        return {
            ...state,
            scenarios: [...state.scenarios, newScenario],
            scenarioEntries: { ...state.scenarioEntries, [newScenario.id]: [] },
        };
    }
    case 'UPDATE_SCENARIO_SUCCESS': {
      const updatedScenario = action.payload;
      return {
        ...state,
        scenarios: state.scenarios.map(s => s.id === updatedScenario.id ? updatedScenario : s),
      };
    }
    case 'TOGGLE_SCENARIO_VISIBILITY': {
      const scenarioId = action.payload;
      return {
        ...state,
        scenarios: state.scenarios.map(s =>
          s.id === scenarioId ? { ...s, isVisible: !s.isVisible } : s
        ),
      };
    }
    case 'ARCHIVE_SCENARIO_SUCCESS': {
      const scenarioId = action.payload;
      return {
        ...state,
        scenarios: state.scenarios.map(s => s.id === scenarioId ? { ...s, isArchived: true } : s),
      };
    }
    case 'RESTORE_SCENARIO_SUCCESS': {
      const scenarioId = action.payload;
      return {
        ...state,
        scenarios: state.scenarios.map(s => s.id === scenarioId ? { ...s, isArchived: false } : s),
      };
    }
    case 'DELETE_SCENARIO_SUCCESS': {
      const scenarioId = action.payload;
      const newScenarios = state.scenarios.filter(s => s.id !== scenarioId);
      const newScenarioEntries = { ...state.scenarioEntries };
      delete newScenarioEntries[scenarioId];
      return { ...state, scenarios: newScenarios, scenarioEntries: newScenarioEntries };
    }
    case 'SAVE_SCENARIO_ENTRY_SUCCESS': {
      const { scenarioId, savedEntry } = action.payload;
      const newScenarioEntries = JSON.parse(JSON.stringify(state.scenarioEntries));
      const scenarioDeltas = newScenarioEntries[scenarioId] || [];
      const index = scenarioDeltas.findIndex(e => e.id === savedEntry.id);
      if (index > -1) {
        scenarioDeltas[index] = savedEntry;
      } else {
        scenarioDeltas.push(savedEntry);
      }
      newScenarioEntries[scenarioId] = scenarioDeltas;
      return { ...state, scenarioEntries: newScenarioEntries };
    }
    case 'DELETE_SCENARIO_ENTRY_SUCCESS': {
      const { scenarioId, entryId } = action.payload;
      const newScenarioEntries = { ...state.scenarioEntries };
      const scenarioDeltas = newScenarioEntries[scenarioId] || [];
      newScenarioEntries[scenarioId] = scenarioDeltas.filter(e => e.id !== entryId);
      return { ...state, scenarioEntries: newScenarioEntries };
    }

    case 'INITIALIZE_PROJECT_SUCCESS': {
        const { newProject, finalCashAccounts, newAllEntries, newAllActuals, newTiers, newLoans } = action.payload;
        return {
            ...state,
            projects: [...state.projects, newProject],
            allEntries: { ...state.allEntries, [newProject.id]: newAllEntries },
            allActuals: { ...state.allActuals, [newProject.id]: newAllActuals },
            allCashAccounts: { ...state.allCashAccounts, [newProject.id]: finalCashAccounts },
            tiers: newTiers,
            loans: [...state.loans, ...newLoans],
            activeProjectId: newProject.id,
            isOnboarding: false,
        };
    }
    
    case 'UPDATE_PROJECT_SETTINGS_SUCCESS': {
      const { projectId, newSettings } = action.payload;
      return {
        ...state,
        projects: state.projects.map(p => p.id === projectId ? { ...p, ...newSettings } : p),
      };
    }
    case 'ARCHIVE_PROJECT_SUCCESS': {
      const projectId = action.payload;
      return {
        ...state,
        projects: state.projects.map(p => p.id === projectId ? { ...p, isArchived: true } : p),
        activeProjectId: state.activeProjectId === projectId ? CONSOLIDATED_PROJECT_ID : state.activeProjectId,
      };
    }
    case 'DELETE_PROJECT_SUCCESS': {
      const projectId = action.payload;
      const remainingProjects = state.projects.filter(p => p.id !== projectId);
      const newEntries = { ...state.allEntries };
      delete newEntries[projectId];
      const newActuals = { ...state.allActuals };
      delete newActuals[projectId];
      const newAllCashAccounts = { ...state.allCashAccounts };
      delete newAllCashAccounts[projectId];
      const newScenarios = state.scenarios.filter(s => s.projectId !== projectId);
      const newScenarioEntries = { ...state.scenarioEntries };
      state.scenarios.forEach(s => {
        if (s.projectId === projectId) {
          delete newScenarioEntries[s.id];
        }
      });
      
      let newActiveProjectId = state.activeProjectId;
      if (remainingProjects.length === 0) {
          newActiveProjectId = null;
      } else if (state.activeProjectId === projectId) {
          newActiveProjectId = CONSOLIDATED_PROJECT_ID;
      }

      return {
        ...state,
        projects: remainingProjects,
        allEntries: newEntries,
        allActuals: newActuals,
        allCashAccounts: newAllCashAccounts,
        scenarios: newScenarios,
        scenarioEntries: newScenarioEntries,
        activeProjectId: newActiveProjectId,
      };
    }

    case 'ADD_TIER_SUCCESS': {
      return { ...state, tiers: [...state.tiers, action.payload] };
    }
    case 'UPDATE_TIER_SUCCESS': {
      const { tierId, newName, oldName } = action.payload;
      const newTiers = state.tiers.map(t => t.id === tierId ? { ...t, name: newName } : t);
      const updateItemsTier = (items) => {
        const newItems = { ...items };
        for (const projId in newItems) {
          newItems[projId] = newItems[projId].map(item => {
            if (item.supplier === oldName) return { ...item, supplier: newName };
            if (item.thirdParty === oldName) return { ...item, thirdParty: newName };
            return item;
          });
        }
        return newItems;
      };
      return {
        ...state,
        tiers: newTiers,
        allEntries: updateItemsTier(state.allEntries),
        allActuals: updateItemsTier(state.allActuals),
      };
    }
    case 'DELETE_TIER_SUCCESS': {
      return { ...state, tiers: state.tiers.filter(t => t.id !== action.payload) };
    }

    case 'ADD_SUB_CATEGORY_SUCCESS': {
        const { type, mainCategoryId, newSubCategory } = action.payload;
        const newCategories = JSON.parse(JSON.stringify(state.categories));
        const mainCat = newCategories[type]?.find(mc => mc.id === mainCategoryId);
        if (mainCat) {
            mainCat.subCategories.push(newSubCategory);
        }
        return { ...state, categories: newCategories };
    }
    case 'UPDATE_SUB_CATEGORY_SUCCESS': {
        const { type, mainCategoryId, subCategoryId, newName, oldName } = action.payload;
        const newCategories = JSON.parse(JSON.stringify(state.categories));
        const mainCat = newCategories[type]?.find(mc => mc.id === mainCategoryId);
        if (mainCat) {
            const subCat = mainCat.subCategories.find(sc => sc.id === subCategoryId);
            if (subCat) subCat.name = newName;
        }

        const updateItemsCategory = (items) => {
            const newItems = { ...items };
            for (const projId in newItems) {
                newItems[projId] = newItems[projId].map(item =>
                    (item.category === oldName) ? { ...item, category: newName } : item
                );
            }
            return newItems;
        };

        return {
            ...state,
            categories: newCategories,
            allEntries: updateItemsCategory(state.allEntries),
            allActuals: updateItemsCategory(state.allActuals),
        };
    }
    case 'DELETE_SUB_CATEGORY_SUCCESS': {
        const { type, mainId, subId } = action.payload;
        const newCategories = JSON.parse(JSON.stringify(state.categories));
        const mainCat = newCategories[type]?.find(mc => mc.id === mainId);
        if (mainCat) {
            mainCat.subCategories = mainCat.subCategories.filter(sc => sc.id !== subId);
        }
        return { ...state, categories: newCategories };
    }

    case 'ADD_USER_CASH_ACCOUNT_SUCCESS': {
      const { projectId, newAccount } = action.payload;
      const newAllCashAccounts = { ...state.allCashAccounts };
      newAllCashAccounts[projectId] = [...(newAllCashAccounts[projectId] || []), newAccount];
      return { ...state, allCashAccounts: newAllCashAccounts };
    }
    case 'UPDATE_USER_CASH_ACCOUNT_SUCCESS': {
      const { projectId, accountId, accountData } = action.payload;
      const newAllCashAccounts = JSON.parse(JSON.stringify(state.allCashAccounts));
      const projectAccounts = (newAllCashAccounts[projectId] || []).map(acc => 
        acc.id === accountId ? { ...acc, ...accountData } : acc
      );
      newAllCashAccounts[projectId] = projectAccounts;
      return { ...state, allCashAccounts: newAllCashAccounts };
    }
    case 'DELETE_USER_CASH_ACCOUNT_SUCCESS': {
      const { projectId, accountId } = action.payload;
      const newAllCashAccounts = { ...state.allCashAccounts };
      newAllCashAccounts[projectId] = (newAllCashAccounts[projectId] || []).filter(acc => acc.id !== accountId);
      return { ...state, allCashAccounts: newAllCashAccounts };
    }
    case 'CLOSE_CASH_ACCOUNT_SUCCESS': {
      const { projectId, accountId, closureDate } = action.payload;
      const newAllCashAccounts = { ...state.allCashAccounts };
      const projectAccounts = (newAllCashAccounts[projectId] || []).map(acc => 
        acc.id === accountId ? { ...acc, isClosed: true, closureDate } : acc
      );
      newAllCashAccounts[projectId] = projectAccounts;
      return { ...state, allCashAccounts: newAllCashAccounts, isCloseAccountModalOpen: false, accountToClose: null };
    }
    case 'REOPEN_CASH_ACCOUNT_SUCCESS': {
      const { projectId, accountId } = action.payload;
      const newAllCashAccounts = { ...state.allCashAccounts };
      const projectAccounts = (newAllCashAccounts[projectId] || []).map(acc => 
        acc.id === accountId ? { ...acc, isClosed: false, closureDate: null } : acc
      );
      newAllCashAccounts[projectId] = projectAccounts;
      return { ...state, allCashAccounts: newAllCashAccounts };
    }
    
    case 'UPDATE_ANNUAL_GOALS_SUCCESS': {
        const { projectId, year, updatedGoals } = action.payload;
        return {
            ...state,
            projects: state.projects.map(p => {
                if (p.id === projectId) {
                    const newProjectData = { ...p };
                    if (!newProjectData.annualGoals) newProjectData.annualGoals = {};
                    newProjectData.annualGoals[year] = updatedGoals;
                    return newProjectData;
                }
                return p;
            }),
        };
    }
    
    case 'SAVE_ENTRY_SUCCESS': {
        const { savedEntry, newActuals, targetProjectId, newTier } = action.payload;
        let newState = { ...state };
        if (newTier) {
            if (!newState.tiers.some(t => t.id === newTier.id)) {
                newState.tiers = [...newState.tiers, newTier];
            }
        }

        const updatedAllEntries = { ...newState.allEntries };
        const projectEntries = [...(updatedAllEntries[targetProjectId] || [])];
        const entryIndex = projectEntries.findIndex(e => e.id === savedEntry.id);
        if (entryIndex > -1) {
            projectEntries[entryIndex] = savedEntry;
        } else {
            projectEntries.push(savedEntry);
        }
        updatedAllEntries[targetProjectId] = projectEntries;
        newState.allEntries = updatedAllEntries;

        const newAllActuals = { ...newState.allActuals };
        const unsettledStatuses = ['pending', 'partially_paid', 'partially_received'];
        let projectActuals = (newAllActuals[targetProjectId] || []).filter(actual => 
            !(actual.budgetId === savedEntry.id && unsettledStatuses.includes(actual.status))
        );
        projectActuals.push(...newActuals);
        newAllActuals[targetProjectId] = projectActuals;
        newState.allActuals = newAllActuals;

        return { ...newState, isBudgetModalOpen: false, editingEntry: null };
    }
    case 'DELETE_ENTRY_SUCCESS': {
        const { entryId, entryProjectId } = action.payload;
        if (!entryProjectId || entryProjectId === CONSOLIDATED_PROJECT_ID) return state;

        const newAllEntries = { ...state.allEntries };
        newAllEntries[entryProjectId] = (newAllEntries[entryProjectId] || []).filter(e => e.id !== entryId);

        const unsettledStatuses = ['pending', 'partially_paid', 'partially_received'];
        const newAllActuals = { ...state.allActuals };
        newAllActuals[entryProjectId] = (newAllActuals[entryProjectId] || []).filter(actual => 
            !(actual.budgetId === entryId && unsettledStatuses.includes(actual.status))
        );

        return { ...state, allEntries: newAllEntries, allActuals: newAllActuals, isBudgetModalOpen: false, editingEntry: null };
    }
    
    case 'SAVE_ACTUAL_SUCCESS': {
        const { finalActualData, newTier } = action.payload;
        let newState = { ...state };
        if (newTier) {
            newState = { ...newState, tiers: [...newState.tiers, newTier] };
        }
        
        const newAllActuals = { ...newState.allActuals };
        const projectActuals = [...(newAllActuals[finalActualData.projectId] || [])];
        const index = projectActuals.findIndex(a => a.id === finalActualData.id);
        if (index > -1) {
            projectActuals[index] = finalActualData;
        } else {
            projectActuals.push(finalActualData);
        }
        newAllActuals[finalActualData.projectId] = projectActuals;

        return { ...newState, allActuals: newAllActuals, isActualTransactionModalOpen: false, editingActual: null };
    }
    case 'DELETE_ACTUAL_SUCCESS': {
        const actualId = action.payload;
        const newAllActuals = { ...state.allActuals };
        for (const projectId in newAllActuals) {
            const initialLength = newAllActuals[projectId].length;
            newAllActuals[projectId] = (newAllActuals[projectId] || []).filter(a => a.id !== actualId);
            if (newAllActuals[projectId].length < initialLength) break;
        }
        return { ...state, allActuals: newAllActuals };
    }
    case 'RECORD_PAYMENT_SUCCESS': {
        const { updatedActual } = action.payload;
        const newAllActuals = JSON.parse(JSON.stringify(state.allActuals));
        const projectActuals = newAllActuals[updatedActual.project_id];
        const index = projectActuals.findIndex(a => a.id === updatedActual.id);
        if (index > -1) {
            projectActuals[index] = {
                ...projectActuals[index],
                status: updatedActual.status,
                payments: updatedActual.payments
            };
        }
        
        let nextState = { ...state, allActuals: newAllActuals, isPaymentModalOpen: false, payingActual: null };
        
        if (updatedActual.is_provision && updatedActual.status === 'paid') {
            const allProvisionsForBudget = projectActuals.filter(a => a.budgetId === updatedActual.budget_id && a.isProvision);
            const allProvisionsPaid = allProvisionsForBudget.every(p => p.status === 'paid');
            if (allProvisionsPaid) {
                const finalPaymentActual = projectActuals.find(a => a.budgetId === updatedActual.budget_id && a.isFinalProvisionPayment);
                if (finalPaymentActual) {
                    nextState = {
                        ...nextState,
                        infoModal: {
                            isOpen: true,
                            title: 'Provision Terminée !',
                            message: `La provision pour "${finalPaymentActual.description.replace('Paiement final pour: ', '')}" est maintenant complète. Vous pouvez procéder au paiement final auprès de ${finalPaymentActual.thirdParty}.`
                        }
                    };
                }
            }
        }
        return nextState;
    }
    case 'UPDATE_PAYMENT_SUCCESS':
    case 'DELETE_PAYMENT_SUCCESS': {
        const updatedActual = action.payload;
        const newAllActuals = JSON.parse(JSON.stringify(state.allActuals));
        const projectActuals = newAllActuals[updatedActual.project_id];
        const index = projectActuals.findIndex(a => a.id === updatedActual.id);
        if (index > -1) {
            projectActuals[index] = {
                ...projectActuals[index],
                status: updatedActual.status,
                payments: updatedActual.payments
            };
        }
        return { ...state, allActuals: newAllActuals };
    }
    case 'UPDATE_SETTINGS_SUCCESS': {
        const newSettings = action.payload;
        return { ...state, settings: { ...state.settings, ...newSettings } };
    }

    default:
      return state;
  }
};

// --- Context and Provider ---
const BudgetContext = createContext();

export const BudgetProvider = ({ children }) => {
  const [state, dispatch] = useReducer(budgetReducer, getInitialState());

  useEffect(() => {
    if (state.session && !state.profile) {
      const fetchInitialData = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
          const user = state.session.user;
          
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, subscription_status, trial_ends_at, plan_id, currency, display_unit, decimal_places, language, timezone_offset')
            .eq('id', user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') throw profileError;

          const profile = profileData ? {
            id: profileData.id,
            fullName: profileData.full_name,
            subscriptionStatus: profileData.subscription_status,
            trialEndsAt: profileData.trial_ends_at,
            planId: profileData.plan_id,
          } : null;

          if (!profile) {
             console.warn("Profile not found for user, might be a new user.");
             dispatch({ type: 'SET_LOADING', payload: false });
             dispatch({ type: 'SET_INITIAL_DATA', payload: { profile: null, projects: [], settings: initialSettings, allEntries: {}, allActuals: {}, allCashAccounts: {}, tiers: [], notes: [], loans: [], scenarios: [], scenarioEntries: {} } });
             return;
          }

          const settings = {
            currency: profileData.currency || '€',
            displayUnit: profileData.display_unit || 'standard',
            decimalPlaces: profileData.decimal_places ?? 2,
            language: profileData.language || 'fr',
            timezoneOffset: profileData.timezone_offset ?? 0,
          };

          const [
            projectsRes, tiersRes, notesRes, loansRes, scenariosRes, 
            entriesRes, actualsRes, paymentsRes, cashAccountsRes, scenarioEntriesRes
          ] = await Promise.all([
            supabase.from('projects').select('*'),
            supabase.from('tiers').select('*'),
            supabase.from('notes').select('*'),
            supabase.from('loans').select('*'),
            supabase.from('scenarios').select('*'),
            supabase.from('budget_entries').select('*'),
            supabase.from('actual_transactions').select('*'),
            supabase.from('payments').select('*'),
            supabase.from('cash_accounts').select('*'),
            supabase.from('scenario_entries').select('*'),
          ]);

          const responses = { projectsRes, tiersRes, notesRes, loansRes, scenariosRes, entriesRes, actualsRes, paymentsRes, cashAccountsRes, scenarioEntriesRes };
          for (const key in responses) {
            if (responses[key].error) throw responses[key].error;
          }

          const projects = (projectsRes.data || []).map(p => ({
            id: p.id, name: p.name, currency: p.currency, startDate: p.start_date, isArchived: p.is_archived,
            annualGoals: p.annual_goals, expenseTargets: p.expense_targets
          }));
          
          const tiers = (tiersRes.data || []).map(t => ({ id: t.id, name: t.name, type: t.type }));
          const notes = (notesRes.data || []).map(n => ({ id: n.id, content: n.content, color: n.color, x: n.x, y: n.y, isMinimized: n.is_minimized }));
          const loans = (loansRes.data || []).map(l => ({
            id: l.id, projectId: l.project_id, type: l.type, thirdParty: l.third_party, principal: l.principal, term: l.term,
            monthlyPayment: l.monthly_payment, principalDate: l.principal_date, repaymentStartDate: l.repayment_start_date
          }));
          const scenarios = (scenariosRes.data || []).map(s => ({
            id: s.id, projectId: s.project_id, name: s.name, description: s.description, color: s.color, isVisible: s.is_visible, isArchived: s.is_archived
          }));

          const allEntries = (entriesRes.data || []).reduce((acc, entry) => {
            const e = {
              id: entry.id, loanId: entry.loan_id, type: entry.type, category: entry.category, frequency: entry.frequency,
              amount: entry.amount, date: entry.date, startDate: entry.start_date, endDate: entry.end_date,
              supplier: entry.supplier, description: entry.description, isOffBudget: entry.is_off_budget,
              payments: entry.payments,
              provisionDetails: entry.provision_details,
            };
            if (!acc[entry.project_id]) acc[entry.project_id] = [];
            acc[entry.project_id].push(e);
            return acc;
          }, {});

          const allActuals = (actualsRes.data || []).reduce((acc, actual) => {
            const a = {
              id: actual.id, budgetId: actual.budget_id, projectId: actual.project_id, type: actual.type,
              category: actual.category, thirdParty: actual.third_party, description: actual.description,
              date: actual.date, amount: actual.amount, status: actual.status, isOffBudget: actual.is_off_budget,
              isProvision: actual.is_provision, isFinalProvisionPayment: actual.is_final_provision_payment,
              provisionDetails: actual.provision_details, isInternalTransfer: actual.is_internal_transfer,
              payments: (paymentsRes.data || []).filter(p => p.actual_id === actual.id).map(p => ({
                id: p.id, paymentDate: p.payment_date, paidAmount: p.paid_amount, cashAccount: p.cash_account
              }))
            };
            if (!acc[actual.project_id]) acc[actual.project_id] = [];
            acc[actual.project_id].push(a);
            return acc;
          }, {});

          const allCashAccounts = (cashAccountsRes.data || []).reduce((acc, account) => {
            const a = {
              id: account.id, projectId: account.project_id, mainCategoryId: account.main_category_id,
              name: account.name, initialBalance: account.initial_balance, initialBalanceDate: account.initial_balance_date,
              isClosed: account.is_closed, closureDate: account.closure_date
            };
            if (!acc[account.project_id]) acc[account.project_id] = [];
            acc[account.project_id].push(a);
            return acc;
          }, {});

          const scenarioEntries = (scenarioEntriesRes.data || []).reduce((acc, entry) => {
             const e = {
              id: entry.id, type: entry.type, category: entry.category, frequency: entry.frequency,
              amount: entry.amount, date: entry.date, startDate: entry.start_date, endDate: entry.end_date,
              supplier: entry.supplier, description: entry.description, isDeleted: entry.is_deleted,
              payments: entry.payments,
            };
            if (!acc[entry.scenario_id]) acc[entry.scenario_id] = [];
            acc[entry.scenario_id].push(e);
            return acc;
          }, {});

          dispatch({
            type: 'SET_INITIAL_DATA',
            payload: {
              profile,
              settings,
              projects, tiers, notes, loans, scenarios,
              allEntries, allActuals, allCashAccounts, scenarioEntries,
            },
          });

        } catch (error) {
          console.error("Error fetching initial data:", error);
          dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur de chargement des données: ${error.message}`, type: 'error' } });
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      };
      fetchInitialData();
    } else if (!state.session && state.profile) {
      dispatch({ type: 'RESET_STATE' });
    }
  }, [state.session, state.profile, dispatch]);

  return (
    <BudgetContext.Provider value={{ state, dispatch }}>
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = () => {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};

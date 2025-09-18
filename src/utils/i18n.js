import { useBudget } from '../context/BudgetContext';

const translations = {
  fr: {
    nav: {
        treasury: 'Trésorerie',
        payables: 'Sorties',
        receivables: 'Entrées',
        expenseAnalysis: 'Analyse',
        budgetJournal: 'Journal du Budget',
        paymentJournal: 'Journal des Paiements',
        settingsAdvanced: 'Avancés',
    },
    sidebar: {
        settings: 'Paramètres',
        analysisUnit: "Unité d'analyse",
        horizon: 'Horizon',
        currency: 'Devise',
        unit: 'Unité',
        decimals: 'Décimales',
        language: 'Langue',
        day: 'Jour',
        week: 'Semaine',
        fortnightly: 'Quinzaine',
        month: 'Mois',
        bimonthly: 'Bimestre',
        quarterly: 'Trimestre',
        semiannually: 'Semestre',
        annually: 'Année',
        standard: 'Standard',
        thousands: 'Milliers (K)',
        millions: 'Millions (M)',
    },
    advancedSettings: {
        categories: 'Catégories',
        tiers: 'Tiers',
        accounts: 'Comptes',
        exchangeRates: 'Taux de change',
        archives: 'Archives',
    },
    common: {
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        edit: 'Modifier',
        add: 'Ajouter',
        new: 'Nouveau',
        confirm: 'Êtes-vous sûr ?',
        projectName: 'Nom du projet',
    },
    subHeader: {
        consolidatedBudget: 'Mes projets consolidé',
        newProject: 'Nouveau projet',
    },
    onboarding: {
        mainTitle: 'Votre Projet Trezocash',
        projectType: 'Type de projet',
        useCasePersonal: 'Suivi Personnel',
        useCaseBusiness: 'Petite Entreprise',
        projectName: 'Nom du projet',
        currency: 'Devise',
        monthlyIncomeGoal: "Objectif d'entrée mensuel",
        monthlyExpenseGoal: "Objectif de sortie mensuel",
        startingCash: 'Trésorerie de départ',
        configuredIncomes: 'Total entrées configurées',
        configuredExpenses: 'Total sorties configurées',
        canChangeLater: 'Vous pourrez modifier tous ces paramètres plus tard.',
        welcomeTitle: 'Bienvenue ! À quoi servira Trezocash ?',
        welcomePersonalTitle: 'Suivi Personnel',
        welcomePersonalDesc: 'Pour gérer mon budget, mes économies et mes dépenses du quotidien.',
        welcomeBusinessTitle: 'Petite Entreprise',
        welcomeBusinessDesc: "Pour piloter la trésorerie de mon activité, suivre les factures et anticiper.",
        projectNameTitle: "Comment s'appelle votre projet ?",
        projectNamePlaceholder: 'Ex: Mon Budget 2025, Trésorerie SARL...',
        currencyTitle: 'Quelle est la devise principale de ce projet ?',
        currencyDesc: 'Vous pourrez gérer les taux de change plus tard.',
        other: 'Autre...',
        goalsTitle: 'Quels sont vos objectifs financiers mensuels ?',
        goalsDesc: 'Indiquez vos prévisions. Cela nous aidera à configurer vos objectifs annuels.',
        goalsIncomeLabel: 'Entrée mensuelle prévue',
        goalsExpenseLabel: 'Objectif de sortie mensuelle',
        initialCashTitle: 'Votre trésorerie de départ',
        initialCashDesc: "Listez vos comptes et leur solde actuel. Vous pourrez en ajouter d'autres plus tard.",
        addAccount: 'Ajouter un compte',
        entriesTitle: "Quelles sont vos principales entrées d'argent ?",
        entriesDesc: "Ajoutez quelques éléments pour commencer. Vous pourrez tout modifier plus tard.",
        expensesTitle: 'Parlons de vos dépenses en "{categoryName}"',
        addRow: 'Ajouter une ligne',
        finishTitle: 'Tout est prêt !',
        finishDesc: 'Votre premier projet est prêt à être lancé. Vous pourrez affiner ces informations plus tard.',
        launchApp: "Lancer l'application",
        previous: 'Précédent',
        next: 'Suivant',
        finishSetup: 'Terminer la configuration',
    },
  },
  en: {
    nav: {
        treasury: 'Treasury',
        payables: 'Payables',
        receivables: 'Receivables',
        expenseAnalysis: 'Analysis',
        budgetJournal: 'Budget Journal',
        paymentJournal: 'Payment Journal',
        settingsAdvanced: 'Advanced',
    },
    sidebar: {
        settings: 'Settings',
        analysisUnit: 'Analysis Unit',
        horizon: 'Horizon',
        currency: 'Currency',
        unit: 'Unit',
        decimals: 'Decimals',
        language: 'Language',
        day: 'Day',
        week: 'Week',
        fortnightly: 'Fortnight',
        month: 'Month',
        bimonthly: 'Bimonthly',
        quarterly: 'Quarterly',
        semiannually: 'Semiannually',
        annually: 'Annually',
        standard: 'Standard',
        thousands: 'Thousands (K)',
        millions: 'Millions (M)',
    },
    advancedSettings: {
        categories: 'Categories',
        tiers: 'Tiers',
        accounts: 'Accounts',
        exchangeRates: 'Exchange Rates',
        archives: 'Archives',
    },
    common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        new: 'New',
        confirm: 'Are you sure?',
        projectName: 'Project Name',
    },
    subHeader: {
        consolidatedBudget: 'Consolidated Project',
        newProject: 'New Project',
    },
    onboarding: {
        mainTitle: 'Your Trezocash Project',
        projectType: 'Project type',
        useCasePersonal: 'Personal Tracking',
        useCaseBusiness: 'Small Business',
        projectName: 'Project name',
        currency: 'Currency',
        monthlyIncomeGoal: 'Monthly income goal',
        monthlyExpenseGoal: 'Monthly expense goal',
        startingCash: 'Starting cash balance',
        configuredIncomes: 'Total configured incomes',
        configuredExpenses: 'Total configured expenses',
        canChangeLater: 'You can change all these settings later.',
        welcomeTitle: "Welcome! What will you use Trezocash for?",
        welcomePersonalTitle: 'Personal Tracking',
        welcomePersonalDesc: 'To manage my budget, my savings, and my daily expenses.',
        welcomeBusinessTitle: 'Small Business',
        welcomeBusinessDesc: 'To manage my business cash flow, track invoices, and forecast.',
        projectNameTitle: "What is your project's name?",
        projectNamePlaceholder: 'E.g., My 2025 Budget, My Company Cashflow...',
        currencyTitle: 'What is the main currency for this project?',
        currencyDesc: 'You can manage exchange rates later.',
        other: 'Other...',
        goalsTitle: 'What are your monthly financial goals?',
        goalsDesc: 'Enter your forecasts. This will help set up your annual goals.',
        goalsIncomeLabel: 'Planned monthly income',
        goalsExpenseLabel: 'Monthly expense goal',
        initialCashTitle: 'Your starting cash position',
        initialCashDesc: 'List your accounts and their current balance. You can add more later.',
        addAccount: 'Add an account',
        entriesTitle: 'What are your main sources of income?',
        entriesDesc: 'Add a few items to get started. You can change everything later.',
        expensesTitle: 'Let\'s talk about your "{categoryName}" expenses',
        addRow: 'Add a row',
        finishTitle: 'All set!',
        finishDesc: 'Your first project is ready to go. You can fine-tune these details later.',
        launchApp: 'Launch the application',
        previous: 'Previous',
        next: 'Next',
        finishSetup: 'Finish Setup',
    },
  }
};

export const useTranslation = () => {
    const { state } = useBudget();
    const lang = state.settings?.language || 'fr';

    const t = (key, params = {}) => {
        const keys = key.split('.');
        let result = translations[lang];
        for (const k of keys) {
            result = result?.[k];
            if (result === undefined) return key;
        }
        
        if (typeof result === 'string' && Object.keys(params).length > 0) {
            return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
                return str.replace(`{${paramKey}}`, paramValue);
            }, result);
        }

        return result;
    };

    return { t, lang };
};

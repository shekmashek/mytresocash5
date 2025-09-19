import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { supabase } from '../utils/supabase';
import { Save, User, Shield, CreditCard, FileText, HelpCircle, LogOut, Table, ArrowDownUp, HandCoins, PieChart, Layers, BookOpen, Cog, Users, FolderKanban, Wallet, Archive, Clock, FolderCog, Globe, Target, Calendar, Plus, FilePlus, Banknote, Maximize, AreaChart, Receipt, Hash, LayoutDashboard, Trash2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../utils/i18n';
import ProjectSwitcher from './ProjectSwitcher';
import FlagIcon from './FlagIcon';
import { useNavigate, useLocation } from 'react-router-dom';
import SubscriptionBadge from './SubscriptionBadge';

const SettingsLink = ({ item, onClick }) => {
  const Icon = item.icon;
  return (
    <li title={item.label}>
      <button 
        onClick={onClick} 
        disabled={item.disabled}
        className={`flex items-center w-full h-10 px-4 rounded-lg text-sm font-medium transition-colors text-text-secondary hover:bg-secondary-100 hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Icon className={`w-5 h-5 shrink-0 ${item.color}`} />
        <span className={`ml-4`}>
          {item.label}
        </span>
      </button>
    </li>
  );
};

const SubHeader = ({ onOpenSettingsDrawer, onNewBudgetEntry, onNewScenario, isConsolidated }) => {
  const { state, dispatch } = useBudget();
  const { settings, isTourActive, tourHighlightId, profile, session } = state;
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLangPopoverOpen, setIsLangPopoverOpen] = useState(false);
  const langPopoverRef = useRef(null);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsPopoverRef = useRef(null);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const newMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langPopoverRef.current && !langPopoverRef.current.contains(event.target)) setIsLangPopoverOpen(false);
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) setIsAvatarMenuOpen(false);
      if (settingsPopoverRef.current && !settingsPopoverRef.current.contains(event.target)) setIsSettingsOpen(false);
      if (newMenuRef.current && !newMenuRef.current.contains(event.target)) setIsNewMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageChange = (newLang) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { ...settings, language: newLang } });
    setIsLangPopoverOpen(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur lors de la déconnexion: ${error.message}`, type: 'error' } });
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    setIsSettingsOpen(false);
    setIsAvatarMenuOpen(false);
  };

  const handleFocusClick = () => {
    const currentView = location.pathname.split('/')[2] || 'dashboard';
    let focusTarget;
    switch (currentView) {
        case 'analyse': focusTarget = 'expenseAnalysis'; break;
        case 'echeancier': focusTarget = 'schedule'; break;
        case 'flux': focusTarget = 'chart'; break;
        case 'scenarios': focusTarget = 'scenarios'; break;
        default: focusTarget = 'table'; break;
    }
    dispatch({ type: 'SET_FOCUS_VIEW', payload: focusTarget });
  };

  const menuItems = [
    { title: 'Mon profil', icon: User, path: '/app/profil' },
    { title: 'Mot de passe et sécurité', icon: Shield, path: '/app/securite' },
    { title: 'Mon abonnement', icon: CreditCard, path: '/app/abonnement' },
    { title: 'Factures', icon: FileText, path: '/app/factures' },
    { title: 'Supprimer mon compte', icon: Trash2, path: '/app/delete-account', isDestructive: true },
    { title: 'Centre d\'aide', icon: HelpCircle, path: '/app/aide' },
  ];

  const advancedNavItems = [
    { id: 'journal-budget', label: t('nav.budgetJournal'), icon: BookOpen, color: 'text-yellow-600', path: '/app/journal-budget' },
    { id: 'journal-paiements', label: t('nav.paymentJournal'), icon: Receipt, color: 'text-blue-600', path: '/app/journal-paiements' },
  ];

  const settingsItems = [
    { id: 'projectSettings', label: 'Paramètres du Projet', icon: FolderCog, color: 'text-blue-500' },
    { id: '/app/display-settings', label: 'Affichage et Devise', icon: Eye, color: 'text-green-500' },
    { id: 'categoryManagement', label: t('advancedSettings.categories'), icon: FolderKanban, color: 'text-orange-500' },
    { id: 'tiersManagement', label: t('advancedSettings.tiers'), icon: Users, color: 'text-pink-500' },
    { id: 'cashAccounts', label: t('advancedSettings.accounts'), icon: Wallet, color: 'text-teal-500' },
    { id: 'timezoneSettings', label: 'Fuseau Horaire', icon: Globe, color: 'text-cyan-500' },
    { id: 'archives', label: t('advancedSettings.archives'), icon: Archive, color: 'text-secondary-500' },
  ];

  const newMenuItems = [
    { label: 'Budget prévisionnel', icon: FilePlus, action: onNewBudgetEntry, disabled: isConsolidated, tooltip: isConsolidated ? "Non disponible en vue consolidée" : "Ajouter une nouvelle entrée ou sortie prévisionnelle" },
    { label: 'Entrée reçue', icon: HandCoins, action: () => dispatch({ type: 'OPEN_DIRECT_PAYMENT_MODAL', payload: 'receivable' }), disabled: isConsolidated, tooltip: isConsolidated ? "Non disponible en vue consolidée" : "Encaisser directement des entrées" },
    { label: 'Sortie payée', icon: Banknote, action: () => dispatch({ type: 'OPEN_DIRECT_PAYMENT_MODAL', payload: 'payable' }), disabled: isConsolidated, tooltip: isConsolidated ? "Non disponible en vue consolidée" : "Payer directement des sorties" },
    { label: 'Scénario', icon: Layers, action: onNewScenario, disabled: isConsolidated, tooltip: isConsolidated ? "Non disponible en vue consolidée" : "Créer une nouvelle simulation financière" },
    { label: 'Nouvelle Note', icon: FileText, action: () => dispatch({ type: 'ADD_NOTE' }), disabled: false, tooltip: "Ajouter une note épinglée sur l'écran" },
    { label: 'Compte de liquidité', icon: Wallet, action: () => onOpenSettingsDrawer('cashAccounts'), disabled: isConsolidated, tooltip: isConsolidated ? "Non disponible en vue consolidée" : "Ajouter un nouveau compte bancaire, caisse, etc." }
  ];

  const handleSettingsItemClick = (itemId) => {
    if (itemId.startsWith('/app/')) {
        handleNavigate(itemId);
    } else if (typeof onOpenSettingsDrawer === 'function') {
      onOpenSettingsDrawer(itemId);
    }
    setIsSettingsOpen(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/app/dashboard' },
    { id: 'trezo', label: 'Trezo', path: '/app/trezo' },
    { id: 'flux', label: 'Flux', path: '/app/flux' },
    { id: 'echeancier', label: 'Echeancier', path: '/app/echeancier' },
    { id: 'scenarios', label: 'Scénarios', path: '/app/scenarios' },
    { id: 'analyse', label: 'Analyse', path: '/app/analyse' },
  ];
  
  const isProjectSwitcherHighlighted = isTourActive && tourHighlightId === '#project-switcher';

  const subscriptionDetails = useMemo(() => {
    if (!profile) return null;
    const status = profile.subscriptionStatus;
    if (status === 'lifetime') return 'Statut : Accès à Vie';
    if (status === 'active') {
        return 'Statut : Abonnement Pro';
    }
    const trialEndDate = profile.trialEndsAt ? new Date(profile.trialEndsAt) :
                         session?.user?.created_at ? new Date(new Date(session.user.created_at).setDate(new Date(session.user.created_at).getDate() + 14)) : null;
    if (trialEndDate) {
        const daysLeft = Math.max(0, Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
        if (daysLeft > 0) {
            return `Statut : Essai gratuit (${daysLeft} jours restants)`;
        }
    }
    return 'Statut : Essai terminé';
  }, [profile, session]);

  return (
    <>
      <div className="sticky top-0 z-30 bg-gray-100 border-b border-gray-200">
        <div className="container mx-auto px-6 py-2 flex w-full items-center justify-between">
          
          <div className="flex-1 flex justify-start">
            <div id="project-switcher" className={`w-64 flex-shrink-0 rounded-lg transition-all ${isProjectSwitcherHighlighted ? 'relative z-[1000] ring-4 ring-blue-500 ring-offset-4 ring-offset-black/60' : ''}`}>
              <ProjectSwitcher />
            </div>
          </div>

          <div className="flex-shrink-0">
            <nav className="flex items-center gap-1">
              {navItems.map(item => {
                const isActive = location.pathname === item.path;
                const isHighlighted = isTourActive && tourHighlightId === `#tour-step-${item.id}`;
                return (
                  <button
                    key={item.id}
                    id={`tour-step-${item.id}`}
                    onClick={() => handleNavigate(item.path)}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                    } ${isHighlighted ? 'relative z-[1000] ring-4 ring-blue-500 ring-offset-4 ring-offset-black/60' : ''}`}
                    title={item.label}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-4">
              <div className="relative" ref={newMenuRef}>
                  <button
                      onClick={() => setIsNewMenuOpen(p => !p)}
                      className="flex items-center gap-2 px-3 h-9 rounded-md bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
                      title="Créer"
                  >
                      <Plus className="w-4 h-4" />
                      Nouveau
                  </button>
                  <AnimatePresence>
                      {isNewMenuOpen && (
                          <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: -10 }}
                              className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border z-20"
                          >
                              <ul className="p-2">
                                  {newMenuItems.map(item => (
                                      <li key={item.label}>
                                          <button
                                              onClick={() => { if (!item.disabled) { item.action(); setIsNewMenuOpen(false); } }}
                                              disabled={item.disabled}
                                              title={item.tooltip}
                                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                          >
                                              <item.icon className="w-4 h-4 text-gray-500" />
                                              <span>{item.label}</span>
                                          </button>
                                      </li>
                                  ))}
                              </ul>
                          </motion.div>
                      )}
                  </AnimatePresence>
              </div>
              <div className="flex items-center gap-2">
                  <div className="relative" ref={langPopoverRef}>
                      <button
                          onClick={() => setIsLangPopoverOpen(p => !p)}
                          className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                          title="Changer la langue"
                      >
                          <FlagIcon lang={lang} className="w-6 h-auto rounded-sm" />
                      </button>
                      <AnimatePresence>
                      {isLangPopoverOpen && (
                          <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border z-20 p-1"
                          >
                              <button onClick={() => handleLanguageChange('fr')} className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-gray-100 flex items-center gap-3">
                                  <FlagIcon lang="fr" className="w-5 h-auto rounded-sm" />
                                  Français
                              </button>
                              <button onClick={() => handleLanguageChange('en')} className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-gray-100 flex items-center gap-3">
                                  <FlagIcon lang="en" className="w-5 h-auto rounded-sm" />
                                  English
                              </button>
                          </motion.div>
                      )}
                      </AnimatePresence>
                  </div>
                  <div className="relative" ref={settingsPopoverRef}>
                      <button
                          onClick={() => setIsSettingsOpen(p => !p)}
                          className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                          title="Paramètres avancés"
                      >
                          <Cog className="w-5 h-5" />
                      </button>
                      <AnimatePresence>
                          {isSettingsOpen && (
                              <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                  className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border z-20"
                              >
                                  <div className="p-2">
                                    <ul className="space-y-1">
                                      {advancedNavItems.map(item => (
                                        <SettingsLink 
                                          key={item.id} 
                                          item={item} 
                                          onClick={() => handleNavigate(item.path)} 
                                        />
                                      ))}
                                    </ul>
                                    <hr className="my-2" />
                                    <ul className="space-y-1">
                                      {settingsItems.map(item => (
                                        <SettingsLink 
                                          key={item.id} 
                                          item={item} 
                                          onClick={() => handleSettingsItemClick(item.id)} 
                                        />
                                      ))}
                                    </ul>
                                  </div>
                              </motion.div>
                          )}
                      </AnimatePresence>
                  </div>
                  <div className="flex items-center gap-2">
                    <SubscriptionBadge />
                    <div className="relative" ref={avatarMenuRef}>
                        <button 
                            onClick={() => setIsAvatarMenuOpen(p => !p)}
                            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                            title="Profil utilisateur"
                        >
                            <User className="w-5 h-5" />
                        </button>
                        <AnimatePresence>
                            {isAvatarMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                    className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border z-20"
                                >
                                    <div className="px-4 py-3 border-b">
                                        <p className="text-sm font-semibold text-gray-800">{state.profile?.fullName || 'Utilisateur'}</p>
                                        <p className="text-xs text-gray-500 truncate">{state.session?.user?.email}</p>
                                        {subscriptionDetails && <p className="text-xs font-semibold text-blue-600 mt-1">{subscriptionDetails}</p>}
                                    </div>
                                    <div className="p-1">
                                        {menuItems.map((item) => (
                                            <button 
                                                key={item.title}
                                                onClick={() => handleNavigate(item.path)}
                                                className={`w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md ${
                                                    item.isDestructive 
                                                    ? 'text-red-600 hover:bg-red-50' 
                                                    : 'text-gray-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                <item.icon className="w-4 h-4" />
                                                <span>{item.title}</span>
                                            </button>
                                        ))}
                                        <div className="h-px bg-gray-200 my-1 mx-1"></div>
                                        <button 
                                            onClick={handleLogout}
                                            className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span>Se déconnecter</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                  </div>
                  <button
                      onClick={handleFocusClick}
                      className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                      title="Focus"
                  >
                      <Maximize className="w-5 h-5" />
                  </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubHeader;

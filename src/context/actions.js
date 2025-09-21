import { supabase } from '../utils/supabase';
import { deriveActualsFromEntry } from '../utils/scenarioCalculations';

export const initializeProject = async (dispatch, payload, user, currency) => {
  try {
    const { projectName, projectStartDate } = payload;
    
    const { data: newProjectId, error: rpcError } = await supabase.rpc('handle_new_project', {
        project_name: projectName,
        project_start_date: projectStartDate,
        project_currency: currency
    });

    if (rpcError) throw rpcError;

    // Fetch the newly created project and its default cash account to update the state
    const { data: newProjectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', newProjectId)
        .single();
    if (projectError) throw projectError;

    const { data: newCashAccountsData, error: cashAccountsError } = await supabase
        .from('cash_accounts')
        .select('*')
        .eq('project_id', newProjectId);
    if (cashAccountsError) throw cashAccountsError;

    dispatch({ 
        type: 'INITIALIZE_PROJECT_SUCCESS', 
        payload: {
            newProject: {
                id: newProjectData.id, name: newProjectData.name, currency: newProjectData.currency,
                startDate: newProjectData.start_date, isArchived: newProjectData.is_archived,
                annualGoals: newProjectData.annual_goals, expenseTargets: newProjectData.expense_targets
            },
            finalCashAccounts: newCashAccountsData.map(acc => ({
                id: acc.id, projectId: acc.project_id, mainCategoryId: acc.main_category_id,
                name: acc.name, initialBalance: acc.initial_balance, initialBalanceDate: acc.initial_balance_date,
                isClosed: acc.is_closed, closureDate: acc.closure_date,
            })),
            newAllEntries: [],
            newAllActuals: [],
            newTiers: [],
            newLoans: [],
        }
    });
    
  } catch (error) {
    console.error("Onboarding failed:", error);
    dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur lors de la création du projet: ${error.message}`, type: 'error' } });
    throw error;
  }
};

export const saveEntry = async (dispatch, { entryData, editingEntry, activeProjectId, tiers, user, cashAccounts }) => {
    try {
        const { supplier, type } = entryData;
        const tierType = type === 'revenu' ? 'client' : 'fournisseur';
        const existingTier = tiers.find(t => t.name.toLowerCase() === supplier.toLowerCase());
        let newTierData = null;

        if (!existingTier && supplier) {
            const { data: insertedTier, error: tierError } = await supabase
                .from('tiers')
                .upsert({ name: supplier, type: tierType, user_id: user.id }, { onConflict: 'user_id,name,type' })
                .select()
                .single();
            if (tierError) throw tierError;
            newTierData = insertedTier;
        }

        const finalEntryDataForDB = {
            project_id: activeProjectId,
            user_id: user.id,
            type: entryData.type,
            category: entryData.category,
            frequency: entryData.frequency,
            amount: entryData.amount,
            date: entryData.date,
            start_date: entryData.startDate,
            end_date: entryData.endDate,
            supplier: entryData.supplier,
            description: entryData.description,
            is_off_budget: entryData.isOffBudget || false,
            payments: entryData.payments,
            provision_details: entryData.provisionDetails,
        };

        let savedEntryFromDB;
        if (editingEntry) {
            const { data, error } = await supabase
                .from('budget_entries')
                .update(finalEntryDataForDB)
                .eq('id', editingEntry.id)
                .select()
                .single();
            if (error) throw error;
            savedEntryFromDB = data;
        } else {
            const { data, error } = await supabase
                .from('budget_entries')
                .insert(finalEntryDataForDB)
                .select()
                .single();
            if (error) throw error;
            savedEntryFromDB = data;
        }
        
        const unsettledStatuses = ['pending', 'partially_paid', 'partially_received'];
        const { error: deleteError } = await supabase
            .from('actual_transactions')
            .delete()
            .eq('budget_id', savedEntryFromDB.id)
            .in('status', unsettledStatuses);
        if (deleteError) throw deleteError;

        const savedEntryForClient = {
            id: savedEntryFromDB.id,
            loanId: savedEntryFromDB.loan_id,
            type: savedEntryFromDB.type,
            category: savedEntryFromDB.category,
            frequency: savedEntryFromDB.frequency,
            amount: savedEntryFromDB.amount,
            date: savedEntryFromDB.date,
            startDate: savedEntryFromDB.start_date,
            endDate: savedEntryFromDB.end_date,
            supplier: savedEntryFromDB.supplier,
            description: savedEntryFromDB.description,
            isOffBudget: savedEntryFromDB.is_off_budget,
            payments: savedEntryFromDB.payments,
            provisionDetails: savedEntryFromDB.provision_details,
        };

        const newActuals = deriveActualsFromEntry(savedEntryForClient, activeProjectId, cashAccounts);
        
        if (newActuals.length > 0) {
            const { error: insertError } = await supabase
                .from('actual_transactions')
                .insert(newActuals.map(a => ({
                    id: a.id,
                    budget_id: a.budgetId,
                    project_id: a.projectId,
                    user_id: user.id,
                    type: a.type,
                    category: a.category,
                    third_party: a.thirdParty,
                    description: a.description,
                    date: a.date,
                    amount: a.amount,
                    status: a.status,
                    is_off_budget: a.isOffBudget,
                    is_provision: a.isProvision,
                    is_final_provision_payment: a.isFinalProvisionPayment,
                    provision_details: a.provisionDetails,
                    is_internal_transfer: a.isInternalTransfer,
                })));
            if (insertError) throw insertError;
        }

        dispatch({
            type: 'SAVE_ENTRY_SUCCESS',
            payload: {
                savedEntry: savedEntryForClient,
                newActuals: newActuals,
                targetProjectId: activeProjectId,
                newTier: newTierData ? { id: newTierData.id, name: newTierData.name, type: newTierData.type } : null,
            }
        });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Entrée budgétaire enregistrée.', type: 'success' } });

    } catch (error) {
        console.error("Error saving entry:", error);
        dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur lors de l'enregistrement: ${error.message}`, type: 'error' } });
    }
};

export const updateSettings = async (dispatch, user, newSettings) => {
    if (!user) {
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Utilisateur non authentifié.', type: 'error' } });
        return;
    }
    try {
        const updates = {
            currency: newSettings.currency,
            display_unit: newSettings.displayUnit,
            decimal_places: newSettings.decimalPlaces,
            language: newSettings.language,
            timezone_offset: newSettings.timezoneOffset
        };

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;

        const updatedSettings = {
            currency: data.currency,
            displayUnit: data.display_unit,
            decimalPlaces: data.decimal_places,
            language: data.language,
            timezoneOffset: data.timezone_offset,
        };
        dispatch({ type: 'UPDATE_SETTINGS_SUCCESS', payload: updatedSettings });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Préférences mises à jour.', type: 'success' } });
    } catch (error) {
        console.error("Error updating settings:", error);
        dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
    }
};

export const updateUserCashAccount = async (dispatch, { projectId, accountId, accountData }) => {
    try {
        const updates = {
            name: accountData.name,
            initial_balance: accountData.initialBalance,
            initial_balance_date: accountData.initialBalanceDate,
        };

        const { data, error } = await supabase
            .from('cash_accounts')
            .update(updates)
            .eq('id', accountId)
            .select()
            .single();

        if (error) throw error;

        dispatch({
            type: 'UPDATE_USER_CASH_ACCOUNT_SUCCESS',
            payload: {
                projectId,
                accountId,
                accountData: {
                    name: data.name,
                    initialBalance: data.initial_balance,
                    initialBalanceDate: data.initial_balance_date,
                }
            }
        });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Compte mis à jour.', type: 'success' } });
    } catch (error) {
        console.error("Error updating cash account:", error);
        dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
    }
};

export const addUserCashAccount = async (dispatch, { projectId, mainCategoryId, name, initialBalance, initialBalanceDate, user }) => {
    try {
        const { data: newAccount, error } = await supabase
            .from('cash_accounts')
            .insert({
                project_id: projectId,
                user_id: user.id,
                main_category_id: mainCategoryId,
                name,
                initial_balance: initialBalance,
                initial_balance_date: initialBalanceDate,
            })
            .select()
            .single();

        if (error) throw error;

        dispatch({
            type: 'ADD_USER_CASH_ACCOUNT_SUCCESS',
            payload: {
                projectId,
                newAccount: {
                    id: newAccount.id,
                    projectId: newAccount.project_id,
                    mainCategoryId: newAccount.main_category_id,
                    name: newAccount.name,
                    initialBalance: newAccount.initial_balance,
                    initialBalanceDate: newAccount.initial_balance_date,
                    isClosed: newAccount.is_closed,
                    closureDate: newAccount.closure_date,
                }
            }
        });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Compte ajouté avec succès.', type: 'success' } });
    } catch (error) {
        console.error("Error adding cash account:", error);
        dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
    }
};

export const deleteUserCashAccount = async (dispatch, { projectId, accountId }) => {
    try {
        const { error } = await supabase
            .from('cash_accounts')
            .delete()
            .eq('id', accountId);

        if (error) throw error;

        dispatch({
            type: 'DELETE_USER_CASH_ACCOUNT_SUCCESS',
            payload: { projectId, accountId }
        });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Compte supprimé.', type: 'success' } });
    } catch (error) {
        console.error("Error deleting cash account:", error);
        dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
    }
};

export const closeCashAccount = async (dispatch, { projectId, accountId, closureDate }) => {
    try {
        const { error } = await supabase
            .from('cash_accounts')
            .update({ is_closed: true, closure_date: closureDate })
            .eq('id', accountId);

        if (error) throw error;

        dispatch({ type: 'CLOSE_CASH_ACCOUNT_SUCCESS', payload: { projectId, accountId, closureDate } });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Compte clôturé.', type: 'success' } });
    } catch (error) {
        console.error("Error closing cash account:", error);
        dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
    }
};

export const reopenCashAccount = async (dispatch, { projectId, accountId }) => {
    try {
        const { error } = await supabase
            .from('cash_accounts')
            .update({ is_closed: false, closure_date: null })
            .eq('id', accountId);

        if (error) throw error;

        dispatch({ type: 'REOPEN_CASH_ACCOUNT_SUCCESS', payload: { projectId, accountId } });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Compte ré-ouvert.', type: 'success' } });
    } catch (error) {
        console.error("Error reopening cash account:", error);
        dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
    }
};

export const saveActual = async (dispatch, { actualData, editingActual, user, tiers }) => {
  try {
    const { thirdParty, type } = actualData;
    const tierType = type === 'receivable' ? 'client' : 'fournisseur';
    let newTierData = null;

    const existingTier = tiers.find(t => t.name.toLowerCase() === thirdParty.toLowerCase());
    if (!existingTier && thirdParty) {
      const { data: insertedTier, error: tierError } = await supabase
        .from('tiers')
        .upsert({ name: thirdParty, type: tierType, user_id: user.id }, { onConflict: 'user_id,name,type' })
        .select().single();
      if (tierError) throw tierError;
      newTierData = insertedTier;
    }
    
    const dataToSave = {
      project_id: actualData.projectId,
      user_id: user.id,
      type: actualData.type,
      category: actualData.category,
      third_party: actualData.thirdParty,
      description: actualData.description,
      date: actualData.date,
      amount: actualData.amount,
      status: actualData.status,
      is_off_budget: actualData.isOffBudget,
    };

    let savedActual;
    if (editingActual) {
      const { data, error } = await supabase.from('actual_transactions').update(dataToSave).eq('id', editingActual.id).select().single();
      if (error) throw error;
      savedActual = data;
    } else {
      const { data, error } = await supabase.from('actual_transactions').insert(dataToSave).select().single();
      if (error) throw error;
      savedActual = data;
    }

    const finalActualData = {
        id: savedActual.id,
        budgetId: savedActual.budget_id,
        projectId: savedActual.project_id,
        type: savedActual.type,
        category: savedActual.category,
        thirdParty: savedActual.third_party,
        description: savedActual.description,
        date: savedActual.date,
        amount: savedActual.amount,
        status: savedActual.status,
        isOffBudget: savedActual.is_off_budget,
        payments: []
    };

    dispatch({
      type: 'SAVE_ACTUAL_SUCCESS',
      payload: {
        finalActualData,
        newTier: newTierData ? { id: newTierData.id, name: newTierData.name, type: newTierData.type } : null,
      }
    });
    dispatch({ type: 'ADD_TOAST', payload: { message: 'Transaction enregistrée.', type: 'success' } });

  } catch (error) {
    console.error("Error saving actual transaction:", error);
    dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
  }
};

export const deleteActual = async (dispatch, actualId) => {
    try {
        const { error } = await supabase.from('actual_transactions').delete().eq('id', actualId);
        if (error) throw error;
        dispatch({ type: 'DELETE_ACTUAL_SUCCESS', payload: actualId });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Transaction supprimée.', type: 'success' } });
    } catch (error) {
        console.error("Error deleting actual:", error);
        dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
    }
};

export const recordPayment = async (dispatch, { actualId, paymentData, allActuals }) => {
    try {
        const { data: payment, error: paymentError } = await supabase.from('payments').insert({
            actual_id: actualId,
            payment_date: paymentData.paymentDate,
            paid_amount: paymentData.paidAmount,
            cash_account: paymentData.cashAccount,
        }).select().single();
        if (paymentError) throw paymentError;

        const actual = Object.values(allActuals).flat().find(a => a.id === actualId);
        const totalPaid = (actual.payments || []).reduce((sum, p) => sum + p.paidAmount, 0) + paymentData.paidAmount;
        let newStatus = actual.status;
        if (paymentData.isFinalPayment || totalPaid >= actual.amount) {
            newStatus = actual.type === 'payable' ? 'paid' : 'received';
        } else if (totalPaid > 0) {
            newStatus = actual.type === 'payable' ? 'partially_paid' : 'partially_received';
        }

        const { data: updatedActual, error: actualError } = await supabase
            .from('actual_transactions')
            .update({ status: newStatus })
            .eq('id', actualId)
            .select('*, payments(*)')
            .single();
        if (actualError) throw actualError;

        dispatch({ type: 'RECORD_PAYMENT_SUCCESS', payload: { updatedActual } });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Paiement enregistré.', type: 'success' } });
    } catch (error) {
        console.error("Error recording payment:", error);
        dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
    }
};

export const writeOffActual = async (dispatch, actualId) => {
    try {
        const { data: updatedActual, error } = await supabase
            .from('actual_transactions')
            .update({ 
                status: 'written_off',
                description: `(Write-off) ${new Date().toLocaleDateString()}` 
            })
            .eq('id', actualId)
            .select()
            .single();

        if (error) throw error;
        
        dispatch({ type: 'WRITE_OFF_ACTUAL_SUCCESS', payload: updatedActual });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Transaction passée en perte.', type: 'success' } });

    } catch (error) {
        console.error("Error writing off actual:", error);
        dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
    }
};

export const saveConsolidatedView = async (dispatch, { viewData, editingView, user }) => {
    try {
        const dataToSave = {
            name: viewData.name,
            description: viewData.description,
            project_ids: viewData.projectIds,
            user_id: user.id,
        };

        let savedView;
        if (editingView) {
            const { data, error } = await supabase
                .from('consolidated_views')
                .update(dataToSave)
                .eq('id', editingView.id)
                .select()
                .single();
            if (error) throw error;
            savedView = data;
            dispatch({ type: 'UPDATE_CONSOLIDATED_VIEW_SUCCESS', payload: savedView });
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Vue consolidée mise à jour.', type: 'success' } });
        } else {
            const { data, error } = await supabase
                .from('consolidated_views')
                .insert(dataToSave)
                .select()
                .single();
            if (error) throw error;
            savedView = data;
            dispatch({ type: 'ADD_CONSOLIDATED_VIEW_SUCCESS', payload: savedView });
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Vue consolidée créée.', type: 'success' } });
        }
        dispatch({ type: 'CLOSE_CONSOLIDATED_VIEW_MODAL' });

    } catch (error) {
        console.error("Error saving consolidated view:", error);
        dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
    }
};

export const deleteConsolidatedView = async (dispatch, viewId) => {
    try {
        const { error } = await supabase
            .from('consolidated_views')
            .delete()
            .eq('id', viewId);
        
        if (error) throw error;

        dispatch({ type: 'DELETE_CONSOLIDATED_VIEW_SUCCESS', payload: viewId });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Vue consolidée supprimée.', type: 'success' } });

    } catch (error) {
        console.error("Error deleting consolidated view:", error);
        dispatch({ type: 'ADD_TOAST', payload: { message: `Erreur: ${error.message}`, type: 'error' } });
    }
};

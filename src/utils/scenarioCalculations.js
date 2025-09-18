import { v4 as uuidv4 } from 'uuid';
import { getEntryAmountForMonth } from './budgetCalculations';

const addMonths = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) {
    d.setDate(0);
  }
  return d;
};

export const resolveScenarioEntries = (baseEntries, scenarioDeltas) => {
    if (!scenarioDeltas || scenarioDeltas.length === 0) {
      return baseEntries;
    }

    const deltaMap = new Map(scenarioDeltas.map(delta => [delta.id, delta]));
    
    let resolvedEntries = baseEntries.filter(baseEntry => {
      const delta = deltaMap.get(baseEntry.id);
      return !(delta && delta.isDeleted);
    });

    resolvedEntries = resolvedEntries.map(baseEntry => {
      const delta = deltaMap.get(baseEntry.id);
      return delta ? { ...baseEntry, ...delta } : baseEntry;
    });

    const newEntries = scenarioDeltas.filter(delta => 
        !delta.isDeleted && !baseEntries.some(baseEntry => baseEntry.id === delta.id)
    );

    return [...resolvedEntries, ...newEntries];
};

export const deriveActualsFromEntry = (entry, projectId, userCashAccounts = []) => {
    const newActualsList = [];
    const actualType = entry.type === 'depense' ? 'payable' : 'receivable';

    const commonActualData = {
        budgetId: entry.id,
        projectId: projectId,
        type: actualType,
        category: entry.category,
        thirdParty: entry.supplier,
        description: `Budget: ${entry.description || entry.category}`,
        status: 'pending',
        payments: []
    };
    
    const frequency = entry.frequency;
    const isLoanPrincipal = entry.category === 'Réception Emprunt' || entry.category === 'Octroi de Prêt';

    if (frequency === 'ponctuel') {
        if (!entry.date) return [];
        const actual = {
            ...commonActualData,
            id: uuidv4(),
            date: entry.date,
            amount: entry.amount,
        };

        // For loan principals, automatically create a paid/received transaction
        // as the cash is moved immediately. It uses the first available cash account.
        if (isLoanPrincipal) {
            const firstAccount = userCashAccounts.find(acc => !acc.isClosed);
            if (firstAccount) {
                actual.status = actual.type === 'payable' ? 'paid' : 'received';
                actual.payments = [{
                    id: uuidv4(),
                    paymentDate: entry.date,
                    paidAmount: entry.amount,
                    cashAccount: firstAccount.id,
                }];
            }
        }
        newActualsList.push(actual);

    } else if (frequency === 'irregulier') {
        (entry.payments || []).forEach(payment => {
            if (payment.date && payment.amount) {
                newActualsList.push({
                    ...commonActualData,
                    id: uuidv4(),
                    date: payment.date,
                    amount: parseFloat(payment.amount),
                });
            }
        });
    } else if (frequency === 'provision') {
        if (!entry.provisionDetails || !entry.payments) return [];
        
        entry.payments.forEach(payment => {
            newActualsList.push({
                id: uuidv4(),
                budgetId: entry.id,
                projectId: projectId,
                type: 'payable',
                category: 'Épargne et Provision',
                date: payment.date,
                amount: parseFloat(payment.amount),
                thirdParty: `Provision vers ${userCashAccounts.find(acc => acc.id === entry.provisionDetails.provisionAccountId)?.name || 'Compte Provision'}`,
                description: `Provision pour: ${entry.description}`,
                status: 'pending',
                payments: [],
                isProvision: true,
                provisionDetails: {
                    ...entry.provisionDetails,
                    sourceAccountId: null,
                    destinationAccountId: entry.provisionDetails.provisionAccountId
                }
            });
        });

        newActualsList.push({
            id: uuidv4(),
            budgetId: entry.id,
            projectId: projectId,
            type: 'payable',
            category: entry.category,
            date: entry.provisionDetails.finalPaymentDate,
            amount: entry.amount,
            thirdParty: entry.supplier,
            description: `Paiement final pour: ${entry.description}`,
            status: 'pending',
            payments: [],
            isFinalProvisionPayment: true,
            provisionDetails: entry.provisionDetails
        });
    } else { // Recurring entries
        if (!entry.startDate) return [];

        const startDate = new Date(entry.startDate);
        const endDate = entry.endDate ? new Date(entry.endDate) : new Date(new Date(startDate).setFullYear(startDate.getFullYear() + 5));
        
        let currentDate = new Date(startDate);
        
        const incrementFns = {
            journalier: (d) => new Date(d.setDate(d.getDate() + 1)),
            hebdomadaire: (d) => new Date(d.setDate(d.getDate() + 7)),
            mensuel: (d) => addMonths(d, 1),
            bimestriel: (d) => addMonths(d, 2),
            trimestriel: (d) => addMonths(d, 3),
            annuel: (d) => addMonths(d, 12),
        };
        
        const incrementFn = incrementFns[frequency];
        if (!incrementFn) return [];

        while (currentDate <= endDate) {
            // Create a new date object for the push to avoid mutation issues
            const actualDate = new Date(currentDate);
            newActualsList.push({
                ...commonActualData,
                id: uuidv4(),
                date: actualDate.toISOString().split('T')[0],
                amount: entry.amount,
            });
            currentDate = incrementFn(currentDate);
        }
    }
    
    return newActualsList;
};


export const generateScenarioActuals = (baseEntries, baseActuals, scenarioDeltas, projectId, userCashAccounts) => {
  const baseEntryMap = new Map(baseEntries.map(e => [e.id, e]));
  let scenarioActuals = [...baseActuals];
  const unsettledStatuses = ['pending', 'partially_paid', 'partially_received'];

  const deltasMap = new Map(scenarioDeltas.map(d => [d.id, d]));

  deltasMap.forEach((delta, entryId) => {
    // Remove all existing unsettled actuals related to this budgetId
    scenarioActuals = scenarioActuals.filter(a => !(a.budgetId === entryId && unsettledStatuses.includes(a.status)));

    if (!delta.isDeleted) {
      // It's a modification or a new entry that was modified
      const baseEntry = baseEntryMap.get(entryId);
      const modifiedEntry = { ...(baseEntry || {}), ...delta, projectId }; // Ensure projectId is set
      const newGeneratedActuals = deriveActualsFromEntry(modifiedEntry, projectId, userCashAccounts);
      scenarioActuals.push(...newGeneratedActuals);
    }
    // If it isDeleted, they are already removed and we don't add them back.
  });
  
  return scenarioActuals;
};

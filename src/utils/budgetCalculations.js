export const getTodayInTimezone = (offset = 0) => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000); // get UTC time in ms
    const todayInTimezone = new Date(utc + (3600000 * offset));
    todayInTimezone.setHours(0, 0, 0, 0); // reset time part for date-only comparisons
    return todayInTimezone;
};

export const getStartOfWeek = (date) => { 
    const d = new Date(date); 
    const day = d.getDay(); 
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    d.setHours(0, 0, 0, 0); 
    return new Date(d.setDate(diff)); 
};

export const getWeeksInMonth = (year, month) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    let mondays = 0;
    for (let day = 1; day <= lastDay; day++) {
      if (new Date(year, month, day).getDay() === 1) mondays++;
    }
    return mondays > 0 ? mondays : Math.ceil(lastDay / 7);
};

export const getEntryAmountForMonth = (entry, monthIndex, year) => {
    const targetMonthStart = new Date(year, monthIndex, 1);
    const targetMonthEnd = new Date(year, monthIndex + 1, 0);

    if (entry.frequency === 'ponctuel') {
      if (!entry.date) return 0;
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === year && entryDate.getMonth() === monthIndex ? entry.amount : 0;
    }

    if (entry.frequency === 'irregulier' || entry.frequency === 'provision') {
      if (!entry.payments || entry.payments.length === 0) return 0;
      return entry.payments.reduce((sum, payment) => {
        if (!payment.date || !payment.amount) return sum;
        const paymentDate = new Date(payment.date);
        if (paymentDate.getFullYear() === year && paymentDate.getMonth() === monthIndex) {
          return sum + parseFloat(payment.amount);
        }
        return sum;
      }, 0);
    }

    if (!entry.startDate) return 0;
    const startDate = new Date(entry.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = entry.endDate ? new Date(entry.endDate) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    if (targetMonthEnd < startDate || (endDate && targetMonthStart > endDate)) return 0;

    switch (entry.frequency) {
      case 'journalier': return entry.amount * new Date(year, monthIndex + 1, 0).getDate();
      case 'mensuel': return entry.amount;
      case 'hebdomadaire': return entry.amount * getWeeksInMonth(year, monthIndex);
      case 'bimestriel': return (monthIndex - startDate.getMonth()) % 2 === 0 && monthIndex >= startDate.getMonth() ? entry.amount : 0;
      case 'trimestriel': return (monthIndex - startDate.getMonth()) % 3 === 0 && monthIndex >= startDate.getMonth() ? entry.amount : 0;
      case 'annuel': return monthIndex === startDate.getMonth() ? entry.amount : 0;
      default: return 0;
    }
};

const addMonths = (date, months) => {
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() !== day) {
        d.setDate(0);
    }
    return d;
};

export const getEntryAmountForPeriod = (entry, periodStart, periodEnd) => {
    if (!entry || !entry.amount || isNaN(entry.amount)) return 0;

    const entryAmount = parseFloat(entry.amount);

    if (entry.frequency === 'ponctuel') {
        if (!entry.date) return 0;
        const entryDate = new Date(entry.date);
        entryDate.setHours(0, 0, 0, 0);
        return (entryDate >= periodStart && entryDate < periodEnd) ? entryAmount : 0;
    }

    if (entry.frequency === 'irregulier' || entry.frequency === 'provision') {
        if (!entry.payments || entry.payments.length === 0) return 0;
        return entry.payments.reduce((sum, payment) => {
            if (!payment.date || !payment.amount) return sum;
            const paymentDate = new Date(payment.date);
            paymentDate.setHours(0, 0, 0, 0);
            if (paymentDate >= periodStart && paymentDate < periodEnd) {
                return sum + parseFloat(payment.amount);
            }
            return sum;
        }, 0);
    }

    if (!entry.startDate) return 0;
    const startDate = new Date(entry.startDate);
    startDate.setHours(0, 0, 0, 0);

    const entryEndDate = entry.endDate ? new Date(entry.endDate) : null;
    if (entryEndDate) entryEndDate.setHours(23, 59, 59, 999);

    if (periodEnd <= startDate || (entryEndDate && periodStart > entryEndDate)) {
        return 0;
    }

    let totalAmount = 0;
    let currentDate = new Date(startDate);
    
    const incrementFns = {
        journalier: (d) => new Date(d.setDate(d.getDate() + 1)),
        hebdomadaire: (d) => new Date(d.setDate(d.getDate() + 7)),
        mensuel: (d) => addMonths(d, 1),
        bimestriel: (d) => addMonths(d, 2),
        trimestriel: (d) => addMonths(d, 3),
        annuel: (d) => addMonths(d, 12),
    };

    const incrementFn = incrementFns[entry.frequency];
    if (!incrementFn || isNaN(currentDate.getTime())) return 0;

    while (currentDate < periodStart && (!entryEndDate || currentDate <= entryEndDate)) {
        const nextDate = incrementFn(new Date(currentDate));
        if (isNaN(nextDate.getTime()) || nextDate <= currentDate) break;
        if (nextDate > periodStart) break;
        currentDate = nextDate;
    }

    while (!entryEndDate || currentDate <= entryEndDate) {
        if (currentDate >= periodEnd) break;
        if (currentDate >= periodStart) {
            totalAmount += entryAmount;
        }
        const nextDate = incrementFn(new Date(currentDate));
        if (isNaN(nextDate.getTime()) || nextDate <= currentDate) break;
        currentDate = nextDate;
    }

    return totalAmount;
};

export const getActualAmountForPeriod = (entry, actualTransactions, periodStart, periodEnd) => {
    if (!entry) return 0;

    // Find all 'actual' transactions linked to this budget entry.
    const relevantActuals = actualTransactions.filter(t => t.budgetId === entry.id);

    // Sum up all payments for these actuals that fall within the period.
    return relevantActuals.reduce((sum, actual) => {
        const paymentsInPeriod = (actual.payments || []).filter(p => {
            const paymentDate = new Date(p.paymentDate);
            return paymentDate >= periodStart && paymentDate < periodEnd;
        });
        const totalPaidInPeriod = paymentsInPeriod.reduce((pSum, p) => pSum + p.paidAmount, 0);
        return sum + totalPaidInPeriod;
    }, 0);
};

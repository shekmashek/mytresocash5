export const formatCurrency = (amount, settings = {}) => {
  const { 
    displayUnit = 'standard', 
    decimalPlaces = 2,
    currency = '€'
  } = settings;
  
  const currencySymbol = currency;

  if (amount === null || amount === undefined || isNaN(amount)) {
    return '-';
  }

  let value = amount;
  let suffix = '';

  if (displayUnit === 'thousands') {
    value /= 1000;
    suffix = ' K';
  } else if (displayUnit === 'millions') {
    value /= 1000000;
    suffix = ' M';
  }

  const formatter = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  return `${formatter.format(value)}${suffix} ${currencySymbol}`;
};

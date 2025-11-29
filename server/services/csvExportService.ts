import { Transaction, Investment, Debt, Budget, Category } from '../../types';

/**
 * CSV Export Service
 * Generates CSV files for various financial data types
 */

/**
 * Convert array of objects to CSV format
 */
function arrayToCSV(data: any[], headers: string[]): string {
    const headerRow = headers.join(',');
    const rows = data.map(row => {
        return headers.map(header => {
            const value = row[header];
            // Escape quotes and wrap in quotes if contains comma or quote
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        }).join(',');
    });

    return [headerRow, ...rows].join('\n');
}

/**
 * Generate CSV for transactions
 */
export function generateTransactionsCSV(transactions: Transaction[]): string {
    const headers = ['id', 'date', 'description', 'category', 'amount', 'type'];

    const formattedData = transactions.map(t => ({
        id: t.id,
        date: new Date(t.date).toISOString().split('T')[0],
        description: t.description,
        category: t.category,
        amount: t.amount.toFixed(2),
        type: t.type
    }));

    return arrayToCSV(formattedData, headers);
}

/**
 * Generate CSV for investments
 */
export function generateInvestmentsCSV(investments: any[]): string {
    const headers = [
        'id',
        'name',
        'type',
        'symbol',
        'initialAmount',
        'currentValue',
        'ratePerAnnum',
        'purchaseDate',
        'totalReturn',
        'totalReturnPercentage',
        'annualizedReturn'
    ];

    const formattedData = investments.map(inv => ({
        id: inv.id,
        name: inv.name,
        type: inv.type,
        symbol: inv.symbol || '',
        initialAmount: inv.initialAmount.toFixed(2),
        currentValue: inv.currentValue.toFixed(2),
        ratePerAnnum: inv.ratePerAnnum.toFixed(2),
        purchaseDate: new Date(inv.purchaseDate).toISOString().split('T')[0],
        totalReturn: inv.calculatedMetrics?.totalReturn?.toFixed(2) || '0.00',
        totalReturnPercentage: inv.calculatedMetrics?.totalReturnPercentage?.toFixed(2) || '0.00',
        annualizedReturn: inv.calculatedMetrics?.annualizedReturn?.toFixed(2) || '0.00'
    }));

    return arrayToCSV(formattedData, headers);
}

/**
 * Generate CSV for debts
 */
export function generateDebtsCSV(debts: any[]): string {
    const headers = [
        'id',
        'name',
        'type',
        'originalAmount',
        'currentBalance',
        'interestRate',
        'minimumPayment',
        'dueDate',
        'payoffDate',
        'totalInterest',
        'monthsRemaining'
    ];

    const formattedData = debts.map(debt => ({
        id: debt.id,
        name: debt.name,
        type: debt.type,
        originalAmount: debt.originalAmount.toFixed(2),
        currentBalance: debt.currentBalance.toFixed(2),
        interestRate: debt.interestRate.toFixed(2),
        minimumPayment: debt.minimumPayment.toFixed(2),
        dueDate: new Date(debt.dueDate).toISOString().split('T')[0],
        payoffDate: debt.calculatedMetrics?.payoffDate || '',
        totalInterest: debt.calculatedMetrics?.totalInterest?.toFixed(2) || '0.00',
        monthsRemaining: debt.calculatedMetrics?.monthsRemaining || '0'
    }));

    return arrayToCSV(formattedData, headers);
}

/**
 * Generate CSV for budgets
 */
export function generateBudgetsCSV(budgets: Budget[], transactions: Transaction[]): string {
    const headers = ['category', 'limit', 'spent', 'remaining', 'percentageUsed'];

    const formattedData = budgets.map(budget => {
        const spent = transactions
            .filter(t => t.category === budget.category && t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const remaining = budget.limit - spent;
        const percentageUsed = budget.limit > 0 ? ((spent / budget.limit) * 100).toFixed(2) : '0.00';

        return {
            category: budget.category,
            limit: budget.limit.toFixed(2),
            spent: spent.toFixed(2),
            remaining: remaining.toFixed(2),
            percentageUsed
        };
    });

    return arrayToCSV(formattedData, headers);
}

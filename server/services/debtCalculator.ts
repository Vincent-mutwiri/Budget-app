import { DebtMetrics, DebtPayment } from '../../types';

// Type for debt data that can come from Mongoose (with _id) or frontend (with id)
type DebtData = {
    currentBalance: number;
    interestRate: number;
    minimumPayment: number;
    [key: string]: any; // Allow additional properties
};

/**
 * Calculate debt metrics including payoff date, total interest, and months remaining
 */
export function calculateDebtMetrics(debt: DebtData): DebtMetrics {
    const { currentBalance, interestRate, minimumPayment } = debt;

    // Monthly interest rate
    const monthlyRate = interestRate / 100 / 12;

    // Calculate months remaining and payoff date
    let balance = currentBalance;
    let monthsRemaining = 0;
    let totalInterest = 0;

    // Simulate monthly payments
    while (balance > 0 && monthsRemaining < 600) { // Cap at 50 years
        const interestCharge = balance * monthlyRate;
        const principalPayment = Math.min(minimumPayment - interestCharge, balance);

        if (principalPayment <= 0) {
            // Payment doesn't cover interest - debt will never be paid off
            monthsRemaining = 600;
            totalInterest = 999999;
            break;
        }

        totalInterest += interestCharge;
        balance -= principalPayment;
        monthsRemaining++;
    }

    // Calculate payoff date
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + monthsRemaining);

    return {
        payoffDate: payoffDate.toISOString(),
        totalInterest: Math.round(totalInterest * 100) / 100,
        monthsRemaining
    };
}

/**
 * Calculate accelerated payoff scenarios with extra payments
 */
export function calculateAcceleratedPayoff(
    debt: DebtData,
    extraPayment: number
): { acceleratedPayoffDate: string; interestSavings: number; monthsRemaining: number } {
    const { currentBalance, interestRate, minimumPayment } = debt;

    // Monthly interest rate
    const monthlyRate = interestRate / 100 / 12;

    // Calculate with extra payment
    let balance = currentBalance;
    let monthsRemaining = 0;
    let totalInterest = 0;
    const totalPayment = minimumPayment + extraPayment;

    while (balance > 0 && monthsRemaining < 600) {
        const interestCharge = balance * monthlyRate;
        const principalPayment = Math.min(totalPayment - interestCharge, balance);

        if (principalPayment <= 0) {
            monthsRemaining = 600;
            totalInterest = 999999;
            break;
        }

        totalInterest += interestCharge;
        balance -= principalPayment;
        monthsRemaining++;
    }

    // Calculate payoff date
    const acceleratedPayoffDate = new Date();
    acceleratedPayoffDate.setMonth(acceleratedPayoffDate.getMonth() + monthsRemaining);

    // Calculate interest savings
    const standardMetrics = calculateDebtMetrics(debt);
    const interestSavings = standardMetrics.totalInterest - totalInterest;

    return {
        acceleratedPayoffDate: acceleratedPayoffDate.toISOString(),
        interestSavings: Math.round(interestSavings * 100) / 100,
        monthsRemaining
    };
}

/**
 * Calculate interest accrued since last payment
 */
export function calculateAccruedInterest(
    currentBalance: number,
    interestRate: number,
    lastPaymentDate: Date
): number {
    const now = new Date();
    const daysSincePayment = Math.floor((now.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24));

    // Daily interest rate
    const dailyRate = interestRate / 100 / 365;

    // Calculate accrued interest
    const accruedInterest = currentBalance * dailyRate * daysSincePayment;

    return Math.round(accruedInterest * 100) / 100;
}

/**
 * Process a debt payment and calculate principal/interest split
 */
export function processDebtPayment(
    debt: DebtData & { paymentHistory?: any[]; createdAt?: any },
    paymentAmount: number,
    paymentDate: Date
): { principalPaid: number; interestPaid: number; newBalance: number } {
    const { currentBalance, interestRate, paymentHistory = [] } = debt;

    // Get last payment date or creation date
    const lastPaymentDate = paymentHistory.length > 0
        ? new Date(paymentHistory[paymentHistory.length - 1].date)
        : new Date(debt.createdAt);

    // Calculate accrued interest
    const accruedInterest = calculateAccruedInterest(currentBalance, interestRate, lastPaymentDate);

    // Split payment between interest and principal
    const interestPaid = Math.min(paymentAmount, accruedInterest);
    const principalPaid = Math.max(0, paymentAmount - interestPaid);

    // Calculate new balance
    const newBalance = Math.max(0, currentBalance - principalPaid);

    return {
        principalPaid: Math.round(principalPaid * 100) / 100,
        interestPaid: Math.round(interestPaid * 100) / 100,
        newBalance: Math.round(newBalance * 100) / 100
    };
}

/**
 * Calculate total debt and monthly obligations for multiple debts
 */
export function calculateDebtSummary(debts: DebtData[]): {
    totalDebt: number;
    monthlyObligations: number;
    totalMonthlyInterest: number;
    averageInterestRate: number;
} {
    const totalDebt = debts.reduce((sum, debt) => sum + debt.currentBalance, 0);
    const monthlyObligations = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);

    // Calculate weighted average interest rate
    const weightedInterestSum = debts.reduce(
        (sum, debt) => sum + (debt.interestRate * debt.currentBalance),
        0
    );
    const averageInterestRate = totalDebt > 0 ? weightedInterestSum / totalDebt : 0;

    // Calculate total monthly interest
    const totalMonthlyInterest = debts.reduce((sum, debt) => {
        const monthlyRate = debt.interestRate / 100 / 12;
        return sum + (debt.currentBalance * monthlyRate);
    }, 0);

    return {
        totalDebt: Math.round(totalDebt * 100) / 100,
        monthlyObligations: Math.round(monthlyObligations * 100) / 100,
        totalMonthlyInterest: Math.round(totalMonthlyInterest * 100) / 100,
        averageInterestRate: Math.round(averageInterestRate * 100) / 100
    };
}

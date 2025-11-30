import type { InvestmentMetrics } from '../types';

// Type for investment data that can come from Mongoose (with _id) or frontend (with id)
type InvestmentData = {
    initialAmount: number;
    currentValue: number;
    ratePerAnnum: number;
    purchaseDate: string | Date;
    [key: string]: any; // Allow additional properties
};

/**
 * Calculate investment metrics including returns and projections
 */
export function calculateInvestmentMetrics(investment: InvestmentData): InvestmentMetrics {
    const { initialAmount, currentValue, ratePerAnnum, purchaseDate } = investment;

    // Calculate total return
    const totalReturn = currentValue - initialAmount;
    const totalReturnPercentage = (totalReturn / initialAmount) * 100;

    // Calculate annualized return
    const purchaseTime = new Date(purchaseDate).getTime();
    const currentTime = new Date().getTime();
    const yearsHeld = (currentTime - purchaseTime) / (1000 * 60 * 60 * 24 * 365.25);

    let annualizedReturn = 0;
    if (yearsHeld > 0) {
        // Annualized return = ((Current Value / Initial Amount) ^ (1 / Years)) - 1
        annualizedReturn = (Math.pow(currentValue / initialAmount, 1 / yearsHeld) - 1) * 100;
    }

    // Project future values using compound interest formula: FV = PV * (1 + r)^t
    const rate = ratePerAnnum / 100;
    const projectedValue1Year = currentValue * Math.pow(1 + rate, 1);
    const projectedValue3Years = currentValue * Math.pow(1 + rate, 3);
    const projectedValue5Years = currentValue * Math.pow(1 + rate, 5);

    return {
        totalReturn,
        totalReturnPercentage,
        annualizedReturn,
        projectedValue1Year,
        projectedValue3Years,
        projectedValue5Years
    };
}

/**
 * Calculate portfolio-level metrics
 */
export function calculatePortfolioMetrics(investments: InvestmentData[]) {
    if (investments.length === 0) {
        return {
            totalValue: 0,
            totalInvested: 0,
            totalReturn: 0,
            totalReturnPercentage: 0,
            assetAllocation: []
        };
    }

    // Calculate totals
    const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalInvested = investments.reduce((sum, inv) => sum + inv.initialAmount, 0);
    const totalReturn = totalValue - totalInvested;
    const totalReturnPercentage = (totalReturn / totalInvested) * 100;

    // Calculate asset allocation by type
    const allocationMap = new Map<string, number>();
    investments.forEach(inv => {
        const current = allocationMap.get(inv.type) || 0;
        allocationMap.set(inv.type, current + inv.currentValue);
    });

    const assetAllocation = Array.from(allocationMap.entries()).map(([type, value]) => ({
        type,
        value,
        percentage: (value / totalValue) * 100
    }));

    return {
        totalValue,
        totalInvested,
        totalReturn,
        totalReturnPercentage,
        assetAllocation
    };
}

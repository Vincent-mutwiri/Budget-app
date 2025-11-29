import { Transaction, Budget, Category } from '../../types';

/**
 * PDF Export Service
 * Generates PDF reports for budgets and financial summaries
 * Note: This is a simplified implementation that generates HTML that can be converted to PDF
 * In production, you would use a library like pdfkit, puppeteer, or jsPDF
 */

/**
 * Generate HTML for budget report (to be converted to PDF)
 */
export function generateBudgetReportHTML(
    budgets: Budget[],
    transactions: Transaction[],
    dateRange: { start: string; end: string },
    userName: string = 'User'
): string {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    // Calculate spending for each budget
    const budgetData = budgets.map(budget => {
        const spent = transactions
            .filter(t =>
                t.category === budget.category &&
                t.type === 'expense' &&
                new Date(t.date) >= startDate &&
                new Date(t.date) <= endDate
            )
            .reduce((sum, t) => sum + t.amount, 0);

        const remaining = budget.limit - spent;
        const percentageUsed = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;

        return {
            category: budget.category,
            limit: budget.limit,
            spent,
            remaining,
            percentageUsed,
            status: percentageUsed >= 100 ? 'over' : percentageUsed >= 80 ? 'warning' : 'good'
        };
    });

    const totalBudget = budgetData.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = budgetData.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = totalBudget - totalSpent;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Budget Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 40px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #10b981;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #10b981;
            margin: 0;
            font-size: 32px;
        }
        .header p {
            color: #666;
            margin: 10px 0 0 0;
        }
        .summary {
            background: #f0fdf4;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-item h3 {
            margin: 0;
            color: #666;
            font-size: 14px;
            font-weight: normal;
        }
        .summary-item p {
            margin: 10px 0 0 0;
            font-size: 24px;
            font-weight: bold;
            color: #10b981;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th {
            background: #10b981;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        tr:hover {
            background: #f9fafb;
        }
        .status-good {
            color: #10b981;
            font-weight: 600;
        }
        .status-warning {
            color: #f59e0b;
            font-weight: 600;
        }
        .status-over {
            color: #ef4444;
            font-weight: 600;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            transition: width 0.3s;
        }
        .progress-good {
            background: #10b981;
        }
        .progress-warning {
            background: #f59e0b;
        }
        .progress-over {
            background: #ef4444;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Budget Report</h1>
        <p>${userName} | ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
    </div>
    
    <div class="summary">
        <div class="summary-grid">
            <div class="summary-item">
                <h3>Total Budget</h3>
                <p>$${totalBudget.toFixed(2)}</p>
            </div>
            <div class="summary-item">
                <h3>Total Spent</h3>
                <p>$${totalSpent.toFixed(2)}</p>
            </div>
            <div class="summary-item">
                <h3>Remaining</h3>
                <p>$${totalRemaining.toFixed(2)}</p>
            </div>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Category</th>
                <th>Budget Limit</th>
                <th>Spent</th>
                <th>Remaining</th>
                <th>Usage</th>
                <th>Progress</th>
            </tr>
        </thead>
        <tbody>
            ${budgetData.map(b => `
            <tr>
                <td><strong>${b.category}</strong></td>
                <td>$${b.limit.toFixed(2)}</td>
                <td>$${b.spent.toFixed(2)}</td>
                <td class="status-${b.status}">$${b.remaining.toFixed(2)}</td>
                <td class="status-${b.status}">${b.percentageUsed.toFixed(1)}%</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill progress-${b.status}" style="width: ${Math.min(100, b.percentageUsed)}%"></div>
                    </div>
                </td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="footer">
        <p>Generated on ${new Date().toLocaleString()} | SmartWallet Budget App</p>
    </div>
</body>
</html>
    `;
}

/**
 * Generate HTML for financial summary report (to be converted to PDF)
 */
export function generateFinancialSummaryHTML(
    transactions: Transaction[],
    budgets: Budget[],
    investments: any[],
    debts: any[],
    dateRange: { start: string; end: string },
    userName: string = 'User'
): string {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    // Filter transactions by date range
    const filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startDate && tDate <= endDate;
    });

    // Calculate income and expenses
    const totalIncome = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Calculate investment totals
    const totalInvestmentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalInvestmentReturn = investments.reduce((sum, inv) =>
        sum + (inv.calculatedMetrics?.totalReturn || 0), 0
    );

    // Calculate debt totals
    const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);
    const totalMonthlyDebtPayment = debts.reduce((sum, d) => sum + d.minimumPayment, 0);

    // Calculate net worth
    const netWorth = totalInvestmentValue - totalDebt;

    // Category breakdown
    const categoryBreakdown = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

    const sortedCategories = Object.entries(categoryBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Financial Summary</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 40px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #10b981;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #10b981;
            margin: 0;
            font-size: 32px;
        }
        .header p {
            color: #666;
            margin: 10px 0 0 0;
        }
        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            color: #10b981;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #10b981;
        }
        .metric-card h3 {
            margin: 0;
            color: #666;
            font-size: 14px;
            font-weight: normal;
        }
        .metric-card p {
            margin: 10px 0 0 0;
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        .metric-card.positive {
            border-left-color: #10b981;
        }
        .metric-card.negative {
            border-left-color: #ef4444;
        }
        .metric-card.neutral {
            border-left-color: #6b7280;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th {
            background: #10b981;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        tr:hover {
            background: #f9fafb;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
        }
        .positive-value {
            color: #10b981;
            font-weight: 600;
        }
        .negative-value {
            color: #ef4444;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Financial Summary Report</h1>
        <p>${userName} | ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
    </div>
    
    <div class="section">
        <h2>Overview</h2>
        <div class="metrics-grid">
            <div class="metric-card positive">
                <h3>Total Income</h3>
                <p class="positive-value">$${totalIncome.toFixed(2)}</p>
            </div>
            <div class="metric-card negative">
                <h3>Total Expenses</h3>
                <p class="negative-value">$${totalExpenses.toFixed(2)}</p>
            </div>
            <div class="metric-card ${netSavings >= 0 ? 'positive' : 'negative'}">
                <h3>Net Savings</h3>
                <p class="${netSavings >= 0 ? 'positive-value' : 'negative-value'}">$${netSavings.toFixed(2)}</p>
            </div>
            <div class="metric-card neutral">
                <h3>Savings Rate</h3>
                <p>${savingsRate.toFixed(1)}%</p>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>Net Worth</h2>
        <div class="metrics-grid">
            <div class="metric-card positive">
                <h3>Investments</h3>
                <p class="positive-value">$${totalInvestmentValue.toFixed(2)}</p>
            </div>
            <div class="metric-card negative">
                <h3>Debts</h3>
                <p class="negative-value">$${totalDebt.toFixed(2)}</p>
            </div>
            <div class="metric-card ${netWorth >= 0 ? 'positive' : 'negative'}">
                <h3>Net Worth</h3>
                <p class="${netWorth >= 0 ? 'positive-value' : 'negative-value'}">$${netWorth.toFixed(2)}</p>
            </div>
            <div class="metric-card neutral">
                <h3>Monthly Debt Payment</h3>
                <p>$${totalMonthlyDebtPayment.toFixed(2)}</p>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>Top Spending Categories</h2>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Percentage of Total</th>
                </tr>
            </thead>
            <tbody>
                ${sortedCategories.map(([category, amount]) => `
                <tr>
                    <td><strong>${category}</strong></td>
                    <td>$${amount.toFixed(2)}</td>
                    <td>${totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0.0'}%</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    
    ${investments.length > 0 ? `
    <div class="section">
        <h2>Investment Performance</h2>
        <table>
            <thead>
                <tr>
                    <th>Investment</th>
                    <th>Current Value</th>
                    <th>Total Return</th>
                    <th>Return %</th>
                </tr>
            </thead>
            <tbody>
                ${investments.map(inv => `
                <tr>
                    <td><strong>${inv.name}</strong></td>
                    <td>$${inv.currentValue.toFixed(2)}</td>
                    <td class="${(inv.calculatedMetrics?.totalReturn || 0) >= 0 ? 'positive-value' : 'negative-value'}">
                        $${(inv.calculatedMetrics?.totalReturn || 0).toFixed(2)}
                    </td>
                    <td class="${(inv.calculatedMetrics?.totalReturnPercentage || 0) >= 0 ? 'positive-value' : 'negative-value'}">
                        ${(inv.calculatedMetrics?.totalReturnPercentage || 0).toFixed(2)}%
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}
    
    <div class="footer">
        <p>Generated on ${new Date().toLocaleString()} | SmartWallet Budget App</p>
    </div>
</body>
</html>
    `;
}

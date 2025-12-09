import React from 'react';

interface FinancialHealthScoreProps {
    healthScore: number;
    healthScoreComponents: {
        savingsRate: number;
        debtToIncome: number;
        budgetAdherence: number;
        emergencyFund: number;
    };
}

const FinancialHealthScore: React.FC<FinancialHealthScoreProps> = ({
    healthScore,
    healthScoreComponents
}) => {
    // Determine color based on score
    const getScoreColor = (score: number): string => {
        if (score >= 75) return '#16a34a'; // green-600
        if (score >= 50) return '#f59e0b'; // yellow
        return '#ef4444'; // red
    };

    const getScoreLabel = (score: number): string => {
        if (score >= 75) return 'Excellent';
        if (score >= 50) return 'Good';
        return 'Needs Improvement';
    };

    const scoreColor = getScoreColor(healthScore);
    const scoreLabel = getScoreLabel(healthScore);

    // Calculate gauge rotation (0-180 degrees)
    const rotation = (healthScore / 100) * 180;

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-6 text-gray-900">Financial Health Score</h3>

            {/* Gauge Visualization */}
            <div className="flex flex-col items-center mb-8">
                <div className="relative w-64 h-32">
                    {/* Background arc */}
                    <svg className="w-full h-full" viewBox="0 0 200 100">
                        <path
                            d="M 10 90 A 90 90 0 0 1 190 90"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="20"
                            strokeLinecap="round"
                        />
                        {/* Colored arc */}
                        <path
                            d="M 10 90 A 90 90 0 0 1 190 90"
                            fill="none"
                            stroke={scoreColor}
                            strokeWidth="20"
                            strokeLinecap="round"
                            strokeDasharray={`${(healthScore / 100) * 283} 283`}
                        />
                    </svg>

                    {/* Needle */}
                    <div
                        className="absolute bottom-0 left-1/2 origin-bottom transition-transform duration-1000"
                        style={{
                            transform: `translateX(-50%) rotate(${rotation - 90}deg)`,
                            width: '4px',
                            height: '80px',
                            backgroundColor: '#374151'
                        }}
                    >
                        <div className="absolute -top-2 -left-1 w-3 h-3 bg-gray-700 rounded-full" />
                    </div>
                </div>

                {/* Score Display */}
                <div className="text-center mt-4">
                    <div className="text-5xl font-bold" style={{ color: scoreColor }}>
                        {healthScore}
                    </div>
                    <div className="text-lg text-gray-600 mt-1">{scoreLabel}</div>
                </div>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-4">
                <h4 className="font-semibold text-gray-700 mb-3">Score Breakdown</h4>

                {/* Savings Rate */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Savings Rate</span>
                        <span className="text-sm font-semibold">{healthScoreComponents.savingsRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                                width: `${healthScoreComponents.savingsRate}%`,
                                backgroundColor: getScoreColor(healthScoreComponents.savingsRate)
                            }}
                        />
                    </div>
                </div>

                {/* Debt-to-Income */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Debt Management</span>
                        <span className="text-sm font-semibold">{healthScoreComponents.debtToIncome}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                                width: `${healthScoreComponents.debtToIncome}%`,
                                backgroundColor: getScoreColor(healthScoreComponents.debtToIncome)
                            }}
                        />
                    </div>
                </div>

                {/* Budget Adherence */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Budget Adherence</span>
                        <span className="text-sm font-semibold">{healthScoreComponents.budgetAdherence}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                                width: `${healthScoreComponents.budgetAdherence}%`,
                                backgroundColor: getScoreColor(healthScoreComponents.budgetAdherence)
                            }}
                        />
                    </div>
                </div>

                {/* Emergency Fund */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Emergency Fund</span>
                        <span className="text-sm font-semibold">{healthScoreComponents.emergencyFund}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                                width: `${healthScoreComponents.emergencyFund}%`,
                                backgroundColor: getScoreColor(healthScoreComponents.emergencyFund)
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialHealthScore;

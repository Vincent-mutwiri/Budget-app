// Help text and tooltips for UI components

export const HELP_TEXT = {
    // Recurring Transactions
    recurringTransactions: {
        frequency: "How often this transaction repeats. Choose from daily, weekly, bi-weekly, monthly, quarterly, or yearly.",
        startDate: "The date when this recurring transaction begins. The first transaction will be created on this date.",
        endDate: "Optional: When this recurring transaction should stop. Leave empty for indefinite recurrence.",
        reminderDaysBefore: "Receive a notification this many days before the transaction is due.",
        isActive: "Toggle to pause/resume automatic transaction creation without deleting the template.",
    },

    // Notifications
    notifications: {
        budgetAlerts: "Get notified when your spending approaches or exceeds budget limits.",
        budgetThresholds: "Choose at what percentage of your budget you want to be alerted (e.g., 80%, 100%).",
        billReminders: "Receive reminders before recurring bills are due.",
        reminderTiming: "How many days before the due date you want to be reminded.",
        goalMilestones: "Get notified when you reach savings goal milestones (25%, 50%, 75%, 100%).",
        anomalyAlerts: "Be alerted when unusual spending patterns are detected (transactions 150%+ above average).",
        emailNotifications: "Receive notifications via email in addition to in-app notifications.",
        pushNotifications: "Receive browser push notifications even when SmartWallet is not open.",
    },

    // Budget Recommendations
    budgetRecommendations: {
        suggestedLimit: "AI-recommended budget amount based on your spending history and income.",
        confidence: "How confident the AI is in this recommendation. Higher confidence means more reliable data.",
        potentialSavings: "Estimated amount you could save by following this recommendation.",
        reasoning: "Explanation of why this budget amount was recommended.",
        acceptAll: "Apply all recommendations at once. You can still adjust individual budgets later.",
    },

    // Financial Insights
    insights: {
        healthScore: "Overall financial wellness score (0-100) based on savings rate, debt-to-income ratio, budget adherence, and emergency fund.",
        savingsRate: "Percentage of your income that you're saving each month.",
        debtToIncome: "Your monthly debt payments as a percentage of monthly income. Lower is better.",
        budgetAdherence: "How well you're sticking to your budgets. 100% means perfect adherence.",
        emergencyFund: "Number of months of expenses covered by your emergency savings. Aim for 3-6 months.",
        spendingTrends: "Visual representation of how your spending in each category has changed over time.",
        forecast: "AI prediction of next month's income and expenses based on historical patterns.",
        anomalies: "Unusual transactions that deviate significantly from your normal spending patterns.",
    },

    // Receipt Scanning
    receiptScanning: {
        upload: "Upload a photo or scan of your receipt. Supported formats: JPEG, PNG, PDF (max 10MB).",
        confidence: "How confident the OCR system is in the extracted data. Review and edit low-confidence fields.",
        merchantName: "The store or vendor name extracted from the receipt.",
        lineItems: "Individual items purchased, if detectable on the receipt.",
        attachReceipt: "The original receipt image will be attached to this transaction for future reference.",
    },

    // Investments
    investments: {
        ratePerAnnum: "Expected annual return rate as a percentage. Used to calculate growth projections.",
        initialAmount: "The amount you originally invested or paid for this asset.",
        currentValue: "The present market value of this investment. Update regularly for accurate tracking.",
        totalReturn: "Total gain or loss: Current Value - Initial Amount.",
        totalReturnPercentage: "Return as a percentage: (Total Return / Initial Amount) × 100.",
        annualizedReturn: "Average yearly return rate, accounting for the time held.",
        projectedValue: "Estimated future value based on your specified rate per annum using compound interest.",
        assetAllocation: "Distribution of your portfolio across different investment types.",
    },

    // Debts
    debts: {
        originalAmount: "The total amount you originally borrowed.",
        currentBalance: "Amount still owed. This decreases as you make payments.",
        interestRate: "Annual percentage rate (APR) charged on this debt.",
        minimumPayment: "Required monthly payment. Paying more reduces interest and payoff time.",
        payoffDate: "Estimated date when debt will be fully paid based on minimum payments.",
        totalInterest: "Total interest you'll pay over the life of the debt at minimum payments.",
        acceleratedPayoff: "See how extra payments can reduce your payoff time and save on interest.",
        principalVsInterest: "Each payment is split between principal (reducing balance) and interest (cost of borrowing).",
    },

    // Gamification
    gamification: {
        xp: "Experience points earned through financial activities. Earn XP to level up!",
        level: "Your current level based on total XP earned. Higher levels unlock special badges.",
        streak: "Consecutive days you've been active on SmartWallet. Don't break the streak!",
        challenges: "Complete challenges to earn bonus XP. Challenges reset daily, weekly, or monthly.",
        badges: "Achievement awards for reaching specific milestones. Collect them all!",
        leaderboard: "See how you rank against other users. Usernames are anonymized for privacy.",
    },

    // AI Assistant
    aiAssistant: {
        naturalLanguage: "Ask questions in plain English. Example: 'How much did I spend on groceries last month?'",
        contextualInsights: "The AI provides data visualizations and charts to support its answers.",
        financialAdvice: "Get personalized tips based on your actual financial data.",
        disclaimer: "AI-generated advice is for informational purposes only and not professional financial advice.",
    },

    // Security
    security: {
        mfa: "Multi-factor authentication adds an extra security layer by requiring a code in addition to your password.",
        authenticatorApp: "Use apps like Google Authenticator or Authy to generate time-based codes.",
        backupCodes: "Save these codes in a secure location. Use them if you lose access to your MFA device.",
        passwordStrength: "Strong passwords have 8+ characters with uppercase, lowercase, numbers, and special characters.",
        activeSessions: "View all devices where you're currently logged in. Logout suspicious sessions immediately.",
        autoLogout: "You'll be automatically logged out after 30 minutes of inactivity for security.",
        dataEncryption: "Your sensitive financial data is encrypted using AES-256 encryption.",
    },

    // Export & Reports
    export: {
        dateRange: "Select the time period for your export. Use custom range for specific dates.",
        format: "CSV for spreadsheet analysis, PDF for formatted reports.",
        filters: "Narrow down your export by selecting specific categories or accounts.",
        expiryTime: "Export files are available for download for 24 hours, then automatically deleted.",
        taxPreparation: "Export transactions for easy tax preparation and record-keeping.",
    },

    // General
    general: {
        category: "Organize transactions by category for better tracking and budgeting.",
        transactionType: "Income increases your balance, expenses decrease it.",
        savingsGoal: "Set a target amount and deadline. Track your progress toward the goal.",
        account: "Separate accounts (checking, savings, credit card) for better organization.",
    },
};

// Tooltip component helper
export const getTooltip = (section: keyof typeof HELP_TEXT, field: string): string => {
    const sectionHelp = HELP_TEXT[section];
    if (sectionHelp && field in sectionHelp) {
        return sectionHelp[field as keyof typeof sectionHelp];
    }
    return "";
};

// Feature introduction messages
export const FEATURE_INTRODUCTIONS = {
    recurringTransactions: {
        title: "Welcome to Recurring Transactions!",
        message: "Automate your regular income and expenses. Set it up once, and SmartWallet will create transactions automatically.",
        steps: [
            "Click 'Add Recurring Transaction'",
            "Fill in the amount, category, and frequency",
            "Enable reminders to get notified before it occurs",
            "SmartWallet handles the rest!",
        ],
    },

    budgetRecommendations: {
        title: "Smart Budget Recommendations",
        message: "Let AI analyze your spending and suggest optimal budgets. Requires at least 30 days of transaction history.",
        steps: [
            "Click 'Get AI Recommendations'",
            "Review suggested budgets for each category",
            "Accept recommendations or customize amounts",
            "Track your progress against new budgets",
        ],
    },

    receiptScanning: {
        title: "Receipt Scanning with OCR",
        message: "Snap a photo of your receipt and let SmartWallet extract the details automatically.",
        steps: [
            "Click 'Scan Receipt' when adding a transaction",
            "Upload or take a photo of your receipt",
            "Review extracted data and make any corrections",
            "Save the transaction with receipt attached",
        ],
    },

    investments: {
        title: "Investment Tracking",
        message: "Monitor your portfolio performance with growth projections and analytics.",
        steps: [
            "Add your investments with initial and current values",
            "Enter the expected rate per annum",
            "View performance metrics and projections",
            "Update values regularly for accurate tracking",
        ],
    },

    debts: {
        title: "Debt Management",
        message: "Track your debts and visualize your path to becoming debt-free.",
        steps: [
            "Add all your debts with balances and interest rates",
            "Record payments as you make them",
            "View payoff timeline and total interest",
            "Use the accelerated payoff calculator to save on interest",
        ],
    },

    gamification: {
        title: "Gamification & Achievements",
        message: "Stay motivated with XP, challenges, and badges. Make financial management fun!",
        steps: [
            "Earn XP for financial activities",
            "Complete daily, weekly, and monthly challenges",
            "Unlock badges for achievements",
            "Compete on the leaderboard",
        ],
    },

    aiAssistant: {
        title: "AI Financial Assistant",
        message: "Ask questions about your finances in plain English and get instant insights.",
        steps: [
            "Open the AI Assistant from the sidebar",
            "Ask questions like 'How much did I spend on dining?'",
            "Get answers with supporting data and charts",
            "Receive personalized financial advice",
        ],
    },
};

// Contextual help for error states
export const ERROR_HELP = {
    ocrFailed: {
        title: "Receipt Processing Failed",
        message: "We couldn't extract data from your receipt. This can happen with poor image quality or unusual receipt formats.",
        solutions: [
            "Ensure the receipt is well-lit and in focus",
            "Flatten the receipt to avoid shadows",
            "Try uploading a different image",
            "You can still enter transaction details manually",
        ],
    },

    insufficientData: {
        title: "Not Enough Data",
        message: "We need more transaction history to generate accurate recommendations.",
        solutions: [
            "Continue logging transactions for at least 30 days",
            "Import past transactions if available",
            "Set up recurring transactions for regular expenses",
            "Check back soon for personalized insights",
        ],
    },

    calculationError: {
        title: "Calculation Error",
        message: "We encountered an issue calculating this metric.",
        solutions: [
            "Verify all input values are correct",
            "Check that dates are in the proper format",
            "Ensure interest rates are entered as percentages",
            "Contact support if the issue persists",
        ],
    },
};

// Quick tips for dashboard
export const QUICK_TIPS = [
    "💡 Set up recurring transactions to automate your financial tracking",
    "💡 Enable bill reminders to never miss a payment deadline",
    "💡 Check your financial health score weekly to track progress",
    "💡 Scan receipts on the go for quick transaction entry",
    "💡 Complete daily challenges to earn bonus XP and stay motivated",
    "💡 Use the AI Assistant to quickly find spending information",
    "💡 Update investment values monthly for accurate portfolio tracking",
    "💡 Record debt payments to see your progress toward debt-free",
    "💡 Export transactions monthly for easy tax preparation",
    "💡 Enable MFA for maximum account security",
];

// Get a random quick tip
export const getRandomTip = (): string => {
    return QUICK_TIPS[Math.floor(Math.random() * QUICK_TIPS.length)];
};

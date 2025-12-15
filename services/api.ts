import axios from 'axios';
import { handleApiError } from '../utils/errorHandler';

const baseURL = import.meta.env.VITE_API_URL?.trim() || '/api';
console.log('API baseURL:', baseURL, 'VITE_API_URL:', import.meta.env.VITE_API_URL);

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        handleApiError(error);
        return Promise.reject(error);
    }
);

export const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

// Transactions
export const getTransactions = async (userId: string) => {
    const response = await api.get('/transactions', { params: { userId } });
    return response.data.map((t: any) => ({ ...t, id: t._id }));
};

export const createTransaction = async (transaction: any) => {
    const response = await api.post('/transactions', transaction);
    return response.data;
};

export const updateTransaction = async (id: string, updates: any) => {
    const response = await api.put(`/transactions/${id}`, updates);
    return response.data;
};

export const deleteTransaction = async (id: string, userId: string) => {
    const response = await api.delete(`/transactions/${id}`, { params: { userId } });
    return response.data;
};

// Budgets
export const getBudgets = async (userId: string) => {
    const response = await api.get('/budgets', { params: { userId } });
    return response.data;
};

export const createBudget = async (budget: any) => {
    const response = await api.post('/budgets', budget);
    return response.data;
};

export const updateBudget = async (id: string, updates: any) => {
    const response = await api.put(`/budgets/${id}`, updates);
    return response.data;
};

export const deleteBudget = async (id: string, userId: string) => {
    const response = await api.delete(`/budgets/${id}`, { params: { userId } });
    return response.data;
};

// Savings Goals
export const getGoals = async (userId: string) => {
    const response = await api.get('/goals', { params: { userId } });
    return response.data;
};

export const createGoal = async (goal: any) => {
    const response = await api.post('/goals', goal);
    return response.data;
};

export const updateGoal = async (id: string, updates: any) => {
    const response = await api.put(`/goals/${id}`, updates);
    return response.data;
};

export const deleteGoal = async (id: string, userId: string) => {
    const response = await api.delete(`/goals/${id}`, { params: { userId } });
    return response.data;
};

export const uploadGoalImage = async (id: string, userId: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('userId', userId);
    const response = await api.post(`/goals/${id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const removeGoalImage = async (id: string, userId: string) => {
    const response = await api.delete(`/goals/${id}/image`, { params: { userId } });
    return response.data;
};

export const contributeToGoal = async (id: string, amount: number, userId: string) => {
    const response = await api.post(`/goals/${id}/contribute`, { amount, userId });
    return response.data;
};

// Accounts
export const getAccounts = async (userId: string) => {
    const response = await api.get('/accounts', { params: { userId } });
    return response.data;
};

export const createAccount = async (account: any) => {
    const response = await api.post('/accounts', account);
    return response.data;
};

export const updateAccount = async (id: string, account: any) => {
    const response = await api.put(`/accounts/${id}`, account);
    return response.data;
};

export const setMainAccount = async (id: string, userId: string) => {
    const response = await api.patch(`/accounts/${id}/set-main`, { userId });
    return response.data;
};

// User
export const getUser = async (clerkId: string, email?: string, fullName?: string) => {
    const response = await api.get(`/user/${clerkId}`, { params: { email, fullName } });
    return response.data;
};

// Recurring Transactions
export const getRecurringTransactions = async (userId: string) => {
    const response = await api.get('/recurring-transactions', { params: { userId } });
    return response.data;
};

export const createRecurringTransaction = async (data: any) => {
    const response = await api.post('/recurring-transactions', data);
    return response.data;
};

export const updateRecurringTransaction = async (id: string, data: any) => {
    const response = await api.put(`/recurring-transactions/${id}`, data);
    return response.data;
};

export const deleteRecurringTransaction = async (id: string) => {
    const response = await api.delete(`/recurring-transactions/${id}`);
    return response.data;
};

export const toggleRecurringTransaction = async (id: string, isActive: boolean) => {
    const response = await api.patch(`/recurring-transactions/${id}/toggle`, { isActive });
    return response.data;
};

export const payRecurringTransaction = async (id: string) => {
    const response = await api.post(`/recurring-transactions/${id}/pay`);
    return response.data;
};

// Notifications
export const getNotifications = async (userId: string, filters?: { type?: string; isRead?: boolean; limit?: number }) => {
    const params: any = { userId };
    if (filters?.type) params.type = filters.type;
    if (filters?.isRead !== undefined) params.isRead = filters.isRead;
    if (filters?.limit) params.limit = filters.limit;

    const response = await api.get('/notifications', { params });
    return response.data;
};

export const markNotificationAsRead = async (id: string) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
};

export const markAllNotificationsAsRead = async (userId: string) => {
    const response = await api.patch('/notifications/read-all', { userId });
    return response.data;
};

export const getNotificationPreferences = async (userId: string) => {
    const response = await api.get('/notifications/preferences', { params: { userId } });
    return response.data;
};

export const updateNotificationPreferences = async (userId: string, preferences: any) => {
    const response = await api.put('/notifications/preferences', { userId, preferences });
    return response.data;
};

export const sendTestNotification = async (userId: string) => {
    const response = await api.post('/notifications/test', { userId });
    return response.data;
};

// Budget Recommendations
export const generateBudgetRecommendations = async (userId: string) => {
    const response = await api.post('/budget-recommendations/generate', { userId });
    return response.data;
};

export const getBudgetRecommendations = async (userId: string, status?: string) => {
    const params: any = { userId };
    if (status) params.status = status;
    const response = await api.get('/budget-recommendations', { params });
    return response.data;
};

export const acceptBudgetRecommendation = async (id: string) => {
    const response = await api.post(`/budget-recommendations/${id}/accept`);
    return response.data;
};

export const dismissBudgetRecommendation = async (id: string) => {
    const response = await api.delete(`/budget-recommendations/${id}`);
    return response.data;
};

// Insights
export const getAllInsights = async (userId: string) => {
    const response = await api.get('/insights/dashboard', { params: { userId } });
    return response.data;
};

export const getHealthScore = async (userId: string) => {
    const response = await api.get('/insights/health-score', { params: { userId } });
    return response.data;
};

export const getSpendingTrends = async (userId: string) => {
    const response = await api.get('/insights/trends', { params: { userId } });
    return response.data;
};

export const getForecast = async (userId: string) => {
    const response = await api.get('/insights/forecast', { params: { userId } });
    return response.data;
};

export const getAnomalies = async (userId: string) => {
    const response = await api.get('/insights/anomalies', { params: { userId } });
    return response.data;
};

// Receipts
export const uploadReceipt = async (file: File, userId: string) => {
    const formData = new FormData();
    formData.append('receipt', file);
    formData.append('userId', userId);

    const response = await api.post('/receipts/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const processReceipt = async (receiptId: string) => {
    const response = await api.post(`/receipts/${receiptId}/process`);
    return response.data;
};

export const getReceipt = async (receiptId: string) => {
    const response = await api.get(`/receipts/${receiptId}`);
    return response.data;
};

export const getReceipts = async (userId: string, status?: string, limit?: number) => {
    const params: any = { userId };
    if (status) params.status = status;
    if (limit) params.limit = limit;

    const response = await api.get('/receipts', { params });
    return response.data;
};

export const deleteReceipt = async (receiptId: string) => {
    const response = await api.delete(`/receipts/${receiptId}`);
    return response.data;
};

// Investments
export const getInvestments = async (userId: string) => {
    const response = await api.get('/investments', { params: { userId } });
    return response.data;
};

export const createInvestment = async (investment: any) => {
    const response = await api.post('/investments', investment);
    return response.data;
};

export const updateInvestment = async (id: string, investment: any) => {
    const response = await api.put(`/investments/${id}`, investment);
    return response.data;
};

export const updateInvestmentValue = async (id: string, currentValue: number) => {
    const response = await api.patch(`/investments/${id}/value`, { currentValue });
    return response.data;
};

export const deleteInvestment = async (id: string) => {
    const response = await api.delete(`/investments/${id}`);
    return response.data;
};

export const getPortfolioMetrics = async (userId: string) => {
    const response = await api.get('/investments/portfolio/metrics', { params: { userId } });
    return response.data;
};

// Debts
export const getDebts = async (userId: string) => {
    const response = await api.get('/debts', { params: { userId } });
    return response.data;
};

export const createDebt = async (debt: any) => {
    const response = await api.post('/debts', debt);
    return response.data;
};

export const updateDebt = async (id: string, debt: any) => {
    const response = await api.put(`/debts/${id}`, debt);
    return response.data;
};

export const recordDebtPayment = async (id: string, amount: number, date: string) => {
    const response = await api.post(`/debts/${id}/payment`, { amount, date });
    return response.data;
};

export const deleteDebt = async (id: string) => {
    const response = await api.delete(`/debts/${id}`);
    return response.data;
};

export const getDebtSummary = async (userId: string) => {
    const response = await api.get('/debts/summary', { params: { userId } });
    return response.data;
};

export const calculateAcceleratedPayoff = async (id: string, extraPayment: number) => {
    const response = await api.post(`/debts/${id}/accelerated-payoff`, { extraPayment });
    return response.data;
};

// AI Assistant
export const chatWithAI = async (userId: string, message: string, context?: Array<{ text: string; type: string }>) => {
    const response = await api.post('/ai/chat', { userId, message, context });
    return response.data;
};

export const getChatHistory = async (userId: string) => {
    const response = await api.get('/ai/chat/history', { params: { userId } });
    return response.data;
};

export const queryAIAssistant = async (userId: string, query: string) => {
    const response = await api.post('/ai/query', { userId, query });
    return response.data;
};

export const getAIAdvice = async (userId: string, query: string, financialData?: any) => {
    const response = await api.post('/ai/advice', { userId, query, financialData });
    return response.data;
};

export const getAIContext = async (userId: string, type?: string) => {
    const params: any = { userId };
    if (type) params.type = type;
    const response = await api.get('/ai-assistant/context', { params });
    return response.data;
};

// Security
export const setupMFA = async (userId: string, method: 'app' | 'email' = 'app') => {
    const response = await api.post('/security/mfa/setup', { userId, method });
    return response.data;
};

export const verifyMFA = async (userId: string, code: string, secret?: string, backupCodes?: string[]) => {
    const response = await api.post('/security/mfa/verify', { userId, code, secret, backupCodes });
    return response.data;
};

export const disableMFA = async (userId: string, password?: string) => {
    const response = await api.post('/security/mfa/disable', { userId, password });
    return response.data;
};

export const changePassword = async (userId: string, currentPassword: string | undefined, newPassword: string) => {
    const response = await api.post('/security/password/change', { userId, currentPassword, newPassword });
    return response.data;
};

export const getSessions = async (userId: string) => {
    const response = await api.get('/security/sessions', { params: { userId } });
    return response.data;
};

export const logoutSession = async (sessionId: string) => {
    const response = await api.delete(`/security/sessions/${sessionId}`);
    return response.data;
};

export const logoutAllSessions = async (userId: string) => {
    const response = await api.post('/security/sessions/logout-all', { userId });
    return response.data;
};

// Export
export const exportTransactions = async (config: any) => {
    const response = await api.post('/export/transactions', config, {
        responseType: config.format === 'csv' ? 'blob' : 'text'
    });
    return response.data;
};

export const exportBudgets = async (config: any) => {
    const response = await api.post('/export/budgets', config, {
        responseType: config.format === 'csv' || config.format === 'pdf' ? 'blob' : 'text'
    });
    return response.data;
};

export const exportInvestments = async (config: any) => {
    const response = await api.post('/export/investments', config, {
        responseType: 'blob'
    });
    return response.data;
};

export const exportSummary = async (config: any) => {
    const response = await api.post('/export/summary', config, {
        responseType: 'blob'
    });
    return response.data;
};

// Custom Categories
export const getCustomCategories = async (userId: string) => {
    const response = await api.get('/categories/custom', { params: { userId } });
    return response.data;
};

export const addCustomCategory = async (userId: string, category: string, type: 'income' | 'expense') => {
    const response = await api.post('/categories/custom', { userId, category, type });
    return response.data;
};

export const deleteCustomCategory = async (userId: string, category: string) => {
    const response = await api.delete(`/categories/custom/${encodeURIComponent(category)}`, { params: { userId } });
    return response.data;
};

export const promoteCustomCategory = async (userId: string, category: string) => {
    const response = await api.patch(`/categories/custom/${encodeURIComponent(category)}/promote?userId=${encodeURIComponent(userId)}`);
    return response.data;
};

// Financial Metrics
export const getMetrics = async (userId: string, month?: string) => {
    const params: any = { userId };
    if (month) params.month = month;
    const response = await api.get(`/metrics/${userId}`, { params });
    return response.data;
};

// Spending History
export const getMonthlySpendingHistory = async (userId: string, year: number, month: number) => {
    const response = await api.get('/spending-history', { params: { userId, year, month } });
    return response.data;
};

export default api;

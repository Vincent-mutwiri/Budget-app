import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
    // You can get the token from Clerk here if needed
    // const token = await window.Clerk.session.getToken();
    // config.headers.Authorization = `Bearer ${token}`;
    return config;
});

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
    return response.data;
};

export const createTransaction = async (transaction: any) => {
    const response = await api.post('/transactions', transaction);
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

// Savings Goals
export const getGoals = async (userId: string) => {
    const response = await api.get('/goals', { params: { userId } });
    return response.data;
};

export const createGoal = async (goal: any) => {
    const response = await api.post('/goals', goal);
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

export default api;

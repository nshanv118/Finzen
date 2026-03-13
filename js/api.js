const IS_LOCAL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const API_URL = IS_LOCAL ? window.location.origin : 'https://finzen-ty46.onrender.com';

const api = {
    // Current user token
    token: localStorage.getItem('budgetai_token'),

    setToken(token) {
        this.token = token;
        localStorage.setItem('budgetai_token', token);
    },

    logout() {
        this.token = null;
        localStorage.removeItem('budgetai_token');
    },

    // Base request helper
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        };

        const config = {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        };

        const fullUrl = `${API_URL}${endpoint}`;
        console.log(`[API Request] ${options.method || 'GET'} ${fullUrl}`, config);

        try {
            // Increase timeout for AI requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

            const response = await fetch(fullUrl, {
                ...config,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log(`[API Response] ${response.status} ${response.statusText}`);
            
            const data = await response.json();
            if (!response.ok) {
                let errorMsg = 'An error occurred. Please try again.';
                
                if (data && data.detail) {
                    if (Array.isArray(data.detail)) {
                        errorMsg = data.detail.map(err => err.msg).join(', ');
                    } else if (typeof data.detail === 'string') {
                        errorMsg = data.detail;
                    } else {
                        errorMsg = JSON.stringify(data.detail);
                    }
                }
                
                console.error(`[API Error] Status ${response.status}:`, errorMsg);
                throw new Error(errorMsg);
            }
            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('API Error: Request timed out after 30s');
                throw new Error('Request timed out. Please try again.');
            }
            console.error('API Error Details:', error);
            throw error;
        }
    },

    // Auth endpoints
    login(phone, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ phone, name: 'Login', password })
        });
    },

    register(name, phone, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, phone, password })
        });
    },

    // Wallet endpoints
    getWallet() {
        return this.request('/wallet/balance');
    },

    transfer(amount, receiver) {
        const payload = { type: 'payment', amount: parseFloat(amount), receiver: receiver };
        console.log("SENDING PAYLOAD:", payload);
        return this.request('/wallet/transfer', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    manageSavings(amount, action) {
        return this.request(`/wallet/savings?amount=${amount}&action=${action}`, {
            method: 'POST'
        });
    },

    getTransactions() {
        return this.request('/wallet/transactions');
    },

    categorizeTransaction(transaction_id, merchant_name, category) {
        return this.request('/wallet/categorize', {
            method: 'POST',
            body: JSON.stringify({ transaction_id, merchant_name, category })
        });
    },

    // Budget endpoints
    getExpenses() {
        return this.request('/budget/expenses');
    },

    getAnalytics() {
        return this.request('/budget/analytics');
    },

    // AI & Opportunities
    askAI(message) {
        return this.request('/ai/chat', {
            method: 'POST',
            body: JSON.stringify({ message })
        });
    },

    getOffers() {
        return this.request('/offers');
    },

    getOpportunities() {
        return this.request('/opportunities');
    }
};

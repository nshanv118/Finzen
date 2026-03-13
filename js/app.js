// --- App State & Initialization ---
let expenseChartInstance = null;
let currentTab = 'tab-pay';
let html5QrCode = null; // Holds the camera instance

document.addEventListener('DOMContentLoaded', () => {
    // Check if logged in
    if (api.token) {
        showScreen('main-layout');
        loadDashboard();
    } else {
        showScreen('auth-section');
    }

    // Auth Listeners
    document.getElementById('to-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
    });

    document.getElementById('to-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    });

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const name = document.getElementById('reg-name').value;
        const phone = document.getElementById('reg-phone').value;
        const password = document.getElementById('reg-password').value;
        
        btn.textContent = 'Registering...';
        try {
            await api.register(name, phone, password);
            // Auto-login after register
            const res = await api.login(phone, password);
            api.setToken(res.access_token);
            localStorage.setItem('budgetai_user', JSON.stringify(res.user));
            document.getElementById('user-greeting').textContent = `Hello ${res.user.name.split(' ')[0]} 👋`;
            showScreen('main-layout');
            loadDashboard();
        } catch (error) {
            showErrorModal('Registration failed: ' + error.message);
        } finally {
            btn.textContent = 'Register';
        }
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const phone = document.getElementById('login-phone').value;
        const password = document.getElementById('login-password').value;
        
        btn.textContent = 'Logging in...';
        try {
            const res = await api.login(phone, password);
            api.setToken(res.access_token);
            localStorage.setItem('budgetai_user', JSON.stringify(res.user));
            document.getElementById('user-greeting').textContent = `Hello ${res.user.name.split(' ')[0]} 👋`;
            showScreen('main-layout');
            loadDashboard();
        } catch (error) {
            showErrorModal('Login failed: ' + error.message);
        } finally {
            btn.textContent = 'Login';
        }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        api.logout();
        localStorage.removeItem('budgetai_user');
        showScreen('auth-section');
    });

    // Navigation Listeners
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.currentTarget.getAttribute('data-target');
            if (currentTab === target) return;

            // Update active nav state
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Switch tab content with clean visibility
            document.querySelectorAll('.tab-content').forEach(t => {
                t.style.display = 'none';
                t.classList.remove('active');
            });

            const content = document.getElementById(target);
            content.style.display = 'block';
            content.classList.add('active');
            currentTab = target;

            // Load data based on tab
            if (target === 'tab-pay') loadDashboard();
            if (target === 'tab-budget') loadBudgetTab();
            if (target === 'tab-offers') loadOffersAndDeals();
            if (target === 'tab-opportunities') loadOpportunitiesTab();
        });
    });

    // --- Action Listeners --- //
    const safeAddListener = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    };

    safeAddListener('btn-scan', 'click', showScanModal);
    safeAddListener('btn-send', 'click', showSendModal);
    safeAddListener('btn-pay-action', 'click', showSendModal);
    safeAddListener('btn-add', 'click', showSendModal); // Assuming add money uses similar modal
    safeAddListener('btn-receive', 'click', showReceiveModal);
    safeAddListener('btn-savings', 'click', showSavingsModal);
    safeAddListener('modal-close', 'click', hideModal);

    // Modern Chatbot Logic
    const chatbotFab = document.getElementById('chatbot-fab');
    const aiChatWindow = document.getElementById('ai-chat-window');
    const closeChatBtn = document.getElementById('close-chat');
    const sendChatBtn = document.getElementById('send-chat');
    const chatInputField = document.getElementById('chat-input');

    if (chatbotFab && aiChatWindow) {
        console.log("Chatbot FAB initialized. Window found:", !!aiChatWindow);
        chatbotFab.onclick = (e) => {
            console.log("FAB Clicked (direct handler), toggling active class");
            aiChatWindow.classList.toggle('active');
            if (aiChatWindow.classList.contains('active')) {
                chatInputField.focus();
            }
        };
    }

    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => {
            aiChatWindow.classList.remove('active');
        });
    }

    if (sendChatBtn) {
        sendChatBtn.addEventListener('click', () => {
            console.log("Send button clicked");
            handleModernAIChat();
        });
    }

    if (chatInputField) {
        chatInputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleModernAIChat();
        });
    }
});

// --- UI Helpers --- //

/**
 * Switch between main application screens (e.g., auth-section vs main-layout)
 */
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
    }
}

/**
 * Utility: Format amount as Indian Currency
 */
function formatMoney(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount);
}

/**
 * Utility: Format ISO timestamp to readable date/time
 */
function formatDate(isoString) {
    if (!isoString) return 'Recent';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

/**
 * Utility: Clean up messy UPI names/IDs for display
 */
function cleanUPIName(name) {
    if (!name) return 'Unknown Party';
    // Remove typical UPI artifacts
    let clean = name.split('@')[0];
    clean = clean.replace(/[0-9]{10}/, ''); // Remove phone numbers
    clean = clean.replace(/[^a-zA-Z\s]/g, ' '); // Remove special characters
    return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ').trim() || name;
}

/**
 * Unified UI State Sync
 * Syncs the wallet balance and transaction history in real-time.
 */
async function updateUIState() {
    try {
        const [wallet, transactions] = await Promise.all([
            api.getWallet(),
            api.getTransactions()
        ]);

        // Sync Balance
        const balEl = document.getElementById('wallet-balance');
        const savEl = document.getElementById('savings-balance');
        if (balEl) balEl.textContent = formatMoney(wallet.wallet_balance);
        if (savEl) savEl.textContent = formatMoney(wallet.savings_balance);

        // Sync Dashboard Transactions
        const txList = document.getElementById('tx-history');
        if (txList) {
            if (transactions.length === 0) {
                txList.innerHTML = '<div class="empty-state">No recent activity</div>';
            } else {
                txList.innerHTML = transactions.slice(0, 10).map(tx => {
                    const isSend = tx.type.includes('payment') || tx.type.includes('send') || tx.type.includes('deposit') || tx.type.includes('transfer_out');
                    const sign = isSend ? '-' : '+';
                    const colorClass = isSend ? 'debit' : 'credit';
                    const icon = isSend ? '💸' : '💰';
                    return `
                        <div class="tx-item">
                            <div class="tx-icon">${icon}</div>
                            <div class="tx-details">
                                <h4>${cleanUPIName(tx.receiver || tx.sender)}</h4>
                                <p>${formatDate(tx.timestamp)}</p>
                            </div>
                            <div class="tx-amount ${colorClass}">${sign}${formatMoney(tx.amount)}</div>
                        </div>
                    `;
                }).join('');
            }
        }
    } catch (e) {
        console.error("State Sync Failed:", e);
    }
}

// --- Data Loading Functions --- //

async function loadDashboard() {
    await updateUIState();
    // Load top AI insight
    try {
        const insights = await api.getAIInsights();
        if (insights && insights.length > 0) {
            document.getElementById('ai-top-insight').textContent = insights[0].text;
        }
    } catch(e) {}
}

async function loadBudgetTab() {
    try {
        const [expenses, analytics] = await Promise.all([
            api.getExpenses(),
            api.getAnalytics()
        ]);

        // Render History
        const expList = document.getElementById('expense-history');
        if (expenses.length === 0) {
            expList.innerHTML = '<li class="list-item empty-state">No recent expenses</li>';
        } else {
            expList.innerHTML = expenses.map(exp => {
                const displayTitle = cleanUPIName(exp.receiver);
                return `
                <li class="list-item">
                    <div class="tx-info" style="min-width: 0; flex: 1; padding-right: 15px;">
                        <h4 style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;">${displayTitle}</h4>
                        <p>${exp.category.charAt(0).toUpperCase() + exp.category.slice(1)} • ${formatDate(exp.timestamp)}</p>
                    </div>
                    <div class="tx-amount" style="color:var(--text-main); white-space: nowrap;">${formatMoney(exp.amount)}</div>
                </li>
            `}).join('');
        }

        // Update Monthly Total
        const monthlyTotalEl = document.getElementById('monthly-total');
        if (monthlyTotalEl) monthlyTotalEl.innerText = `₹${parseFloat(analytics.monthly_total).toFixed(2)}`;
        
        // Update Budget Progress
        const limit = 5000;
        const total = parseFloat(analytics.monthly_total);
        const ratioText = `${formatMoney(total)} / ${formatMoney(limit)}`;
        const percent = Math.min((total / limit) * 100, 100);
        
        const budgetRatioEl = document.getElementById('budget-ratio');
        if (budgetRatioEl) budgetRatioEl.innerText = `Spent ${ratioText}`;
        
        const budgetFillEl = document.getElementById('budget-fill');
        if (budgetFillEl) budgetFillEl.style.width = `${percent}%`;

        // Render Bar Chart (Monthly/Daily)
        renderBarChart(analytics.daily_spending.labels, analytics.daily_spending.values);

        // Render Pie Chart (Categories)
        renderPieChart(analytics.category_distribution);

    } catch(error) {
        console.error("Budget Load Error", error);
    }
}

let barChartInstance = null;
let pieChartInstance = null;

function renderBarChart(labels, data) {
    const ctx = document.getElementById('monthlyBarChart')?.getContext('2d');
    if (!ctx) return;

    if (barChartInstance) barChartInstance.destroy();

    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Spending',
                data: data,
                backgroundColor: '#4F46E5',
                borderRadius: 6,
                barThickness: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                x: { grid: { display: false }, ticks: { font: { size: 10 } } }
            }
        }
    });
}

function renderPieChart(distribution) {
    const ctx = document.getElementById('categoryPieChart')?.getContext('2d');
    if (!ctx) return;

    if (pieChartInstance) pieChartInstance.destroy();

    const labels = distribution.map(d => d.category);
    const values = distribution.map(d => d.amount);

    const colors = {
        food: '#F59E0B',
        transport: '#06B6D4',
        shopping: '#A855F7',
        entertainment: '#EF4444',
        groceries: '#10B981',
        education: '#4F46E5',
        other: '#64748B'
    };

    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: labels.map(l => colors[l.toLowerCase()] || '#E5E7EB'),
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { 
                    position: 'right',
                    labels: { 
                        usePointStyle: true, 
                        boxWidth: 6, 
                        padding: 15,
                        font: { family: 'Outfit', size: 11 } 
                    } 
                }
            }
        }
    });
}

async function loadOffersAndDeals() {
    const offersList = document.getElementById('offers-list');
    const dealsList = document.getElementById('deals-list');
    
    try {
        const offers = await api.getOffers();
        if (!offers || offers.length === 0) {
            offersList.innerHTML = '<p class="empty-state">No offers right now.</p>';
            dealsList.innerHTML = '<p class="empty-state">No brand deals right now.</p>';
            return;
        }

        // Split offers into two sets for the two horizontal scrolls
        const topOffers = offers.slice(0, 3);
        const brandDeals = offers.slice(3);

        const renderOfferCard = (o) => `
            <div class="offer-card">
                <div class="offer-header">
                    <div class="offer-logo">
                        <img src="${o.image_url || 'https://img.icons8.com/color/48/gift.png'}" alt="${o.provider}">
                    </div>
                    <div class="offer-info">
                        <h4>${o.provider}</h4>
                        <p>${o.title}</p>
                    </div>
                </div>
                <div class="cashback-text">${o.discount || '₹50'} Cashback</div>
                <button class="btn primary" onclick="window.open('${o.redirect_url}', '_blank')" style="padding: 10px; font-size: 13px; border-radius: 12px;">Redeem Now</button>
            </div>
        `;

        offersList.innerHTML = topOffers.map(renderOfferCard).join('');
        dealsList.innerHTML = brandDeals.map(renderOfferCard).join('');

    } catch (e) {
        console.error("Offers Load error:", e);
    }
}

async function loadOpportunitiesTab() {
    const list = document.getElementById('opps-list');
    try {
        const opps = await api.getOpportunities();
        if (!opps || opps.length === 0) {
            list.innerHTML = '<p class="empty-state" style="text-align:center; padding:40px 20px; color:var(--text-muted);">No opportunities available right now. Please check again later.</p>';
            return;
        }

        function render(filter) {
            const filtered = filter === 'all' ? opps : opps.filter(o => o.type === filter);
            if (filtered.length === 0) {
                list.innerHTML = '<p class="empty-state" style="text-align:center; padding:40px 20px; color:var(--text-muted);">No matching opportunities found.</p>';
                return;
            }
            list.innerHTML = filtered.map(o => {
                const isJob = o.type === 'job';
                const tagColor = isJob ? '#EEF2FF' : '#F5F3FF';
                const tagTextColor = isJob ? '#4F46E5' : '#8B5CF6';
                const tagLabel = isJob ? '💼 Part-Time Job' : '🎓 Scholarship';
                
                return `
                    <div class="offer-card">
                        <div style="background: ${tagColor}; color: ${tagTextColor}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; align-self: flex-start; margin-bottom: 4px;">${tagLabel}</div>
                        <h4 style="font-size: 15px; margin-bottom: 8px;">${o.title}</h4>
                        <p style="font-size: 12px; margin-bottom: 4px;">📍 ${o.detail_1}</p>
                        <p style="font-size: 12px; margin-bottom: 12px;">💰 ${o.detail_2}</p>
                        <button class="btn primary" onclick="window.open('${o.apply_url || '#'}', '_blank')" style="padding: 10px; font-size: 13px; border-radius: 12px;">Apply Now</button>
                    </div>
                `;
            }).join('');
        }

        render('all');

        // Filter Logic
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                render(e.target.getAttribute('data-filter'));
            });
        });
    } catch (e) {
        list.innerHTML = '<p class="empty-state" style="text-align:center; padding:40px 20px; color:var(--text-muted);">Could not load opportunities. Please try again later.</p>';
        console.error(e);
    }
}

// --- Modals & Popups --- //

function openModal(htmlContent) {
    document.getElementById('modal-content').innerHTML = htmlContent;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function hideModal() {
    // Stop camera if running
    if (html5QrCode) {
        try {
            html5QrCode.stop().then(() => html5QrCode.clear()).catch(e => {});
        } catch(e) {}
    }
    document.getElementById('modal-overlay').style.display = 'none';
}

function showScanModal() {
    openModal(`
        <div id="scan-flow-container">
            <h3>📷 Scan & Pay</h3>
            <p class="mb-10 text-muted">Position the QR code inside the frame.</p>
            
            <div class="scanner-container">
                <div id="reader"></div>
                <div class="scan-line" id="scan-line-anim" style="display:none;"></div>
            </div>
            
            <button class="btn secondary mb-10" onclick="stopScannerAndShowManual()">Enter ID Manually</button>
        </div>
        
        <div id="pay-flow-container" style="display: none;">
            <h3>💸 Complete Payment</h3>
            <div class="input-group mt-2">
                <label>Paying to:</label>
                <input type="text" id="scan-target" disabled>
            </div>
            <div class="input-group">
                <label>Amount (₹)</label>
                <input type="number" id="scan-amount" placeholder="e.g. 150">
            </div>
            <button class="btn primary" id="btn-confirm-scan-pay">Pay Now</button>
        </div>
    `);

    // Initialize scanner
    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    // First figure out what cameras are actually plugged in (e.g. laptop vs phone)
    Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length) {
            // Default to back camera, but grab the first available if not found
            let cameraId = devices[0].id;
            for (let i = 0; i < devices.length; i++) {
                if (devices[i].label.toLowerCase().includes("back")) {
                    cameraId = devices[i].id;
                    break;
                }
            }
            
            html5QrCode.start(
                cameraId, 
                config,
                (decodedText, decodedResult) => {
                    html5QrCode.stop().then(() => {
                        html5QrCode.clear();
                        showPaymentForm(decodedText);
                    }).catch(e => console.error(e));
                },
                (errorMessage) => { }
            ).then(() => {
                document.getElementById('scan-line-anim').style.display = 'block';
            }).catch(err => {
                document.getElementById('reader').innerHTML = '<p style="color:red; text-align:center; padding: 20px;">Camera access denied. Please click "Allow" in your browser or enter ID manually.</p>';
            });
        }
    }).catch(err => {
        document.getElementById('reader').innerHTML = '<p style="color:red; text-align:center; padding: 20px;">Could not request camera. Are you on a secure (HTTPS or localhost) connection?</p>';
    });
}

function stopScannerAndShowManual() {
    if(html5QrCode) {
        try {
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                showPaymentForm("");
                document.getElementById('scan-target').disabled = false;
            }).catch(err => {
                showPaymentForm("");
                document.getElementById('scan-target').disabled = false;
            });
        } catch(e) {
            showPaymentForm("");
            document.getElementById('scan-target').disabled = false;
        }
    } else {
        showPaymentForm("");
        document.getElementById('scan-target').disabled = false;
    }
}

function showPaymentForm(scannedId) {
    document.getElementById('scan-flow-container').style.display = 'none';
    const payFlow = document.getElementById('pay-flow-container');
    payFlow.style.display = 'block';
    
    let displayName = scannedId;
    if (scannedId.toLowerCase().startsWith('upi://')) {
        try {
            const url = new URL(scannedId);
            const params = new URLSearchParams(url.search);
            displayName = params.get('pn') || params.get('pa') || scannedId;
            displayName = displayName.replace(/\+/g, ' ');
        } catch(e) {}
    }
    
    const targetInput = document.getElementById('scan-target');
    targetInput.value = displayName;
    
    document.getElementById('btn-confirm-scan-pay').onclick = async () => {
        const amt = parseFloat(document.getElementById('scan-amount').value);
        if (!amt || amt <= 0) return showErrorModal('Enter a valid amount');
        
        try {
            const res = await api.transfer(amt, displayName);
            await updateUIState();
            showSuccessModal(amt, displayName, "payment", res.transaction_id);
            hideModal();
        } catch(e) { showErrorModal(e.message); }
    };
}

function showSendModal() {
    openModal(`
        <h3>📱 Pay via Phone</h3>
        <div class="input-group">
            <label>Phone Number</label>
            <input type="tel" id="send-target" placeholder="9876543210">
        </div>
        <div class="input-group">
            <label>Amount (₹)</label>
            <input type="number" id="send-amount" placeholder="e.g. 500">
        </div>
        <button class="btn primary" onclick="handlePhoneTransfer()">Send Money</button>
    `);
}

function showSavingsModal() {
    openModal(`
        <h3>🏦 Savings Pocket</h3>
        <p class="mb-20 text-muted">Move money to avoid spending it!</p>
        <div class="input-group">
            <label>Amount (₹)</label>
            <input type="number" id="save-amount" placeholder="e.g. 500">
        </div>
        <div style="display:flex; gap:10px;">
            <button class="btn primary" onclick="handleSavings('save-amount', 'deposit')">Deposit to Savings</button>
            <button class="btn secondary" onclick="handleSavings('save-amount', 'withdraw')">Withdraw to Wallet</button>
        </div>
    `);
}

function showReceiveModal() {
    const user = JSON.parse(localStorage.getItem('budgetai_user'));
    if (!user || !user.finzen_id) {
        return showErrorModal("Your account does not have a Finzen ID yet. Please log out and log back in to refresh your profile.");
    }
    
    // Feature 3: Generate QR Code String
    const qrData = `finzen://pay?receiver=${user.finzen_id}`;
    // Use QR Server API for rendering
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}&margin=10`;
    
    openModal(`
        <div style="text-align:center;">
            <h3 style="margin-bottom: 5px; font-size: 24px;">Receive Money</h3>
            <p style="color:var(--text-muted); font-size:14px; margin-bottom: 20px;">Show this QR code to receive payments instantly.</p>
            
            <div style="background:white; padding:15px; border-radius:16px; margin-bottom:15px; display:inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <img src="${qrUrl}" alt="QR Code" style="width: 200px; height: 200px; display: block; margin: 0 auto; border-radius: 8px;">
            </div>
            
            <div style="background: #f9fafb; padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: left; border: 1px solid #e5e7eb;">
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">Your Finzen ID</p>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong id="display-finzen-id" style="color:var(--text-main); font-family: monospace; font-size: 16px; letter-spacing: 0.5px;">${user.finzen_id}</strong>
                    <button class="btn-icon" onclick="navigator.clipboard.writeText('${user.finzen_id}').then(() => alert('Copied to clipboard!'))" style="background:var(--primary); color:white; border:none; border-radius:6px; cursor:pointer; padding:6px 12px; font-size: 13px; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">Copy</button>
                </div>
            </div>
            
            <button class="btn primary" onclick="hideModal()">Done</button>
        </div>
    `);
}

function showAIModal() {
    openModal(`
        <h3>🤖 Ask AI Budget Advisor</h3>
        <p class="mb-10 text-muted" style="font-size:12px">Powered by Mistral AI</p>
        <div id="ai-chat-history" style="height: 200px; overflow-y:auto; background:#f9fafb; padding:10px; border-radius:12px; margin-bottom:15px; font-size:14px;">
            <p><strong>AI:</strong> Hello! I analyzed your spending. How can I help you save money today?</p>
        </div>
        <div style="display:flex; gap:10px;">
            <input type="text" id="ai-input" placeholder="e.g., Can I afford a PS5?" style="flex:1;">
            <button class="btn primary" style="width:auto; padding:0 20px;" onclick="handleAIChat()">Send</button>
        </div>
    `);
}

// --- Action Handlers --- //

async function handlePhoneTransfer() {
    const phoneInput = document.getElementById('send-target').value.trim();
    const amount = parseFloat(document.getElementById('send-amount').value);
    
    const digitsOnly = phoneInput.replace(/\D/g, ''); 
    if (digitsOnly.length < 10) {
        return showErrorModal('Please enter a valid 10-digit phone number.');
    }

    if (!amount || amount <= 0) return showErrorModal('Enter a valid amount');
    
    // Simulate searching for recipient
    const recipientName = phoneInput.endsWith('0') ? "Rahul Sharma" : "Priya Singh"; // Mock logic
    
    if (confirm(`Confirm payment of ₹${amount} to ${recipientName} (${phoneInput})?`)) {
        try {
            const res = await api.transfer(amount, phoneInput);
            await updateUIState(); 
            showSuccessModal(amount, recipientName, "payment", res.transaction_id);
            hideModal();
        } catch(e) { showErrorModal(e.message); }
    }
}

async function handleTransfer(inputId, defaultParty) {
    const amount = parseFloat(document.getElementById(inputId).value);
    if (!amount || amount <= 0) return showErrorModal('Enter a valid amount');
    
    try {
        const res = await api.transfer(amount, defaultParty);
        loadDashboard(); // Refresh
        showSuccessModal(amount, defaultParty, "payment", res.transaction_id, res.requires_categorization, res.merchant_name);
    } catch(e) { showErrorModal(e.message); }
}

async function handleSavings(inputId, action) {
    const amount = parseFloat(document.getElementById(inputId).value);
    if (!amount || amount <= 0) return showErrorModal('Enter a valid amount');
    
    try {
        const res = await api.manageSavings(amount, action);
        loadDashboard(); // Refresh
        const actionStr = action === 'deposit' ? 'Moved to Savings' : 'Withdrawn to Wallet';
        showSuccessModal(amount, actionStr, "savings", res.transaction_id, false, null);
    } catch(e) { showErrorModal(e.message); }
}

function showSuccessModal(amount, target, type="payment", transactionId="") {
    const successOverlay = document.getElementById('success-overlay');
    const successMessage = document.getElementById('success-message');
    const doneBtn = document.getElementById('btn-success-done');

    // Set message
    successMessage.innerText = `₹${parseFloat(amount).toFixed(2)} ${type === "payment" ? "sent successfully to" : "moved to"} ${target}`;
    
    // Trigger Confetti (Simple programmatic implementation)
    createConfetti();

    // Show overlay with premium animation
    successOverlay.classList.add('active');

    // Handle buttons
    doneBtn.onclick = () => {
        successOverlay.classList.remove('active');
        stopConfetti();
    };

    document.getElementById('btn-view-tx').onclick = () => {
        successOverlay.classList.remove('active');
        stopConfetti();
        // Scroll to transactions area on dashboard
        document.getElementById('tx-history').scrollIntoView({ behavior: 'smooth' });
    };
}

/**
 * Premium Celebration Logic
 */
function createConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';
    const colors = ['#4F46E5', '#10B981', '#38BDF8', '#F59E0B', '#FFFFFF'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.cssText = `
            position: absolute;
            width: ${Math.random() * 10 + 5}px;
            height: ${Math.random() * 10 + 5}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}%;
            top: -10px;
            opacity: ${Math.random()};
            transform: rotate(${Math.random() * 360}deg);
            animation: fall ${Math.random() * 3 + 2}s linear infinite;
        `;
        container.appendChild(confetti);
    }
    
    // Add dynamic animation keyframes if not already present
    if (!document.getElementById('confetti-styles')) {
        const style = document.createElement('style');
        style.id = 'confetti-styles';
        style.innerHTML = `
            @keyframes fall {
                to { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

function stopConfetti() {
    const container = document.getElementById('confetti-container');
    if (container) container.innerHTML = '';
}

function showErrorModal(message) {
    openModal(`
        <div class="success-modal-content">
            <div class="success-icon-wrapper" style="background: #fee2e2; box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);">
                <div class="success-icon" style="color: #ef4444;">!</div>
            </div>
            <h3 style="margin-top:20px; color:var(--text-main); font-size: 24px;">Action Failed</h3>
            <p style="color:var(--text-muted); font-size: 15px; margin-top:10px;">${message}</p>
            <button class="btn primary" style="margin-top:30px; background:#ef4444;" onclick="hideModal()">Close</button>
        </div>
    `);
}

function showCategorySelectionModal(transactionId, merchantName) {
    // Feature 7: Manual Category Selection UI
    openModal(`
        <div class="modal-header">
            <h3>Categorize Payment</h3>
            <button class="close-btn" onclick="hideModal()">&times;</button>
        </div>
        <p style="margin-bottom:15px; color:var(--text-muted); font-size:14px; text-align:center;">
          We didn't recognize <strong>${merchantName}</strong>. Select the category for this transaction so Budget AI can track it accurately.
        </p>
        <div class="input-group">
            <label>Select Category</label>
            <select id="manual-category" required>
                <option value="food">Food</option>
                <option value="transport">Transport</option>
                <option value="shopping">Shopping</option>
                <option value="entertainment">Entertainment</option>
                <option value="education">Education</option>
                <option value="groceries">Groceries</option>
                <option value="electronics">Electronics</option>
                <option value="other">Other</option>
            </select>
        </div>
        <button class="btn primary" style="margin-top:10px;" onclick="submitCategory('${transactionId}', '${merchantName.replace(/'/g, "\\'")}')">Save Category</button>
    `);
}

async function submitCategory(transactionId, merchantName) {
    const category = document.getElementById('manual-category').value;
    try {
        await api.categorizeTransaction(transactionId, merchantName, category);
        hideModal();
        loadBudgetTab(); // Refresh the chart to reflect the new category!
    } catch(e) {
        showErrorModal(e.message || "Failed to map category");
    }
}

async function handleModernAIChat() {
    const input = document.getElementById('chat-input');
    const container = document.getElementById('chat-messages');
    const msg = input.value.trim();
    if (!msg) return;

    // Append User Message
    appendMessage('user', msg);
    input.value = '';

    // Show Typing Indicator
    const typingId = showTypingIndicator();
    
    try {
        const response = await api.askAI(msg);
        removeTypingIndicator(typingId);
        appendMessage('bot', response.reply);
    } catch (e) {
        removeTypingIndicator(typingId);
        const errorText = e.message || "I'm having a bit of trouble connecting to my brain.";
        appendMessage('bot', `${errorText} 🧠`);
        console.error("Chat Error:", e);
    }
}

function appendMessage(sender, text) {
    const container = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${sender}-msg`;
    
    // Simple markdown-ish formatting
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/^\* (.*?)$/gm, '• $1');
    formattedText = formattedText.replace(/\n/g, '<br>');

    msgDiv.innerHTML = `<p>${formattedText}</p>`;
    container.appendChild(msgDiv);
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

function showTypingIndicator() {
    const container = document.getElementById('chat-messages');
    const id = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.id = id;
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    container.appendChild(typingDiv);
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

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
            document.getElementById('user-greeting').textContent = `Hi, ${res.user.name.split(' ')[0]} 👋`;
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
            document.getElementById('user-greeting').textContent = `Hi, ${res.user.name.split(' ')[0]} 👋`;
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
            // Update active state
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Switch tab content
            const target = e.currentTarget.getAttribute('data-target');
            document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
            document.getElementById(target).style.display = 'block';
            currentTab = target;

            // Load data based on tab
            if (target === 'tab-pay') loadDashboard();
            if (target === 'tab-budget') loadBudgetTab();
            if (target === 'tab-offers') loadOffersTab();
            if (target === 'tab-opportunities') loadOpportunitiesTab();
        });
    });

    // --- PAY Tab Actions --- //
    document.getElementById('btn-receive').addEventListener('click', showReceiveModal);
    document.getElementById('btn-scan').addEventListener('click', showScanModal);
    document.getElementById('btn-send').addEventListener('click', showSendModal);
    document.getElementById('btn-savings').addEventListener('click', showSavingsModal);
    document.getElementById('modal-close').addEventListener('click', hideModal);

    // --- BUDGET Tab Actions --- //
    // Manual expenses removed per dynamic requirement.


    document.getElementById('chatbot-fab').addEventListener('click', showAIModal);
});

// --- UI Helpers --- //
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById(screenId).style.display = 'flex';
}

function formatMoney(amount) {
    return '₹' + parseFloat(amount).toFixed(2);
}

function formatDate(dateString) {
    const d = new Date(dateString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function cleanUPIName(name) {
    if (!name) return "Payment";
    let text = name;
    if (text.toLowerCase().includes("upi://")) {
        try {
            const match = text.match(/(upi:\/\/[^\s]+)/i);
            if (match) {
                const urlStr = match[1];
                const url = new URL(urlStr);
                const params = new URLSearchParams(url.search);
                let clean = params.get('pn') || params.get('pa') || urlStr;
                return text.replace(urlStr, clean.replace(/\+/g, ' '));
            }
        } catch(e) {}
    }
    return text;
}

// --- Data Loading Functions --- //

async function loadDashboard() {
    try {
        const [wallet, transactions] = await Promise.all([
            api.getWallet(),
            api.getTransactions()
        ]);

        document.getElementById('wallet-balance').textContent = formatMoney(wallet.wallet_balance);
        document.getElementById('savings-balance').textContent = formatMoney(wallet.savings_balance);

        const txList = document.getElementById('tx-history');
        if (transactions.length === 0) {
            txList.innerHTML = '<li class="list-item empty-state">No recent transactions</li>';
        } else {
            txList.innerHTML = transactions.map(tx => {
                const isSend = tx.type.includes('payment') || tx.type === 'savings_deposit' || tx.type === 'savings_transfer' || tx.type === 'send';
                const sign = isSend ? '-' : '+';
                const colorClass = isSend ? 'tx-send' : 'tx-receive';
                const displayName = cleanUPIName(tx.receiver);
                return `
                    <li class="list-item">
                        <div class="tx-info" style="min-width: 0; flex: 1; padding-right: 15px;">
                            <h4 style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;">${displayName}</h4>
                            <p>${formatDate(tx.timestamp)}</p>
                        </div>
                        <div class="tx-amount ${colorClass}" style="white-space: nowrap;">${sign}${formatMoney(tx.amount)}</div>
                    </li>
                `;
            }).join('');
        }
    } catch (error) {
        console.error("Dashboard Load Error", error);
    }
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
        document.getElementById('monthly-total').innerText = `₹${parseFloat(analytics.monthly_total).toFixed(2)}`;
        
        // Update Category Percentages
        const catList = document.getElementById('category-percentages');
        if (analytics.category_distribution.length === 0) {
            catList.innerHTML = '<li class="list-item empty-state">No categories found this month</li>';
        } else {
            catList.innerHTML = analytics.category_distribution.map(cat => `
                <li class="list-item" style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight: 600;">${cat.category}</span>
                    <span style="color:var(--text-main); font-weight:700;">${cat.percentage}% <span style="font-size:12px; color:var(--text-muted); font-weight:normal; margin-left:5px;">(₹${cat.amount.toFixed(2)})</span></span>
                </li>
            `).join('');
        }

        // Render Bar Chart
        renderChart(analytics.daily_spending.labels, analytics.daily_spending.values);

    } catch(error) {
        console.error("Budget Load Error", error);
    }
}

function renderChart(labels, data) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    // Destroy previous instance to prevent overlapping
    if (expenseChartInstance) {
        expenseChartInstance.destroy();
    }

    if (data.length === 0) return;

    expenseChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Daily Spending (₹)',
                data: data,
                backgroundColor: '#4f46e5',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { display: false } // Hide legend for cleaner bar chart look
            }
        }
    });
}

async function loadOffersTab() {
    const list = document.getElementById('offers-list');
    try {
        const offers = await api.getOffers();
        if (!offers || offers.length === 0) {
            list.innerHTML = '<p class="empty-state" style="text-align:center; padding:40px 20px; color:var(--text-muted);">No offers available right now. Please check again later.</p>';
            return;
        }
        list.innerHTML = offers.map(o => `
            <div class="opp-card" style="position:relative; overflow:hidden;">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
                    <img src="${o.image_url || 'https://img.icons8.com/color/48/gift.png'}" alt="${o.provider}" style="width:42px; height:42px; border-radius:10px; object-fit:cover;">
                    <div style="flex:1; min-width:0;">
                        <h4 style="margin:0; font-size:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${o.title}</h4>
                        <p style="margin:2px 0 0; font-size:12px; color:var(--text-muted);">${o.provider}</p>
                    </div>
                    <span class="tag" style="background:rgba(16,185,129,0.12); color:#059669; font-weight:700; font-size:13px; padding:4px 10px; border-radius:6px; white-space:nowrap;">${o.discount} OFF</span>
                </div>
                <p style="font-size:13px; color:var(--text-muted); margin-bottom:8px; line-height:1.4;">${o.description || ''}</p>
                <p style="font-size:11px; color:var(--text-muted); margin-bottom:12px;">Valid until: ${o.expiry_date}</p>
                <button class="btn primary small" onclick="window.open('${o.redirect_url}', '_blank')" style="width:100%;">Claim Offer</button>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = '<p class="empty-state" style="text-align:center; padding:40px 20px; color:var(--text-muted);">Could not load offers. Please try again later.</p>';
        console.error(e);
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
                const tagColor = isJob ? 'rgba(37,99,235,0.1)' : 'rgba(168,85,247,0.1)';
                const tagTextColor = isJob ? '#2563eb' : '#9333ea';
                const tagLabel = isJob ? '💼 Part-Time Job' : '🎓 Scholarship';
                const icon1 = isJob ? '📍' : '✅';
                const icon2 = isJob ? '💰' : '📅';
                const applyUrl = o.apply_url || '#';
                return `
                    <div class="opp-card ${o.type}">
                        <div class="tags"><span class="tag" style="background:${tagColor}; color:${tagTextColor}; font-weight:600;">${tagLabel}</span></div>
                        <h4 style="margin: 8px 0 6px;">${o.title}</h4>
                        <p style="font-size:13px; color:var(--text-muted); margin-bottom:4px;">${icon1} ${o.detail_1}</p>
                        <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">${icon2} ${o.detail_2}</p>
                        <button class="btn primary small" onclick="window.open('${applyUrl}', '_blank')" style="width:100%;">Apply Now</button>
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
    
    // Check if the scanned string is a standard India UPI QR code url
    let displayName = scannedId;
    if (scannedId.toLowerCase().startsWith('upi://')) {
        try {
            const url = new URL(scannedId);
            const params = new URLSearchParams(url.search);
            // Try to grab Payee Name (pn), fallback to Payee Address (pa)
            displayName = params.get('pn') || params.get('pa') || scannedId;
            
            // Clean up + signs occasionally used for spaces in UPI names
            displayName = displayName.replace(/\+/g, ' ');
        } catch(e) { /* ignore parse errors and use raw string */ }
    } else if (scannedId.toLowerCase().startsWith('finzen://pay')) {
        // Feature 4: QR Payment Flow Integration
        try {
            const url = new URL(scannedId);
            const params = new URLSearchParams(url.search);
            displayName = params.get('receiver') || scannedId;
        } catch(e) {}
    }
    
    const targetInput = document.getElementById('scan-target');
    targetInput.value = displayName;
    
    document.getElementById('btn-confirm-scan-pay').onclick = () => {
        handleTransfer('scan-amount', targetInput.value || 'Manual Entry');
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
        <p class="mb-10 text-muted" style="font-size:12px">Powered by Google Gemini</p>
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
    
    // Feature 1: Phone Validation
    const digitsOnly = phoneInput.replace(/\D/g, ''); // strip non-numeric
    if (digitsOnly.length < 10) {
        return showErrorModal('Invalid phone number. Please enter a valid 10-digit phone number.');
    }

    const amount = parseFloat(document.getElementById('send-amount').value);
    if (!amount || amount <= 0) return showErrorModal('Enter a valid amount');
    
    try {
        const res = await api.transfer(amount, phoneInput);
        loadDashboard(); // Refresh
        showSuccessModal(amount, phoneInput, "payment", res.transaction_id, res.requires_categorization, res.merchant_name);
    } catch(e) { showErrorModal(e.message); }
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

function showSuccessModal(amount, target, type="payment", transactionId="", requiresCategorization=false, merchantName=null) {
    const dateStr = new Date().toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'});
    const title = type === "payment" ? "Payment Successful" : "Transfer Successful";
    const label = type === "payment" ? "Paid to" : "Action";
    
    const txnHtml = transactionId ? `<p style="margin-top: 10px; font-size: 13px; color: var(--text-muted); padding: 6px; background: rgba(0,0,0,0.03); border-radius: 6px; border: 1px dashed rgba(0,0,0,0.1);">Transaction ID: <strong style="color:var(--text-main)">${transactionId}</strong></p>` : '';
    
    // Feature 7: Hook into Done button to conditionally pop category modal
    let doneAction = `hideModal()`;
    if (requiresCategorization && transactionId && merchantName) {
        doneAction = `showCategorySelectionModal('${transactionId}', '${merchantName.replace(/'/g, "\\'")}')`;
    }

    openModal(`
        <div class="success-modal-content">
            <div class="fintech-success-wrapper">
              <div class="glow-bg"></div>
              <div class="ripple-ring"></div>
              <div class="sparkles">
                <div class="sparkle s1">✦</div>
                <div class="sparkle s2">✦</div>
                <div class="sparkle s3">✦</div>
                <div class="sparkle s4">✦</div>
              </div>
              <div class="logo-morph-container">
                <svg class="fz-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="z-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#2dd4bf" />
                      <stop offset="100%" stop-color="#059669" />
                    </linearGradient>
                    <linearGradient id="sweep-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="rgba(255,255,255,0)" />
                      <stop offset="50%" stop-color="rgba(255,255,255,0.8)" />
                      <stop offset="100%" stop-color="rgba(255,255,255,0)" />
                    </linearGradient>
                    <clipPath id="z-clip">
                      <path d="M52 30 h 25 v 8 l -15 24 h 15 v 8 h -26 v -8 l 15 -24 h -14 z"/>
                    </clipPath>
                  </defs>
                  <rect width="100" height="100" rx="24" fill="#0B2A5B" class="logo-bg" />
                  <g class="letters-group">
                    <path class="fz-f" d="M22 30 h 22 v 8 h -14 v 8 h 11 v 8 h -11 v 16 h -8 z" fill="#ffffff" />
                    <path class="fz-z" d="M52 30 h 25 v 8 l -15 24 h 15 v 8 h -26 v -8 l 15 -24 h -14 z" fill="url(#z-gradient)" />
                    <rect class="light-sweep" x="-50" y="0" width="30" height="100" fill="url(#sweep-gradient)" clip-path="url(#z-clip)" transform="skewX(-20)" />
                  </g>
                  <path class="success-check" d="M28 52 l 14 14 l 30 -30" fill="none" stroke="#2dd4bf" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
            </div>
            
            <h3 style="margin-top:20px; color:var(--text-main); font-size: 24px;">${title}</h3>
            <p class="text-muted" style="margin-top:5px; font-size: 14px;">${dateStr}</p>
            
            <div class="success-details">
                <p style="font-size:32px; font-weight:700; color:var(--text-main); margin-bottom:5px;">₹${parseFloat(amount).toFixed(2)}</p>
                <p style="color:var(--text-muted); font-size: 15px;">${label}: <strong style="color:var(--text-main)">${target}</strong></p>
                ${txnHtml}
            </div>

            <button class="btn primary" style="margin-top:20px; background:var(--primary);" onclick="${doneAction}">Done</button>
        </div>
    `);
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

async function handleAIChat() {
    const input = document.getElementById('ai-input');
    const msg = input.value;
    if(!msg) return;

    const historyBox = document.getElementById('ai-chat-history');
    
    // Add user message
    historyBox.innerHTML += `<p style="text-align:right; margin-top:10px;"><strong>You:</strong> ${msg}</p>`;
    input.value = '';
    
    // Add loading
    historyBox.innerHTML += `<p id="ai-loading" style="margin-top:10px; color:var(--text-muted)"><em>AI is thinking...</em></p>`;
    historyBox.scrollTop = historyBox.scrollHeight;

    try {
        const response = await api.askAI(msg);
        document.getElementById('ai-loading').remove();
        
        // Format markdown: Bold (**text**)
        let formattedReply = response.reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Format markdown: Bullet points (* text)
        formattedReply = formattedReply.replace(/^\* (.*?)$/gm, '• $1');
        
        // Format line breaks (\n)
        formattedReply = formattedReply.replace(/\n/g, '<br>');

        historyBox.innerHTML += `<div style="margin-top:12px; line-height:1.5; background:white; padding:10px; border-radius:10px; border-left:4px solid var(--primary);"><strong>AI:</strong> ${formattedReply}</div>`;
    } catch(e) {
        document.getElementById('ai-loading').remove();
        historyBox.innerHTML += `<p style="margin-top:10px; color:red;"><strong>Error:</strong> ${e.message || 'Failed to connect to AI.'}</p>`;
    }
    historyBox.scrollTo({ top: historyBox.scrollHeight, behavior: 'smooth' });
}

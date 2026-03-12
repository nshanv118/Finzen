# 🎓 Student Budget AI — Financial Super App

A smart AI-powered budgeting assistant and financial super-app designed to help students manage their money, track expenses, achieve saving goals, and find opportunities.

Built to support **SDG-1** (No Poverty), **SDG-8** (Decent Work & Economic Growth), and **SDG-12** (Responsible Consumption).

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.13 / FastAPI |
| AI Engine | Google Gemini 2.0 Flash (`google-genai`) |
| Database | SQLite (SQLAlchemy) |
| Frontend | HTML5, CSS3 (Custom Glassmorphism), Vanilla JS |
| Analytics | Chart.js |

## ⚙️ How to Run Locally

### 1. Setup the Backend
Open a terminal in the project root:
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

### 2. Configure Environment
Create a `.env` file in the `backend` folder and add your Gemini API Key:
```env
GEMINI_API_KEY=your_api_key_here
```

### 3. Start the API Server
```bash
uvicorn main:app --reload
```
The API will run at `http://127.0.0.1:8000`. 
*(Note: A test user `9876543210` / `password123` with demo data is auto-seeded!)*

### 4. Start the Frontend
The frontend requires no build steps! Just open `frontend/index.html` in your web browser, or use a tool like VS Code Live Server.

## 📱 Features
1. **Pay Dashboard**: Simulated Wallet, Scan & Pay, Send Money, Savings Pocket.
2. **AI Budget**: Expense tracking, category breakdown (pie charts), and Gemini-powered financial advice.
3. **Offers**: Student discounts to save money.
4. **Opportunities**: Scholarships and part-time jobs board.

## 📄 License
Educational Hackathon Project.

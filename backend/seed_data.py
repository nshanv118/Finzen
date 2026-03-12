from sqlalchemy.orm import Session
import os, sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
import models

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

def seed_db():
    db = SessionLocal()
    
    # Check if user already exists
    if db.query(models.User).first():
        print("Database already seeded. Skipping.")
        db.close()
        return

    print("Seeding database with demo data...")
    import uuid
    
    # 1. Create a Test User
    user = models.User(
        phone="9876543210",
        name="Test User",
        password_hash="password123", # Remember, just for demo
        wallet_balance=2500.0,
        savings_balance=800.0,
        finzen_id="finzen@testuser1234"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # 2. Add some Transactions (both incoming and outgoing)
    transactions = [
        # Incoming
        models.Transaction(
            transaction_id=f"TXN-{uuid.uuid4().hex[:8].upper()}",
            user_id=user.id, 
            type="receive", 
            amount=1500.0, 
            receiver="Freelance Delivery",
            category="other"
        ),
        # Outgoing / Expense
        models.Transaction(
            transaction_id=f"TXN-{uuid.uuid4().hex[:8].upper()}",
            user_id=user.id, 
            type="payment", 
            amount=120.0, 
            receiver="Campus Cafe",
            category="food"
        ),
        # Savings
        models.Transaction(
            transaction_id=f"TXN-{uuid.uuid4().hex[:8].upper()}",
            user_id=user.id, 
            type="savings_deposit", 
            amount=800.0, 
            receiver="To Savings Pocket",
            category="savings"
        ),
        # More Expenses
        models.Transaction(
            transaction_id=f"TXN-{uuid.uuid4().hex[:8].upper()}",
            user_id=user.id, 
            type="payment", 
            amount=400.0, 
            receiver="Metro Pass",
            category="transport"
        ),
        models.Transaction(
            transaction_id=f"TXN-{uuid.uuid4().hex[:8].upper()}",
            user_id=user.id, 
            type="payment", 
            amount=250.0, 
            receiver="Movie Ticket",
            category="entertainment"
        ),
    ]
    db.add_all(transactions)
    
    db.commit()
    print("Database seeded successfully!")
    print(f"Test User Created: Phone: 9876543210 | Password: password123 | Token (ID): {user.id}")
    db.close()

if __name__ == "__main__":
    seed_db()

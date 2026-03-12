from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
import uuid
from sqlalchemy import func
import models, schemas
from database import get_db

router = APIRouter(prefix="/wallet", tags=["wallet"])

# Helper dependency to "authenticate" using our mock token (User ID)
def get_current_user_id(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        token = authorization.split(" ")[1]
        return int(token)
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/balance")
def get_balance(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    return {
        "wallet_balance": user.wallet_balance,
        "savings_balance": user.savings_balance
    }

@router.post("/transfer")
def transfer_money(transfer: schemas.TransactionCreate, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    import random
    from ai.engine import classify_merchant

    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if user.wallet_balance < transfer.amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        
    # Deduct from sender
    user.wallet_balance -= transfer.amount
    
    # --- Feature 6: MCC AI Classification ---
    clean_merchant = transfer.receiver.strip()
    
    # 1. Lookup existing category in DB
    existing_mapping = db.query(models.MerchantCategory).filter(
        func.lower(models.MerchantCategory.merchant_name) == clean_merchant.lower()
    ).first()
    
    if existing_mapping:
        category = existing_mapping.expense_category
        requires_categorization = False
    else:
        # 2. Not found -> Fallback to manual selection
        category = "uncategorized"
        requires_categorization = True

    # Generate a unique global transaction ID
    txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"

    # Record unified transaction
    new_transaction = models.Transaction(
        transaction_id=txn_id,
        user_id=user.id,
        type="payment",
        amount=transfer.amount,
        receiver=clean_merchant,
        category=category
    )
    
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    
    return {
        "message": "Payment successful", 
        "new_balance": user.wallet_balance, 
        "transaction_id": txn_id,
        "requires_categorization": requires_categorization,
        "merchant_name": clean_merchant
    }

@router.post("/categorize")
def categorize_transaction(req: schemas.CategorizeRequest, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    import random
    
    # 1. Update the transaction
    txn = db.query(models.Transaction).filter(
        models.Transaction.transaction_id == req.transaction_id,
        models.Transaction.user_id == user_id
    ).first()
    
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    txn.category = req.category
    
    # 2. Save mapping for future
    existing_mapping = db.query(models.MerchantCategory).filter(
        func.lower(models.MerchantCategory.merchant_name) == req.merchant_name.lower()
    ).first()
    
    if not existing_mapping:
        mcc_code = str(random.randint(1000, 9999))
        new_mapping = models.MerchantCategory(
            merchant_name=req.merchant_name,
            merchant_code=mcc_code,
            expense_category=req.category
        )
        db.add(new_mapping)
        
    db.commit()
    return {"message": "Categorized successfully"}

@router.post("/savings")
def move_to_savings(amount: float, action: str = "deposit", user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if action == "deposit":
        if user.wallet_balance < amount:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        user.wallet_balance -= amount
        user.savings_balance += amount
        receiver = "To Savings Pocket"
    elif action == "withdraw":
        if user.savings_balance < amount:
            raise HTTPException(status_code=400, detail="Insufficient savings balance")
        user.savings_balance -= amount
        user.wallet_balance += amount
        receiver = "From Savings Pocket"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
        
    # Record unified transaction
    new_transaction = models.Transaction(
        transaction_id=txn_id,
        user_id=user.id,
        type="savings_transfer",
        amount=amount,
        receiver=receiver,
        category="savings"
    )
    
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    
    return {"wallet_balance": user.wallet_balance, "savings_balance": user.savings_balance, "transaction_id": txn_id}

@router.get("/transactions")
def get_transactions(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).order_by(models.Transaction.timestamp.desc()).limit(15).all()
    return transactions

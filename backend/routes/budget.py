from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import models, schemas
from database import get_db

router = APIRouter(prefix="/budget", tags=["budget"])

# Helper dependency to "authenticate" using our mock token (User ID)
def get_current_user_id(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        token = authorization.split(" ")[1]
        return int(token)
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/expenses")
def get_expenses(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # Read directly from Transactions where it was an outgoing payment
    expenses = db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == "payment"
    ).order_by(models.Transaction.timestamp.desc()).all()
    return expenses

@router.get("/analytics")
def get_expense_analytics(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    now = datetime.now()
    first_day = datetime(now.year, now.month, 1)
    
    # Query current month expenses, ordered chronologically
    expenses = db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == "payment",
        models.Transaction.timestamp >= first_day
    ).order_by(models.Transaction.timestamp.asc()).all()
    
    monthly_total = 0.0
    category_totals = {}
    daily_totals = {}
    
    for exp in expenses:
        monthly_total += exp.amount
        cat = exp.category.capitalize()
        category_totals[cat] = category_totals.get(cat, 0.0) + exp.amount
        
        # Windows-safe formatting for "Jan 1"
        date_str = exp.timestamp.strftime("%b %d").replace(" 0", " ")
        daily_totals[date_str] = daily_totals.get(date_str, 0.0) + exp.amount
        
    category_distribution = []
    for cat, amount in category_totals.items():
        pct = (amount / monthly_total * 100) if monthly_total > 0 else 0
        category_distribution.append({
            "category": cat,
            "amount": amount,
            "percentage": round(pct, 1)
        })
        
    return {
        "monthly_total": monthly_total,
        "category_distribution": category_distribution,
        "daily_spending": {
            "labels": list(daily_totals.keys()),
            "values": list(daily_totals.values())
        }
    }

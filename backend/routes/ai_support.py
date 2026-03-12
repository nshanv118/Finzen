from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
from database import get_db
from pydantic import BaseModel
from ai.engine import get_ai_insights

router = APIRouter(prefix="/ai", tags=["ai"])

class ChatMessage(BaseModel):
    message: str

def get_current_user_id(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        token = authorization.split(" ")[1]
        return int(token)
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/chat")
def chat_with_ai(chat: ChatMessage, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Calculate total expenses from the unified Transaction table
        total_expenses = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "payment"
        ).scalar() or 0.0
        
        # Get top spending categories
        categories = db.query(
            models.Transaction.category,
            func.sum(models.Transaction.amount).label('total')
        ).filter(
            models.Transaction.user_id == user_id,
            models.Transaction.type == "payment"
        ).group_by(models.Transaction.category).all()
        
        cat_str = "\n".join([f"- {c[0]}: ₹{c[1]}" for c in categories]) if categories else "No expenses recorded yet."
    except Exception as e:
        print(f"DB query error in AI chat: {e}")
        total_expenses = 0.0
        cat_str = "No expense data available."
    
    user_context = f"""
    User Name: {user.name}
    Wallet Balance: ₹{user.wallet_balance}
    Savings Balance: ₹{user.savings_balance}
    Total Recent Expenses: ₹{total_expenses}
    
    Spending Breakdown:
    {cat_str}
    """
    
    try:
        # Call Gemini Engine
        ai_response = get_ai_insights(user_context=user_context, question=chat.message)
    except Exception as e:
        print(f"Engine error in AI chat: {e}")
        ai_response = "I'm having trouble thinking right now. Please try asking again in a moment."
    
    return {"reply": ai_response}


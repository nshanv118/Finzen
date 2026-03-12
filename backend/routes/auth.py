from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas
from database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.phone == user.phone).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Phone already registered")
    
    import uuid
    name_clean = user.name.lower().replace(' ', '')
    fid = f"finzen@{name_clean}{str(uuid.uuid4().hex[:4])}"
    
    # In a real app we'd hash the password, here we just store it
    new_user = models.User(
        phone=user.phone,
        name=user.name,
        password_hash=user.password, # For demo only
        wallet_balance=1000.0, # Give them ₹1000 starting balance
        savings_balance=0.0,
        finzen_id=fid
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login")
def login(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.phone == user.phone).first()
    
    if not db_user or db_user.password_hash != user.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    return {
        "access_token": str(db_user.id), # For hackathon demo, token is just user ID
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "name": db_user.name,
            "phone": db_user.phone,
            "finzen_id": db_user.finzen_id
        }
    }

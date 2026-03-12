from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    phone: str
    name: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    wallet_balance: float
    savings_balance: float
    finzen_id: Optional[str] = None

    class Config:
        orm_mode = True

# --- Transaction Schemas ---
class TransactionCreate(BaseModel):
    category: str = "uncategorized"
    amount: float
    receiver: str

class CategorizeRequest(BaseModel):
    transaction_id: str
    merchant_name: str
    category: str

class TransactionResponse(BaseModel):
    id: int
    transaction_id: str
    type: str
    category: str
    amount: float
    receiver: str
    timestamp: datetime

    class Config:
        orm_mode = True

# --- Opportunity & Offer Schemas ---
class OfferResponse(BaseModel):
    id: int
    title: str
    discount_percentage: int
    partner_platform: str
    validity_period: str

    class Config:
        orm_mode = True

class OpportunityResponse(BaseModel):
    id: int
    type: str
    title: str
    detail_1: str
    detail_2: str

    class Config:
        orm_mode = True

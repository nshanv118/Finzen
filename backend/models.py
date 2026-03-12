from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True)
    name = Column(String)
    password_hash = Column(String)
    wallet_balance = Column(Float, default=5000.0) # Mock starting balance
    savings_balance = Column(Float, default=1000.0)
    finzen_id = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transactions = relationship("Transaction", back_populates="user")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, unique=True, index=True) # TXN-XXXXXXXX
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String) # 'payment', 'transfer', 'savings_transfer', 'expense'
    category = Column(String) # 'food', 'transport', 'entertainment', 'other', 'savings'
    amount = Column(Float)
    receiver = Column(String) # Historically party_name
    timestamp = Column(DateTime(timezone=True), server_default=func.now()) # Historically date

    user = relationship("User", back_populates="transactions")

class Offer(Base):
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    discount_percentage = Column(Integer)
    partner_platform = Column(String)
    validity_period = Column(String)

class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String) # 'scholarship', 'job'
    title = Column(String)
    detail_1 = Column(String) # Eligibility or Location
    detail_2 = Column(String) # Deadline or Pay estimate

class MerchantCategory(Base):
    __tablename__ = "merchant_categories"

    id = Column(Integer, primary_key=True, index=True)
    merchant_name = Column(String, unique=True, index=True)
    merchant_code = Column(String) # MCC style code
    expense_category = Column(String)

from typing import Optional
from decimal import Decimal
from pydantic import BaseModel


class AuthRequest(BaseModel):
    email: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class TransactionCreate(BaseModel):
    type: str
    amount: float
    currency: str = "PLN"
    account_id: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    date: str
    recurrence: str = "none"
    recurrence_end_date: Optional[str] = None
    tag_ids: list[str] = []


class TransactionUpdate(BaseModel):
    type: str
    amount: float
    currency: str = "PLN"
    account_id: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    date: str
    recurrence: str = "none"
    recurrence_end_date: Optional[str] = None
    tag_ids: list[str] = []


class CategoryCreate(BaseModel):
    name: str
    type: str
    icon: Optional[str] = None
    color: Optional[str] = None


class TagCreate(BaseModel):
    name: str
    color: Optional[str] = None


class GoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0
    currency: str = "PLN"
    deadline: Optional[str] = None


class GoalUpdate(BaseModel):
    name: str
    target_amount: float
    current_amount: float
    currency: str = "PLN"
    deadline: Optional[str] = None


class ImportedTransaction(BaseModel):
    type: str
    amount: float
    currency: str = "PLN"
    description: Optional[str] = None
    category: Optional[str] = None
    date: str
    account_id: Optional[str] = None


class SuggestCategoryItem(BaseModel):
    description: str
    type: str


class SuggestCategoryCategory(BaseModel):
    name: str
    type: str


class SuggestCategoryRequest(BaseModel):
    transactions: list[SuggestCategoryItem]
    categories: list[SuggestCategoryCategory]

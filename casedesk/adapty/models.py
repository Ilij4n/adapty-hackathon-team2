"""Shared Adapty models (contract: ARCH.md). Do not change shape without updating ARCH.md."""
from datetime import datetime

from pydantic import BaseModel


class Money(BaseModel):
    amount: float
    currency: str


class Subscription(BaseModel):
    vendor_product_id: str
    store: str  # 'app_store' | 'play_store' | 'stripe' | 'adapty' | other
    access_level_id: str | None = None
    is_active: bool
    is_lifetime: bool = False
    will_renew: bool = False
    starts_at: datetime | None = None
    purchased_at: datetime | None = None
    renewed_at: datetime | None = None
    expires_at: datetime | None = None
    unsubscribed_at: datetime | None = None
    billing_issue_detected_at: datetime | None = None
    is_in_grace_period: bool = False
    is_refund: bool = False
    refunded_at: datetime | None = None
    is_sandbox: bool = False
    is_family_shared: bool = False
    offer_type: str | None = None  # 'free_trial' | 'pay_as_you_go' | ...
    cancellation_reason: str | None = None
    price: Money | None = None


class AccessLevel(BaseModel):
    id: str
    is_active: bool
    is_lifetime: bool = False
    expires_at: datetime | None = None
    will_renew: bool = False
    store: str | None = None
    vendor_product_id: str | None = None
    is_granted_by_developer: bool = False


class Profile(BaseModel):
    profile_id: str
    customer_user_id: str | None = None
    store_country: str | None = None
    platform: str | None = None
    locale: str | None = None
    custom_attributes: dict[str, str | float | bool | None] = {}
    access_levels: list[AccessLevel] = []
    subscriptions: list[Subscription] = []
    sale_context: dict[str, str] = {}  # {'acquisition_channel', 'placement', 'flow'} (placement/flow = CSV stand-in)

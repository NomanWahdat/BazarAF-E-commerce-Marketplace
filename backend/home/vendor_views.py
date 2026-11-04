"""
Vendor profile and settings API views.

This module focuses on production-safe validation and security flows:
- Password change with Django validators
- Email verification resend with cooldown
- Phone OTP send/verify with cooldown and expiration
- Safe settings updates (policies, notifications, appearance)
"""

from __future__ import annotations

import json
import logging
import secrets
import re
import os
from datetime import timedelta
from typing import Any
from django.contrib.auth.hashers import check_password

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .emails import send_email_verification_email
from .models import Product, User, Vendor
from .two_factor import (
    build_qr_data_url,
    build_totp_uri,
    consume_backup_code,
    generate_backup_codes,
    generate_totp_secret,
    hash_backup_codes,
    verify_totp,
)

logger = logging.getLogger(__name__)

PHONE_CODE_TTL_SECONDS = 10 * 60
PHONE_CODE_COOLDOWN_SECONDS = 60
EMAIL_VERIFY_COOLDOWN_SECONDS = 60
SESSIONS_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60
MAX_TRACKED_SESSIONS = 10
TWO_FA_VERIFY_RATE_LIMIT_WINDOW_SECONDS = 60
TWO_FA_VERIFY_RATE_LIMIT_COUNT = 8

COLOR_RE = re.compile(r"^#([A-Fa-f0-9]{6})$")


def _response_error(message: str, code: int = status.HTTP_400_BAD_REQUEST) -> Response:
    return Response({"status": "error", "detail": message}, status=code)


def _bool(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def _cache_key_phone_code(user_id: str) -> str:
    return f"vendor:phone_code:{user_id}"


def _cache_key_phone_cooldown(user_id: str) -> str:
    return f"vendor:phone_cooldown:{user_id}"


def _cache_key_email_cooldown(user_id: str) -> str:
    return f"vendor:email_verify_cooldown:{user_id}"


def _cache_key_sessions(user_id: str) -> str:
    return f"vendor:sessions:{user_id}"


def _remaining_cooldown_seconds(key: str) -> int:
    ttl = cache.ttl(key) if hasattr(cache, "ttl") else None
    if isinstance(ttl, int) and ttl > 0:
        return ttl
    return 0


def _cache_key_2fa_attempts(user_id: str, scope: str) -> str:
    return f"vendor:2fa_attempts:{scope}:{user_id}"


def _is_2fa_rate_limited(user_id: str, scope: str) -> bool:
    key = _cache_key_2fa_attempts(user_id, scope)
    count = cache.get(key, 0)
    if int(count) >= TWO_FA_VERIFY_RATE_LIMIT_COUNT:
        return True
    cache.set(key, int(count) + 1, TWO_FA_VERIFY_RATE_LIMIT_WINDOW_SECONDS)
    return False


def _parse_faqs(raw_faqs: Any) -> list[dict[str, str]]:
    if raw_faqs is None:
        return []

    if isinstance(raw_faqs, str):
        try:
            raw_faqs = json.loads(raw_faqs)
        except json.JSONDecodeError:
            raise ValidationError("FAQs must be valid JSON.")

    if not isinstance(raw_faqs, list):
        raise ValidationError("FAQs must be a list.")

    sanitized: list[dict[str, str]] = []
    for idx, faq in enumerate(raw_faqs):
        if not isinstance(faq, dict):
            raise ValidationError(f"FAQ #{idx + 1} must be an object.")

        question = str(faq.get("question", "")).strip()
        answer = str(faq.get("answer", "")).strip()
        if not question or not answer:
            raise ValidationError(f"FAQ #{idx + 1} requires both question and answer.")
        if len(question) > 300:
            raise ValidationError(f"FAQ #{idx + 1} question is too long (max 300 chars).")
        if len(answer) > 2000:
            raise ValidationError(f"FAQ #{idx + 1} answer is too long (max 2000 chars).")

        sanitized.append({
            "id": faq.get("id", idx + 1),
            "question": question,
            "answer": answer,
        })

    return sanitized


def _parse_featured_product_ids(vendor: Vendor, raw_ids: Any) -> list[str]:
    if raw_ids is None:
        return []

    if isinstance(raw_ids, str):
        try:
            raw_ids = json.loads(raw_ids)
        except json.JSONDecodeError:
            raise ValidationError("featured_products must be valid JSON.")

    if not isinstance(raw_ids, list):
        raise ValidationError("featured_products must be a list.")

    seen: set[str] = set()
    ordered_ids: list[str] = []
    for value in raw_ids:
        product_id = str(value).strip()
        if not product_id or product_id in seen:
            continue
        seen.add(product_id)
        ordered_ids.append(product_id)

    if len(ordered_ids) > 5:
        raise ValidationError("You can select up to 5 featured products.")

    if not ordered_ids:
        return []

    valid_ids = set(
        Product.objects.filter(vendor=vendor, id__in=ordered_ids).values_list("id", flat=True)
    )
    return [pid for pid in ordered_ids if pid in {str(v) for v in valid_ids}]


def _load_featured_product_ids(vendor: Vendor) -> list[str]:
    try:
        parsed = json.loads(vendor.featured_products_json or "[]")
    except json.JSONDecodeError:
        parsed = []
    try:
        return _parse_featured_product_ids(vendor, parsed)
    except ValidationError:
        return []


def _build_security_session_id(request) -> str:
    auth = getattr(request, "auth", None)
    if auth is not None and hasattr(auth, "get"):
        jti = auth.get("sid") or auth.get("jti")
        if jti:
            return str(jti)

    # fallback (session auth or non-jti token)
    if getattr(request, "session", None) is not None and request.session.session_key:
        return f"sess:{request.session.session_key}"

    return f"req:{secrets.token_hex(8)}"


def _client_ip(request) -> str:
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def _simple_device_name(user_agent: str) -> str:
    ua = (user_agent or "").lower()
    if "iphone" in ua:
        return "iPhone"
    if "android" in ua:
        return "Android"
    if "windows" in ua:
        return "Windows"
    if "mac os" in ua or "macintosh" in ua:
        return "macOS"
    if "linux" in ua:
        return "Linux"
    return "Unknown Device"


def _register_current_session(request) -> list[dict[str, Any]]:
    user_id = str(request.user.id)
    key = _cache_key_sessions(user_id)
    sessions = cache.get(key) or []

    session_id = _build_security_session_id(request)
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    now = timezone.now()

    item = {
        "id": session_id,
        "device": _simple_device_name(user_agent),
        "location": _client_ip(request),
        "last_activity": now.isoformat(),
        "user_agent": user_agent,
        "is_current": True,
    }

    updated: list[dict[str, Any]] = []
    found = False
    for s in sessions:
        sid = str(s.get("id", ""))
        if sid == session_id:
            found = True
            s.update(item)
            updated.append(s)
        else:
            s["is_current"] = False
            updated.append(s)

    if not found:
        updated.insert(0, item)

    updated = updated[:MAX_TRACKED_SESSIONS]
    cache.set(key, updated, SESSIONS_CACHE_TTL_SECONDS)
    return updated


def _logout_session_from_cache(user_id: str, session_id: str) -> tuple[list[dict[str, Any]], bool]:
    key = _cache_key_sessions(user_id)
    sessions = cache.get(key) or []
    next_sessions = [s for s in sessions if str(s.get("id")) != str(session_id)]
    removed = len(next_sessions) != len(sessions)

    if next_sessions:
        cache.set(key, next_sessions, SESSIONS_CACHE_TTL_SECONDS)
    else:
        cache.delete(key)

    return next_sessions, removed


def _dispatch_phone_verification_sms(phone: str, code: str) -> bool:
    """
    Production-ready abstraction point for SMS dispatch.

    Current behavior:
    - If SMS_PROVIDER=console (or missing), log OTP in development.
    - For real SMS provider integration (Twilio/AWS SNS/etc), wire credentials and implementation.
    """
    provider = getattr(settings, "SMS_PROVIDER", "console").lower()
    if provider == "console":
        logger.warning("SMS_PROVIDER=console. OTP for %s is %s", phone, code)
        print(f"\\n📱 PHONE VERIFICATION OTP (Development Mode): {code} for {phone}\\n")
        return True

    # Placeholder for real provider transport.
    logger.error("SMS_PROVIDER '%s' is not implemented. Falling back failed.", provider)
    return False


class VendorOnlyPermission(permissions.IsAuthenticated):
    """Require authenticated vendor/admin user and existing vendor profile."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.role in {"vendor", "admin"}


class VendorProfileView(APIView):
    permission_classes = [VendorOnlyPermission]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        vendor = Vendor.objects.filter(user=request.user).first()
        if not vendor:
            return _response_error("Vendor profile not found.", status.HTTP_404_NOT_FOUND)

        first_name = request.user.first_name or (request.user.full_name.split()[0] if request.user.full_name else "")
        last_name = request.user.last_name or (
            " ".join(request.user.full_name.split()[1:])
            if request.user.full_name and len(request.user.full_name.split()) > 1
            else ""
        )

        return Response(
            {
                "status": "success",
                "user": {
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": request.user.email,
                    "phone": request.user.phone,
                },
                "vendor": {
                    "avatar": request.user.avatar.url if getattr(request.user, "avatar", None) else None,
                    "street_address": vendor.address,
                    "city": vendor.city,
                    "province": vendor.province or "",
                    "postal_code": vendor.postal_code or "",
                    "country": vendor.country or "Afghanistan",
                    "status": vendor.status,
                },
            }
        )

    def patch(self, request):
        vendor = Vendor.objects.filter(user=request.user).first()
        if not vendor:
            return _response_error("Vendor profile not found.", status.HTTP_404_NOT_FOUND)

        # Names
        first_name = request.data.get("first_name", request.user.first_name or "").strip()
        last_name = request.data.get("last_name", request.user.last_name or "").strip()
        if first_name or last_name:
            request.user.first_name = first_name
            request.user.last_name = last_name
            request.user.full_name = f"{first_name} {last_name}".strip() or request.user.full_name

        # Email uniqueness
        new_email = request.data.get("email")
        if new_email is not None:
            new_email = str(new_email).strip().lower()
            if new_email and User.objects.filter(email=new_email).exclude(id=request.user.id).exists():
                return _response_error("Email already registered.")
            request.user.email = new_email or None

        # Phone uniqueness
        new_phone = request.data.get("phone")
        if new_phone is not None:
            new_phone = str(new_phone).strip()
            if new_phone and User.objects.filter(phone=new_phone).exclude(id=request.user.id).exists():
                return _response_error("Phone number already registered.")
            request.user.phone = new_phone

        # Avatar upload with size guard
        avatar = request.FILES.get("avatar")
        if avatar:
            if avatar.size > 2 * 1024 * 1024:
                return _response_error("Avatar size must be less than 2MB.")
            request.user.avatar = avatar

        request.user.save()

        vendor.address = str(request.data.get("street_address", vendor.address or "")).strip()
        vendor.city = str(request.data.get("city", vendor.city or "")).strip()
        vendor.province = str(request.data.get("province", vendor.province or "")).strip() or None
        vendor.postal_code = str(request.data.get("postal_code", vendor.postal_code or "")).strip() or None
        vendor.country = str(request.data.get("country", vendor.country or "Afghanistan")).strip() or "Afghanistan"
        vendor.save()

        return Response(
            {
                "status": "success",
                "message": "Profile updated successfully.",
                "avatar": request.user.avatar.url if getattr(request.user, "avatar", None) else None,
            }
        )


class VendorSettingsView(APIView):
    permission_classes = [VendorOnlyPermission]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        vendor = Vendor.objects.filter(user=request.user).first()
        if not vendor:
            return _response_error("Vendor not found.", status.HTTP_404_NOT_FOUND)

        sessions = _register_current_session(request)
        email_cd = _remaining_cooldown_seconds(_cache_key_email_cooldown(str(request.user.id)))
        phone_cd = _remaining_cooldown_seconds(_cache_key_phone_cooldown(str(request.user.id)))

        try:
            faqs = json.loads(vendor.faqs_json or "[]")
        except json.JSONDecodeError:
            faqs = []

        settings_payload = {
            "security": {
                "two_factor_enabled": vendor.two_factor_enabled,
                "two_factor_configured": bool(vendor.totp_secret),
                "two_factor_confirmed_at": vendor.two_factor_confirmed_at.isoformat() if vendor.two_factor_confirmed_at else None,
                "has_backup_codes": bool(vendor.backup_codes_hashed and vendor.backup_codes_hashed != "[]"),
                "email_verified": bool(request.user.email_verified),
                "phone_verified": bool(vendor.phone_verified),
                "sessions": sessions,
                "email_verification_cooldown_seconds": email_cd,
                "phone_verification_cooldown_seconds": phone_cd,
            },
            "policies": {
                "shipping_policy": vendor.shipping_policy or "",
                "return_policy": vendor.return_policy or "",
                "terms_conditions": vendor.terms_conditions or "",
                "privacy_policy": vendor.privacy_policy or "",
                "faqs": faqs,
            },
            "notifications": {
                "email_new_order": vendor.notify_email_new_order,
                "email_order_shipped": vendor.notify_email_order_shipped,
                "email_new_review": vendor.notify_email_new_review,
                "email_new_message": vendor.notify_email_new_message,
                "email_product_approved": vendor.notify_email_product_approved,
                "email_marketing": vendor.notify_email_marketing,
                "sms_urgent_order": vendor.notify_sms_urgent_order,
                "digest_type": vendor.digest_type,
                "in_app_notifications": vendor.notify_in_app,
                "notification_sound": vendor.notify_sound,
            },
            "appearance": {
                "primary_color": vendor.primary_color or "#059669",
                "logo": vendor.logo.url if vendor.logo else None,
                "banner": vendor.banner.url if vendor.banner else None,
                "favicon": vendor.favicon.url if vendor.favicon else None,
                "featured_products": _load_featured_product_ids(vendor),
            },
        }

        return Response({"status": "success", **settings_payload})

    def patch(self, request):
        vendor = Vendor.objects.filter(user=request.user).first()
        if not vendor:
            return _response_error("Vendor not found.", status.HTTP_404_NOT_FOUND)

        # Policies
        if "policies" in request.data:
            try:
                policies_raw = request.data.get("policies")
                if isinstance(policies_raw, str):
                    policies = json.loads(policies_raw)
                else:
                    policies = policies_raw

                if not isinstance(policies, dict):
                    return _response_error("Invalid policies payload.")

                shipping_policy = str(policies.get("shipping_policy", vendor.shipping_policy or "")).strip()
                return_policy = str(policies.get("return_policy", vendor.return_policy or "")).strip()
                terms_conditions = str(policies.get("terms_conditions", vendor.terms_conditions or "")).strip()
                privacy_policy = str(policies.get("privacy_policy", vendor.privacy_policy or "")).strip()

                for name, value in {
                    "shipping_policy": shipping_policy,
                    "return_policy": return_policy,
                    "terms_conditions": terms_conditions,
                    "privacy_policy": privacy_policy,
                }.items():
                    if len(value) > 5000:
                        return _response_error(f"{name} is too long (max 5000 characters).")

                vendor.shipping_policy = shipping_policy
                vendor.return_policy = return_policy
                vendor.terms_conditions = terms_conditions
                vendor.privacy_policy = privacy_policy

                if "faqs" in policies:
                    vendor.faqs_json = json.dumps(_parse_faqs(policies.get("faqs")), ensure_ascii=False)
            except ValidationError as exc:
                return _response_error(str(exc))
            except json.JSONDecodeError:
                return _response_error("Invalid JSON for policies.")

        # Notifications
        if "notifications" in request.data:
            try:
                notif_raw = request.data.get("notifications")
                if isinstance(notif_raw, str):
                    notif = json.loads(notif_raw)
                else:
                    notif = notif_raw

                if not isinstance(notif, dict):
                    return _response_error("Invalid notifications payload.")

                digest_type = str(notif.get("digest_type", vendor.digest_type)).lower().strip()
                if digest_type not in {"instant", "hourly", "daily", "weekly"}:
                    return _response_error("Invalid digest type.")

                vendor.notify_email_new_order = _bool(notif.get("email_new_order"), vendor.notify_email_new_order)
                vendor.notify_email_order_shipped = _bool(notif.get("email_order_shipped"), vendor.notify_email_order_shipped)
                vendor.notify_email_new_review = _bool(notif.get("email_new_review"), vendor.notify_email_new_review)
                vendor.notify_email_new_message = _bool(notif.get("email_new_message"), vendor.notify_email_new_message)
                vendor.notify_email_product_approved = _bool(
                    notif.get("email_product_approved"), vendor.notify_email_product_approved
                )
                vendor.notify_email_marketing = _bool(notif.get("email_marketing"), vendor.notify_email_marketing)
                vendor.notify_sms_urgent_order = _bool(notif.get("sms_urgent_order"), vendor.notify_sms_urgent_order)
                vendor.notify_in_app = _bool(notif.get("in_app_notifications"), vendor.notify_in_app)
                vendor.notify_sound = _bool(notif.get("notification_sound"), vendor.notify_sound)
                vendor.digest_type = digest_type
            except json.JSONDecodeError:
                return _response_error("Invalid JSON for notifications.")

        # Appearance
        appearance_payload = request.data.get("appearance")
        if appearance_payload is not None:
            try:
                appearance = json.loads(appearance_payload) if isinstance(appearance_payload, str) else appearance_payload
                if not isinstance(appearance, dict):
                    return _response_error("Invalid appearance payload.")

                primary_color = appearance.get("primary_color")
                if primary_color is not None:
                    primary_color = str(primary_color).strip()
                    if not COLOR_RE.match(primary_color):
                        return _response_error("Primary color must be a valid hex color (e.g. #059669).")
                    vendor.primary_color = primary_color

                if "featured_products" in appearance:
                    try:
                        featured_ids = _parse_featured_product_ids(vendor, appearance.get("featured_products"))
                    except ValidationError as exc:
                        return _response_error(str(exc))
                    vendor.featured_products_json = json.dumps(featured_ids)
            except json.JSONDecodeError:
                return _response_error("Invalid JSON for appearance.")

        # Image upload/removal
        if _bool(request.data.get("remove_logo"), False):
            if vendor.logo:
                vendor.logo.delete(save=False)
            vendor.logo = None

        if _bool(request.data.get("remove_banner"), False):
            if vendor.banner:
                vendor.banner.delete(save=False)
            vendor.banner = None

        if _bool(request.data.get("remove_favicon"), False):
            if vendor.favicon:
                vendor.favicon.delete(save=False)
            vendor.favicon = None

        logo = request.FILES.get("logo")
        if logo:
            if logo.size > 2 * 1024 * 1024:
                return _response_error("Logo must be smaller than 2MB.")
            vendor.logo = logo

        banner = request.FILES.get("banner")
        if banner:
            if banner.size > 5 * 1024 * 1024:
                return _response_error("Banner must be smaller than 5MB.")
            vendor.banner = banner

        favicon = request.FILES.get("favicon")
        if favicon:
            if favicon.size > 1 * 1024 * 1024:
                return _response_error("Favicon must be smaller than 1MB.")
            vendor.favicon = favicon

        vendor.save()
        return Response({"status": "success", "message": "Settings updated successfully."})


class ChangePasswordView(APIView):
    permission_classes = [VendorOnlyPermission]

    def post(self, request):
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")

        if not current_password or not new_password:
            return _response_error("Current and new password are required.")

        if not request.user.check_password(current_password):
            return _response_error("Current password is incorrect.")

        if current_password == new_password:
            return _response_error("New password must be different from current password.")

        try:
            validate_password(new_password, user=request.user)
        except ValidationError as exc:
            return _response_error(" ".join(exc.messages))

        request.user.set_password(new_password)
        request.user.save(update_fields=["password", "updated_at"])

        return Response({"status": "success", "message": "Password changed successfully."})


class Toggle2FAView(APIView):
    permission_classes = [VendorOnlyPermission]

    def post(self, request):
        if _bool(request.data.get('enabled'), False):
            return _response_error('Use the two-factor setup flow to enable 2FA.')
        return TwoFactorDisableView().post(request)


class TwoFactorSetupBeginView(APIView):
    permission_classes = [VendorOnlyPermission]

    def post(self, request):
        vendor = Vendor.objects.filter(user=request.user).first()
        if not vendor:
            return _response_error("Vendor not found.", status.HTTP_404_NOT_FOUND)

        if vendor.two_factor_enabled and vendor.totp_secret:
            return _response_error("2FA is already enabled. Disable it before reconfiguring.")

        secret = generate_totp_secret()
        account_name = request.user.email or request.user.phone or str(request.user.id)
        otpauth_uri = build_totp_uri(secret, account_name=account_name, issuer="BazarAF")

        vendor.totp_secret = secret
        vendor.two_factor_enabled = False
        vendor.two_factor_confirmed_at = None
        vendor.backup_codes_hashed = "[]"
        vendor.backup_codes_generated_at = None
        vendor.save(
            update_fields=[
                "totp_secret",
                "two_factor_enabled",
                "two_factor_confirmed_at",
                "backup_codes_hashed",
                "backup_codes_generated_at",
                "updated_at",
            ]
        )

        return Response(
            {
                "status": "success",
                "otpauth_uri": otpauth_uri,
                "qr_data_url": build_qr_data_url(otpauth_uri),
                "manual_entry_key": secret,
                "setup_state": "setup_in_progress",
            }
        )


class TwoFactorSetupVerifyView(APIView):
    permission_classes = [VendorOnlyPermission]

    def post(self, request):
        vendor = Vendor.objects.filter(user=request.user).first()
        if not vendor:
            return _response_error("Vendor not found.", status.HTTP_404_NOT_FOUND)

        if _is_2fa_rate_limited(str(request.user.id), "setup_verify"):
            return Response(
                {"status": "error", "detail": "Too many attempts. Please try again shortly."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        code = str(request.data.get("code", "")).strip()
        if not vendor.totp_secret:
            return _response_error("No pending authenticator setup. Start setup first.")

        if not verify_totp(vendor.totp_secret, code):
            return _response_error("Invalid authenticator code.")

        backup_codes = generate_backup_codes()
        vendor.two_factor_enabled = True
        vendor.two_factor_confirmed_at = timezone.now()
        vendor.backup_codes_hashed = json.dumps(hash_backup_codes(backup_codes))
        vendor.backup_codes_generated_at = timezone.now()
        vendor.save(
            update_fields=[
                "two_factor_enabled",
                "two_factor_confirmed_at",
                "backup_codes_hashed",
                "backup_codes_generated_at",
                "updated_at",
            ]
        )

        return Response(
            {
                "status": "success",
                "message": "2FA enabled successfully.",
                "two_factor_enabled": True,
                "backup_codes": backup_codes,
            }
        )


class TwoFactorBackupCodesRegenerateView(APIView):
    permission_classes = [VendorOnlyPermission]

    def post(self, request):
        vendor = Vendor.objects.filter(user=request.user).first()
        if not vendor:
            return _response_error("Vendor not found.", status.HTTP_404_NOT_FOUND)

        if not vendor.two_factor_enabled or not vendor.totp_secret:
            return _response_error("2FA is not enabled.")

        current_password = str(request.data.get("current_password", ""))
        current_totp_code = str(request.data.get("current_totp_code", ""))

        password_valid = bool(current_password) and check_password(current_password, request.user.password)
        totp_valid = verify_totp(vendor.totp_secret, current_totp_code)
        if not (password_valid or totp_valid):
            return _response_error("Provide a valid current password or current authenticator code.")

        backup_codes = generate_backup_codes()
        vendor.backup_codes_hashed = json.dumps(hash_backup_codes(backup_codes))
        vendor.backup_codes_generated_at = timezone.now()
        vendor.save(update_fields=["backup_codes_hashed", "backup_codes_generated_at", "updated_at"])

        return Response(
            {
                "status": "success",
                "message": "Backup codes regenerated.",
                "backup_codes": backup_codes,
            }
        )


class TwoFactorDisableView(APIView):
    permission_classes = [VendorOnlyPermission]

    def post(self, request):
        vendor = Vendor.objects.filter(user=request.user).first()
        if not vendor:
            return _response_error("Vendor not found.", status.HTTP_404_NOT_FOUND)

        if not vendor.two_factor_enabled:
            return Response({"status": "success", "message": "2FA is already disabled."})

        current_password = str(request.data.get("current_password", ""))
        code = str(request.data.get("code", ""))

        if not (current_password and check_password(current_password, request.user.password)):
            return _response_error("Current password is required and must be valid.")

        totp_valid = verify_totp(vendor.totp_secret or "", code)
        backup_hashes = []
        try:
            backup_hashes = json.loads(vendor.backup_codes_hashed or "[]")
        except json.JSONDecodeError:
            backup_hashes = []

        backup_valid, _remaining_hashes = consume_backup_code(code, backup_hashes)
        if not (totp_valid or backup_valid):
            return _response_error("Provide a valid authenticator or backup code.")

        vendor.two_factor_enabled = False
        vendor.totp_secret = None
        vendor.two_factor_confirmed_at = None
        vendor.backup_codes_hashed = "[]"
        vendor.backup_codes_generated_at = None
        vendor.save(
            update_fields=[
                "two_factor_enabled",
                "totp_secret",
                "two_factor_confirmed_at",
                "backup_codes_hashed",
                "backup_codes_generated_at",
                "updated_at",
            ]
        )

        return Response({"status": "success", "message": "2FA disabled successfully."})


class SendEmailVerificationView(APIView):
    permission_classes = [VendorOnlyPermission]

    def post(self, request):
        user = request.user
        if not user.email:
            return _response_error("Add an email to your profile before requesting verification.")

        if user.email_verified:
            return _response_error("Email is already verified.")

        cooldown_key = _cache_key_email_cooldown(str(user.id))
        if cache.get(cooldown_key):
            retry_after = _remaining_cooldown_seconds(cooldown_key) or EMAIL_VERIFY_COOLDOWN_SECONDS
            return Response(
                {
                    "status": "error",
                    "detail": "Please wait before requesting another verification email.",
                    "retry_after": retry_after,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        token = user.generate_email_verification_token()
        frontend_url = request.data.get("frontend_url", None) or os.getenv('FRONTEND_URL', 'http://localhost:5173')

        sent = send_email_verification_email(user, token, frontend_url=frontend_url)
        if not sent:
            return _response_error("Failed to send verification email. Please try again.")

        cache.set(cooldown_key, True, EMAIL_VERIFY_COOLDOWN_SECONDS)
        return Response(
            {
                "status": "success",
                "message": "Verification email sent.",
                "retry_after": EMAIL_VERIFY_COOLDOWN_SECONDS,
            }
        )


class SendPhoneVerificationView(APIView):
    permission_classes = [VendorOnlyPermission]

    def post(self, request):
        vendor = Vendor.objects.filter(user=request.user).first()
        if not vendor:
            return _response_error("Vendor not found.", status.HTTP_404_NOT_FOUND)

        phone = (request.user.phone or "").strip()
        if not phone:
            return _response_error("Add a phone number to your profile before verification.")

        if vendor.phone_verified:
            return _response_error("Phone number is already verified.")

        cooldown_key = _cache_key_phone_cooldown(str(request.user.id))
        if cache.get(cooldown_key):
            retry_after = _remaining_cooldown_seconds(cooldown_key) or PHONE_CODE_COOLDOWN_SECONDS
            return Response(
                {
                    "status": "error",
                    "detail": "Please wait before requesting another verification code.",
                    "retry_after": retry_after,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        code = f"{secrets.randbelow(1_000_000):06d}"
        payload = {
            "code": code,
            "created_at": timezone.now().isoformat(),
            "expires_at": (timezone.now() + timedelta(seconds=PHONE_CODE_TTL_SECONDS)).isoformat(),
        }
        cache.set(_cache_key_phone_code(str(request.user.id)), payload, PHONE_CODE_TTL_SECONDS)
        cache.set(cooldown_key, True, PHONE_CODE_COOLDOWN_SECONDS)

        if not _dispatch_phone_verification_sms(phone, code):
            return _response_error("Failed to send verification code. Configure SMS provider and retry.")

        response_payload = {
            "status": "success",
            "message": "Verification code sent to your phone.",
            "retry_after": PHONE_CODE_COOLDOWN_SECONDS,
            "expires_in": PHONE_CODE_TTL_SECONDS,
        }

        if getattr(settings, "DEBUG", False):
            # Development convenience. Never expose in production.
            response_payload["development_code"] = code

        return Response(response_payload)


class VerifyPhoneCodeView(APIView):
    permission_classes = [VendorOnlyPermission]

    def post(self, request):
        vendor = Vendor.objects.filter(user=request.user).first()
        if not vendor:
            return _response_error("Vendor not found.", status.HTTP_404_NOT_FOUND)

        if vendor.phone_verified:
            return Response({"status": "success", "message": "Phone already verified."})

        code = str(request.data.get("code", "")).strip()
        if not re.fullmatch(r"\d{6}", code):
            return _response_error("Enter a valid 6-digit verification code.")

        payload = cache.get(_cache_key_phone_code(str(request.user.id)))
        if not payload:
            return _response_error("Verification code expired. Request a new code.")

        if str(payload.get("code")) != code:
            return _response_error("Invalid verification code.")

        vendor.phone_verified = True
        vendor.save(update_fields=["phone_verified", "updated_at"])
        cache.delete(_cache_key_phone_code(str(request.user.id)))

        return Response({"status": "success", "message": "Phone verified successfully."})


class LogoutAllSessionsView(APIView):
    permission_classes = [VendorOnlyPermission]

    def post(self, request):
        user_id = str(request.user.id)
        keep_current = _bool(request.data.get("keep_current", True), True)
        current_session_id = _build_security_session_id(request)

        from .models import AuthSession
        active = AuthSession.objects.filter(user=request.user, revoked_at__isnull=True)
        if keep_current:
            active = active.exclude(pk=current_session_id)
        active.update(revoked_at=timezone.now())

        sessions = cache.get(_cache_key_sessions(user_id)) or []
        if keep_current:
            remaining = [s for s in sessions if str(s.get("id")) == current_session_id]
        else:
            remaining = []

        if remaining:
            cache.set(_cache_key_sessions(user_id), remaining, SESSIONS_CACHE_TTL_SECONDS)
        else:
            cache.delete(_cache_key_sessions(user_id))

        removed_count = max(0, len(sessions) - len(remaining))

        return Response(
            {
                "status": "success",
                "message": "Sessions updated successfully.",
                "removed_count": removed_count,
                "sessions": remaining,
            }
        )


class LogoutSessionView(APIView):
    permission_classes = [VendorOnlyPermission]

    def post(self, request, session_id):
        user_id = str(request.user.id)
        current_session_id = _build_security_session_id(request)

        if str(session_id) == str(current_session_id):
            return _response_error("Use logout for current session from the main account logout action.")

        from .models import AuthSession
        AuthSession.objects.filter(pk=session_id, user=request.user).update(revoked_at=timezone.now())
        sessions, removed = _logout_session_from_cache(user_id, str(session_id))
        if not removed:
            return _response_error("Session not found.", status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "status": "success",
                "message": "Session logged out.",
                "sessions": sessions,
            }
        )

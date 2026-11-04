# File: backend/home/emails.py

from django.core.mail import send_mail
from django.conf import settings
import logging
import os

logger = logging.getLogger(__name__)


def _send_email_async(subject, message, from_email, recipient_list):
    """Persist before returning; a separate worker delivers and retries."""
    from .models import EmailJob
    from django.utils import timezone
    EmailJob.objects.create(subject=subject, body=message, sender=from_email,
                            recipients=recipient_list, available_at=timezone.now())

def send_vendor_approval_email(vendor):
    """
    Send email notification when vendor is approved
    """
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    subject = 'Congratulations! Your BazaarAF Seller Application is Approved ✅'
    
    message = f"""
Dear {vendor.user.full_name},

Congratulations! Your application to become a seller on BazaarAF has been approved! 🎉

Shop Details:
━━━━━━━━━━━━━━━━━━━━━━━━
Shop Name: {vendor.shop_name}
Location: {vendor.city}

You can now:
✓ Access your Vendor Dashboard
✓ Add and manage products
✓ Start receiving orders
✓ Track your earnings

Get Started:
1. Log in at: {frontend_url}/login
2. Go to Vendor Dashboard
3. Start adding your products

We're excited to have you on board!

Best regards,
The BazaarAF Team
    """
    
    
    _send_email_async(subject, message, settings.DEFAULT_FROM_EMAIL, [vendor.user.email])
    return True


def send_vendor_rejection_email(vendor, reason=""):
    """
    Send email notification when vendor is rejected
    """
    subject = 'BazaarAF Seller Application - Additional Information Needed'
    
    message = f"""
Dear {vendor.user.full_name},

Thank you for applying to become a seller on BazaarAF.

We need some additional information before we can approve your application for "{vendor.shop_name}".

{f'Reason: {reason}' if reason else 'Please contact our support team for more details.'}

What to do next:
━━━━━━━━━━━━━━━━━━━━━━━━
Please reach out to our seller support team and we'll help you complete your application.

Support Contact:
━━━━━━━━━━━━━━━━━━━━━━━━
Email: seller-support@bazaaraf.com
Phone: +93 700 123 456
WhatsApp: +93 700 123 456

We're here to help you get started!

Best regards,
The BazaarAF Team
    """
    
    
    _send_email_async(subject, message, settings.DEFAULT_FROM_EMAIL, [vendor.user.email])
    return True


def send_email_verification_email(user, verification_token, frontend_url=None):
    """
    Send email verification link to user after signup
    """
    if frontend_url is None:
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    
    subject = 'Verify your BazaarAF Email Address ✉️'
    verification_url = f"{frontend_url}/verify-email?email={user.email}&otp={verification_token}"
    
    message = f"""
Dear {user.full_name},

Thank you for signing up on BazaarAF! 🎉

To complete your registration, use this verification code:

{verification_token}

Or click the link below:

Verification Link:
{verification_url}

This link will expire in 24 hours.

If you didn't create this account, please ignore this email.

Best regards,
The BazaarAF Team
    """
    
    
    _send_email_async(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])
    return True


def send_password_reset_email(user, reset_token, frontend_url=None):
    """
    Send password reset link to user
    """
    if frontend_url is None:
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    
    subject = 'Reset Your BazaarAF Password 🔐'
    reset_url = f"{frontend_url}/reset-password?token={reset_token}"
    
    message = f"""
Dear {user.full_name},

We received a request to reset your BazaarAF password.

To reset your password, please click the link below:

Reset Link:
{reset_url}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email and your password will remain unchanged.

Best regards,
The BazaarAF Team
    """
    
    
    _send_email_async(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])
    return True

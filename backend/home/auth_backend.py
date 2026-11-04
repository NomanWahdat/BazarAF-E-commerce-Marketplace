from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class PhoneAuthenticationBackend(ModelBackend):
    """
    Custom authentication backend that normalizes phone numbers before authentication.
    Allows users to login with either format: 03XX... or +933XX...
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Authenticate using phone number with normalization
        """
        if username is None:
            return None

        # Normalize the phone number using the same logic as User.save()
        phone = username.strip().replace(' ', '').replace('-', '').replace('(', '').replace(')', '')

        # Handle different phone formats for Afghanistan
        if not phone.startswith('+'):
            # If starts with 0, replace with country code
            if phone.startswith('0'):
                phone = '+93' + phone[1:]
            # If just digits, add country code
            elif phone.isdigit():
                phone = '+93' + phone

        try:
            user = User.objects.get(phone=phone)
        except User.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None

    def get_user(self, user_id):
        """
        Get user by ID
        """
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

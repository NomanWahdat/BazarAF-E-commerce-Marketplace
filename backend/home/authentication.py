from django.utils import timezone
from django.contrib.auth.hashers import make_password
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .models import AuthSession


def issue_refresh(user):
    token = RefreshToken.for_user(user)
    session = AuthSession.objects.create(user=user)
    token['sid'] = str(session.pk)
    return token


def check_session(token, user):
    sid = token.get('sid')
    if not sid or not AuthSession.objects.filter(pk=sid, user=user, revoked_at__isnull=True).exists():
        raise AuthenticationFailed('Session expired. Please sign in again.')


class SessionJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        check_session(validated_token, user)
        return user


class SessionTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        token = RefreshToken(attrs['refresh'])
        from .models import User
        user = User.objects.filter(pk=token['user_id'], is_active=True).first()
        if not user:
            raise AuthenticationFailed('Account unavailable.')
        check_session(token, user)
        return super().validate(attrs)

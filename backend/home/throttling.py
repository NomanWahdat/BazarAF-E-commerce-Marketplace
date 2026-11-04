import hashlib
from rest_framework.throttling import SimpleRateThrottle


class AuthenticationThrottle(SimpleRateThrottle):
    scope = 'authentication'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class AccountAuthenticationThrottle(SimpleRateThrottle):
    scope = 'authentication_account'

    def get_cache_key(self, request, view):
        identifier = str(request.data.get('email') or request.data.get('identifier') or request.data.get('phone') or '').strip().lower()
        return self.cache_format % {'scope': self.scope, 'ident': hashlib.sha256(identifier.encode()).hexdigest()}

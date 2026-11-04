import pyotp
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import User, Vendor


class VendorTwoFactorFlowTests(APITestCase):
    def setUp(self):
        self.password = 'StrongPass123!'
        self.user = User.objects.create_user(
            phone='+93700111222',
            full_name='Vendor Tester',
            password=self.password,
            role='vendor',
            email='vendor@test.com',
            email_verified=True,
        )
        self.vendor, _ = Vendor.objects.get_or_create(
            user=self.user,
            defaults={
                'shop_name': 'Vendor Test Shop',
                'address': 'Kabul',
                'city': 'Kabul',
                'status': 'approved',
            },
        )
        self.vendor.shop_name = self.vendor.shop_name or 'Vendor Test Shop'
        self.vendor.address = self.vendor.address or 'Kabul'
        self.vendor.city = self.vendor.city or 'Kabul'
        self.vendor.status = 'approved'
        self.vendor.save(update_fields=['shop_name', 'address', 'city', 'status', 'updated_at'])

    def _begin_setup(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('vendor-2fa-setup-begin')
        return self.client.post(url, {}, format='json')

    def _verify_setup(self):
        begin_response = self._begin_setup()
        self.assertEqual(begin_response.status_code, status.HTTP_200_OK)

        self.vendor.refresh_from_db()
        code = pyotp.TOTP(self.vendor.totp_secret).now()

        verify_url = reverse('vendor-2fa-setup-verify')
        verify_response = self.client.post(verify_url, {'code': code}, format='json')
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)
        return verify_response

    def test_setup_begin_generates_secret_and_qr_payload(self):
        response = self._begin_setup()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('otpauth_uri', response.data)
        self.assertIn('qr_data_url', response.data)
        self.assertTrue(response.data['qr_data_url'].startswith('data:image/png;base64,'))

        self.vendor.refresh_from_db()
        self.assertTrue(bool(self.vendor.totp_secret))
        self.assertFalse(self.vendor.two_factor_enabled)

    def test_setup_verify_success_and_failure(self):
        begin_response = self._begin_setup()
        self.assertEqual(begin_response.status_code, status.HTTP_200_OK)

        verify_url = reverse('vendor-2fa-setup-verify')
        invalid_response = self.client.post(verify_url, {'code': '000000'}, format='json')
        self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)

        self.vendor.refresh_from_db()
        valid_code = pyotp.TOTP(self.vendor.totp_secret).now()
        valid_response = self.client.post(verify_url, {'code': valid_code}, format='json')
        self.assertEqual(valid_response.status_code, status.HTTP_200_OK)
        self.assertTrue(valid_response.data.get('two_factor_enabled'))
        self.assertTrue(len(valid_response.data.get('backup_codes', [])) > 0)

        self.vendor.refresh_from_db()
        self.assertTrue(self.vendor.two_factor_enabled)
        self.assertIsNotNone(self.vendor.two_factor_confirmed_at)

    def test_login_requires_2fa_when_enabled(self):
        self._verify_setup()

        login_url = reverse('login')
        response = self.client.post(
            login_url,
            {'identifier': self.user.email, 'password': self.password},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('status'), '2fa_required')
        self.assertIn('challenge_token', response.data)
        self.assertNotIn('tokens', response.data)

    def test_challenge_verify_success_failure_and_backup_code_one_time(self):
        setup_response = self._verify_setup()
        backup_code = setup_response.data['backup_codes'][0]

        login_url = reverse('login')
        verify_url = reverse('auth-2fa-verify')

        login_response = self.client.post(
            login_url,
            {'identifier': self.user.email, 'password': self.password},
            format='json',
        )
        challenge_token = login_response.data['challenge_token']

        bad_response = self.client.post(
            verify_url,
            {'challenge_token': challenge_token, 'code': '123123'},
            format='json',
        )
        self.assertEqual(bad_response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.vendor.refresh_from_db()
        totp_code = pyotp.TOTP(self.vendor.totp_secret).now()
        ok_response = self.client.post(
            verify_url,
            {'challenge_token': challenge_token, 'code': totp_code},
            format='json',
        )
        self.assertEqual(ok_response.status_code, status.HTTP_200_OK)
        self.assertEqual(ok_response.data.get('status'), 'success')
        self.assertIn('tokens', ok_response.data)

        second_login = self.client.post(
            login_url,
            {'identifier': self.user.email, 'password': self.password},
            format='json',
        )
        second_challenge = second_login.data['challenge_token']
        backup_ok = self.client.post(
            verify_url,
            {'challenge_token': second_challenge, 'code': backup_code},
            format='json',
        )
        self.assertEqual(backup_ok.status_code, status.HTTP_200_OK)

        third_login = self.client.post(
            login_url,
            {'identifier': self.user.email, 'password': self.password},
            format='json',
        )
        third_challenge = third_login.data['challenge_token']
        backup_reuse = self.client.post(
            verify_url,
            {'challenge_token': third_challenge, 'code': backup_code},
            format='json',
        )
        self.assertEqual(backup_reuse.status_code, status.HTTP_401_UNAUTHORIZED)

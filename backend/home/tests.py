from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Order, SellerApplication, User


class AdminGovernanceFlowTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            phone="+93700000001",
            full_name="Admin User",
            password="AdminPass123!",
            role="admin",
            is_staff=True,
        )
        self.customer_user = User.objects.create_user(
            phone="+93700000002",
            full_name="Customer User",
            password="CustomerPass123!",
            role="customer",
        )
        self.vendor_user = User.objects.create_user(
            phone="+93700000005",
            full_name="Vendor User",
            password="VendorPass123!",
            role="vendor",
        )

    def _make_seller_application(self, phone="+93700000003"):
        identity = SimpleUploadedFile("id.txt", b"identity-doc", content_type="text/plain")
        return SellerApplication.objects.create(
            full_name="Applicant User",
            phone=phone,
            email="applicant@example.com",
            shop_name="Applicant Shop",
            address="Kabul Street 1",
            city="Kabul",
            identity_document=identity,
            status="pending",
        )

    def test_dashboard_route_protected_for_admin_only(self):
        self.client.force_authenticate(self.customer_user)
        forbidden_response = self.client.get("/api/dashboard/")
        self.assertEqual(forbidden_response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.admin_user)
        ok_response = self.client.get("/api/dashboard/")
        self.assertEqual(ok_response.status_code, status.HTTP_200_OK)
        self.assertIn("stats", ok_response.data)

    def test_admin_can_approve_seller_application(self):
        application = self._make_seller_application()

        self.client.force_authenticate(self.admin_user)
        response = self.client.post(f"/api/seller-applications/{application.id}/approve/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        application.refresh_from_db()
        self.assertEqual(application.status, "approved")
        self.assertIsNotNone(application.vendor)
        self.assertEqual(application.vendor.status, "approved")

    def test_non_admin_cannot_reject_seller_application(self):
        application = self._make_seller_application(phone="+93700000004")

        self.client.force_authenticate(self.customer_user)
        response = self.client.post(
            f"/api/seller-applications/{application.id}/reject/",
            {"reason": "missing docs"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_bulk_order_status_update(self):
        order_1 = Order.objects.create(
            customer=self.customer_user,
            total_amount=100,
            payment_method="COD",
            status="pending",
            delivery_address="Kabul Street 2",
            city="Kabul",
        )
        order_2 = Order.objects.create(
            customer=self.customer_user,
            total_amount=200,
            payment_method="COD",
            status="pending",
            delivery_address="Kabul Street 3",
            city="Herat",
        )

        self.client.force_authenticate(self.admin_user)
        response = self.client.post(
            "/api/orders/bulk-update-status/",
            {"order_ids": [str(order_1.id), str(order_2.id)], "status": "confirmed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("success"))

        order_1.refresh_from_db()
        order_2.refresh_from_db()
        self.assertEqual(order_1.status, "confirmed")
        self.assertEqual(order_2.status, "confirmed")

    def test_customer_product_list_contract_smoke(self):
        self.client.force_authenticate(self.customer_user)
        response = self.client.get("/api/products/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)

    def test_vendor_dashboard_contract_smoke(self):
        self.client.force_authenticate(self.vendor_user)
        response = self.client.get("/api/dashboard/vendor/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("stats", response.data)

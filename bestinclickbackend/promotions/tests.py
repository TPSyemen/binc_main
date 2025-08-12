"""
Tests for promotions app.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from products.models import Store
from .models import Promotion, DiscountQR

User = get_user_model()


class PromotionModelTest(TestCase):
    """
    Test cases for Promotion model.
    """
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='testpass123',
            role='admin'
        )
    
    def test_create_promotion(self):
        """Test creating a promotion."""
        promotion = Promotion.objects.create(
            name='Test Promotion',
            description='Test description',
            discount_type='percentage',
            value=10.00,
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=7),
            created_by=self.user
        )
        self.assertEqual(promotion.name, 'Test Promotion')
        self.assertTrue(promotion.is_valid())


class PromotionAPITest(APITestCase):
    """
    Test cases for promotion API endpoints.
    """
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.store_owner = User.objects.create_user(
            username='storeowner',
            email='owner@example.com',
            password='testpass123',
            role='store_owner'
        )
        self.promotion = Promotion.objects.create(
            name='Test Promotion',
            description='Test description',
            discount_type='percentage',
            value=10.00,
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=7),
            created_by=self.user
        )
    
    def test_list_promotions(self):
        """Test listing active promotions."""
        url = reverse('promotions:promotion_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

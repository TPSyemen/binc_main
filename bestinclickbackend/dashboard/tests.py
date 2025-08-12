"""
Tests for dashboard app.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from products.models import Store, Product, Category, Brand
from .models import StoreAnalytics

User = get_user_model()


class DashboardModelTest(TestCase):
    """
    Test cases for dashboard models.
    """
    
    def setUp(self):
        self.store_owner = User.objects.create_user(
            username='storeowner',
            email='owner@example.com',
            password='testpass123',
            role='store_owner'
        )
        self.store = Store.objects.create(
            owner=self.store_owner,
            name='Test Store',
            email='store@example.com',
            phone='1234567890',
            address='Test Address'
        )
    
    def test_create_store_analytics(self):
        """Test creating store analytics."""
        analytics = StoreAnalytics.objects.create(
            store=self.store,
            date='2024-01-01',
            total_views=100,
            unique_visitors=80,
            conversion_rate=5.0
        )
        self.assertEqual(analytics.store, self.store)
        self.assertEqual(analytics.total_views, 100)


class DashboardAPITest(APITestCase):
    """
    Test cases for dashboard API endpoints.
    """
    
    def setUp(self):
        self.store_owner = User.objects.create_user(
            username='storeowner',
            email='owner@example.com',
            password='testpass123',
            role='store_owner'
        )
        self.store = Store.objects.create(
            owner=self.store_owner,
            name='Test Store',
            email='store@example.com',
            phone='1234567890',
            address='Test Address'
        )
        self.category = Category.objects.create(name='Test Category')
        self.brand = Brand.objects.create(name='Test Brand')
        self.product = Product.objects.create(
            store=self.store,
            category=self.category,
            brand=self.brand,
            name='Test Product',
            description='Test description',
            sku='TEST001',
            price=99.99
        )
    
    def test_store_analytics_access(self):
        """Test accessing store analytics."""
        self.client.force_authenticate(user=self.store_owner)
        url = reverse('dashboard:store_analytics', kwargs={'store_id': self.store.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('store_info', response.data)
    
    def test_unauthorized_access(self):
        """Test unauthorized access to store analytics."""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=other_user)
        url = reverse('dashboard:store_analytics', kwargs={'store_id': self.store.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

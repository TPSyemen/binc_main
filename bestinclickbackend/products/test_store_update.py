"""
Test script for store update functionality.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from products.models import Store

User = get_user_model()


class StoreUpdateTestCase(TestCase):
    """
    Test cases for store update functionality.
    """
    
    def setUp(self):
        """
        Set up test data.
        """
        # Create store owner user
        self.store_owner = User.objects.create_user(
            username='store_owner',
            email='owner@example.com',
            password='testpass123',
            role='store_owner'
        )
        
        # Create customer user
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@example.com',
            password='testpass123',
            role='customer'
        )
        
        # Create store
        self.store = Store.objects.create(
            owner=self.store_owner,
            name='Test Store',
            description='Test store description',
            email='store@example.com',
            phone='+1234567890',
            address='123 Test Street'
        )
        
        self.client = APIClient()
    
    def test_store_owner_can_update_own_store(self):
        """
        Test that store owner can update their own store.
        """
        self.client.force_authenticate(user=self.store_owner)
        
        update_data = {
            'name': 'Updated Store Name',
            'description': 'Updated description',
            'email': 'updated@example.com',
            'phone': '+9876543210',
            'address': '456 Updated Street'
        }
        
        response = self.client.patch(
            f'/api/products/stores/{self.store.slug}/update/',
            update_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh store from database
        self.store.refresh_from_db()
        self.assertEqual(self.store.name, 'Updated Store Name')
        self.assertEqual(self.store.email, 'updated@example.com')
    
    def test_customer_cannot_update_store(self):
        """
        Test that customer cannot update store.
        """
        self.client.force_authenticate(user=self.customer)
        
        update_data = {
            'name': 'Hacked Store Name'
        }
        
        response = self.client.patch(
            f'/api/products/stores/{self.store.slug}/update/',
            update_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_unauthenticated_user_cannot_update_store(self):
        """
        Test that unauthenticated user cannot update store.
        """
        update_data = {
            'name': 'Hacked Store Name'
        }
        
        response = self.client.patch(
            f'/api/products/stores/{self.store.slug}/update/',
            update_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_my_store_endpoint(self):
        """
        Test the my-store endpoint.
        """
        self.client.force_authenticate(user=self.store_owner)
        
        response = self.client.get('/api/products/stores/my-store/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.store.name)
        self.assertEqual(response.data['id'], self.store.id)
    
    def test_customer_cannot_access_my_store(self):
        """
        Test that customer cannot access my-store endpoint.
        """
        self.client.force_authenticate(user=self.customer)
        
        response = self.client.get('/api/products/stores/my-store/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
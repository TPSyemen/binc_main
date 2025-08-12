"""
Tests for comments app.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from products.models import Product, Category, Brand, Store
from .models import Comment

User = get_user_model()


class CommentModelTest(TestCase):
    """
    Test cases for Comment model.
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
        self.category = Category.objects.create(name='Test Category')
        self.brand = Brand.objects.create(name='Test Brand')
        self.store = Store.objects.create(
            owner=self.store_owner,
            name='Test Store',
            email='store@example.com',
            phone='1234567890',
            address='Test Address'
        )
        self.product = Product.objects.create(
            store=self.store,
            category=self.category,
            brand=self.brand,
            name='Test Product',
            description='Test description',
            sku='TEST001',
            price=99.99
        )
    
    def test_create_comment(self):
        """Test creating a comment."""
        comment = Comment.objects.create(
            user=self.user,
            product=self.product,
            text='Great product!',
            rating=5
        )
        self.assertEqual(comment.user, self.user)
        self.assertEqual(comment.product, self.product)
        self.assertEqual(comment.rating, 5)


class CommentAPITest(APITestCase):
    """
    Test cases for comment API endpoints.
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
        self.category = Category.objects.create(name='Test Category')
        self.brand = Brand.objects.create(name='Test Brand')
        self.store = Store.objects.create(
            owner=self.store_owner,
            name='Test Store',
            email='store@example.com',
            phone='1234567890',
            address='Test Address'
        )
        self.product = Product.objects.create(
            store=self.store,
            category=self.category,
            brand=self.brand,
            name='Test Product',
            description='Test description',
            sku='TEST001',
            price=99.99
        )
    
    def test_create_comment(self):
        """Test creating a comment via API."""
        self.client.force_authenticate(user=self.user)
        url = reverse('comments:comment_list_create')
        data = {
            'product': self.product.id,
            'text': 'Great product!',
            'rating': 5
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Comment.objects.filter(user=self.user, product=self.product).exists())
    
    def test_list_product_comments(self):
        """Test listing comments for a product."""
        Comment.objects.create(
            user=self.user,
            product=self.product,
            text='Great product!',
            rating=5
        )
        
        url = reverse('comments:product_comments', kwargs={'product_id': self.product.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

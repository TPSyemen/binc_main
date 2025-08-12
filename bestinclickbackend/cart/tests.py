"""
Tests for cart app.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from products.models import Product, Category, Brand, Store
from .models import Cart, CartItem, SavedItem

User = get_user_model()


class CartModelTest(TestCase):
    """
    Test cases for cart models.
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
    
    def test_create_cart(self):
        """Test creating a cart."""
        cart = Cart.objects.create(user=self.user)
        self.assertEqual(cart.user, self.user)
        self.assertEqual(cart.get_total_items(), 0)
        self.assertEqual(cart.get_total_price(), 0)
    
    def test_add_cart_item(self):
        """Test adding item to cart."""
        cart = Cart.objects.create(user=self.user)
        cart_item = CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=2,
            price_when_added=self.product.get_final_price()
        )
        
        self.assertEqual(cart.get_total_items(), 2)
        self.assertEqual(cart_item.get_total_price(), self.product.get_final_price() * 2)
    
    def test_saved_item(self):
        """Test saving item to wishlist."""
        saved_item = SavedItem.objects.create(
            user=self.user,
            product=self.product,
            notes='Want to buy later'
        )
        
        self.assertEqual(saved_item.user, self.user)
        self.assertEqual(saved_item.product, self.product)


class CartAPITest(APITestCase):
    """
    Test cases for cart API endpoints.
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
            price=99.99,
            stock_quantity=10
        )
    
    def test_add_to_cart(self):
        """Test adding product to cart."""
        self.client.force_authenticate(user=self.user)
        url = reverse('cart:add_to_cart')
        data = {
            'product_id': self.product.id,
            'quantity': 2
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(CartItem.objects.filter(product=self.product).exists())
    
    def test_get_cart(self):
        """Test getting cart details."""
        # Create cart with item
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=1,
            price_when_added=self.product.get_final_price()
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('cart:cart_detail')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_items'], 1)
    
    def test_save_item_to_wishlist(self):
        """Test saving item to wishlist."""
        self.client.force_authenticate(user=self.user)
        url = reverse('cart:save_item')
        data = {
            'product_id': self.product.id,
            'notes': 'Want to buy later'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(SavedItem.objects.filter(user=self.user, product=self.product).exists())
    
    def test_guest_cart_with_session(self):
        """Test cart functionality for guest users with session ID."""
        url = reverse('cart:add_to_cart')
        data = {
            'product_id': self.product.id,
            'quantity': 1,
            'session_id': 'test_session_123'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Cart.objects.filter(session_id='test_session_123').exists())

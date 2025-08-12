#!/usr/bin/env python
"""
Test script for personalized recommendations functionality.
"""

import os
import sys
import django
from django.conf import settings

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bestinclickbackend.settings')
django.setup()

from django.contrib.auth import get_user_model
from products.models import Product, Category, Brand, Store
from ai_models.models import UserBehaviorLog
from ai_models.services import RecommendationService
from django.utils import timezone
from datetime import timedelta
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

User = get_user_model()

def create_test_data():
    """Create test data for recommendations."""
    logger.info("Creating test data...")
    
    # Create test user
    user, created = User.objects.get_or_create(
        username='testuser',
        defaults={
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'customer'
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
    
    # Create test store owner
    store_owner, created = User.objects.get_or_create(
        username='storeowner',
        defaults={
            'email': 'owner@example.com',
            'first_name': 'Store',
            'last_name': 'Owner',
            'role': 'store_owner'
        }
    )
    if created:
        store_owner.set_password('testpass123')
        store_owner.save()
    
    # Create test store
    store, created = Store.objects.get_or_create(
        name='Test Store',
        defaults={
            'owner': store_owner,
            'slug': 'test-store',
            'description': 'A test store',
            'email': 'store@example.com',
            'phone': '1234567890',
            'address': 'Test Address'
        }
    )
    
    # Create test category
    category, created = Category.objects.get_or_create(
        name='Electronics',
        defaults={
            'slug': 'electronics',
            'description': 'Electronic products'
        }
    )
    
    # Create test brand
    brand, created = Brand.objects.get_or_create(
        name='TestBrand',
        defaults={
            'slug': 'testbrand',
            'description': 'A test brand'
        }
    )
    
    # Create test products
    products = []
    for i in range(10):
        product, created = Product.objects.get_or_create(
            sku=f'TEST-{i:03d}',
            defaults={
                'store': store,
                'category': category,
                'brand': brand,
                'name': f'Test Product {i}',
                'slug': f'test-product-{i}',
                'description': f'Description for test product {i}',
                'price': 100.00 + (i * 10),
                'in_stock': True,
                'stock_quantity': 50,
                'average_rating': 4.0 + (i * 0.1),
                'total_reviews': 10 + i,
                'view_count': 100 + (i * 10),
                'is_active': True
            }
        )
        products.append(product)
    
    # Create user behavior logs
    logger.info("Creating user behavior logs...")
    for i, product in enumerate(products[:5]):  # User viewed first 5 products
        UserBehaviorLog.objects.get_or_create(
            user=user,
            product=product,
            action_type='view',
            defaults={
                'metadata': {'source': 'test'},
                'session_id': 'test-session-123'
            }
        )
    
    # User liked 2 products
    for product in products[:2]:
        UserBehaviorLog.objects.get_or_create(
            user=user,
            product=product,
            action_type='like',
            defaults={
                'metadata': {'source': 'test'},
                'session_id': 'test-session-123'
            }
        )
    
    logger.info(f"Created test data: {len(products)} products, user behavior logs")
    return user, products

def test_personalized_recommendations():
    """Test personalized recommendations."""
    logger.info("Testing personalized recommendations...")
    
    # Create test data
    user, products = create_test_data()
    
    # Test recommendation service
    service = RecommendationService()
    
    # Test personalized recommendations
    logger.info("Getting personalized recommendations...")
    recommendations = service.get_personalized_recommendations(user=user, limit=5)
    
    logger.info(f"Personalized recommendations result: {len(recommendations)} items")
    for i, rec in enumerate(recommendations):
        logger.info(f"  {i+1}. Product ID: {rec.get('product_id')}, Name: {rec.get('name')}, Score: {rec.get('score')}, Algorithm: {rec.get('algorithm')}")
    
    # Test general recommendations as fallback
    logger.info("Getting general recommendations...")
    general_recs = service.get_general_recommendations(limit=5)
    
    logger.info(f"General recommendations result: {len(general_recs)} items")
    for i, rec in enumerate(general_recs):
        logger.info(f"  {i+1}. Product ID: {rec.get('product_id')}, Name: {rec.get('name')}, Score: {rec.get('score')}, Algorithm: {rec.get('algorithm')}")
    
    return recommendations, general_recs

def test_api_endpoint():
    """Test the API endpoint directly."""
    from django.test import Client
    from django.contrib.auth import authenticate
    from rest_framework_simplejwt.tokens import RefreshToken
    
    logger.info("Testing API endpoint...")
    
    # Get test user
    user = User.objects.get(username='testuser')
    
    # Create JWT token
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    
    # Test API call
    client = Client()
    response = client.get(
        '/api/recommendations/personalized/',
        HTTP_AUTHORIZATION=f'Bearer {access_token}',
        data={'limit': 5}
    )
    
    logger.info(f"API Response Status: {response.status_code}")
    logger.info(f"API Response Data: {response.json()}")
    
    return response

if __name__ == '__main__':
    try:
        logger.info("Starting personalized recommendations test...")
        
        # Test service directly
        recommendations, general_recs = test_personalized_recommendations()
        
        # Test API endpoint
        api_response = test_api_endpoint()
        
        logger.info("Test completed successfully!")
        
    except Exception as e:
        logger.error(f"Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

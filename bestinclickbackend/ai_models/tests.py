"""
Tests for ai_models app.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from products.models import Product, Category, Brand, Store
from .models import UserBehaviorLog
from .services import SearchService, SentimentAnalysisService

User = get_user_model()


class UserBehaviorLogTest(TestCase):
    """
    Test cases for UserBehaviorLog model.
    """
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_behavior_log(self):
        """Test creating a behavior log."""
        log = UserBehaviorLog.objects.create(
            user=self.user,
            action_type='view',
            metadata={'source': 'test'}
        )
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.action_type, 'view')


class SearchServiceTest(TestCase):
    """
    Test cases for SearchService.
    """
    
    def setUp(self):
        self.search_service = SearchService()
    
    def test_spell_correction(self):
        """Test spell correction functionality."""
        corrected = self.search_service._spell_correct('iphon')
        self.assertIn('iphone', corrected.lower())
    
    def test_enhance_search_query(self):
        """Test search query enhancement."""
        enhanced = self.search_service.enhance_search_query('cheap iphon')
        self.assertIsInstance(enhanced, str)
        self.assertTrue(len(enhanced) > 0)


class SentimentAnalysisTest(TestCase):
    """
    Test cases for SentimentAnalysisService.
    """
    
    def setUp(self):
        self.sentiment_service = SentimentAnalysisService()
    
    def test_positive_sentiment(self):
        """Test positive sentiment analysis."""
        result = self.sentiment_service.analyze_sentiment("This product is excellent and amazing!")
        self.assertEqual(result['sentiment'], 'positive')
        self.assertGreater(result['confidence_score'], 0.5)
    
    def test_negative_sentiment(self):
        """Test negative sentiment analysis."""
        result = self.sentiment_service.analyze_sentiment("This product is terrible and awful!")
        self.assertEqual(result['sentiment'], 'negative')
        self.assertGreater(result['confidence_score'], 0.5)
    
    def test_neutral_sentiment(self):
        """Test neutral sentiment analysis."""
        result = self.sentiment_service.analyze_sentiment("This is a product.")
        self.assertEqual(result['sentiment'], 'neutral')


class AIModelsAPITest(APITestCase):
    """
    Test cases for AI models API endpoints.
    """
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_log_user_behavior(self):
        """Test logging user behavior."""
        url = reverse('ai_models:log_behavior')
        data = {
            'action_type': 'view',
            'session_id': 'test_session',
            'metadata': {'source': 'test'}
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(UserBehaviorLog.objects.filter(action_type='view').exists())
    
    def test_search_suggestions(self):
        """Test search suggestions endpoint."""
        url = reverse('ai_models:search_suggestions')
        response = self.client.get(url, {'q': 'phone'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('suggestions', response.data)
    
    def test_sentiment_analysis(self):
        """Test sentiment analysis endpoint."""
        url = reverse('ai_models:analyze_sentiment')
        data = {'text': 'This is a great product!'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('sentiment', response.data)

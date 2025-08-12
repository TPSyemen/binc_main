"""
Tests for reports app.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from datetime import date, timedelta
from products.models import Store, Category, Brand
from .models import GeneratedReport
from .services import ReportGenerationService

User = get_user_model()


class ReportModelTest(TestCase):
    """
    Test cases for report models.
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
        self.store = Store.objects.create(
            owner=self.store_owner,
            name='Test Store',
            email='store@example.com',
            phone='1234567890',
            address='Test Address'
        )
    
    def test_create_generated_report(self):
        """Test creating a generated report."""
        report = GeneratedReport.objects.create(
            report_type='store_performance',
            generated_by=self.user,
            store=self.store,
            date_from=date.today() - timedelta(days=30),
            date_to=date.today(),
            raw_data={'test': 'data'},
            ai_summary_text='Test summary'
        )
        self.assertEqual(report.report_type, 'store_performance')
        self.assertEqual(report.generated_by, self.user)


class ReportServiceTest(TestCase):
    """
    Test cases for report generation service.
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
        self.store = Store.objects.create(
            owner=self.store_owner,
            name='Test Store',
            email='store@example.com',
            phone='1234567890',
            address='Test Address'
        )
        self.report_service = ReportGenerationService()
    
    def test_generate_store_performance_report(self):
        """Test generating store performance report."""
        report_data = self.report_service.generate_report(
            report_type='store_performance',
            user=self.user,
            store_id=self.store.id,
            date_from=date.today() - timedelta(days=30),
            date_to=date.today()
        )
        
        self.assertIn('raw_data', report_data)
        self.assertIn('ai_summary', report_data)
        self.assertIn('visualizations', report_data)


class ReportAPITest(APITestCase):
    """
    Test cases for report API endpoints.
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
    
    def test_generate_report_request(self):
        """Test report generation request."""
        self.client.force_authenticate(user=self.store_owner)
        url = reverse('reports:generate_report')
        data = {
            'report_type': 'store_performance',
            'store_id': self.store.id,
            'date_from': '2024-01-01',
            'date_to': '2024-01-31'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(GeneratedReport.objects.filter(generated_by=self.store_owner).exists())
    
    def test_list_reports(self):
        """Test listing user's reports."""
        GeneratedReport.objects.create(
            report_type='store_performance',
            generated_by=self.store_owner,
            store=self.store,
            date_from=date.today() - timedelta(days=30),
            date_to=date.today(),
            raw_data={'test': 'data'},
            ai_summary_text='Test summary'
        )
        
        self.client.force_authenticate(user=self.store_owner)
        url = reverse('reports:report_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

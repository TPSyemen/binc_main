"""
Models for comprehensive reporting system with AI-generated insights.
"""

from django.db import models
from django.contrib.auth import get_user_model
from products.models import Store
import uuid

User = get_user_model()


class GeneratedReport(models.Model):
    """
    Stores metadata and results for generated reports.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Report metadata
    report_type = models.CharField(
        max_length=50,
        choices=[
            ('store_performance', 'Store Performance Report'),
            ('product_analysis', 'Product Analysis Report'),
            ('customer_insights', 'Customer Insights Report'),
            ('market_trends', 'Market Trends Report'),
            ('competitive_analysis', 'Competitive Analysis Report'),
            ('financial_summary', 'Financial Summary Report'),
        ]
    )
    
    # Access control
    generated_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='generated_reports')
    store = models.ForeignKey(Store, on_delete=models.CASCADE, null=True, blank=True)
    
    # Report parameters
    date_from = models.DateField()
    date_to = models.DateField()
    parameters = models.JSONField(
        null=True,
        blank=True,
        help_text="Additional report parameters and filters"
    )
    
    # Report content
    raw_data = models.JSONField(null=True, blank=True, help_text="Raw aggregated data used in the report")
    ai_summary_text = models.TextField(
        help_text="AI-generated narrative summary of key insights and trends"
    )
    detailed_report_text = models.TextField(
        null=True, blank=True,
        help_text="Detailed narrative report with comprehensive analysis"
    )
    visualizations = models.JSONField(
        null=True,
        blank=True,
        help_text="Chart and graph data for visualizations"
    )
    
    # File storage
    file_url = models.URLField(
        null=True,
        blank=True,
        help_text="URL to the generated report file (PDF, Excel, etc.)"
    )
    
    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='pending'
    )
    
    # Timestamps
    generated_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Access tracking
    download_count = models.PositiveIntegerField(default=0)
    last_accessed = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'generated_reports'
        indexes = [
            models.Index(fields=['generated_by', 'generated_at']),
            models.Index(fields=['store', 'report_type']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.get_report_type_display()} - {self.generated_at.strftime('%Y-%m-%d')}"


class ReportSchedule(models.Model):
    """
    Scheduled automatic report generation.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='report_schedules')
    store = models.ForeignKey(Store, on_delete=models.CASCADE, null=True, blank=True)
    
    report_type = models.CharField(
        max_length=50,
        choices=[
            ('store_performance', 'Store Performance Report'),
            ('product_analysis', 'Product Analysis Report'),
            ('customer_insights', 'Customer Insights Report'),
            ('market_trends', 'Market Trends Report'),
        ]
    )
    
    frequency = models.CharField(
        max_length=20,
        choices=[
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
            ('monthly', 'Monthly'),
            ('quarterly', 'Quarterly'),
        ]
    )
    
    parameters = models.JSONField(
        null=True,
        blank=True,
        help_text="Report parameters and filters"
    )
    
    is_active = models.BooleanField(default=True)
    next_run = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'report_schedules'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['next_run', 'is_active']),
        ]

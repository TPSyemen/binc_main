"""
Serializers for reports app.
"""

from rest_framework import serializers
from django.utils import timezone
from datetime import datetime, timedelta
from products.models import Store
from .models import GeneratedReport, ReportSchedule


class ReportGenerationRequestSerializer(serializers.Serializer):
    """
    Serializer for report generation requests.
    """
    report_type = serializers.ChoiceField(choices=[
        ('store_performance', 'Store Performance Report'),
        ('product_analysis', 'Product Analysis Report'),
        ('customer_insights', 'Customer Insights Report'),
        ('market_trends', 'Market Trends Report'),
        ('competitive_analysis', 'Competitive Analysis Report'),
        ('financial_summary', 'Financial Summary Report'),
    ])
    store_id = serializers.IntegerField(required=False)
    date_from = serializers.DateField()
    date_to = serializers.DateField()
    parameters = serializers.JSONField(required=False, default=dict)
    
    def validate(self, attrs):
        # Validate date range
        if attrs['date_from'] > attrs['date_to']:
            raise serializers.ValidationError("date_from must be before date_to")
        
        # Validate date range is not too large
        if (attrs['date_to'] - attrs['date_from']).days > 365:
            raise serializers.ValidationError("Date range cannot exceed 365 days")
        
        # Validate store ownership if store_id provided
        store_id = attrs.get('store_id')
        if store_id:
            request = self.context.get('request')
            if request and request.user.is_authenticated:
                try:
                    store = Store.objects.get(id=store_id)
                    if request.user.is_store_owner and store.owner != request.user:
                        raise serializers.ValidationError("You can only generate reports for your own stores")
                except Store.DoesNotExist:
                    raise serializers.ValidationError("Store not found")
        
        return attrs


class GeneratedReportSerializer(serializers.ModelSerializer):
    """
    Serializer for generated reports.
    """
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    
    class Meta:
        model = GeneratedReport
        fields = [
            'id', 'report_type', 'report_type_display', 'store', 'store_name',
            'date_from', 'date_to', 'parameters', 'ai_summary_text',
            'visualizations', 'status', 'generated_at', 'completed_at',
            'download_count', 'last_accessed'
        ]
        read_only_fields = [
            'id', 'generated_at', 'completed_at', 'download_count', 'last_accessed'
        ]


class ReportScheduleSerializer(serializers.ModelSerializer):
    """
    Serializer for report schedules.
    """
    store_name = serializers.CharField(source='store.name', read_only=True)
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    
    class Meta:
        model = ReportSchedule
        fields = [
            'id', 'report_type', 'report_type_display', 'store', 'store_name',
            'frequency', 'parameters', 'is_active', 'next_run', 'created_at'
        ]
        read_only_fields = ['id', 'next_run', 'created_at']
    
    def validate_store(self, value):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.is_store_owner:
            if value.owner != request.user:
                raise serializers.ValidationError("You can only schedule reports for your own stores")
        return value

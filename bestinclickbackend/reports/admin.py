"""
Admin configuration for reports app.
"""

from django.contrib import admin
from .models import GeneratedReport, ReportSchedule


@admin.register(GeneratedReport)
class GeneratedReportAdmin(admin.ModelAdmin):
    """
    Admin for generated reports.
    """
    list_display = ['id', 'report_type', 'generated_by', 'store', 'status', 'generated_at', 'download_count']
    list_filter = ['report_type', 'status', 'generated_at']
    search_fields = ['generated_by__username', 'store__name']
    readonly_fields = ['id', 'generated_at', 'completed_at', 'download_count', 'last_accessed']


@admin.register(ReportSchedule)
class ReportScheduleAdmin(admin.ModelAdmin):
    """
    Admin for report schedules.
    """
    list_display = ['id', 'user', 'report_type', 'store', 'frequency', 'is_active', 'next_run']
    list_filter = ['report_type', 'frequency', 'is_active']
    search_fields = ['user__username', 'store__name']
    readonly_fields = ['created_at']

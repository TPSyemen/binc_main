"""
URL configuration for reports app.
"""

from django.urls import path
from . import views

app_name = 'reports'

urlpatterns = [
    # Report generation
    path('generate/', views.GenerateReportView.as_view(), name='generate_report'),
    path('<uuid:report_id>/download/', views.download_report, name='download_report'),
    path('<uuid:report_id>/status/', views.report_status, name='report_status'),

    # Report management
    path('', views.ReportListView.as_view(), name='report_list'),
    path('<uuid:report_id>/', views.ReportDetailView.as_view(), name='report_detail'),

    # Scheduled reports
    path('schedules/', views.ReportScheduleView.as_view(), name='report_schedules'),
]

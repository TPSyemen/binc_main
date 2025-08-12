"""
API views for reports generation and management.
"""

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.utils import timezone
from datetime import datetime, timedelta
from products.models import Store
from products.permissions import IsStoreOwner
from .models import GeneratedReport, ReportSchedule
from .serializers import (
    ReportGenerationRequestSerializer,
    GeneratedReportSerializer,
    ReportScheduleSerializer
)
from .services import ReportGenerationService
import logging

logger = logging.getLogger(__name__)


class GenerateReportView(generics.CreateAPIView):
    """
    Generate a new report.
    """
    serializer_class = ReportGenerationRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """
        احترافي: إذا لم يُرسل store_id أو كان غير صحيح، يتم جلب أول متجر يملكه المستخدم تلقائياً أو إرجاع رسالة خطأ واضحة.
        """
        import traceback
        from decimal import Decimal
        def convert_decimal(obj):
            if isinstance(obj, dict):
                return {k: convert_decimal(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_decimal(i) for i in obj]
            elif isinstance(obj, Decimal):
                return float(obj)
            else:
                return obj

        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            # معالجة store_id بشكل احترافي
            store_id = serializer.validated_data.get('store_id')
            if not store_id:
                # إذا لم يُرسل store_id، جلب أول متجر يملكه المستخدم
                user_stores = Store.objects.filter(owner=request.user)
                if not user_stores.exists():
                    return Response(
                        {'error': 'You do not have any store. Please create a store first.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                store_id = user_stores.first().id
            else:
                # تحقق أن المتجر فعلاً يخص المستخدم
                if not Store.objects.filter(id=store_id, owner=request.user).exists():
                    return Response(
                        {'error': 'Invalid store_id. You do not own this store.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Create report record
            parameters = serializer.validated_data.get('parameters', {})
            parameters = convert_decimal(parameters)
            report = GeneratedReport.objects.create(
                report_type=serializer.validated_data['report_type'],
                generated_by=request.user,
                store_id=store_id,
                date_from=serializer.validated_data['date_from'],
                date_to=serializer.validated_data['date_to'],
                parameters=parameters,
                status='pending'
            )

            # Generate report asynchronously (in production, use Celery)
            try:
                report_service = ReportGenerationService()
                report_data = report_service.generate_report(
                    report_type=report.report_type,
                    user=request.user,
                    store_id=report.store_id,
                    date_from=report.date_from,
                    date_to=report.date_to,
                    parameters=report.parameters
                )

                # Update report with generated data
                report.raw_data = convert_decimal(report_data['raw_data'])
                # معالجة الملخص ليكون 100 كلمة تقريبًا مع تنسيق المسافات
                def format_summary(text, word_limit=100):
                    import re
                    # إضافة مسافة بين الأرقام والكلمات إذا لم تكن موجودة
                    text = re.sub(r"(\d)([A-Za-zأ-ي])", r"\1 \2", text)
                    text = re.sub(r"([A-Za-zأ-ي])(\d)", r"\1 \2", text)
                    # تقطيع النص إلى كلمات
                    words = text.split()
                    if len(words) > word_limit:
                        text = ' '.join(words[:word_limit])
                        text += ' ...'
                    return text
                report.ai_summary_text = format_summary(report_data['ai_summary'], word_limit=100)
                report.visualizations = convert_decimal(report_data.get('visualizations', {}))
                report.status = 'completed'
                report.completed_at = timezone.now()
                report.save()

            except Exception as e:
                tb = traceback.format_exc()
                logger.error(f"Error generating report: {str(e)}\nTraceback:\n{tb}")
                report.status = 'failed'
                report.save()

                return Response(
                    {'error': 'Report generation failed', 'details': str(e), 'traceback': tb},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            response_serializer = GeneratedReportSerializer(report)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            tb = traceback.format_exc()
            logger.error(f"Error in report generation: {str(e)}\nTraceback:\n{tb}")
            return Response(
                {'error': 'Failed to generate report', 'details': str(e), 'traceback': tb},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ReportListView(generics.ListAPIView):
    """
    List user's generated reports.
    """
    serializer_class = GeneratedReportSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return GeneratedReport.objects.filter(
            generated_by=self.request.user
        ).order_by('-generated_at')


class ReportDetailView(generics.RetrieveAPIView):
    """
    Get detailed report information.
    """
    serializer_class = GeneratedReportSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return GeneratedReport.objects.filter(generated_by=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Update last accessed timestamp
        instance.last_accessed = timezone.now()
        instance.save(update_fields=['last_accessed'])
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_report(request, report_id):
    """
    Download generated report file.
    """
    try:
        report = get_object_or_404(
            GeneratedReport,
            id=report_id,
            generated_by=request.user,
            status='completed'
        )
        
        # Update download count
        report.download_count += 1
        report.last_accessed = timezone.now()
        report.save(update_fields=['download_count', 'last_accessed'])
        
        # Generate file content (simplified - in production, use proper file generation)
        if request.GET.get('format') == 'json':
            response = HttpResponse(
                content=str(report.raw_data),
                content_type='application/json'
            )
            response['Content-Disposition'] = f'attachment; filename="report_{report.id}.json"'
        else:
            # Generate CSV format
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow(['Report Type', 'Generated Date', 'Summary'])
            writer.writerow([
                report.get_report_type_display(),
                report.generated_at.strftime('%Y-%m-%d %H:%M'),
                report.ai_summary_text[:100] + '...' if len(report.ai_summary_text) > 100 else report.ai_summary_text
            ])
            
            response = HttpResponse(
                content=output.getvalue(),
                content_type='text/csv'
            )
            response['Content-Disposition'] = f'attachment; filename="report_{report.id}.csv"'
        
        return response
        
    except Exception as e:
        logger.error(f"Error downloading report: {str(e)}")
        return Response(
            {'error': 'Failed to download report'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_status(request, report_id):
    """
    Get report generation status.
    """
    try:
        report = get_object_or_404(
            GeneratedReport,
            id=report_id,
            generated_by=request.user
        )
        
        return Response({
            'id': report.id,
            'status': report.status,
            'progress': 100 if report.status == 'completed' else 50 if report.status == 'processing' else 0,
            'generated_at': report.generated_at,
            'completed_at': report.completed_at,
            'error_message': 'Report generation failed' if report.status == 'failed' else None
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting report status: {str(e)}")
        return Response(
            {'error': 'Failed to get report status'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class ReportScheduleView(generics.ListCreateAPIView):
    """
    List and create report schedules.
    """
    serializer_class = ReportScheduleSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ReportSchedule.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        # Calculate next run time
        frequency = serializer.validated_data['frequency']
        now = timezone.now()
        
        if frequency == 'daily':
            next_run = now + timedelta(days=1)
        elif frequency == 'weekly':
            next_run = now + timedelta(weeks=1)
        elif frequency == 'monthly':
            next_run = now + timedelta(days=30)
        elif frequency == 'quarterly':
            next_run = now + timedelta(days=90)
        else:
            next_run = now + timedelta(days=1)
        
        serializer.save(user=self.request.user, next_run=next_run)

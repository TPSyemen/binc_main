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
    
    def generate_detailed_report_text(self, raw_data, report_type):
        """
        Generate a detailed text report from the raw data.
        
        Args:
            raw_data: The raw data dictionary from the report
            report_type: The type of report
            
        Returns:
            A formatted string with the detailed report
        """
        detailed_report = []
        
        # Add report title
        if report_type == 'store_performance':
            detailed_report.append(f"# Store Performance Report: {raw_data.get('store_info', {}).get('name', '')}")
        elif report_type == 'product_analysis':
            detailed_report.append(f"# Product Analysis Report: {raw_data.get('store_name', '')}")
        elif report_type == 'customer_insights':
            detailed_report.append(f"# Customer Insights Report: {raw_data.get('store_name', '')}")
        elif report_type == 'market_trends':
            detailed_report.append("# Market Trends Report")
        elif report_type == 'competitive_analysis':
            detailed_report.append(f"# Competitive Analysis Report: {raw_data.get('target_store', '')}")
        elif report_type == 'financial_summary':
            detailed_report.append(f"# Order Summary Report: {raw_data.get('store_name', '')}")
        
        detailed_report.append(f"Report Date: {raw_data.get('period', '')}")
        detailed_report.append("")
        
        # Add report sections based on report type
        if report_type == 'store_performance':
            # Store Information
            detailed_report.append("## Store Information")
            store_info = raw_data.get('store_info', {})
            detailed_report.append(f"Store Name: {store_info.get('name', '')}")
            detailed_report.append(f"Average Rating: {store_info.get('average_rating', 0)}")
            detailed_report.append(f"Total Products: {store_info.get('total_products', 0)}")
            detailed_report.append("")
            
            # Performance Metrics
            detailed_report.append("## Performance Metrics")
            metrics = raw_data.get('performance_metrics', {})
            detailed_report.append(f"Total Views: {metrics.get('total_views', 0)}")
            detailed_report.append(f"Average Conversion Rate: {metrics.get('avg_conversion_rate', 0)}%")
            detailed_report.append(f"Period: {metrics.get('period', '')}")
            detailed_report.append("")
            
            # Top Products
            detailed_report.append("## Top Products")
            for i, product in enumerate(raw_data.get('top_products', []), 1):
                detailed_report.append(f"{i}. {product.get('name', '')}")
                detailed_report.append(f"   Views: {product.get('views', 0)}")
                detailed_report.append(f"   Rating: {product.get('rating', 0)}")
                detailed_report.append("")
            
            # Customer Behavior
            detailed_report.append("## Customer Behavior")
            for behavior in raw_data.get('customer_behavior', []):
                detailed_report.append(f"Action Type: {behavior.get('action_type', '')}")
                detailed_report.append(f"Count: {behavior.get('count', 0)}")
                detailed_report.append("")
            
        elif report_type == 'product_analysis':
            # Store Information
            detailed_report.append("## Store Information")
            detailed_report.append(f"Store Name: {raw_data.get('store_name', '')}")
            detailed_report.append(f"Analysis Period: {raw_data.get('analysis_period', '')}")
            detailed_report.append(f"Total Products: {raw_data.get('total_products', 0)}")
            detailed_report.append("")
            
            # Products Analysis
            detailed_report.append("## Product Analysis")
            for i, product in enumerate(raw_data.get('products', [])[:10], 1):
                detailed_report.append(f"{i}. {product.get('name', '')}")
                detailed_report.append(f"   Category: {product.get('category', '')}")
                detailed_report.append(f"   Rating: {product.get('rating', 0)}")
                detailed_report.append(f"   Views: {product.get('views', 0)}")
                detailed_report.append(f"   Clicks: {product.get('clicks', 0)}")
                detailed_report.append(f"   Cart Additions: {product.get('cart_adds', 0)}")
                detailed_report.append(f"   Conversion Rate: {product.get('conversion_rate', 0)}%")
                detailed_report.append(f"   Engagement Score: {product.get('engagement_score', 0)}")
                detailed_report.append("")
            
            # Category Performance
            detailed_report.append("## Category Performance")
            for category, performance in raw_data.get('category_performance', {}).items():
                detailed_report.append(f"Category: {category}")
                detailed_report.append(f"Number of Products: {performance.get('products', 0)}")
                detailed_report.append(f"Average Conversion Rate: {performance.get('avg_conversion', 0)}%")
                detailed_report.append(f"Average Views: {performance.get('avg_views', 0)}")
                detailed_report.append("")
            
        elif report_type == 'customer_insights':
            # Analysis Information
            detailed_report.append("## Analysis Information")
            detailed_report.append(f"Analysis Period: {raw_data.get('analysis_period', '')}")
            detailed_report.append(f"Store Name: {raw_data.get('store_name', '')}")
            detailed_report.append(f"Total Interactions: {raw_data.get('total_interactions', 0)}")
            detailed_report.append(f"Unique Users: {raw_data.get('unique_users', 0)}")
            detailed_report.append("")
            
            # Top Users
            detailed_report.append("## Top Users")
            for i, user in enumerate(raw_data.get('top_users', [])[:5], 1):
                detailed_report.append(f"{i}. User: {user.get('user', '')}")
                detailed_report.append(f"   Total Actions: {user.get('total_actions', 0)}")
                detailed_report.append(f"   Unique Products: {user.get('unique_products', 0)}")
                detailed_report.append("")
            
            # Hourly Patterns
            detailed_report.append("## Hourly Activity Patterns")
            for pattern in raw_data.get('hourly_patterns', []):
                detailed_report.append(f"Hour: {pattern.get('hour', '')}:00")
                detailed_report.append(f"Activity Count: {pattern.get('activity_count', 0)}")
                detailed_report.append("")
            
            # Action Patterns
            detailed_report.append("## Action Patterns")
            for pattern in raw_data.get('action_patterns', []):
                detailed_report.append(f"Action Type: {pattern.get('action_type', '')}")
                detailed_report.append(f"Count: {pattern.get('count', 0)}")
                detailed_report.append("")
            
            # Customer Segments
            detailed_report.append("## Customer Segments")
            for segment in raw_data.get('customer_segments', []):
                detailed_report.append(f"Segment: {segment.get('name', '')}")
                detailed_report.append(f"Description: {segment.get('description', '')}")
                detailed_report.append("Characteristics:")
                for characteristic in segment.get('characteristics', []):
                    detailed_report.append(f"- {characteristic}")
                detailed_report.append("")
            
        elif report_type == 'market_trends':
            # Analysis Information
            detailed_report.append("## Analysis Information")
            detailed_report.append(f"Analysis Period: {raw_data.get('analysis_period', '')}")
            detailed_report.append("")
            
            # Trending Categories
            detailed_report.append("## Trending Categories")
            for i, category in enumerate(raw_data.get('trending_categories', []), 1):
                detailed_report.append(f"{i}. {category.get('product__category__name', '')}")
                detailed_report.append(f"   View Count: {category.get('view_count', 0)}")
                detailed_report.append("")
            
            # Price Trends
            detailed_report.append("## Price Trends")
            for i, trend in enumerate(raw_data.get('price_trends', []), 1):
                detailed_report.append(f"{i}. Category: {trend.get('category__name', '')}")
                detailed_report.append(f"   Product Count: {trend.get('product_count', 0)}")
                detailed_report.append("")
            
            # Popular Brands
            detailed_report.append("## Popular Brands")
            for i, brand in enumerate(raw_data.get('popular_brands', []), 1):
                detailed_report.append(f"{i}. {brand.get('product__brand__name', '')}")
                detailed_report.append(f"   Interaction Count: {brand.get('interaction_count', 0)}")
                detailed_report.append("")
            
            # Market Insights
            detailed_report.append("## Market Insights")
            for i, insight in enumerate(raw_data.get('market_insights', []), 1):
                detailed_report.append(f"{i}. {insight}")
                detailed_report.append("")
            
        elif report_type == 'competitive_analysis':
            # Analysis Information
            detailed_report.append("## Analysis Information")
            detailed_report.append(f"Target Store: {raw_data.get('target_store', '')}")
            detailed_report.append(f"Analysis Period: {raw_data.get('analysis_period', '')}")
            detailed_report.append("")
            
            # Competitor Comparison
            detailed_report.append("## Competitor Comparison")
            for i, competitor in enumerate(raw_data.get('competitor_comparison', []), 1):
                detailed_report.append(f"{i}. {competitor.get('store_name', '')}")
                detailed_report.append(f"   Target Store: {'Yes' if competitor.get('is_target', False) else 'No'}")
                detailed_report.append(f"   Average Rating: {competitor.get('average_rating', 0)}")
                detailed_report.append(f"   Total Products: {competitor.get('total_products', 0)}")
                detailed_report.append(f"   Customer Service Score: {competitor.get('customer_service_score', 0)}")
                detailed_report.append("")
            
            # Market Position
            detailed_report.append("## Market Position")
            position = raw_data.get('market_position', {})
            detailed_report.append(f"Rating Rank: {position.get('rating_rank', '')}")
            detailed_report.append(f"Product Variety Rank: {position.get('product_variety_rank', '')}")
            detailed_report.append(f"Price Competitiveness: {position.get('price_competitiveness', '')}")
            detailed_report.append("Unique Strengths:")
            for strength in position.get('unique_strengths', []):
                detailed_report.append(f"- {strength}")
            detailed_report.append("Areas for Improvement:")
            for area in position.get('improvement_areas', []):
                detailed_report.append(f"- {area}")
            detailed_report.append("")
            
            # Recommendations
            detailed_report.append("## Recommendations")
            for i, recommendation in enumerate(raw_data.get('recommendations', []), 1):
                detailed_report.append(f"{i}. {recommendation}")
                detailed_report.append("")
            
        elif report_type == 'financial_summary':
            # Store Information
            detailed_report.append("## Store Information")
            detailed_report.append(f"Store Name: {raw_data.get('store_name', '')}")
            detailed_report.append(f"Period: {raw_data.get('period', '')}")
            detailed_report.append("")
            
            # Summary
            detailed_report.append("## Order Summary")
            summary = raw_data.get('summary', {})
            detailed_report.append(f"Total Orders: {summary.get('total_orders', 0)}")
            detailed_report.append("")
            
            # Monthly Breakdown
            detailed_report.append("## Monthly Breakdown")
            for month, data in raw_data.get('monthly_breakdown', {}).items():
                detailed_report.append(f"Month: {month}")
                detailed_report.append(f"Orders: {data.get('orders', 0)}")
                detailed_report.append(f"Days: {data.get('days', 0)}")
                detailed_report.append(f"Daily Order Average: {data.get('orders', 0) / data.get('days', 1) if data.get('days', 0) > 0 else 0:.2f}")
                detailed_report.append("")
            
            # Order Insights
            detailed_report.append("## Order Insights")
            for i, insight in enumerate(raw_data.get('order_insights', []), 1):
                detailed_report.append(f"{i}. {insight}")
                detailed_report.append("")
        
        return "\n".join(detailed_report)
    
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
                
                # Store the summary text (shortened version)
                report.ai_summary_text = format_summary(report_data['ai_summary'], word_limit=100)
                
                # Generate and store the detailed report text
                detailed_report = self.generate_detailed_report_text(report_data['raw_data'], report.report_type)
                report.detailed_report_text = detailed_report
                
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
                report.ai_summary_text
            ])
            
            # Add detailed report if available
            if report.detailed_report_text:
                writer.writerow([])
                writer.writerow(['Detailed Report'])
                writer.writerow([report.detailed_report_text])
            
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

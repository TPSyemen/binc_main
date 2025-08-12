from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from reports.models import GeneratedReport
from products.models import Store
from datetime import timedelta

User = get_user_model()

class Command(BaseCommand):
    help = 'Populate the database with dummy reports for testing (admin, users, owners)'

    def handle(self, *args, **options):
        # جلب المستخدمين المطلوبين
        usernames = ['khcustomer', 'admin']
        users = User.objects.filter(username__in=usernames)
        store = Store.objects.first()
        now = timezone.now()

        # تقارير للمستخدمين
        for user in users:
            for report_type in ['user_activity', 'sales_summary', 'system_overview']:
                report = GeneratedReport.objects.create(
                    report_type=report_type,
                    generated_by=user,
                    store=store if report_type == 'sales_summary' else None,
                    date_from=now - timedelta(days=30),
                    date_to=now,
                    status='completed',
                    raw_data={'dummy': 'data', 'user': user.username, 'type': report_type},
                    ai_summary_text=f'ملخص آلي افتراضي لتقرير {report_type} للمستخدم {user.username}',
                    completed_at=now,
                )
                self.stdout.write(self.style.SUCCESS(f'Created report {report_type} for {user.username}'))

        # تقارير للمالك (مالك أول متجر)
        if store and store.owner:
            owner = store.owner
            report = GeneratedReport.objects.create(
                report_type='store_performance',
                generated_by=owner,
                store=store,
                date_from=now - timedelta(days=30),
                date_to=now,
                status='completed',
                raw_data={'dummy': 'data', 'owner': owner.username, 'type': 'store_performance'},
                ai_summary_text=f'ملخص آلي افتراضي لأداء المتجر للمالك {owner.username}',
                completed_at=now,
            )
            self.stdout.write(self.style.SUCCESS(f'Created store_performance report for owner {owner.username}'))

        self.stdout.write(self.style.SUCCESS('✅ Dummy reports created successfully!'))

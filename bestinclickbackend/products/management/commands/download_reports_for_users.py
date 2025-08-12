import requests
import os

# إعدادات الاتصال
API_BASE = 'http://localhost:8000/api/reports/'  # عدّل إذا كان السيرفر على عنوان آخر
TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzUzMjA3MDY2LCJpYXQiOjE3NTMyMDM0NjYsImp0aSI6ImNlODc3YzExNjVkODRkYThiY2M5NDU1MWE3MmUwMTRjIiwidXNlcl9pZCI6MzN9.vuisDcsT2WhPY07HJvIPy-1FN-zuyOc2QcLtRLpOaug'  # توكن khcustomer
DOWNLOAD_DIR = r'C:\Users\PC\Downloads'
USERS = ['admin', 'khcustomer']  # أسماء المستخدمين المطلوب تحميل تقاريرهم

headers = {'Authorization': f'Bearer {TOKEN}'}

# جلب قائمة كل التقارير
response = requests.get(API_BASE, headers=headers)
response.raise_for_status()
data = response.json()

# إذا كانت النتائج paginated
reports = data['results'] if 'results' in data else data

for report in reports:
    generated_by = report.get('generated_by_username') or report.get('generated_by', '')
    if generated_by in USERS:
        report_id = report['id']
        # تحميل بصيغة PDF
        url = f'{API_BASE}{report_id}/download/?format=pdf'
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            filename = os.path.join(DOWNLOAD_DIR, f'report_{report_id}_{generated_by}.pdf')
            with open(filename, 'wb') as f:
                f.write(r.content)
            print(f'✔ تم تحميل تقرير PDF: {filename}')
        else:
            print(f'✖ فشل تحميل تقرير {report_id} للمستخدم {generated_by}: {r.status_code}')

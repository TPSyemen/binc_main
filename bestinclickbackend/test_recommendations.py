#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bestinclickbackend.settings')
django.setup()

from recommendations.views import general_recommendations
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
import traceback

def test_recommendations():
    try:
        factory = RequestFactory()
        request = factory.get('/api/recommendations/general/?limit=3')
        request.user = AnonymousUser()
        
        print("Testing general recommendations...")
        response = general_recommendations(request)
        print(f"Status: {response.status_code}")
        print(f"Data: {response.data}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    test_recommendations()
"""
WSGI config for best_on_click project.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'best_on_click.settings')

application = get_wsgi_application()

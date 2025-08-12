"""
ASGI config for best_on_click project.
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'best_on_click.settings')

application = get_asgi_application()

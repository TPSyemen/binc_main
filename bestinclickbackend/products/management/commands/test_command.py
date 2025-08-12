"""
Simple test command to verify Django management commands are working.
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """
    Simple test command.
    """
    help = 'Test command to verify management commands work'

    def handle(self, *args, **options):
        """
        Main command execution logic.
        """
        self.stdout.write(
            self.style.SUCCESS('✅ Test command is working!')
        )
        self.stdout.write('Django management commands are functioning correctly.')

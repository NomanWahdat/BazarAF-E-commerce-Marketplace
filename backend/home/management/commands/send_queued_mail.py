"""Durable outbox worker. Run continuously, or --once from a scheduler."""
import time
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from home.models import EmailJob


class Command(BaseCommand):
    help = 'Deliver queued email with bounded exponential retries (at-least-once delivery).'

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true')

    def handle(self, *args, **options):
        while True:
            processed = False
            with transaction.atomic():
                job = EmailJob.objects.select_for_update(skip_locked=True).filter(
                    sent_at__isnull=True, attempts__lt=8, available_at__lte=timezone.now()
                ).order_by('created_at').first()
                if job:
                    processed = True
                    job.attempts += 1
                    try:
                        send_mail(job.subject, job.body, job.sender, job.recipients, fail_silently=False)
                        job.sent_at = timezone.now()
                        job.last_error = ''
                        # Verification codes and reset links should not remain in the outbox.
                        job.body = ''
                    except Exception as exc:
                        job.last_error = type(exc).__name__
                        job.available_at = timezone.now() + timedelta(seconds=min(3600, 30 * 2 ** job.attempts))
                    job.save()
            if not processed:
                if options['once']:
                    return
                time.sleep(5)

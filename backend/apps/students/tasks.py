from celery import shared_task
from django.utils import timezone
from .models import FreezeRecord, Student, StudentStatus


@shared_task
def auto_unfreeze_students():
    """Muzlatish muddati tugagan o'quvchilarni avtomatik Faol qaytarish."""
    today = timezone.now().date()
    expired = FreezeRecord.objects.filter(released=False, end_date__lt=today)
    count = 0
    for fr in expired:
        fr.released = True
        fr.save()
        fr.student.status = StudentStatus.ACTIVE
        fr.student.save()
        count += 1
    return f"{count} o'quvchi faollashtirildi"

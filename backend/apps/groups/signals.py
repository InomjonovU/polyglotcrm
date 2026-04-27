from datetime import date as _date
from django.db.models.signals import m2m_changed
from django.dispatch import receiver
from django.utils import timezone

from apps.students.models import Student
from .models import GroupEnrollment


@receiver(m2m_changed, sender=Student.groups.through)
def sync_group_enrollments(sender, instance, action, pk_set, **kwargs):
    """
    Student.groups.add()/remove() ishlatilganda GroupEnrollment
    yozuvini yaratish yoki left_at sanasini qo'yish.
    """
    if not pk_set:
        return
    today = _date.today()
    if action == 'post_add':
        for group_id in pk_set:
            # Agar ochiq (left_at is null) yozuv mavjud bo'lsa — qayta yaratmaymiz
            existing = GroupEnrollment.objects.filter(
                student=instance, group_id=group_id, left_at__isnull=True,
            ).first()
            if not existing:
                GroupEnrollment.objects.create(
                    student=instance, group_id=group_id, enrolled_at=today,
                )
    elif action == 'post_remove':
        GroupEnrollment.objects.filter(
            student=instance, group_id__in=pk_set, left_at__isnull=True,
        ).update(left_at=today)

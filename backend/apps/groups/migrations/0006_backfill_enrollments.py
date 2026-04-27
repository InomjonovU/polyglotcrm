from django.db import migrations


def backfill_enrollments(apps, schema_editor):
    Student = apps.get_model('students', 'Student')
    GroupEnrollment = apps.get_model('groups', 'GroupEnrollment')
    for s in Student.objects.all():
        for g in s.groups.all():
            if not GroupEnrollment.objects.filter(student=s, group=g, left_at__isnull=True).exists():
                GroupEnrollment.objects.create(
                    student=s, group=g, enrolled_at=s.joined_date,
                )


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('groups', '0005_groupenrollment'),
    ]

    operations = [
        migrations.RunPython(backfill_enrollments, reverse_noop),
    ]

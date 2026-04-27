from django.db import migrations


def copy_fk_to_m2m(apps, schema_editor):
    Student = apps.get_model('students', 'Student')
    for s in Student.objects.all():
        if s.group_id:
            s.groups.add(s.group_id)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0003_student_groups_alter_student_group'),
    ]

    operations = [
        migrations.RunPython(copy_fk_to_m2m, noop_reverse),
    ]

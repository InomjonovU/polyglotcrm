from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0005_student_referrer_source_student_referrer_student_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='student',
            name='parent_phone',
            field=models.CharField(blank=True, db_index=True, max_length=20,
                                   help_text='Ota-ona telefon raqami (login uchun)'),
        ),
        migrations.AddField(
            model_name='student',
            name='parent_name',
            field=models.CharField(blank=True, max_length=128,
                                   help_text="Ota-ona to'liq ismi (ixtiyoriy)"),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('groups', '0006_backfill_enrollments'),
    ]

    operations = [
        migrations.AddField(
            model_name='group',
            name='start_date',
            field=models.DateField(
                null=True, blank=True,
                help_text="Guruhning birinchi dars sanasi",
            ),
        ),
    ]

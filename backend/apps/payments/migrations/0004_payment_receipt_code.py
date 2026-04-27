from django.db import migrations, models
import secrets
import string


def _gen(n=8):
    alphabet = ''.join(c for c in (string.ascii_uppercase + string.digits)
                       if c not in 'O0I1L')
    return ''.join(secrets.choice(alphabet) for _ in range(n))


def backfill_codes(apps, schema_editor):
    Payment = apps.get_model('payments', 'Payment')
    used = set(Payment.objects.exclude(receipt_code='').values_list('receipt_code', flat=True))
    for p in Payment.objects.filter(receipt_code='').iterator():
        for _ in range(20):
            code = _gen(8)
            if code not in used:
                used.add(code)
                p.receipt_code = code
                p.save(update_fields=['receipt_code'])
                break


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0003_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='receipt_code',
            field=models.CharField(blank=True, db_index=False, default='', max_length=12),
            preserve_default=False,
        ),
        migrations.RunPython(backfill_codes, noop),
        migrations.AlterField(
            model_name='payment',
            name='receipt_code',
            field=models.CharField(blank=True, db_index=True, max_length=12, unique=True),
        ),
    ]

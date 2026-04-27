from celery import shared_task
from django.conf import settings
from django.utils import timezone
from .models import SmsLog


@shared_task(bind=True, max_retries=3)
def send_sms(self, phone, message):
    log = SmsLog.objects.create(phone=phone, message=message)
    if not settings.SMS_ENABLED:
        log.status = 'sent'
        log.sent_at = timezone.now()
        log.error = '[DRY-RUN] SMS_ENABLED=False'
        log.save()
        return {'phone': phone, 'message': message, 'dry_run': True}

    try:
        from .providers import send_via_provider
        send_via_provider(phone, message)
        log.status = 'sent'
        log.sent_at = timezone.now()
        log.save()
        return 'ok'
    except Exception as e:
        log.status = 'failed'
        log.error = str(e)
        log.attempts += 1
        log.save()
        raise self.retry(exc=e, countdown=60)


@shared_task
def send_monthly_payment_reminders():
    """Har oyning 1-kuni — to'lov eslatmasi."""
    from datetime import date
    from apps.payments.services import generate_monthly_charges
    from apps.payments.models import MonthlyCharge
    today = date.today()
    generate_monthly_charges(today.year, today.month)

    charges = MonthlyCharge.objects.filter(
        year=today.year, month=today.month
    ).select_related('student__user')

    month_name = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
                  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'][today.month - 1]

    for c in charges:
        phone = c.student.user.phone
        if not phone:
            continue
        message = (f"Assalomu alaykum, {c.student.user.first_name}! "
                   f"{month_name} uchun to'lov: {c.amount:,.0f} so'm. "
                   f"Iltimos, 10-sanagacha to'lang. {settings.CENTER_NAME}")
        send_sms.delay(phone, message)


@shared_task
def send_overdue_reminders():
    """Oyning 10-kuni — qaytarilgan eslatma."""
    from datetime import date
    from apps.payments.models import MonthlyCharge
    today = date.today()
    charges = MonthlyCharge.objects.filter(
        year=today.year, month=today.month
    ).select_related('student__user')
    for c in charges:
        if c.balance <= 0:
            continue
        phone = c.student.user.phone
        if not phone:
            continue
        message = (f"{c.student.user.first_name}, to'lov hali amalga oshmagan: "
                   f"{c.balance:,.0f} so'm. Muammo bo'lsa, administrator bilan bog'laning.")
        send_sms.delay(phone, message)

import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('polyglot_crm')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'payment-reminder-1st': {
        'task': 'apps.sms.tasks.send_monthly_payment_reminders',
        'schedule': crontab(day_of_month='1', hour=9, minute=0),
    },
    'payment-reminder-10th': {
        'task': 'apps.sms.tasks.send_overdue_reminders',
        'schedule': crontab(day_of_month='10', hour=9, minute=0),
    },
    'unfreeze-students': {
        'task': 'apps.students.tasks.auto_unfreeze_students',
        'schedule': crontab(hour=0, minute=5),
    },
}

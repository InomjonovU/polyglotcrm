from django.contrib import admin
from .models import SmsTemplate, SmsLog

admin.site.register(SmsTemplate)
admin.site.register(SmsLog)

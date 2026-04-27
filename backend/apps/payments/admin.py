from django.contrib import admin
from .models import Payment, MonthlyCharge

admin.site.register(Payment)
admin.site.register(MonthlyCharge)

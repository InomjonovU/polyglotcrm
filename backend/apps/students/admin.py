from django.contrib import admin
from .models import Student, FreezeRecord, GroupTransfer, DiscountLog

admin.site.register(Student)
admin.site.register(FreezeRecord)
admin.site.register(GroupTransfer)
admin.site.register(DiscountLog)

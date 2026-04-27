from django.contrib import admin
from .models import Homework


@admin.register(Homework)
class HomeworkAdmin(admin.ModelAdmin):
    list_display = ['title', 'group', 'due_date', 'created_at']
    list_filter = ['group', 'due_date']
    search_fields = ['title']

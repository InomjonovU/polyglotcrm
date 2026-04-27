from django.contrib import admin
from .models import Group, Course, Level, LessonCancellation, GroupScheduleChange

admin.site.register(Group)
admin.site.register(Course)
admin.site.register(Level)
admin.site.register(LessonCancellation)
admin.site.register(GroupScheduleChange)

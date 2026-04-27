from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/students/', include('apps.students.urls')),
    path('api/groups/', include('apps.groups.urls')),
    path('api/teachers/', include('apps.teachers.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/attendance/', include('apps.attendance.urls')),
    path('api/grades/', include('apps.grades.urls')),
    path('api/salary/', include('apps.salary.urls')),
    path('api/sms/', include('apps.sms.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/homework/', include('apps.homework.urls')),
    path('api/leads/', include('apps.leads.urls')),
    path('api/library/', include('apps.library.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

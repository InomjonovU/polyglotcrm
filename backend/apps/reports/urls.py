from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard),
    path('financial/', views.financial),
    path('teachers/', views.teachers_report),
    path('students-dynamics/', views.students_dynamics),
    path('export/students/', views.export_students),
    path('export/payments/', views.export_payments),
]

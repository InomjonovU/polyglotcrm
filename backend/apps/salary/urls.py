from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (AdvanceViewSet, SalaryRecordViewSet, AdvanceRequestViewSet,
                    current_salary, finalize)

router = DefaultRouter()
router.register('advances', AdvanceViewSet)
router.register('records', SalaryRecordViewSet)
router.register('requests', AdvanceRequestViewSet)

urlpatterns = [
    path('current/', current_salary),
    path('finalize/', finalize),
] + router.urls

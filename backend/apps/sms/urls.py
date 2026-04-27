from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import SmsTemplateViewSet, SmsLogViewSet, SmsSettingsView, bulk_send

router = DefaultRouter()
router.register('templates', SmsTemplateViewSet)
router.register('logs', SmsLogViewSet)

urlpatterns = [
    path('bulk-send/', bulk_send),
    path('settings/', SmsSettingsView.as_view()),
] + router.urls

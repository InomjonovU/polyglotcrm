from rest_framework.routers import DefaultRouter
from .views import HomeworkViewSet

router = DefaultRouter()
router.register('', HomeworkViewSet)

urlpatterns = router.urls

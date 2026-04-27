from rest_framework.routers import DefaultRouter
from .views import GroupViewSet, CourseViewSet, LevelViewSet

router = DefaultRouter()
router.register('courses', CourseViewSet)
router.register('levels', LevelViewSet)
router.register('', GroupViewSet)

urlpatterns = router.urls

from rest_framework.routers import DefaultRouter
from .views import BookViewSet, BookSaleViewSet

router = DefaultRouter()
router.register('books', BookViewSet, basename='book')
router.register('sales', BookSaleViewSet, basename='sale')
urlpatterns = router.urls

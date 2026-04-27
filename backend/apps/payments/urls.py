from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, ChargeViewSet

router = DefaultRouter()
router.register('charges', ChargeViewSet)
router.register('', PaymentViewSet)

urlpatterns = router.urls

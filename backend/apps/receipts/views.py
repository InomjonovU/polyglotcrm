from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.users.permissions import IsAdmin
from .models import Receipt
from .serializers import ReceiptSerializer


class ReceiptViewSet(viewsets.ModelViewSet):
    """
    Chek boshqaruvi.
    - create: hamma yaratishi mumkin (auth talab qilinmaydi)
    - list/retrieve/destroy: faqat admin
    """
    queryset = Receipt.objects.prefetch_related('items').all()
    serializer_class = ReceiptSerializer
    lookup_field = 'pk'

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        if self.action == 'lookup':
            return [AllowAny()]
        return [IsAdmin()]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user)

    @action(detail=False, methods=['get'], url_path='lookup/(?P<code>[^/]+)',
            permission_classes=[AllowAny])
    def lookup(self, request, code=None):
        """
        Qisqa kod orqali chekni topish. Hamma uchun ochiq.
        """
        try:
            receipt = Receipt.objects.prefetch_related('items').get(code__iexact=code.strip())
        except Receipt.DoesNotExist:
            return Response({'detail': 'Chek topilmadi'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ReceiptSerializer(receipt).data)

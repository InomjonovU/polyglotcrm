from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.users.permissions import IsAdmin
from .models import Parent
from .serializers import ParentSerializer, ParentWriteSerializer


class ParentViewSet(viewsets.ModelViewSet):
    queryset = Parent.objects.prefetch_related('students__user').all()
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['full_name', 'phone']
    filterset_fields = ['relation']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ParentWriteSerializer
        return ParentSerializer

    @action(detail=True, methods=['post'])
    def send_sms(self, request, pk=None):
        parent = self.get_object()
        message = request.data.get('message', '').strip()
        if not message:
            return Response({'detail': 'Xabar bo\'sh'}, status=400)
        if not parent.phone:
            return Response({'detail': 'Telefon yo\'q'}, status=400)
        try:
            from apps.sms.tasks import send_sms
            send_sms.delay(parent.phone, message)
        except Exception:
            pass
        return Response({'detail': 'Yuborildi'})

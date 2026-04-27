from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsAdmin
from .models import SmsTemplate, SmsLog, SmsSettings
from .serializers import SmsTemplateSerializer, SmsLogSerializer, SmsSettingsSerializer
from .tasks import send_sms


class SmsTemplateViewSet(viewsets.ModelViewSet):
    queryset = SmsTemplate.objects.all()
    serializer_class = SmsTemplateSerializer
    permission_classes = [IsAdmin]


class SmsLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SmsLog.objects.all().order_by('-created_at')
    serializer_class = SmsLogSerializer
    filterset_fields = ['status', 'phone']

    def get_queryset(self):
        from django.db.models import Q
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'student':
            qs = qs.filter(phone=user.phone)
        search = (self.request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(Q(phone__icontains=search) | Q(message__icontains=search))
        return qs


class SmsSettingsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(SmsSettingsSerializer(SmsSettings.load()).data)

    def put(self, request):
        obj = SmsSettings.load()
        ser = SmsSettingsSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        # avoid clearing password if not provided
        if 'eskiz_password' in request.data and not request.data.get('eskiz_password'):
            ser.validated_data.pop('eskiz_password', None)
        ser.save()
        return Response(ser.data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def bulk_send(request):
    """Massa SMS: {phones: [...], message: "..."}"""
    phones = request.data.get('phones', [])
    message = request.data.get('message', '')
    if not phones or not message:
        return Response({'detail': 'phones va message kerak'}, status=400)
    for phone in phones:
        send_sms.delay(phone, message)
    return Response({'queued': len(phones)})

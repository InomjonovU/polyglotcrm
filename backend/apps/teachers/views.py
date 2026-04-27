from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.users.permissions import IsAdmin
from .models import Teacher
from .serializers import TeacherSerializer, TeacherCreateSerializer


class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.select_related('user').all()
    serializer_class = TeacherSerializer
    search_fields = ['user__first_name', 'user__last_name', 'user__phone']
    filterset_fields = ['type']

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'me'):
            return super().get_permissions()
        return [IsAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # O'qituvchi faqat o'zini ko'radi (referrals va h.k. uchun)
        if user.is_authenticated and user.role == 'teacher':
            qs = qs.filter(user=user)
        return qs

    @action(detail=False, methods=['get'])
    def me(self, request):
        if request.user.role != 'teacher':
            return Response({'detail': "Faqat o'qituvchi uchun"}, status=403)
        try:
            teacher = request.user.teacher_profile
        except Teacher.DoesNotExist:
            return Response({'detail': "Profil topilmadi"}, status=404)
        return Response(TeacherSerializer(teacher).data)

    def create(self, request, *args, **kwargs):
        serializer = TeacherCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        teacher = serializer.save()
        return Response(TeacherSerializer(teacher).data, status=201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user_data = serializer.validated_data.pop('user', {})
        for k, v in user_data.items():
            setattr(instance.user, k, v)
        instance.user.save()
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        from apps.sms.tasks import send_sms
        teacher = self.get_object()
        new_password = request.data.get('new_password')
        if not new_password or len(new_password) < 4:
            return Response({'detail': "Parol kamida 4 ta belgi"}, status=400)
        teacher.user.set_password(new_password)
        teacher.user.save()
        if teacher.user.phone:
            send_sms.delay(teacher.user.phone, f"Yangi parolingiz: {new_password}")
        return Response({'detail': "Parol yangilandi"})

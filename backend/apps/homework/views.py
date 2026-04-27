from datetime import date as _date

from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.groups.utils import is_lesson_day
from apps.groups.models import LessonCancellation
from .models import Homework
from .serializers import HomeworkSerializer


class HomeworkViewSet(viewsets.ModelViewSet):
    queryset = Homework.objects.select_related('group', 'created_by').all()
    serializer_class = HomeworkSerializer
    filterset_fields = ['group']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'teacher':
            from django.db.models import Q
            qs = qs.filter(Q(group__teacher__user=user) | Q(group__support_teacher__user=user))
        elif user.role == 'student':
            qs = qs.filter(group__enrolled_students__user=user).distinct()
        elif user.role == 'parent':
            qs = qs.filter(group__enrolled_students__parent_phone=user.phone).distinct()
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ('admin', 'teacher'):
            raise PermissionDenied("Faqat o'qituvchi yoki admin")
        group = serializer.validated_data.get('group')
        if user.role == 'teacher':
            is_main = group.teacher and group.teacher.user == user
            is_support = group.support_teacher and group.support_teacher.user == user
            if not (is_main or is_support):
                raise PermissionDenied("Faqat o'z guruhingiz")
            today = _date.today()
            if not is_lesson_day(group, today):
                raise ValidationError({'detail': "Vazifa faqat dars kuni qo'yiladi"})
            if LessonCancellation.objects.filter(group=group, date=today).exists():
                raise ValidationError({'detail': "Bugungi dars bekor qilingan"})
        serializer.save(created_by=user)

    def perform_update(self, serializer):
        user = self.request.user
        if user.role not in ('admin', 'teacher'):
            raise PermissionDenied("Ruxsat yo'q")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role not in ('admin', 'teacher'):
            raise PermissionDenied("Ruxsat yo'q")
        instance.delete()

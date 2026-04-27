from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.users.permissions import IsAdmin, IsAdminOrReadOnly
from .models import Group, Course, Level, LessonCancellation, GroupScheduleChange
from .serializers import (CourseSerializer, LevelSerializer, GroupSerializer,
                          LessonCancellationSerializer, GroupScheduleChangeSerializer)


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAdminOrReadOnly]


class LevelViewSet(viewsets.ModelViewSet):
    queryset = Level.objects.all()
    serializer_class = LevelSerializer
    permission_classes = [IsAdminOrReadOnly]


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.select_related('course', 'level', 'teacher__user').all()
    serializer_class = GroupSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ['is_active', 'course', 'teacher']
    search_fields = ['name']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'teacher':
            from django.db.models import Q
            qs = qs.filter(Q(teacher__user=user) | Q(support_teacher__user=user))
        elif user.role == 'student':
            qs = qs.filter(enrolled_students__user=user)
        elif user.role == 'parent':
            qs = qs.filter(enrolled_students__parent_phone=user.phone)
        return qs.distinct()

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def change_schedule(self, request, pk=None):
        from apps.sms.tasks import send_sms
        group = self.get_object()
        new_pattern = request.data.get('weekday_pattern')
        new_time = request.data.get('lesson_time')
        effective_date = request.data.get('effective_date')
        if not all([new_pattern, new_time, effective_date]):
            return Response({'detail': "weekday_pattern, lesson_time, effective_date kerak"}, status=400)

        GroupScheduleChange.objects.create(
            group=group,
            old_pattern=group.weekday_pattern,
            old_time=group.lesson_time,
            new_pattern=new_pattern,
            new_time=new_time,
            effective_date=effective_date,
            changed_by=request.user,
        )
        old_display = group.get_weekday_pattern_display()
        old_time_str = group.lesson_time.strftime('%H:%M')
        group.weekday_pattern = new_pattern
        group.lesson_time = new_time
        group.save()

        recipients = []
        for s in group.enrolled_students.filter(status='active'):
            if s.user.phone:
                recipients.append(s.user.phone)
        if group.teacher and group.teacher.user.phone:
            recipients.append(group.teacher.user.phone)
        message = (f"Diqqat! {group.name} guruhining dars vaqti o'zgardi: "
                   f"{old_display} {old_time_str} → {group.get_weekday_pattern_display()} {new_time}. "
                   f"{effective_date} dan kuchga kiradi.")
        for phone in recipients:
            send_sms.delay(phone, message)

        return Response(GroupSerializer(group).data)

    @action(detail=True, methods=['post'])
    def cancel_lesson(self, request, pk=None):
        from apps.sms.tasks import send_sms
        group = self.get_object()
        if request.user.role not in ('admin', 'teacher'):
            return Response({'detail': 'Ruxsat yo\'q'}, status=403)
        if request.user.role == 'teacher' and (not group.teacher or group.teacher.user != request.user):
            return Response({'detail': 'Faqat o\'z guruhingiz'}, status=403)
        date = request.data.get('date')
        reason = request.data.get('reason', '')
        cancel, created = LessonCancellation.objects.get_or_create(
            group=group, date=date, defaults={'reason': reason, 'created_by': request.user},
        )
        if not created:
            return Response({'detail': 'Bu sana uchun allaqachon belgilangan'}, status=400)

        message = f"{date} kuni {group.name} guruhining darsi bo'lmaydi."
        for s in group.enrolled_students.filter(status='active'):
            if s.user.phone:
                send_sms.delay(s.user.phone, message)

        return Response(LessonCancellationSerializer(cancel).data, status=201)

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        from apps.students.serializers import StudentSerializer
        group = self.get_object()
        qs = group.enrolled_students.select_related('user').all()
        return Response(StudentSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def enroll(self, request, pk=None):
        """Guruhga o'quvchi(lar) qo'shish."""
        from apps.students.models import Student
        from apps.students.serializers import StudentSerializer
        group = self.get_object()
        ids = request.data.get('student_ids') or []
        if not isinstance(ids, list):
            ids = [ids]
        students = Student.objects.filter(id__in=ids)
        for s in students:
            s.groups.add(group)
            if not s.group_id:
                s.group = group
                s.save()
        return Response({'added': students.count()})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def unenroll(self, request, pk=None):
        """Guruhdan o'quvchi chiqarish."""
        from apps.students.models import Student
        group = self.get_object()
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'detail': 'student_id kerak'}, status=400)
        try:
            s = Student.objects.get(pk=student_id)
        except Student.DoesNotExist:
            return Response({'detail': 'Topilmadi'}, status=404)
        s.groups.remove(group)
        if s.group_id == group.id:
            # Primary'ni boshqa guruhlardan tanlash
            remaining = s.groups.first()
            s.group = remaining
            s.save()
        return Response({'detail': "Chiqarildi"})

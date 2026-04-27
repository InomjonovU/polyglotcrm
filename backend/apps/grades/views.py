from datetime import date as _date

from django.db.models import Avg
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.groups.utils import is_lesson_day
from apps.groups.models import Group, LessonCancellation
from .models import Grade
from .serializers import GradeSerializer


class GradeViewSet(viewsets.ModelViewSet):
    queryset = Grade.objects.select_related('student__user', 'group').all()
    serializer_class = GradeSerializer
    filterset_fields = ['group', 'student', 'type']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'student':
            qs = qs.filter(student__user=user)
        elif user.role == 'parent':
            qs = qs.filter(student__parent_phone=user.phone)
        elif user.role == 'teacher':
            from django.db.models import Q
            qs = qs.filter(Q(group__teacher__user=user) | Q(group__support_teacher__user=user))
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ('admin', 'teacher'):
            raise PermissionDenied("Ruxsat yo'q")

        group = serializer.validated_data.get('group')
        date = serializer.validated_data.get('date') or _date.today()

        if user.role == 'teacher':
            is_main = group and group.teacher and group.teacher.user == user
            is_support = group and group.support_teacher and group.support_teacher.user == user
            if not (is_main or is_support):
                raise PermissionDenied("Faqat o'z guruhingiz")
            today = _date.today()
            if date != today:
                raise ValidationError({'date': "Baholar faqat bugungi sana uchun qo'yiladi"})
            if not is_lesson_day(group, today):
                raise ValidationError({'date': "Bugun bu guruh uchun dars kuni emas"})
            if LessonCancellation.objects.filter(group=group, date=today).exists():
                raise ValidationError({'date': "Bugungi dars bekor qilingan"})

        serializer.save(given_by=user, date=date)

    @action(detail=False, methods=['get'])
    def average(self, request):
        student_id = request.query_params.get('student')
        qs = self.get_queryset()
        if student_id:
            qs = qs.filter(student_id=student_id)
        avg = qs.aggregate(a=Avg('value'))['a']
        return Response({'average': round(avg, 2) if avg else None, 'count': qs.count()})

    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        """O'rtacha ball bo'yicha o'quvchilar reytingi.

        - admin  : barcha o'quvchilar (yoki `?group=` bilan bitta guruh)
        - teacher: o'z guruhlari (`?group=` ixtiyoriy)
        - student: faqat o'z guruh(lar)idagilar
        - parent : faqat o'z farzandi guruh(lar)idagilar
        """
        from django.db.models import Count, Q
        from apps.students.models import Student, StudentStatus

        user = request.user
        if not user.is_authenticated:
            return Response({'detail': "Ruxsat yo'q"}, status=403)

        group_id = request.query_params.get('group')

        students = Student.objects.filter(
            status__in=[StudentStatus.ACTIVE, StudentStatus.FROZEN]
        ).select_related('user').prefetch_related('groups')

        # Rolga ko'ra cheklov
        if user.role == 'student':
            try:
                me = user.student_profile
            except Exception:
                return Response([])
            my_groups = me.groups.values_list('id', flat=True)
            students = students.filter(groups__id__in=list(my_groups)).distinct()
        elif user.role == 'parent':
            children = Student.objects.filter(parent_phone=user.phone)
            child_groups = set()
            for c in children:
                child_groups.update(c.groups.values_list('id', flat=True))
            if not child_groups:
                return Response([])
            students = students.filter(groups__id__in=list(child_groups)).distinct()
        elif user.role == 'teacher':
            from apps.groups.models import Group
            my_group_ids = list(Group.objects.filter(
                Q(teacher__user=user) | Q(support_teacher__user=user)
            ).values_list('id', flat=True))
            students = students.filter(groups__id__in=my_group_ids).distinct()

        if group_id:
            students = students.filter(groups__id=group_id).distinct()

        # Har bir o'quvchi uchun avg + count
        students = students.annotate(
            avg_score=Avg('grades__value'),
            grade_count=Count('grades', distinct=True),
        )

        # Faqat baho olganlar reytingda turadi (avg_score is not None)
        rows = []
        for s in students:
            if s.avg_score is None:
                continue
            group_names = [g.name for g in s.groups.all()]
            rows.append({
                'student_id': s.id,
                'full_name': s.user.full_name,
                'group_names': group_names,
                'avg_score': round(float(s.avg_score), 2),
                'grade_count': s.grade_count,
            })

        # Saralash: avg DESC, count DESC, ism ASC
        rows.sort(key=lambda r: (-r['avg_score'], -r['grade_count'], r['full_name']))
        # Rank qo'shamiz (bir xil ballarga bir xil o'rin)
        prev_key = None
        prev_rank = 0
        for i, r in enumerate(rows, start=1):
            key = (r['avg_score'], r['grade_count'])
            if key != prev_key:
                prev_rank = i
                prev_key = key
            r['rank'] = prev_rank

        # `me` — joriy foydalanuvchining o'rni
        me_id = None
        if user.role == 'student':
            try:
                me_id = user.student_profile.id
            except Exception:
                pass

        return Response({'results': rows, 'my_id': me_id})

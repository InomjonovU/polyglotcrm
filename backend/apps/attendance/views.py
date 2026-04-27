from datetime import date as _date, timedelta

from django.db import transaction
from django.db.models import Count, Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.groups.models import Group, LessonCancellation
from apps.groups.utils import is_lesson_day, lesson_dates_in_range, has_lesson_today
from apps.students.models import Student, StudentStatus
from .models import Attendance, AttendanceStatus
from .serializers import AttendanceSerializer, BulkAttendanceSerializer


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related('student__user', 'group').all()
    serializer_class = AttendanceSerializer
    filterset_fields = ['group', 'student', 'date', 'status']

    def get_queryset(self):
        qs = super().get_queryset().order_by('-date', 'student__user__first_name')
        user = self.request.user
        if user.role == 'student':
            qs = qs.filter(student__user=user)
        elif user.role == 'parent':
            qs = qs.filter(student__parent_phone=user.phone)
        elif user.role == 'teacher':
            qs = qs.filter(Q(group__teacher__user=user) | Q(group__support_teacher__user=user))
        return qs

    # ------------------------------------------------------------------
    # O'QITUVCHI UCHUN: bugungi dars
    # ------------------------------------------------------------------
    @action(detail=False, methods=['get'])
    def today(self, request):
        """
        O'qituvchi uchun bugungi dars konteksti.
        - Bugun dars bormi
        - Qaysi guruh(lar)
        - Har bir guruh uchun: o'quvchilar ro'yxati, allaqachon belgilanganmi
        """
        user = request.user
        if user.role != 'teacher':
            return Response({'detail': "Faqat o'qituvchi uchun"}, status=403)

        today = _date.today()
        try:
            teacher = user.teacher_profile
        except Exception:
            return Response({'detail': "O'qituvchi profili topilmadi"}, status=404)

        if teacher.type == 'support':
            return Response({
                'date': today.isoformat(),
                'has_lesson': False,
                'groups': [],
                'support_blocked': True,
            })

        groups = Group.objects.filter(teacher=teacher, is_active=True)
        result = []
        for g in groups:
            if not is_lesson_day(g, today):
                continue
            if LessonCancellation.objects.filter(group=g, date=today).exists():
                continue

            students = g.enrolled_students.filter(
                status__in=[StudentStatus.ACTIVE, StudentStatus.FROZEN]
            ).select_related('user').order_by('user__first_name')

            existing = {a.student_id: a.status for a in Attendance.objects.filter(group=g, date=today)}
            locked = len(existing) > 0  # birinchi saqlangach qulflanadi

            result.append({
                'group_id': g.id,
                'group_name': g.name,
                'lesson_time': g.lesson_time.strftime('%H:%M'),
                'locked': locked,
                'students': [
                    {
                        'id': s.id,
                        'name': f"{s.user.first_name} {s.user.last_name}".strip(),
                        'status': existing.get(s.id),  # None agar belgilanmagan
                        'frozen': s.status == StudentStatus.FROZEN,
                    }
                    for s in students
                ],
            })

        return Response({
            'date': today.isoformat(),
            'has_lesson': len(result) > 0,
            'groups': result,
        })

    @action(detail=False, methods=['post'])
    def bulk_mark(self, request):
        """
        Davomat belgilash.
        - O'qituvchi: faqat bugungi kun, faqat lesson_day, faqat o'z guruhi, 1 marta.
        - Admin: har qanday sana, yangilash mumkin.
        """
        user = request.user
        if user.role not in ('admin', 'teacher'):
            return Response({'detail': "Ruxsat yo'q"}, status=403)

        serializer = BulkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group_id = serializer.validated_data['group']
        d = serializer.validated_data['date']
        items = serializer.validated_data['items']

        try:
            group = Group.objects.get(pk=group_id)
        except Group.DoesNotExist:
            return Response({'detail': 'Guruh topilmadi'}, status=404)

        # O'qituvchi cheklovlari
        if user.role == 'teacher':
            # Support o'qituvchi davomat ola olmaydi
            t_profile = getattr(user, 'teacher_profile', None)
            if t_profile and t_profile.type == 'support':
                return Response({'detail': "Support o'qituvchi davomat ola olmaydi"}, status=403)
            if not group.teacher or group.teacher.user != user:
                return Response({'detail': "Faqat o'z guruhingiz"}, status=403)
            if d != _date.today():
                return Response({'detail': "Faqat bugungi sana uchun davomat qila olasiz"}, status=400)
            if not is_lesson_day(group, d):
                return Response({'detail': "Bugun bu guruh uchun dars kuni emas"}, status=400)
            if LessonCancellation.objects.filter(group=group, date=d).exists():
                return Response({'detail': "Bugungi dars bekor qilingan"}, status=400)
            if Attendance.objects.filter(group=group, date=d).exists():
                return Response({'detail': "Davomat allaqachon belgilangan. Tahrirlashni adminga yozing."}, status=400)

        with transaction.atomic():
            for item in items:
                status = item.get('status')
                if not status:
                    # null/empty => yozuvni o'chirish (admin: "belgilanmagan"ga qaytarish)
                    if user.role != 'admin':
                        return Response({'detail': "Faqat admin davomatni o'chira oladi"}, status=403)
                    Attendance.objects.filter(
                        student_id=item['student'], group=group, date=d,
                    ).delete()
                else:
                    Attendance.objects.update_or_create(
                        student_id=item['student'], group=group, date=d,
                        defaults={'status': status, 'marked_by': user},
                    )
        return Response({'detail': 'Saqlandi', 'count': len(items)})

    # ------------------------------------------------------------------
    # ADMIN UCHUN: davomat jadvali (grid)
    # ------------------------------------------------------------------
    @action(detail=False, methods=['get'])
    def grid(self, request):
        """
        Admin/teacher uchun davomat jadvali (oylik).
        Query: group, year, month
        Qaytaradi: { dates: [...], students: [{id, name, cells: {date: status}, enrolled_at}], missing_dates: [...] }
        """
        import calendar
        user = request.user
        group_id = request.query_params.get('group')
        if not group_id:
            return Response({'detail': 'group parametr kerak'}, status=400)

        try:
            group = Group.objects.get(pk=group_id)
        except Group.DoesNotExist:
            return Response({'detail': 'Guruh topilmadi'}, status=404)

        if user.role == 'teacher':
            is_main = group.teacher and group.teacher.user == user
            is_support = group.support_teacher and group.support_teacher.user == user
            if not (is_main or is_support):
                return Response({'detail': "Ruxsat yo'q"}, status=403)

        today = _date.today()
        try:
            year = int(request.query_params.get('year') or today.year)
            month = int(request.query_params.get('month') or today.month)
            if month < 1 or month > 12:
                raise ValueError
        except ValueError:
            return Response({'detail': 'year/month noto\'g\'ri'}, status=400)

        last_day = calendar.monthrange(year, month)[1]
        start = _date(year, month, 1)
        end = _date(year, month, last_day)

        # Faqat dars kunlari
        lesson_dates = lesson_dates_in_range(group, start, end)
        # Bekor qilingan kunlarni chiqarib tashlash
        cancelled = set(LessonCancellation.objects.filter(
            group=group, date__in=lesson_dates
        ).values_list('date', flat=True))
        lesson_dates = [d for d in lesson_dates if d not in cancelled]

        students = group.enrolled_students.filter(
            status__in=[StudentStatus.ACTIVE, StudentStatus.FROZEN]
        ).select_related('user').order_by('user__first_name')

        # Enrollment sanalari (o'quvchi guruhga qo'shilgan kun)
        from apps.groups.models import GroupEnrollment
        enroll_map = {
            e.student_id: e.enrolled_at
            for e in GroupEnrollment.objects.filter(group=group, student__in=students, left_at__isnull=True)
        }

        # Mavjud davomat yozuvlari
        records = Attendance.objects.filter(group=group, date__in=lesson_dates)
        rec_map = {(r.student_id, r.date): r.status for r in records}

        # Belgilanmagan dars kunlari (oldingi kunlar, hali belgilanmagan)
        marked_dates = set(r.date for r in records)
        missing_dates = [d for d in lesson_dates if d < today and d not in marked_dates]

        student_rows = []
        for s in students:
            enrolled_at = enroll_map.get(s.id)
            cells = {}
            for d in lesson_dates:
                # Enrollment kunidan oldingi kunlar ko'rinmasin
                if enrolled_at and d < enrolled_at:
                    cells[d.isoformat()] = '__before__'
                else:
                    status = rec_map.get((s.id, d))
                    cells[d.isoformat()] = status  # None => belgilanmagan
            student_rows.append({
                'id': s.id,
                'name': f"{s.user.first_name} {s.user.last_name}".strip(),
                'frozen': s.status == StudentStatus.FROZEN,
                'enrolled_at': enrolled_at.isoformat() if enrolled_at else None,
                'cells': cells,
            })

        return Response({
            'group_id': group.id,
            'group_name': group.name,
            'year': year,
            'month': month,
            'start': start.isoformat(),
            'end': end.isoformat(),
            'dates': [d.isoformat() for d in lesson_dates],
            'students': student_rows,
            'missing_dates': [d.isoformat() for d in missing_dates],
        })

    # ------------------------------------------------------------------
    # Belgilanmagan darslar (admin nazorati)
    # ------------------------------------------------------------------
    @action(detail=False, methods=['get'])
    def unmarked(self, request):
        """O'qituvchi davomat qilmagan dars kunlari ro'yxati (admin ko'radi)."""
        user = request.user
        if user.role != 'admin':
            return Response({'detail': "Ruxsat yo'q"}, status=403)

        days = int(request.query_params.get('days', 14))
        today = _date.today()
        start = today - timedelta(days=days)

        result = []
        for g in Group.objects.filter(is_active=True).select_related('teacher__user'):
            dates = lesson_dates_in_range(g, start, today - timedelta(days=1))
            if not dates:
                continue
            cancelled = set(LessonCancellation.objects.filter(
                group=g, date__in=dates
            ).values_list('date', flat=True))
            dates = [d for d in dates if d not in cancelled]

            marked = set(Attendance.objects.filter(
                group=g, date__in=dates
            ).values_list('date', flat=True))
            missing = [d.isoformat() for d in dates if d not in marked]

            if missing:
                tname = ''
                if g.teacher and g.teacher.user:
                    tname = f"{g.teacher.user.first_name} {g.teacher.user.last_name}".strip()
                result.append({
                    'group_id': g.id,
                    'group_name': g.name,
                    'teacher_name': tname,
                    'missing_dates': missing,
                    'count': len(missing),
                })
        return Response(result)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Guruh bo'yicha davomat statistikasi."""
        group_id = request.query_params.get('group')
        qs = self.get_queryset()
        if group_id:
            qs = qs.filter(group_id=group_id)
        stats = qs.values('student', 'student__user__first_name', 'student__user__last_name').annotate(
            total=Count('id'),
            present=Count('id', filter=Q(status='present')),
            absent=Count('id', filter=Q(status='absent')),
            late=Count('id', filter=Q(status='late')),
        )
        result = []
        for row in stats:
            total = row['total'] or 1
            percent = ((row['present'] + row['late']) * 100) / total
            result.append({
                'student_id': row['student'],
                'student_name': f"{row['student__user__first_name']} {row['student__user__last_name']}".strip(),
                'total': row['total'],
                'present': row['present'],
                'absent': row['absent'],
                'late': row['late'],
                'percent': round(percent, 1),
            })
        return Response(result)

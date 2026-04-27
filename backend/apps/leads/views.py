from django.db.models import Count
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.users.permissions import IsAdmin
from .models import Lead, LeadActivity, LeadStatus
from .serializers import LeadSerializer, LeadActivitySerializer


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.select_related(
        'interest_course', 'interest_level', 'assigned_to',
        'referrer_student__user', 'referrer_teacher__user',
    ).prefetch_related('activities__created_by').all()
    serializer_class = LeadSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['full_name', 'phone', 'notes']
    filterset_fields = ['status', 'source', 'assigned_to', 'interest_course']

    def perform_create(self, serializer):
        lead = serializer.save()
        LeadActivity.objects.create(
            lead=lead, kind='status_change',
            text=f"Lid yaratildi ({lead.get_status_display()})",
            created_by=self.request.user,
        )

    def perform_update(self, serializer):
        old_status = self.get_object().status
        lead = serializer.save()
        if lead.status != old_status:
            LeadActivity.objects.create(
                lead=lead, kind='status_change',
                text=f"Holat: {old_status} → {lead.status}",
                created_by=self.request.user,
            )

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Kanban uchun — holat bo'yicha soni."""
        counts = Lead.objects.values('status').annotate(n=Count('id'))
        result = {s: 0 for s, _ in LeadStatus.choices}
        for c in counts:
            result[c['status']] = c['n']
        return Response(result)

    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        lead = self.get_object()
        text = (request.data.get('text') or '').strip()
        if not text:
            return Response({'detail': "Matn bo'sh"}, status=400)
        a = LeadActivity.objects.create(lead=lead, kind='note', text=text, created_by=request.user)
        return Response(LeadActivitySerializer(a).data, status=201)

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        """Lidni o'quvchiga aylantirish."""
        from django.db import transaction
        from apps.users.models import User, Role
        from apps.students.models import Student
        from apps.groups.models import Group

        lead = self.get_object()
        if lead.converted_student_id:
            return Response({'detail': "Bu lid allaqachon o'quvchiga aylantirilgan"}, status=400)

        password = request.data.get('password') or '1234'
        group_id = request.data.get('group_id')

        with transaction.atomic():
            parts = lead.full_name.strip().split(' ', 1)
            first = parts[0]
            last = parts[1] if len(parts) > 1 else ''
            user = User.objects.create_user(
                username=lead.phone or f"lead{lead.id}",
                password=password,
                role=Role.STUDENT,
                first_name=first, last_name=last,
                phone=lead.phone,
            )
            student = Student.objects.create(
                user=user,
                referrer_student=lead.referrer_student,
                referrer_teacher=lead.referrer_teacher,
                referrer_source=lead.get_source_display() if not (lead.referrer_student or lead.referrer_teacher) else '',
            )
            if group_id:
                try:
                    g = Group.objects.get(pk=group_id)
                    student.groups.add(g)
                    student.group = g
                    student.save()
                except Group.DoesNotExist:
                    pass

            lead.status = LeadStatus.CONVERTED
            lead.converted_student = student
            lead.save()
            LeadActivity.objects.create(
                lead=lead, kind='status_change',
                text=f"O'quvchiga aylantirildi → {student.user.full_name}",
                created_by=request.user,
            )
        return Response({'student_id': student.id, 'detail': "O'quvchi yaratildi"})

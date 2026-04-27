from datetime import date
from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.permissions import IsAdmin
from apps.teachers.models import Teacher
from .models import Advance, SalaryRecord, AdvanceRequest
from .serializers import AdvanceSerializer, SalaryRecordSerializer, AdvanceRequestSerializer
from .services import calculate_teacher_salary, finalize_month


class AdvanceViewSet(viewsets.ModelViewSet):
    queryset = Advance.objects.select_related('teacher__user').all()
    serializer_class = AdvanceSerializer
    filterset_fields = ['teacher', 'year', 'month']

    def get_permissions(self):
        return [IsAdmin()]

    def perform_create(self, serializer):
        teacher = serializer.validated_data['teacher']
        year = serializer.validated_data['year']
        month = serializer.validated_data['month']
        amount = Decimal(serializer.validated_data['amount'])

        data = calculate_teacher_salary(teacher, year, month)
        remaining = data['calculated_amount'] - data['advances_total']
        if amount > remaining:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'amount': f"Limitdan oshgan. Qoldiq limit: {remaining}"
            })
        serializer.save(given_by=self.request.user)


class SalaryRecordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SalaryRecord.objects.select_related('teacher__user').all()
    serializer_class = SalaryRecordSerializer
    filterset_fields = ['teacher', 'year', 'month']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'teacher':
            qs = qs.filter(teacher__user=user)
        return qs


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_salary(request):
    """Joriy oy hisoblangan maosh (hali finalize qilinmagan)."""
    user = request.user
    if user.role == 'teacher':
        teacher = Teacher.objects.get(user=user)
    else:
        teacher_id = request.query_params.get('teacher')
        teacher = Teacher.objects.get(pk=teacher_id)
    year = int(request.query_params.get('year', date.today().year))
    month = int(request.query_params.get('month', date.today().month))
    data = calculate_teacher_salary(teacher, year, month)
    return Response({
        'teacher_id': teacher.id,
        'teacher_name': teacher.user.full_name,
        'year': year, 'month': month,
        **{k: (float(v) if isinstance(v, Decimal) else v) for k, v in data.items()},
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def finalize(request):
    teacher_id = request.data.get('teacher')
    year = int(request.data.get('year'))
    month = int(request.data.get('month'))
    teacher = Teacher.objects.get(pk=teacher_id)
    record = finalize_month(teacher, year, month, user=request.user)
    return Response(SalaryRecordSerializer(record).data)


class AdvanceRequestViewSet(viewsets.ModelViewSet):
    queryset = AdvanceRequest.objects.select_related('teacher__user').all()
    serializer_class = AdvanceRequestSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role == 'teacher':
            qs = qs.filter(teacher__user=self.request.user)
        return qs

    def perform_create(self, serializer):
        if self.request.user.role != 'teacher':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()
        teacher = Teacher.objects.get(user=self.request.user)
        serializer.save(teacher=teacher)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        req = self.get_object()
        today = date.today()
        Advance.objects.create(
            teacher=req.teacher, year=today.year, month=today.month,
            amount=req.amount, given_by=request.user,
            note=f"So'rov #{req.id}: {req.reason}",
        )
        req.status = 'approved'
        req.reviewed_at = timezone.now()
        req.reviewed_by = request.user
        req.save()
        return Response(AdvanceRequestSerializer(req).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        req = self.get_object()
        req.status = 'rejected'
        req.reviewed_at = timezone.now()
        req.reviewed_by = request.user
        req.save()
        return Response(AdvanceRequestSerializer(req).data)

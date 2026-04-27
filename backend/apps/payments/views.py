from datetime import date
from decimal import Decimal
from django.db.models import Sum
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.users.permissions import IsAdmin
from .models import Payment, MonthlyCharge
from .serializers import PaymentSerializer, MonthlyChargeSerializer, ReceiptPublicSerializer
from .services import apply_payment, ensure_current_month_charges


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('student__user', 'charge__group').all()
    serializer_class = PaymentSerializer
    filterset_fields = ['student', 'method']

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'receipt'):
            return super().get_permissions()
        if self.action == 'lookup':
            return [AllowAny()]
        return [IsAdmin()]

    def get_queryset(self):
        from django.db.models import Q
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'student':
            qs = qs.filter(student__user=user)
        elif user.role == 'parent':
            qs = qs.filter(student__parent_phone=user.phone)

        params = self.request.query_params
        search = (params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(student__user__first_name__icontains=search)
                | Q(student__user__last_name__icontains=search)
                | Q(student__user__phone__icontains=search)
                | Q(receipt_code__icontains=search)
            )
        date_from = params.get('date_from')
        date_to = params.get('date_to')
        if date_from:
            qs = qs.filter(paid_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(paid_at__date__lte=date_to)
        # ?group=ID — to'lovni mos charge'ning guruhi bo'yicha filtrlash
        group_id = params.get('group')
        if group_id:
            qs = qs.filter(charge__group_id=group_id)
        return qs

    def perform_create(self, serializer):
        from django.conf import settings
        group_id = serializer.validated_data.get('group')
        payment = serializer.save(received_by=self.request.user)
        apply_payment(payment, group_id=group_id)
        student = payment.student
        if student.user.phone:
            try:
                from apps.sms.tasks import send_sms
                message = (f"{student.user.first_name}, {payment.amount:,.0f} so'm to'lovingiz "
                           f"qabul qilindi. Chek: {payment.receipt_code}. {settings.CENTER_NAME}")
                send_sms.delay(student.user.phone, message)
            except Exception:
                pass

    @action(detail=True, methods=['get'])
    def receipt(self, request, pk=None):
        """Auth bo'lgan foydalanuvchi uchun chekni ko'rish (o'z to'lovi/admin)."""
        payment = self.get_object()
        return Response(ReceiptPublicSerializer(payment).data)

    @action(detail=False, methods=['get'], url_path='lookup/(?P<code>[^/]+)',
            permission_classes=[AllowAny])
    def lookup(self, request, code=None):
        """Chek kodini ochiq tekshirish."""
        try:
            p = Payment.objects.select_related('student__user', 'charge__group',
                                               'received_by').get(receipt_code__iexact=(code or '').strip())
        except Payment.DoesNotExist:
            return Response({'detail': 'Chek topilmadi'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ReceiptPublicSerializer(p).data)


class ChargeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MonthlyCharge.objects.select_related('student__user', 'group').all()
    serializer_class = MonthlyChargeSerializer
    filterset_fields = ['year', 'month', 'student', 'group']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'student':
            qs = qs.filter(student__user=user)
        elif user.role == 'parent':
            qs = qs.filter(student__parent_phone=user.phone)
        return qs

    def list(self, request, *args, **kwargs):
        try:
            ensure_current_month_charges()
        except Exception:
            pass
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def debtors(self, request):
        try:
            ensure_current_month_charges()
        except Exception:
            pass
        year = int(request.query_params.get('year', date.today().year))
        month = int(request.query_params.get('month', date.today().month))
        charges = MonthlyCharge.objects.filter(year=year, month=month).select_related('student__user')
        debtors = []
        for c in charges:
            balance = c.balance
            if balance > 0:
                debtors.append({
                    'id': c.id,
                    'student_id': c.student.id,
                    'student_name': c.student.user.full_name,
                    'student_phone': c.student.user.phone,
                    'amount': c.amount,
                    'paid': c.paid_total,
                    'balance': balance,
                    'group_name': c.group.name if c.group else None,
                })
        return Response(debtors)

    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def summary(self, request):
        try:
            ensure_current_month_charges()
        except Exception:
            pass
        year = int(request.query_params.get('year', date.today().year))
        month = int(request.query_params.get('month', date.today().month))
        charges = MonthlyCharge.objects.filter(year=year, month=month)
        total_charged = charges.aggregate(s=Sum('amount'))['s'] or 0
        total_paid = Payment.objects.filter(
            charge__year=year, charge__month=month
        ).aggregate(s=Sum('amount'))['s'] or 0
        return Response({
            'year': year, 'month': month,
            'total_charged': total_charged,
            'total_paid': total_paid,
            'balance': Decimal(total_charged) - Decimal(total_paid),
        })

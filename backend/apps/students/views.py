import calendar
from decimal import Decimal
from datetime import date
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.users.permissions import IsAdmin
from apps.groups.models import Group
from .models import Student, StudentStatus, FreezeRecord, GroupTransfer, DiscountLog
from .serializers import (StudentSerializer, StudentCreateSerializer,
                          FreezeSerializer, GroupTransferSerializer)


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related('user', 'group').prefetch_related('groups').all()
    serializer_class = StudentSerializer
    filterset_fields = ['status', 'group', 'referrer_student', 'referrer_teacher']
    search_fields = ['user__first_name', 'user__last_name', 'user__phone']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return super().get_permissions()
        return [IsAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'student':
            qs = qs.filter(user=user)
        elif user.role == 'parent':
            qs = qs.filter(parent_phone=user.phone)
        elif user.role == 'teacher':
            qs = qs.filter(groups__teacher__user=user).distinct()
        # Filter by group param (both M2M and FK)
        group_param = self.request.query_params.get('group')
        if group_param:
            qs = qs.filter(groups__id=group_param).distinct()
        return qs

    def create(self, request, *args, **kwargs):
        serializer = StudentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        return Response(StudentSerializer(student).data, status=201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user_data = serializer.validated_data.pop('user', {})
        groups = serializer.validated_data.pop('groups', None)
        for k, v in user_data.items():
            setattr(instance.user, k, v)
        instance.user.save()
        serializer.save()
        if groups is not None:
            instance.groups.set(groups)
        return Response(StudentSerializer(instance).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def freeze(self, request, pk=None):
        from apps.sms.tasks import send_sms
        student = self.get_object()
        serializer = FreezeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        start_date = serializer.validated_data['start_date']
        end_date = serializer.validated_data['end_date']
        reason = serializer.validated_data.get('reason', '')

        with transaction.atomic():
            freeze = FreezeRecord.objects.create(
                student=student, start_date=start_date, end_date=end_date,
                reason=reason, created_by=request.user,
            )
            student.status = StudentStatus.FROZEN
            student.save()

        if student.user.phone:
            message = (f"{student.user.first_name}, o'qishingiz {start_date} dan "
                       f"{end_date} gacha muzlatildi. Shu davr uchun to'lov hisoblanmaydi.")
            send_sms.delay(student.user.phone, message)

        return Response(FreezeSerializer(freeze).data, status=201)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def unfreeze(self, request, pk=None):
        student = self.get_object()
        student.status = StudentStatus.ACTIVE
        student.save()
        FreezeRecord.objects.filter(student=student, released=False).update(released=True)
        return Response(StudentSerializer(student).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def transfer(self, request, pk=None):
        """Guruh o'tkazish — M2M: eski guruhdan chiqarib, yangiga qo'shiladi."""
        from apps.sms.tasks import send_sms
        student = self.get_object()
        new_group_id = request.data.get('new_group')
        transfer_date_str = request.data.get('transfer_date')
        if not new_group_id or not transfer_date_str:
            return Response({'detail': 'new_group va transfer_date kerak'}, status=400)
        new_group = Group.objects.get(pk=new_group_id)
        if isinstance(transfer_date_str, str):
            transfer_date = date.fromisoformat(transfer_date_str)
        else:
            transfer_date = transfer_date_str
        old_group = student.group

        days_in_month = calendar.monthrange(transfer_date.year, transfer_date.month)[1]
        day = transfer_date.day
        old_fee_share = Decimal(0)
        new_fee_share = Decimal(0)
        if old_group:
            old_daily = Decimal(old_group.monthly_fee) / days_in_month
            old_fee_share = (old_daily * (day - 1)).quantize(Decimal('0.01'))
        new_daily = Decimal(new_group.monthly_fee) / days_in_month
        new_fee_share = (new_daily * (days_in_month - day + 1)).quantize(Decimal('0.01'))

        with transaction.atomic():
            transfer = GroupTransfer.objects.create(
                student=student,
                old_group=old_group,
                new_group=new_group,
                transfer_date=transfer_date,
                old_group_fee_charged=old_fee_share,
                new_group_fee_charged=new_fee_share,
                created_by=request.user,
            )
            if old_group:
                student.groups.remove(old_group)
            student.groups.add(new_group)
            student.group = new_group
            student.save()

        if student.user.phone:
            message = (f"{student.user.first_name}, siz "
                       f"{old_group.name if old_group else '—'} dan {new_group.name} ga "
                       f"o'tkazildingiz. {transfer_date} dan kuchga kiradi.")
            send_sms.delay(student.user.phone, message)

        return Response(GroupTransferSerializer(transfer).data, status=201)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def archive(self, request, pk=None):
        student = self.get_object()
        student.status = StudentStatus.ARCHIVED
        student.archived_reason = request.data.get('reason', '')
        student.save()
        return Response(StudentSerializer(student).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def activate(self, request, pk=None):
        student = self.get_object()
        student.status = StudentStatus.ACTIVE
        group_id = request.data.get('group')
        if group_id:
            student.group_id = group_id
            student.groups.add(group_id)
        student.save()
        return Response(StudentSerializer(student).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def set_discount(self, request, pk=None):
        student = self.get_object()
        new_percent = Decimal(str(request.data.get('discount_percent', 0)))
        DiscountLog.objects.create(
            student=student,
            old_percent=student.discount_percent,
            new_percent=new_percent,
            changed_by=request.user,
        )
        student.discount_percent = new_percent
        student.save()
        return Response(StudentSerializer(student).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def set_parent_password(self, request, pk=None):
        """Ota-ona uchun parol yaratish/yangilash. Parent_phone bo'yicha User
        topiladi yoki yaratiladi (role=PARENT)."""
        from apps.users.models import User, Role
        from apps.sms.tasks import send_sms
        student = self.get_object()
        new_password = (request.data.get('new_password') or '').strip()
        if not student.parent_phone:
            return Response({'detail': "Avval ota-ona telefon raqamini kiriting"}, status=400)
        if not new_password or len(new_password) < 4:
            return Response({'detail': "Parol kamida 4 ta belgi"}, status=400)
        phone = student.parent_phone
        # Mavjud parent topamiz yoki yangi yaratamiz
        parent_user = User.objects.filter(phone=phone, role=Role.PARENT).first()
        if parent_user:
            parent_user.set_password(new_password)
            parent_user.is_active = True
            if student.parent_name and not parent_user.first_name:
                parent_user.first_name = student.parent_name.split()[0]
                rest = ' '.join(student.parent_name.split()[1:])
                parent_user.last_name = rest
            parent_user.save()
        else:
            # Username sifatida telefon raqamni ishlatamiz, agar band bo'lsa - boshqa
            base_username = phone
            uname = base_username
            i = 1
            while User.objects.filter(username=uname).exists():
                i += 1
                uname = f"{base_username}_p{i}"
            first = ''
            last = ''
            if student.parent_name:
                parts = student.parent_name.split()
                first = parts[0] if parts else ''
                last = ' '.join(parts[1:])
            parent_user = User.objects.create_user(
                username=uname, password=new_password, phone=phone,
                role=Role.PARENT, first_name=first or 'Ota-ona', last_name=last,
            )
        try:
            send_sms.delay(phone, f"Ota-ona kabinet paroli yangilandi: {new_password}")
        except Exception:
            pass
        return Response({'detail': "Parol o'rnatildi", 'parent_phone': phone})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def reset_password(self, request, pk=None):
        from apps.sms.tasks import send_sms
        student = self.get_object()
        new_password = request.data.get('new_password')
        if not new_password or len(new_password) < 4:
            return Response({'detail': "Parol kamida 4 ta belgi"}, status=400)
        student.user.set_password(new_password)
        student.user.save()
        if student.user.phone:
            send_sms.delay(student.user.phone, f"Yangi parolingiz: {new_password}")
        return Response({'detail': "Parol yangilandi"})

    @action(detail=False, methods=['post'], permission_classes=[IsAdmin], url_path='bulk')
    def bulk(self, request):
        """
        Ko'p o'quvchi ustida amal:
          { ids: [...], action: 'archive'|'activate'|'enroll'|'unenroll'|'sms',
            group?: int, message?: str, reason?: str }
        """
        from apps.sms.tasks import send_sms
        ids = request.data.get('ids') or []
        act = request.data.get('action')
        if not ids or not act:
            return Response({'detail': 'ids va action kerak'}, status=400)
        qs = Student.objects.filter(id__in=ids)
        count = 0
        if act == 'archive':
            reason = request.data.get('reason', '')
            for s in qs:
                s.status = StudentStatus.ARCHIVED
                s.archived_reason = reason
                s.save()
                count += 1
        elif act == 'activate':
            for s in qs:
                s.status = StudentStatus.ACTIVE
                s.save()
                count += 1
        elif act == 'enroll':
            gid = request.data.get('group')
            if not gid:
                return Response({'detail': 'group kerak'}, status=400)
            try:
                g = Group.objects.get(pk=gid)
            except Group.DoesNotExist:
                return Response({'detail': 'Guruh topilmadi'}, status=404)
            for s in qs:
                s.groups.add(g)
                if not s.group_id:
                    s.group = g
                    s.save()
                count += 1
        elif act == 'unenroll':
            gid = request.data.get('group')
            if not gid:
                return Response({'detail': 'group kerak'}, status=400)
            for s in qs:
                s.groups.remove(gid)
                if s.group_id == int(gid):
                    s.group = s.groups.first()
                    s.save()
                count += 1
        elif act == 'sms':
            msg = request.data.get('message', '')
            if not msg:
                return Response({'detail': 'message kerak'}, status=400)
            for s in qs:
                if s.user.phone:
                    send_sms.delay(s.user.phone, msg)
                    count += 1
        else:
            return Response({'detail': "action noma'lum"}, status=400)
        return Response({'count': count, 'action': act})

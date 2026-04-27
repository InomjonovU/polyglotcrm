from rest_framework import serializers
from apps.users.models import User, Role
from .models import Student, FreezeRecord, GroupTransfer, DiscountLog


class StudentSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    phone = serializers.CharField(source='user.phone')
    birth_date = serializers.DateField(source='user.birth_date', required=False, allow_null=True)
    address = serializers.CharField(source='user.address', required=False, allow_blank=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True, default=None)
    groups_detail = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    has_debt = serializers.SerializerMethodField()
    referrer_name = serializers.SerializerMethodField()
    referrals_count = serializers.SerializerMethodField()
    parent_has_account = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ['id', 'first_name', 'last_name', 'phone', 'birth_date', 'address',
                  'full_name', 'group', 'group_name', 'groups', 'groups_detail',
                  'status', 'status_display', 'discount_percent', 'joined_date',
                  'archived_reason', 'notes', 'has_debt',
                  'referrer_student', 'referrer_teacher', 'referrer_source',
                  'referrer_name', 'referrals_count',
                  'parent_phone', 'parent_name', 'parent_has_account']
        read_only_fields = ['joined_date']

    def get_referrer_name(self, obj):
        if obj.referrer_student_id:
            return f"👤 {obj.referrer_student.user.full_name}"
        if obj.referrer_teacher_id:
            return f"🎓 {obj.referrer_teacher.user.full_name}"
        if obj.referrer_source:
            return f"🌐 {obj.referrer_source}"
        return None

    def get_referrals_count(self, obj):
        return obj.referrals.count()

    def get_parent_has_account(self, obj):
        if not obj.parent_phone:
            return False
        return User.objects.filter(phone=obj.parent_phone, role=Role.PARENT,
                                   is_active=True).exists()

    def get_groups_detail(self, obj):
        return [{'id': g.id, 'name': g.name} for g in obj.groups.all()]

    def get_has_debt(self, obj):
        from datetime import date
        from apps.payments.models import MonthlyCharge
        today = date.today()
        charges = MonthlyCharge.objects.filter(student=obj, year=today.year, month=today.month)
        for c in charges:
            if c.balance > 0:
                return True
        return False


class StudentCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=64)
    last_name = serializers.CharField(max_length=64)
    phone = serializers.CharField(max_length=20)
    password = serializers.CharField(max_length=64)
    birth_date = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    group = serializers.IntegerField(required=False, allow_null=True)
    groups = serializers.ListField(child=serializers.IntegerField(), required=False)
    discount_percent = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)
    referrer_student = serializers.IntegerField(required=False, allow_null=True)
    referrer_teacher = serializers.IntegerField(required=False, allow_null=True)
    referrer_source = serializers.CharField(required=False, allow_blank=True, max_length=64)
    parent_phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    parent_name = serializers.CharField(required=False, allow_blank=True, max_length=128)

    def create(self, validated_data):
        from apps.sms.tasks import send_sms
        from django.conf import settings
        phone = validated_data['phone']
        password = validated_data['password']
        if User.objects.filter(username=phone).exists():
            raise serializers.ValidationError({'phone': 'Bu telefon allaqachon ro\'yxatda'})
        user = User.objects.create_user(
            username=phone,
            password=password,
            phone=phone,
            role=Role.STUDENT,
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            birth_date=validated_data.get('birth_date'),
            address=validated_data.get('address', ''),
        )
        primary_group_id = validated_data.get('group')
        student = Student.objects.create(
            user=user,
            group_id=primary_group_id,
            discount_percent=validated_data.get('discount_percent', 0),
            referrer_student_id=validated_data.get('referrer_student'),
            referrer_teacher_id=validated_data.get('referrer_teacher'),
            referrer_source=validated_data.get('referrer_source', ''),
            parent_phone=validated_data.get('parent_phone', ''),
            parent_name=validated_data.get('parent_name', ''),
        )
        # M2M: primary + qo'shimcha guruhlar
        group_ids = set(validated_data.get('groups', []))
        if primary_group_id:
            group_ids.add(primary_group_id)
        if group_ids:
            student.groups.set(group_ids)
        message = (f"Assalomu alaykum, {user.first_name}! {settings.CENTER_NAME} ga xush kelibsiz. "
                   f"Login: {phone}, Parol: {password}. Sayt: {settings.CENTER_URL}")
        send_sms.delay(phone, message)
        return student


class FreezeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FreezeRecord
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'released']


class GroupTransferSerializer(serializers.ModelSerializer):
    old_group_name = serializers.CharField(source='old_group.name', read_only=True)
    new_group_name = serializers.CharField(source='new_group.name', read_only=True)

    class Meta:
        model = GroupTransfer
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'old_group_fee_charged', 'new_group_fee_charged']

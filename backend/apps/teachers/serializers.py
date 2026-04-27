from rest_framework import serializers
from apps.users.models import User, Role
from .models import Teacher


class TeacherSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    phone = serializers.CharField(source='user.phone')
    birth_date = serializers.DateField(source='user.birth_date', required=False, allow_null=True)
    address = serializers.CharField(source='user.address', required=False, allow_blank=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    groups_count = serializers.SerializerMethodField()

    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Teacher
        fields = ['id', 'first_name', 'last_name', 'phone', 'birth_date', 'address',
                  'full_name', 'type', 'type_display', 'percent', 'hired_date',
                  'is_active', 'groups_count']
        read_only_fields = ['hired_date']

    def get_groups_count(self, obj):
        return obj.groups.filter(is_active=True).count()


class TeacherCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=64)
    last_name = serializers.CharField(max_length=64)
    phone = serializers.CharField(max_length=20)
    password = serializers.CharField(max_length=64)
    percent = serializers.DecimalField(max_digits=5, decimal_places=2, default=30)
    type = serializers.ChoiceField(choices=['main', 'support'], default='main')

    def create(self, validated_data):
        from apps.sms.tasks import send_sms
        from django.conf import settings
        phone = validated_data['phone']
        password = validated_data['password']
        if User.objects.filter(username=phone).exists():
            raise serializers.ValidationError({'phone': "Bu telefon allaqachon band"})
        user = User.objects.create_user(
            username=phone,
            password=password,
            phone=phone,
            role=Role.TEACHER,
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
        )
        teacher = Teacher.objects.create(
            user=user,
            percent=validated_data.get('percent', 30),
            type=validated_data.get('type', 'main'),
        )
        message = (f"Assalomu alaykum, {user.first_name}! {settings.CENTER_NAME} "
                   f"tizimiga kirish uchun login: {phone}, parol: {password}")
        send_sms.delay(phone, message)
        return teacher

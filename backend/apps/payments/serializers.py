from django.conf import settings
from rest_framework import serializers
from .models import Payment, MonthlyCharge


class MonthlyChargeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.full_name', read_only=True)
    student_phone = serializers.CharField(source='student.user.phone', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    paid_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = MonthlyCharge
        fields = ['id', 'student', 'student_name', 'student_phone', 'group', 'group_name',
                  'year', 'month', 'amount', 'original_amount', 'discount_percent',
                  'active_days', 'total_days', 'paid_total', 'balance', 'created_at']


class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.full_name', read_only=True)
    student_phone = serializers.CharField(source='student.user.phone', read_only=True)
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    charge_year = serializers.IntegerField(source='charge.year', read_only=True)
    charge_month = serializers.IntegerField(source='charge.month', read_only=True)
    group_name = serializers.SerializerMethodField()
    received_by_name = serializers.SerializerMethodField()
    center_name = serializers.SerializerMethodField()
    # Write-only — admin chek qabul qilayotganda qaysi guruh uchun ekanligini tanlaydi
    group = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Payment
        fields = ['id', 'student', 'student_name', 'student_phone', 'charge', 'amount',
                  'method', 'method_display', 'paid_at', 'note',
                  'received_by', 'received_by_name',
                  'receipt_code', 'charge_year', 'charge_month',
                  'group', 'group_name', 'center_name']
        read_only_fields = ['paid_at', 'received_by', 'receipt_code']

    def get_group_name(self, obj):
        if obj.charge and obj.charge.group:
            return obj.charge.group.name
        return None

    def get_received_by_name(self, obj):
        if obj.received_by:
            return obj.received_by.full_name
        return None

    def get_center_name(self, obj):
        return getattr(settings, 'CENTER_NAME', 'PolyglotLC')

    def create(self, validated_data):
        # `group` faqat view'ga signal — Payment modelida bu maydon yo'q
        validated_data.pop('group', None)
        return super().create(validated_data)


class ReceiptPublicSerializer(serializers.ModelSerializer):
    """Chek tekshirish uchun ochiq (auth talab qilinmaydi) — minimum ma'lumot."""
    student_name = serializers.CharField(source='student.user.full_name', read_only=True)
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    year = serializers.IntegerField(source='charge.year', read_only=True)
    month = serializers.IntegerField(source='charge.month', read_only=True)
    group_name = serializers.SerializerMethodField()
    received_by_name = serializers.SerializerMethodField()
    center_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ['receipt_code', 'student_name', 'amount', 'method', 'method_display',
                  'paid_at', 'note', 'year', 'month', 'group_name',
                  'received_by_name', 'center_name']

    def get_group_name(self, obj):
        if obj.charge and obj.charge.group:
            return obj.charge.group.name
        return None

    def get_received_by_name(self, obj):
        if obj.received_by:
            return obj.received_by.full_name
        return None

    def get_center_name(self, obj):
        return getattr(settings, 'CENTER_NAME', 'PolyglotLC')

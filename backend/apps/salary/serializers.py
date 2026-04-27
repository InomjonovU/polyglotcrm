from rest_framework import serializers
from .models import Advance, SalaryRecord, AdvanceRequest


class AdvanceSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.user.full_name', read_only=True)

    class Meta:
        model = Advance
        fields = '__all__'
        read_only_fields = ['given_by', 'given_at']


class SalaryRecordSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.user.full_name', read_only=True)

    class Meta:
        model = SalaryRecord
        fields = '__all__'


class AdvanceRequestSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.user.full_name', read_only=True)

    class Meta:
        model = AdvanceRequest
        fields = '__all__'
        read_only_fields = ['status', 'reviewed_at', 'reviewed_by']

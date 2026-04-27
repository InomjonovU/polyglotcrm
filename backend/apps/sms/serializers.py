from rest_framework import serializers
from .models import SmsTemplate, SmsLog, SmsSettings


class SmsTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmsTemplate
        fields = '__all__'


class SmsLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmsLog
        fields = '__all__'


class SmsSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmsSettings
        fields = ['id', 'provider', 'eskiz_email', 'eskiz_password',
                  'eskiz_sender', 'is_enabled', 'updated_at']
        extra_kwargs = {'eskiz_password': {'write_only': True, 'required': False}}

from rest_framework import serializers
from .models import Parent


class ParentStudentBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    phone = serializers.CharField()


class ParentSerializer(serializers.ModelSerializer):
    relation_display = serializers.CharField(source='get_relation_display', read_only=True)
    student_ids = serializers.PrimaryKeyRelatedField(
        source='students', many=True, read_only=True
    )
    students_detail = serializers.SerializerMethodField()

    class Meta:
        model = Parent
        fields = ['id', 'full_name', 'phone', 'relation', 'relation_display',
                  'student_ids', 'students_detail', 'notes', 'created_at']

    def get_students_detail(self, obj):
        return [
            {'id': s.id, 'full_name': s.user.full_name, 'phone': s.user.phone}
            for s in obj.students.select_related('user').all()
        ]


class ParentWriteSerializer(serializers.ModelSerializer):
    student_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)

    class Meta:
        model = Parent
        fields = ['id', 'full_name', 'phone', 'relation', 'notes', 'student_ids']

    def create(self, validated_data):
        student_ids = validated_data.pop('student_ids', [])
        parent = Parent.objects.create(**validated_data)
        if student_ids:
            parent.students.set(student_ids)
        return parent

    def update(self, instance, validated_data):
        student_ids = validated_data.pop('student_ids', None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if student_ids is not None:
            instance.students.set(student_ids)
        return instance

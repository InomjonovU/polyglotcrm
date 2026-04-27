from decimal import Decimal
from rest_framework import serializers
from .models import Receipt, ReceiptItem


class ReceiptItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = ReceiptItem
        fields = ['id', 'name', 'quantity', 'unit_price', 'subtotal']
        read_only_fields = ['id', 'subtotal']


class ReceiptSerializer(serializers.ModelSerializer):
    items = ReceiptItemSerializer(many=True, required=False)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Receipt
        fields = [
            'id', 'code', 'title', 'amount', 'currency',
            'buyer_name', 'buyer_phone', 'note',
            'items', 'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'code', 'created_by', 'created_by_name', 'created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name
        return None

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        receipt = Receipt.objects.create(**validated_data)
        total = Decimal(0)
        for item in items_data:
            it = ReceiptItem.objects.create(receipt=receipt, **item)
            total += it.subtotal
        # Agar amount aniq berilmagan bo'lsa, items yig'indisidan hisoblaymiz
        if not receipt.amount and total:
            receipt.amount = total
            receipt.save(update_fields=['amount'])
        return receipt

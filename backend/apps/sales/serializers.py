"""Serializadores do Django REST Framework para o sistema de vendas e comissões."""

from decimal import Decimal
from django.db import transaction
from rest_framework import serializers

from apps.sales.models import (
    Customer,
    DayCommissionRule,
    Product,
    Sale,
    SaleItem,
    Salesperson,
)
from apps.sales.services.commission_service import CommissionService


class CustomerSummarySerializer(serializers.ModelSerializer):
    """Resumo de cliente para cabeçalhos de venda."""

    class Meta:
        model = Customer
        fields = ["id", "name"]


class CustomerSerializer(serializers.ModelSerializer):
    """Serializador completo de cliente."""

    class Meta:
        model = Customer
        fields = ["id", "name", "email", "phone", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class SalespersonSummarySerializer(serializers.ModelSerializer):
    """Resumo de vendedor para cabeçalhos de venda."""

    class Meta:
        model = Salesperson
        fields = ["id", "name"]


class SalespersonSerializer(serializers.ModelSerializer):
    """Serializador completo de vendedor."""

    class Meta:
        model = Salesperson
        fields = ["id", "name", "email", "phone", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProductSerializer(serializers.ModelSerializer):
    """Serializador de produtos comercializados."""

    class Meta:
        model = Product
        fields = [
            "id",
            "code",
            "description",
            "unit_price",
            "commission_percentage",
            "is_active",
        ]
        read_only_fields = ["id"]


class DayCommissionRuleSerializer(serializers.ModelSerializer):
    """Serializador de regras de comissão por dia da semana."""

    day_name = serializers.CharField(
        source="get_day_of_week_display", read_only=True
    )

    class Meta:
        model = DayCommissionRule
        fields = [
            "id",
            "day_of_week",
            "day_name",
            "min_percentage",
            "max_percentage",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]


class SaleItemCreateInputSerializer(serializers.Serializer):
    """Payload de entrada de um item na criação de venda."""

    product_id = serializers.IntegerField(
        help_text="ID do produto a ser vendido",
    )
    quantity = serializers.IntegerField(
        min_value=1,
        help_text="Quantidade vendida (mínimo 1 unidade)",
    )


class SaleItemDetailSerializer(serializers.ModelSerializer):
    """Detalhamento completo de item de venda com valores congelados."""

    product_id = serializers.IntegerField(source="product.id", read_only=True)
    product_code = serializers.CharField(source="product.code", read_only=True)
    product_description = serializers.CharField(
        source="product.description", read_only=True
    )

    class Meta:
        model = SaleItem
        fields = [
            "id",
            "product_id",
            "product_code",
            "product_description",
            "quantity",
            "unit_price",
            "applied_commission_percentage",
            "total_price",
            "commission_amount",
        ]


class SaleListSerializer(serializers.ModelSerializer):
    """Serializador para listagem resumida de vendas realizadas na tabela."""

    customer = CustomerSummarySerializer(read_only=True)
    salesperson = SalespersonSummarySerializer(read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "invoice_number",
            "sold_at",
            "customer",
            "salesperson",
            "total_amount",
            "total_commission",
            "created_at",
        ]


class SaleDetailSerializer(serializers.ModelSerializer):
    """Serializador para visualização completa de uma venda com seus itens."""

    customer = CustomerSummarySerializer(read_only=True)
    salesperson = SalespersonSummarySerializer(read_only=True)
    items = SaleItemDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "invoice_number",
            "sold_at",
            "customer",
            "salesperson",
            "items",
            "total_amount",
            "total_commission",
            "created_at",
        ]


class SaleCreateSerializer(serializers.Serializer):
    """Serializador para criação atômica de nova venda com itens."""

    invoice_number = serializers.CharField(
        max_length=50,
        trim_whitespace=True,
        help_text="Número único da nota fiscal informado manualmente",
    )
    sold_at = serializers.DateTimeField(
        help_text="Data e hora da transação de venda",
    )
    customer_id = serializers.IntegerField(
        help_text="ID do cliente cadastrado",
    )
    salesperson_id = serializers.IntegerField(
        help_text="ID do vendedor responsável",
    )
    items = SaleItemCreateInputSerializer(
        many=True,
        help_text="Lista de itens contendo product_id e quantity",
    )

    def validate_invoice_number(self, value: str) -> str:
        """Valida se o número da nota fiscal é único no sistema."""
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError(
                "O número da nota fiscal não pode ser vazio."
            )
        if Sale.objects.filter(invoice_number__iexact=trimmed).exists():
            raise serializers.ValidationError(
                "Já existe uma venda com este número de nota fiscal."
            )
        return trimmed

    def validate_customer_id(self, value: int) -> Customer:
        """Valida a existência do cliente informado."""
        try:
            return Customer.objects.get(id=value)
        except Customer.DoesNotExist:
            raise serializers.ValidationError(
                f"Cliente com ID {value} não encontrado no sistema."
            )

    def validate_salesperson_id(self, value: int) -> Salesperson:
        """Valida a existência do vendedor informado."""
        try:
            return Salesperson.objects.get(id=value)
        except Salesperson.DoesNotExist:
            raise serializers.ValidationError(
                f"Vendedor com ID {value} não encontrado no sistema."
            )

    def validate_items(self, value: list) -> list:
        """Valida se a venda possui ao menos um item válido."""
        if not value or len(value) == 0:
            raise serializers.ValidationError(
                "A venda deve conter pelo menos um item válido com quantidade superior a zero."
            )
        return value

    def validate(self, attrs: dict) -> dict:
        """Validação cruzada dos produtos informados nos itens."""
        items_payload = attrs.get("items", [])
        product_ids = [item["product_id"] for item in items_payload]

        # Busca os produtos em lote
        products_map = {
            p.id: p for p in Product.objects.filter(id__in=product_ids)
        }

        # Verifica se todos existem e se estão ativos
        validated_items = []
        for idx, item in enumerate(items_payload):
            prod_id = item["product_id"]
            if prod_id not in products_map:
                raise serializers.ValidationError(
                    {"items": f"Produto com ID {prod_id} não encontrado."}
                )
            product = products_map[prod_id]
            if not product.is_active:
                raise serializers.ValidationError(
                    {
                        "items": f"O produto '{product.description}' está inativo e não pode ser comercializado."
                    }
                )
            validated_items.append(
                {
                    "product": product,
                    "quantity": item["quantity"],
                }
            )

        attrs["validated_items"] = validated_items
        return attrs

    @transaction.atomic
    def create(self, validated_data: dict) -> Sale:
        """
        Executa a criação atômica da venda e dos itens:
        - Calcula subtotais e comissões dinâmicas com CommissionService.
        - Salva o registro de Sale e os SaleItem associados.
        """
        invoice_number = validated_data["invoice_number"]
        sold_at = validated_data["sold_at"]
        customer = validated_data["customer_id"]  # Já resolvido para instância
        salesperson = validated_data["salesperson_id"]  # Já resolvido para instância
        validated_items = validated_data["validated_items"]

        # Busca a regra do dia da semana uma única vez
        day_of_week = CommissionService.get_day_of_week(sold_at)
        rule = CommissionService.get_rule_for_day(day_of_week)

        # Criação inicial do cabeçalho da venda
        sale = Sale.objects.create(
            invoice_number=invoice_number,
            sold_at=sold_at,
            customer=customer,
            salesperson=salesperson,
            total_amount=Decimal("0.00"),
            total_commission=Decimal("0.00"),
        )

        total_amount = Decimal("0.00")
        total_commission = Decimal("0.00")
        sale_items_to_create = []

        for item in validated_items:
            product = item["product"]
            quantity = item["quantity"]

            calc = CommissionService.calculate_item(
                product=product,
                quantity=quantity,
                sale_date=sold_at,
                rule=rule,
            )

            total_amount += calc.total_price
            total_commission += calc.commission_amount

            sale_items_to_create.append(
                SaleItem(
                    sale=sale,
                    product=product,
                    quantity=quantity,
                    unit_price=calc.unit_price,
                    applied_commission_percentage=calc.applied_commission_percentage,
                    total_price=calc.total_price,
                    commission_amount=calc.commission_amount,
                )
            )

        # Bulk create de todos os itens associados
        SaleItem.objects.bulk_create(sale_items_to_create)

        # Atualização dos totais consolidados
        sale.total_amount = total_amount
        sale.total_commission = total_commission
        sale.save(update_fields=["total_amount", "total_commission"])

        return sale

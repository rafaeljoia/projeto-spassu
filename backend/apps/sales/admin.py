"""Configuração das interfaces administrativas do Django Admin para vendas e comissões."""

from decimal import Decimal
from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError

from apps.sales.models import (
    Customer,
    DayCommissionRule,
    Product,
    Sale,
    SaleItem,
    Salesperson,
)


class DayCommissionRuleForm(forms.ModelForm):
    """Formulário administrativo customizado com validações de regras de comissão."""

    class Meta:
        model = DayCommissionRule
        fields = ["day_of_week", "min_percentage", "max_percentage"]

    def clean(self):
        cleaned_data = super().clean()
        min_pct = cleaned_data.get("min_percentage")
        max_pct = cleaned_data.get("max_percentage")

        if min_pct is not None and max_pct is not None:
            if min_pct < Decimal("0.00") or min_pct > Decimal("10.00"):
                self.add_error(
                    "min_percentage",
                    "A comissão mínima deve estar estritamente entre 0,00% e 10,00%.",
                )
            if max_pct < Decimal("0.00") or max_pct > Decimal("10.00"):
                self.add_error(
                    "max_percentage",
                    "A comissão máxima deve estar estritamente entre 0,00% e 10,00%.",
                )
            if min_pct > max_pct:
                self.add_error(
                    "min_percentage",
                    "O percentual mínimo não pode ser superior ao percentual máximo.",
                )

        return cleaned_data


@admin.register(DayCommissionRule)
class DayCommissionRuleAdmin(admin.ModelAdmin):
    """Administração das regras de limites de comissão por dia da semana."""

    form = DayCommissionRuleForm
    list_display = [
        "get_day_name",
        "day_of_week",
        "min_percentage",
        "max_percentage",
        "updated_at",
    ]
    list_editable = ["min_percentage", "max_percentage"]
    ordering = ["day_of_week"]

    @admin.display(description="Dia da Semana")
    def get_day_name(self, obj: DayCommissionRule) -> str:
        return obj.get_day_of_week_display()


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Administração de produtos comercializados."""

    list_display = [
        "code",
        "description",
        "unit_price",
        "commission_percentage",
        "is_active",
        "updated_at",
    ]
    list_filter = ["is_active"]
    search_fields = ["code", "description"]
    list_editable = ["unit_price", "commission_percentage", "is_active"]
    ordering = ["code"]


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    """Administração de clientes cadastrados."""

    list_display = ["name", "email", "phone", "created_at"]
    search_fields = ["name", "email", "phone"]
    ordering = ["name"]


@admin.register(Salesperson)
class SalespersonAdmin(admin.ModelAdmin):
    """Administração de vendedores da papelaria."""

    list_display = ["name", "email", "phone", "created_at"]
    search_fields = ["name", "email", "phone"]
    ordering = ["name"]


class SaleItemInline(admin.TabularInline):
    """Visualização em linha dos itens vinculados a uma venda."""

    model = SaleItem
    extra = 0
    can_delete = False
    readonly_fields = [
        "product",
        "quantity",
        "unit_price",
        "applied_commission_percentage",
        "total_price",
        "commission_amount",
    ]


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    """Administração e auditoria de vendas registradas."""

    list_display = [
        "invoice_number",
        "sold_at",
        "customer",
        "salesperson",
        "total_amount",
        "total_commission",
        "created_at",
    ]
    list_filter = ["sold_at", "salesperson"]
    search_fields = ["invoice_number", "customer__name", "salesperson__name"]
    readonly_fields = [
        "total_amount",
        "total_commission",
        "created_at",
        "updated_at",
    ]
    inlines = [SaleItemInline]
    ordering = ["-sold_at"]

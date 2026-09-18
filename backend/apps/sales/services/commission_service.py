"""Serviço de domínio responsável pelo cálculo de comissões de vendas."""

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Union

from apps.sales.models import DayCommissionRule, Product

# Precisão decimal padrão para moeda e percentuais
CURRENCY_PRECISION = Decimal("0.01")
PERCENTAGE_PRECISION = Decimal("0.01")
ONE_HUNDRED = Decimal("100.00")


@dataclass(frozen=True)
class CommissionCalculationResult:
    """Estrutura com os valores calculados para um item de venda."""

    unit_price: Decimal
    applied_commission_percentage: Decimal
    total_price: Decimal
    commission_amount: Decimal


class CommissionService:
    """Motor de cálculo de comissões com base nos limites do dia da semana."""

    @staticmethod
    def get_day_of_week(sale_date: Union[date, datetime]) -> int:
        """Extrai o dia da semana no padrão Python (0=Segunda ... 6=Domingo)."""
        if isinstance(sale_date, datetime):
            return sale_date.date().weekday()
        return sale_date.weekday()

    @classmethod
    def get_rule_for_day(cls, day_of_week: int) -> Optional[DayCommissionRule]:
        """Busca a regra de limites de comissão configurada para o dia da semana."""
        return DayCommissionRule.objects.filter(day_of_week=day_of_week).first()

    @classmethod
    def calculate_applied_rate(
        cls,
        nominal_percentage: Decimal,
        day_of_week: int,
        rule: Optional[DayCommissionRule] = None,
    ) -> Decimal:
        """
        Calcula o percentual de comissão efetivo aplicando piso e teto do dia.

        Regra de negócio:
        - Se a comissão nominal for menor que o piso (min_percentage), eleva para o piso.
        - Se for maior que o teto (max_percentage), reduz para o teto.
        - Se estiver entre o piso e o teto, mantém o percentual nominal.
        """
        if rule is None:
            rule = cls.get_rule_for_day(day_of_week)

        # Se não houver regra configurada no banco para o dia, delimita no padrão geral (0% a 10%)
        min_rate = rule.min_percentage if rule else Decimal("0.00")
        max_rate = rule.max_percentage if rule else Decimal("10.00")

        # Delimitação (clamping)
        effective_rate = min(max(nominal_percentage, min_rate), max_rate)
        return effective_rate.quantize(PERCENTAGE_PRECISION, rounding=ROUND_HALF_UP)

    @classmethod
    def calculate_item(
        cls,
        product: Product,
        quantity: int,
        sale_date: Union[date, datetime],
        rule: Optional[DayCommissionRule] = None,
    ) -> CommissionCalculationResult:
        """
        Calcula todos os valores de um item da venda:
        - Preço unitário (congelado do cadastro do produto)
        - Percentual efetivo aplicado
        - Subtotal do item (quantidade * preço unitário)
        - Valor de comissão gerado pelo item (subtotal * percentual_efetivo / 100)
        """
        if quantity < 1:
            raise ValueError("A quantidade do item deve ser de no mínimo 1 unidade.")

        unit_price = product.unit_price.quantize(
            CURRENCY_PRECISION, rounding=ROUND_HALF_UP
        )
        day_of_week = cls.get_day_of_week(sale_date)
        applied_rate = cls.calculate_applied_rate(
            product.commission_percentage, day_of_week, rule=rule
        )

        total_price = (Decimal(quantity) * unit_price).quantize(
            CURRENCY_PRECISION, rounding=ROUND_HALF_UP
        )

        commission_amount = (
            total_price * (applied_rate / ONE_HUNDRED)
        ).quantize(CURRENCY_PRECISION, rounding=ROUND_HALF_UP)

        return CommissionCalculationResult(
            unit_price=unit_price,
            applied_commission_percentage=applied_rate,
            total_price=total_price,
            commission_amount=commission_amount,
        )

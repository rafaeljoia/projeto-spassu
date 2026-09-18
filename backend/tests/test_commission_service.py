"""Testes unitários automatizados para o motor de cálculo de comissões (CommissionService)."""

from datetime import date, datetime
from decimal import Decimal
import pytest
from apps.sales.models import DayCommissionRule, Product
from apps.sales.services.commission_service import CommissionService


@pytest.fixture
def monday_rule(db):
    """Regra para Segunda-feira (0): Min 3.00%, Max 5.00%."""
    return DayCommissionRule.objects.create(
        day_of_week=DayCommissionRule.DayOfWeek.MONDAY,
        min_percentage=Decimal("3.00"),
        max_percentage=Decimal("5.00"),
    )


@pytest.fixture
def product_high_commission(db):
    """Produto com comissão nominal de 10% (acima do teto de segunda-feira)."""
    return Product.objects.create(
        code="PROD-HIGH",
        description="Caderno 10 Matérias",
        unit_price=Decimal("50.00"),
        commission_percentage=Decimal("10.00"),
    )


@pytest.fixture
def product_low_commission(db):
    """Produto com comissão nominal de 2% (abaixo do piso de segunda-feira)."""
    return Product.objects.create(
        code="PROD-LOW",
        description="Caneta Azul 1.0mm",
        unit_price=Decimal("100.00"),
        commission_percentage=Decimal("2.00"),
    )


@pytest.fixture
def product_mid_commission(db):
    """Produto com comissão nominal de 4% (dentro da faixa de 3% a 5%)."""
    return Product.objects.create(
        code="PROD-MID",
        description="Borracha Escolar",
        unit_price=Decimal("25.00"),
        commission_percentage=Decimal("4.00"),
    )


@pytest.mark.django_db
class TestCommissionServiceCalculations:
    """Testes das regras de delimitação de comissões."""

    def test_commission_capped_at_max_rate(
        self, monday_rule, product_high_commission
    ):
        """
        Produto com 10% vendido em uma segunda-feira (máx 5%).
        A comissão deve ser limitada ao teto de 5%.
        Exemplo do desafio:
        50.00 x 2 unidades = 100.00.
        Comissão esperada = 100.00 x 5% = 5.00.
        """
        # 2026-09-21 é uma segunda-feira (weekday == 0)
        sale_date = date(2026, 9, 21)
        assert sale_date.weekday() == 0

        result = CommissionService.calculate_item(
            product=product_high_commission,
            quantity=2,
            sale_date=sale_date,
            rule=monday_rule,
        )

        assert result.unit_price == Decimal("50.00")
        assert result.applied_commission_percentage == Decimal("5.00")
        assert result.total_price == Decimal("100.00")
        assert result.commission_amount == Decimal("5.00")

    def test_commission_elevated_to_min_rate(
        self, monday_rule, product_low_commission
    ):
        """
        Produto com 2% vendido em uma segunda-feira (mín 3%).
        A comissão deve ser elevada ao piso de 3%.
        Exemplo do desafio:
        100.00 x 1 unidade = 100.00.
        Comissão esperada = 100.00 x 3% = 3.00.
        """
        sale_date = date(2026, 9, 21)

        result = CommissionService.calculate_item(
            product=product_low_commission,
            quantity=1,
            sale_date=sale_date,
            rule=monday_rule,
        )

        assert result.unit_price == Decimal("100.00")
        assert result.applied_commission_percentage == Decimal("3.00")
        assert result.total_price == Decimal("100.00")
        assert result.commission_amount == Decimal("3.00")

    def test_commission_within_bounds_preserved(
        self, monday_rule, product_mid_commission
    ):
        """
        Produto com 4% vendido em uma segunda-feira (faixa 3% a 5%).
        A comissão deve ser mantida exatamente em 4%.
        25.00 x 4 unidades = 100.00.
        Comissão esperada = 100.00 x 4% = 4.00.
        """
        sale_date = date(2026, 9, 21)

        result = CommissionService.calculate_item(
            product=product_mid_commission,
            quantity=4,
            sale_date=sale_date,
            rule=monday_rule,
        )

        assert result.unit_price == Decimal("25.00")
        assert result.applied_commission_percentage == Decimal("4.00")
        assert result.total_price == Decimal("100.00")
        assert result.commission_amount == Decimal("4.00")

    def test_decimal_precision_and_rounding(self, db):
        """Validação de arredondamento financeiro com 2 casas decimais (ROUND_HALF_UP)."""
        rule = DayCommissionRule.objects.create(
            day_of_week=DayCommissionRule.DayOfWeek.TUESDAY,
            min_percentage=Decimal("2.00"),
            max_percentage=Decimal("6.00"),
        )
        product = Product.objects.create(
            code="PROD-FRAC",
            description="Item Fracionário",
            unit_price=Decimal("33.33"),
            commission_percentage=Decimal("3.33"),
        )
        # 2026-09-22 é uma terça-feira (weekday == 1)
        sale_date = date(2026, 9, 22)

        result = CommissionService.calculate_item(
            product=product,
            quantity=3,
            sale_date=sale_date,
            rule=rule,
        )

        # 33.33 * 3 = 99.99
        assert result.total_price == Decimal("99.99")
        # 99.99 * 3.33% = 3.329667 -> arredondado para 3.33
        assert result.commission_amount == Decimal("3.33")

    def test_invalid_quantity_raises_value_error(self, product_mid_commission):
        """Quantidade inferior a 1 deve levantar ValueError."""
        with pytest.raises(ValueError, match="no mínimo 1 unidade"):
            CommissionService.calculate_item(
                product=product_mid_commission,
                quantity=0,
                sale_date=datetime.now(),
            )

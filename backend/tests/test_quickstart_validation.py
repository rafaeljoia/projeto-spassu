"""Validação ponta a ponta dos cenários descritos no quickstart.md (T045).

Cenários cobertos:
- Cenário 1: Registro de venda com cálculo dinâmico (teto e piso aplicados).
- Cenário 2: Rejeição de duplicidade de nota fiscal.
- Cenário 3: Apuração de comissões por período com agregação correta.
"""

from decimal import Decimal
import pytest
from rest_framework.test import APIClient
from apps.sales.models import (
    Customer,
    DayCommissionRule,
    Product,
    Sale,
    Salesperson,
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def quickstart_environment(db):
    """Configura o ambiente com dados do seed/quickstart."""
    # Regra de Segunda-feira (0): Min 3.00%, Max 5.00%
    monday_rule = DayCommissionRule.objects.create(
        day_of_week=DayCommissionRule.DayOfWeek.MONDAY,
        min_percentage=Decimal("3.00"),
        max_percentage=Decimal("5.00"),
    )

    customer = Customer.objects.create(
        name="Papelaria do Estudante",
        email="contato@estudante.com.br",
        phone="(11) 98765-4321",
    )

    salesperson = Salesperson.objects.create(
        name="Carlos Eduardo",
        email="carlos.eduardo@spassu.com.br",
        phone="(11) 91234-5678",
    )

    other_salesperson = Salesperson.objects.create(
        name="Mariana Souza",
        email="mariana.souza@spassu.com.br",
        phone="(11) 92345-6789",
    )

    # Caderno: 10% nominal -> deve ser limitado a 5% (teto de segunda)
    caderno = Product.objects.create(
        code="CAD-001",
        description="Caderno Espiral Universitário",
        unit_price=Decimal("50.00"),
        commission_percentage=Decimal("10.00"),
    )

    # Caneta: 2% nominal -> deve ser elevado a 3% (piso de segunda)
    caneta = Product.objects.create(
        code="CAN-002",
        description="Caneta Esferográfica Premium",
        unit_price=Decimal("100.00"),
        commission_percentage=Decimal("2.00"),
    )

    return {
        "monday_rule": monday_rule,
        "customer": customer,
        "salesperson": salesperson,
        "other_salesperson": other_salesperson,
        "caderno": caderno,
        "caneta": caneta,
    }


@pytest.mark.django_db
class TestQuickstartValidationScenarios:
    """Bateria de testes que valida os cenários 1 a 3 do Quickstart."""

    def test_quickstart_scenarios_end_to_end(self, api_client, quickstart_environment):
        env = quickstart_environment
        # 2026-09-07 é uma segunda-feira (weekday = 0)
        monday_date = "2026-09-07T14:30:00Z"

        # --- CENÁRIO 1: Validação do Cálculo Dinâmico de Comissões por Dia ---
        sale_payload = {
            "invoice_number": "NF-99001",
            "sold_at": monday_date,
            "customer_id": env["customer"].id,
            "salesperson_id": env["salesperson"].id,
            "items": [
                {"product_id": env["caderno"].id, "quantity": 2},
                {"product_id": env["caneta"].id, "quantity": 1},
            ],
        }

        response = api_client.post("/api/v1/sales/", sale_payload, format="json")
        assert response.status_code == 201, response.data
        data = response.json()

        # Verifica totais da venda
        assert data["invoice_number"] == "NF-99001"
        assert Decimal(str(data["total_amount"])) == Decimal("200.00")
        assert Decimal(str(data["total_commission"])) == Decimal("8.00")

        # Verifica itens individuais congelados
        items = data["items"]
        assert len(items) == 2

        item_caderno = next(i for i in items if i["product_code"] == "CAD-001")
        assert Decimal(str(item_caderno["unit_price"])) == Decimal("50.00")
        assert Decimal(str(item_caderno["applied_commission_percentage"])) == Decimal("5.00")  # Teto aplicado
        assert Decimal(str(item_caderno["total_price"])) == Decimal("100.00")
        assert Decimal(str(item_caderno["commission_amount"])) == Decimal("5.00")

        item_caneta = next(i for i in items if i["product_code"] == "CAN-002")
        assert Decimal(str(item_caneta["unit_price"])) == Decimal("100.00")
        assert Decimal(str(item_caneta["applied_commission_percentage"])) == Decimal("3.00")  # Piso aplicado
        assert Decimal(str(item_caneta["total_price"])) == Decimal("100.00")
        assert Decimal(str(item_caneta["commission_amount"])) == Decimal("3.00")

        # --- CENÁRIO 2: Validação da Unicidade da Nota Fiscal ---
        duplicate_payload = {
            "invoice_number": "NF-99001",
            "sold_at": monday_date,
            "customer_id": env["customer"].id,
            "salesperson_id": env["salesperson"].id,
            "items": [
                {"product_id": env["caderno"].id, "quantity": 1},
            ],
        }

        dup_response = api_client.post("/api/v1/sales/", duplicate_payload, format="json")
        assert dup_response.status_code == 400
        assert "invoice_number" in dup_response.json()

        # --- CENÁRIO 3: Validação da Apuração de Comissões por Período ---
        report_response = api_client.get(
            "/api/v1/commissions/report/?start_date=2026-09-01&end_date=2026-09-30"
        )
        assert report_response.status_code == 200
        report_data = report_response.json()

        assert Decimal(str(report_data["grand_total_commission"])) == Decimal("8.00")
        assert len(report_data["salespeople"]) == 1
        salesperson_result = report_data["salespeople"][0]
        assert salesperson_result["salesperson_id"] == env["salesperson"].id
        assert salesperson_result["salesperson_name"] == "Carlos Eduardo"
        assert salesperson_result["sales_count"] == 1
        assert Decimal(str(salesperson_result["total_commission"])) == Decimal("8.00")

        # Mariana Souza não possui vendas no período e não deve poluir a listagem
        assert not any(s["salesperson_id"] == env["other_salesperson"].id for s in report_data["salespeople"])

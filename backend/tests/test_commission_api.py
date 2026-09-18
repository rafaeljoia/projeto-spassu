"""Testes de integração para o endpoint de relatório de comissões por período."""

from decimal import Decimal
import pytest
from rest_framework.test import APIClient
from apps.sales.models import Customer, DayCommissionRule, Product, Sale, SaleItem, Salesperson


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def commission_test_data(db):
    """Cria vendedores, clientes, produtos e vendas em datas variadas para testes de período."""
    customer = Customer.objects.create(
        name="Empresa Gama Papéis",
        email="contato@gama.com.br",
        phone="(11) 98888-7777",
    )

    # Vendedor 1: Carlos (com 2 vendas no período)
    carlos = Salesperson.objects.create(
        name="Carlos Eduardo Lima",
        email="carlos@spassu.com.br",
        phone="(11) 91111-2222",
    )

    # Vendedor 2: Mariana (com 1 venda no período)
    mariana = Salesperson.objects.create(
        name="Mariana Souza",
        email="mariana@spassu.com.br",
        phone="(11) 93333-4444",
    )

    # Vendedor 3: Roberto (sem vendas no período)
    roberto = Salesperson.objects.create(
        name="Roberto Santos",
        email="roberto@spassu.com.br",
        phone="(11) 95555-6666",
    )

    prod = Product.objects.create(
        code="CAD-001",
        description="Caderno Universitário",
        unit_price=Decimal("50.00"),
        commission_percentage=Decimal("5.00"),
    )

    # Venda 1: Carlos em 2026-09-05 -> Comissão R$ 10.00
    sale1 = Sale.objects.create(
        invoice_number="NF-001",
        sold_at="2026-09-05T10:00:00Z",
        customer=customer,
        salesperson=carlos,
        total_amount=Decimal("200.00"),
        total_commission=Decimal("10.00"),
    )
    SaleItem.objects.create(
        sale=sale1,
        product=prod,
        quantity=4,
        unit_price=Decimal("50.00"),
        applied_commission_percentage=Decimal("5.00"),
        total_price=Decimal("200.00"),
        commission_amount=Decimal("10.00"),
    )

    # Venda 2: Carlos em 2026-09-12 -> Comissão R$ 15.00
    sale2 = Sale.objects.create(
        invoice_number="NF-002",
        sold_at="2026-09-12T14:30:00Z",
        customer=customer,
        salesperson=carlos,
        total_amount=Decimal("300.00"),
        total_commission=Decimal("15.00"),
    )
    SaleItem.objects.create(
        sale=sale2,
        product=prod,
        quantity=6,
        unit_price=Decimal("50.00"),
        applied_commission_percentage=Decimal("5.00"),
        total_price=Decimal("300.00"),
        commission_amount=Decimal("15.00"),
    )

    # Venda 3: Mariana em 2026-09-15 -> Comissão R$ 8.50
    sale3 = Sale.objects.create(
        invoice_number="NF-003",
        sold_at="2026-09-15T18:00:00Z",
        customer=customer,
        salesperson=mariana,
        total_amount=Decimal("170.00"),
        total_commission=Decimal("8.50"),
    )
    SaleItem.objects.create(
        sale=sale3,
        product=prod,
        quantity=3,
        unit_price=Decimal("50.00"),
        applied_commission_percentage=Decimal("5.00"),
        total_price=Decimal("170.00"),
        commission_amount=Decimal("8.50"),
    )

    # Venda 4: Mariana FORA do período (em 2026-08-20) -> Não deve entrar no relatório de 01 a 15 de setembro
    sale_outside = Sale.objects.create(
        invoice_number="NF-OUTSIDE",
        sold_at="2026-08-20T10:00:00Z",
        customer=customer,
        salesperson=mariana,
        total_amount=Decimal("500.00"),
        total_commission=Decimal("25.00"),
    )
    SaleItem.objects.create(
        sale=sale_outside,
        product=prod,
        quantity=10,
        unit_price=Decimal("50.00"),
        applied_commission_percentage=Decimal("5.00"),
        total_price=Decimal("500.00"),
        commission_amount=Decimal("25.00"),
    )

    return {
        "carlos": carlos,
        "mariana": mariana,
        "roberto": roberto,
    }


@pytest.mark.django_db
class TestCommissionReportEndpoint:
    """Testes do endpoint GET /api/v1/commissions/."""

    def test_commission_report_success_aggregates_correctly(
        self, api_client, commission_test_data
    ):
        """
        Consulta de 01/09/2026 a 15/09/2026:
        - Carlos tem 2 vendas: R$ 10.00 + R$ 15.00 = R$ 25.00
        - Mariana tem 1 venda: R$ 8.50 (a de agosto é ignorada)
        - Roberto tem 0 vendas: NÃO deve aparecer na lista
        - Total Geral = R$ 25.00 + R$ 8.50 = R$ 33.50
        """
        response = api_client.get(
            "/api/v1/commissions/?start_date=2026-09-01&end_date=2026-09-15"
        )
        assert response.status_code == 200
        data = response.json()

        assert data["start_date"] == "2026-09-01"
        assert data["end_date"] == "2026-09-15"
        assert data["grand_total_commission"] == "33.50"
        assert len(data["salespeople"]) == 2

        # Valida Carlos
        carlos_entry = next(
            s for s in data["salespeople"] if s["salesperson_name"] == "Carlos Eduardo Lima"
        )
        assert carlos_entry["sales_count"] == 2
        assert carlos_entry["total_commission"] == "25.00"

        # Valida Mariana
        mariana_entry = next(
            s for s in data["salespeople"] if s["salesperson_name"] == "Mariana Souza"
        )
        assert mariana_entry["sales_count"] == 1
        assert mariana_entry["total_commission"] == "8.50"

        # Roberto não deve estar na lista (RN-009)
        names = [s["salesperson_name"] for s in data["salespeople"]]
        assert "Roberto Santos" not in names

    def test_commission_report_empty_period_returns_zero(
        self, api_client, commission_test_data
    ):
        """Período sem vendas deve retornar lista vazia e total R$ 0.00 sem erro."""
        response = api_client.get(
            "/api/v1/commissions/?start_date=2026-01-01&end_date=2026-01-10"
        )
        assert response.status_code == 200
        data = response.json()

        assert data["start_date"] == "2026-01-01"
        assert data["end_date"] == "2026-01-10"
        assert data["salespeople"] == []
        assert data["grand_total_commission"] == "0.00"

    def test_commission_report_start_date_greater_than_end_date_fails(
        self, api_client
    ):
        """Data inicial maior que final deve retornar erro 400."""
        response = api_client.get(
            "/api/v1/commissions/?start_date=2026-09-20&end_date=2026-09-10"
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "não pode ser posterior" in data["detail"]

    def test_commission_report_missing_parameters_fails(self, api_client):
        """Parâmetros obrigatórios ausentes devem retornar erro 400."""
        response = api_client.get("/api/v1/commissions/")
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data

"""Testes de integração automatizados para a API REST de Vendas."""

from decimal import Decimal
import pytest
from rest_framework.test import APIClient
from apps.sales.models import Customer, DayCommissionRule, Product, Sale, Salesperson


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def initial_data(db):
    """Cria dados prévios para os testes de integração de venda."""
    # Regra de Segunda-feira (0): Min 3.00%, Max 5.00%
    monday_rule = DayCommissionRule.objects.create(
        day_of_week=DayCommissionRule.DayOfWeek.MONDAY,
        min_percentage=Decimal("3.00"),
        max_percentage=Decimal("5.00"),
    )

    customer = Customer.objects.create(
        name="Empresa Alfa Papéis",
        email="contato@alfa.com.br",
        phone="(11) 98765-4321",
    )

    salesperson = Salesperson.objects.create(
        name="Carlos Eduardo Lima",
        email="carlos.lima@spassu.com.br",
        phone="(11) 91234-5678",
    )

    # Produto 1: 10% nominal -> deve ser limitado a 5% (teto)
    prod_notebook = Product.objects.create(
        code="CAD-001",
        description="Caderno Universitário 200 Folhas",
        unit_price=Decimal("50.00"),
        commission_percentage=Decimal("10.00"),
    )

    # Produto 2: 2% nominal -> deve ser elevado a 3% (piso)
    prod_pen = Product.objects.create(
        code="CAN-002",
        description="Caneta Esferográfica Azul",
        unit_price=Decimal("100.00"),
        commission_percentage=Decimal("2.00"),
    )

    # Produto Inativo
    prod_inactive = Product.objects.create(
        code="INA-999",
        description="Produto Descontinuado",
        unit_price=Decimal("10.00"),
        commission_percentage=Decimal("5.00"),
        is_active=False,
    )

    return {
        "monday_rule": monday_rule,
        "customer": customer,
        "salesperson": salesperson,
        "prod_notebook": prod_notebook,
        "prod_pen": prod_pen,
        "prod_inactive": prod_inactive,
    }


@pytest.mark.django_db
class TestSaleCreateEndpoint:
    """Testes do endpoint POST /api/v1/sales/."""

    def test_create_sale_success_with_dynamic_commission(
        self, api_client, initial_data
    ):
        """
        Criação de venda bem-sucedida em uma segunda-feira (2026-09-21):
        - Item 1: 2 unidades de Caderno (R$ 50,00) = R$ 100,00 -> Comissão 5% = R$ 5,00
        - Item 2: 1 unidade de Caneta (R$ 100,00) = R$ 100,00 -> Comissão 3% = R$ 3,00
        - Total da Venda = R$ 200,00
        - Total de Comissão = R$ 8,00
        """
        payload = {
            "invoice_number": "NF-10520",
            "sold_at": "2026-09-21T15:30:00Z",
            "customer_id": initial_data["customer"].id,
            "salesperson_id": initial_data["salesperson"].id,
            "items": [
                {
                    "product_id": initial_data["prod_notebook"].id,
                    "quantity": 2,
                },
                {
                    "product_id": initial_data["prod_pen"].id,
                    "quantity": 1,
                },
            ],
        }

        response = api_client.post("/api/v1/sales/", data=payload, format="json")

        assert response.status_code == 201
        data = response.json()

        assert data["invoice_number"] == "NF-10520"
        assert data["customer"]["name"] == "Empresa Alfa Papéis"
        assert data["salesperson"]["name"] == "Carlos Eduardo Lima"
        assert data["total_amount"] == "200.00"
        assert data["total_commission"] == "8.00"
        assert len(data["items"]) == 2

        # Valida item 1
        item1 = next(
            i for i in data["items"] if i["product_code"] == "CAD-001"
        )
        assert item1["quantity"] == 2
        assert item1["unit_price"] == "50.00"
        assert item1["applied_commission_percentage"] == "5.00"
        assert item1["total_price"] == "100.00"
        assert item1["commission_amount"] == "5.00"

        # Valida item 2
        item2 = next(
            i for i in data["items"] if i["product_code"] == "CAN-002"
        )
        assert item2["quantity"] == 1
        assert item2["unit_price"] == "100.00"
        assert item2["applied_commission_percentage"] == "3.00"
        assert item2["total_price"] == "100.00"
        assert item2["commission_amount"] == "3.00"

        # Confirma persistência no banco
        sale_in_db = Sale.objects.get(invoice_number="NF-10520")
        assert sale_in_db.total_amount == Decimal("200.00")
        assert sale_in_db.total_commission == Decimal("8.00")
        assert sale_in_db.items.count() == 2

    def test_create_sale_duplicate_invoice_number_fails(
        self, api_client, initial_data
    ):
        """Tentativa de criar venda com número de nota fiscal duplicado deve retornar 400."""
        # Cria a primeira venda
        Sale.objects.create(
            invoice_number="NF-DUPLICADA",
            sold_at="2026-09-21T10:00:00Z",
            customer=initial_data["customer"],
            salesperson=initial_data["salesperson"],
            total_amount=Decimal("100.00"),
            total_commission=Decimal("5.00"),
        )

        payload = {
            "invoice_number": "NF-DUPLICADA",
            "sold_at": "2026-09-21T15:30:00Z",
            "customer_id": initial_data["customer"].id,
            "salesperson_id": initial_data["salesperson"].id,
            "items": [
                {
                    "product_id": initial_data["prod_notebook"].id,
                    "quantity": 1,
                }
            ],
        }

        response = api_client.post("/api/v1/sales/", data=payload, format="json")

        assert response.status_code == 400
        data = response.json()
        assert "invoice_number" in data
        assert any(
            "Já existe uma venda com este número" in err
            for err in data["invoice_number"]
        )

    def test_create_sale_without_items_fails(self, api_client, initial_data):
        """Tentativa de registrar venda sem itens deve retornar 400."""
        payload = {
            "invoice_number": "NF-NO-ITEMS",
            "sold_at": "2026-09-21T15:30:00Z",
            "customer_id": initial_data["customer"].id,
            "salesperson_id": initial_data["salesperson"].id,
            "items": [],
        }

        response = api_client.post("/api/v1/sales/", data=payload, format="json")

        assert response.status_code == 400
        data = response.json()
        assert "items" in data

    def test_create_sale_with_inactive_product_fails(
        self, api_client, initial_data
    ):
        """Tentativa de vender produto inativo deve retornar 400."""
        payload = {
            "invoice_number": "NF-INACTIVE",
            "sold_at": "2026-09-21T15:30:00Z",
            "customer_id": initial_data["customer"].id,
            "salesperson_id": initial_data["salesperson"].id,
            "items": [
                {
                    "product_id": initial_data["prod_inactive"].id,
                    "quantity": 1,
                }
            ],
        }

        response = api_client.post("/api/v1/sales/", data=payload, format="json")

        assert response.status_code == 400
        data = response.json()
        assert "items" in data
        assert "inativo" in str(data["items"])

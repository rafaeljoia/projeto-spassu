"""Comando de gerenciamento para carga inicial de dados (seeding)."""

from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.sales.models import Customer, DayCommissionRule, Product, Salesperson


class Command(BaseCommand):
    help = (
        "Popula o banco de dados com regras de comissão para os 7 dias da semana, "
        "produtos, clientes, vendedores e superusuário para ambiente de desenvolvimento."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Iniciando carga de dados (seeding)..."))

        self._seed_day_commission_rules()
        self._seed_products()
        self._seed_customers()
        self._seed_salespeople()
        self._seed_superuser()

        self.stdout.write(
            self.style.SUCCESS("Carga de dados concluída com sucesso!")
        )

    def _seed_day_commission_rules(self) -> None:
        """Cadastra ou atualiza os limites de comissão para todos os 7 dias da semana."""
        rules_data = [
            # 0 = Segunda-feira (Min 3.00%, Max 5.00% conforme exemplo do desafio)
            {
                "day_of_week": DayCommissionRule.DayOfWeek.MONDAY,
                "min_percentage": Decimal("3.00"),
                "max_percentage": Decimal("5.00"),
            },
            # 1 = Terça-feira
            {
                "day_of_week": DayCommissionRule.DayOfWeek.TUESDAY,
                "min_percentage": Decimal("2.00"),
                "max_percentage": Decimal("4.00"),
            },
            # 2 = Quarta-feira
            {
                "day_of_week": DayCommissionRule.DayOfWeek.WEDNESDAY,
                "min_percentage": Decimal("1.00"),
                "max_percentage": Decimal("3.00"),
            },
            # 3 = Quinta-feira
            {
                "day_of_week": DayCommissionRule.DayOfWeek.THURSDAY,
                "min_percentage": Decimal("2.00"),
                "max_percentage": Decimal("5.00"),
            },
            # 4 = Sexta-feira
            {
                "day_of_week": DayCommissionRule.DayOfWeek.FRIDAY,
                "min_percentage": Decimal("2.00"),
                "max_percentage": Decimal("6.00"),
            },
            # 5 = Sábado
            {
                "day_of_week": DayCommissionRule.DayOfWeek.SATURDAY,
                "min_percentage": Decimal("1.00"),
                "max_percentage": Decimal("4.00"),
            },
            # 6 = Domingo
            {
                "day_of_week": DayCommissionRule.DayOfWeek.SUNDAY,
                "min_percentage": Decimal("1.00"),
                "max_percentage": Decimal("3.00"),
            },
        ]

        for item in rules_data:
            rule, created = DayCommissionRule.objects.update_or_create(
                day_of_week=item["day_of_week"],
                defaults={
                    "min_percentage": item["min_percentage"],
                    "max_percentage": item["max_percentage"],
                },
            )
            action = "Criada" if created else "Atualizada"
            self.stdout.write(
                f"  - Regra {action}: {rule.get_day_of_week_display()} "
                f"({rule.min_percentage}% a {rule.max_percentage}%)"
            )

    def _seed_products(self) -> None:
        """Cadastra produtos de exemplo no catálogo da papelaria."""
        products_data = [
            {
                "code": "CAD-001",
                "description": "Caderno Universitário Espiral 10 Matérias 200 Folhas",
                "unit_price": Decimal("28.90"),
                "commission_percentage": Decimal("10.00"),
            },
            {
                "code": "CAN-002",
                "description": "Caixa de Caneta Esferográfica Azul 1.0mm com 50 Unidades",
                "unit_price": Decimal("45.00"),
                "commission_percentage": Decimal("2.00"),
            },
            {
                "code": "BOR-003",
                "description": "Borracha Escolar Branca Macia com Capa Plástica",
                "unit_price": Decimal("3.50"),
                "commission_percentage": Decimal("4.00"),
            },
            {
                "code": "LAP-004",
                "description": "Caixa de Lápis de Cor Aquarelável 24 Cores",
                "unit_price": Decimal("39.90"),
                "commission_percentage": Decimal("7.50"),
            },
            {
                "code": "RES-005",
                "description": "Resma de Papel Sulfite A4 75g com 500 Folhas",
                "unit_price": Decimal("32.50"),
                "commission_percentage": Decimal("5.00"),
            },
            {
                "code": "EST-006",
                "description": "Estojo Escolar Duplo em Tecido Reforçado",
                "unit_price": Decimal("22.00"),
                "commission_percentage": Decimal("8.00"),
            },
            {
                "code": "TES-007",
                "description": "Tesoura Escolar Sem Ponta em Aço Inox",
                "unit_price": Decimal("8.90"),
                "commission_percentage": Decimal("3.00"),
            },
            {
                "code": "MAR-008",
                "description": "Conjunto Marcador de Texto Fluorescente com 6 Cores",
                "unit_price": Decimal("24.00"),
                "commission_percentage": Decimal("6.00"),
            },
        ]

        for item in products_data:
            product, created = Product.objects.update_or_create(
                code=item["code"],
                defaults={
                    "description": item["description"],
                    "unit_price": item["unit_price"],
                    "commission_percentage": item["commission_percentage"],
                    "is_active": True,
                },
            )
            action = "Criado" if created else "Atualizado"
            self.stdout.write(
                f"  - Produto {action}: [{product.code}] {product.description} "
                f"(R$ {product.unit_price} / {product.commission_percentage}%)"
            )

    def _seed_customers(self) -> None:
        """Cadastra clientes de teste."""
        customers_data = [
            {
                "name": "Papelaria e Livraria Central Ltda",
                "email": "compras@papelariacentral.com.br",
                "phone": "(11) 98765-4321",
            },
            {
                "name": "Colégio São Francisco de Assis",
                "email": "suprimentos@colegiosaofrancisco.edu.br",
                "phone": "(21) 99876-5432",
            },
            {
                "name": "Escritório Modelo Advocacia & Consultoria",
                "email": "adm@modeloadv.com.br",
                "phone": "(27) 98877-6655",
            },
        ]

        for item in customers_data:
            customer, created = Customer.objects.update_or_create(
                email=item["email"],
                defaults={
                    "name": item["name"],
                    "phone": item["phone"],
                },
            )
            action = "Criado" if created else "Atualizado"
            self.stdout.write(f"  - Cliente {action}: {customer.name}")

    def _seed_salespeople(self) -> None:
        """Cadastra vendedores de teste."""
        salespeople_data = [
            {
                "name": "Carlos Eduardo da Silva",
                "email": "carlos.silva@spassu.com.br",
                "phone": "(27) 99111-2233",
            },
            {
                "name": "Mariana Santos Oliveira",
                "email": "mariana.santos@spassu.com.br",
                "phone": "(27) 99222-3344",
            },
            {
                "name": "Roberto Gomes Souza",
                "email": "roberto.gomes@spassu.com.br",
                "phone": "(27) 99333-4455",
            },
        ]

        for item in salespeople_data:
            salesperson, created = Salesperson.objects.update_or_create(
                email=item["email"],
                defaults={
                    "name": item["name"],
                    "phone": item["phone"],
                },
            )
            action = "Criado" if created else "Atualizado"
            self.stdout.write(f"  - Vendedor {action}: {salesperson.name}")

    def _seed_superuser(self) -> None:
        """Cria o superusuário admin caso ainda não exista."""
        user_model = get_user_model()
        username = "admin"
        email = "admin@spassu.com.br"
        password = "admin123"

        if not user_model.objects.filter(username=username).exists():
            user_model.objects.create_superuser(
                username=username,
                email=email,
                password=password,
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"  - Superusuário criado: {username} (senha: {password})"
                )
            )
        else:
            self.stdout.write(
                f"  - Superusuário '{username}' já existe no sistema."
            )

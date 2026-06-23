"""
Tests de cobertura de ramas para _get_metricas_variable().

Ramas:
  RAMA-1: metricas_globales is None          → retorna None
  RAMA-2: variable en formato v5             → busca en resultados[variable][modelo_Xh]
  RAMA-2b: horizonte no existe en v5         → m vacío → None
  RAMA-3: variable='temperatura' + legacy v4 → busca en resultados[modelo_Xh]
  RAMA-4: variable != temperatura + legacy v4→ m = {} → None
  RAMA-5: m no vacío                         → retorna dict con campos correctos
"""
import pytest
import app as app_module
from app import _get_metricas_variable

# ─── Fixtures de métricas ──────────────────────────────────────────────────────

METRICAS_V5 = {
    "resultados": {
        "temperatura": {
            "modelo_24h": {
                "mae_celsius": 1.2,
                "rmse_celsius": 1.8,
                "r2_score": 0.92,
                "nivel": "Bueno",
            }
        },
        "humedad": {
            "modelo_48h": {
                "mae_celsius": 3.5,
                "rmse_celsius": 4.2,
                "r2_score": 0.85,
                "nivel": "Aceptable",
            }
        },
    }
}

METRICAS_LEGACY_V4 = {
    "resultados": {
        "modelo_24h": {
            "mae_celsius": 1.5,
            "rmse_celsius": 2.0,
            "r2_score": 0.90,
            "nivel": "Bueno",
        }
    }
}


@pytest.fixture(autouse=True)
def restaurar_metricas():
    """Restaura metricas_globales al valor original después de cada test."""
    original = app_module.metricas_globales
    yield
    app_module.metricas_globales = original


# ── RAMA-1: metricas_globales es None ────────────────────────────────────────

class TestMetricasNone:
    def test_R1_metricas_globales_none(self):
        """RAMA-1: metricas_globales=None → retorna None."""
        app_module.metricas_globales = None
        assert _get_metricas_variable("temperatura", 24) is None

    def test_R1_cualquier_variable_retorna_none(self):
        """RAMA-1: aplica para cualquier variable, no solo temperatura."""
        app_module.metricas_globales = None
        assert _get_metricas_variable("humedad", 48) is None


# ── RAMA-2: formato v5, variable existe ──────────────────────────────────────

class TestFormatoV5:
    def test_R2_temperatura_24h_retorna_dict(self):
        """RAMA-2: temperatura + horizonte existente → dict con campos correctos."""
        app_module.metricas_globales = METRICAS_V5
        r = _get_metricas_variable("temperatura", 24)
        assert r is not None
        assert r["mae_celsius"] == 1.2
        assert r["r2_score"] == 0.92
        assert r["nivel"] == "Bueno"

    def test_R2_incluye_unidad_de_la_variable(self):
        """RAMA-2: el resultado incluye la unidad de VARIABLES_CONFIG."""
        app_module.metricas_globales = METRICAS_V5
        r = _get_metricas_variable("temperatura", 24)
        assert r["unidad"] == "°C"

    def test_R2_humedad_48h(self):
        """RAMA-2: humedad + horizonte existente funciona igual."""
        app_module.metricas_globales = METRICAS_V5
        r = _get_metricas_variable("humedad", 48)
        assert r is not None
        assert r["r2_score"] == 0.85
        assert r["unidad"] == "%"

    def test_R2b_horizonte_inexistente_retorna_none(self):
        """RAMA-2b: variable existe en v5 pero horizonte no → m vacío → None."""
        app_module.metricas_globales = METRICAS_V5
        assert _get_metricas_variable("temperatura", 72) is None

    def test_R2b_variable_sin_metricas_retorna_none(self):
        """RAMA-2b: variable en v5 pero sin ningún modelo → None."""
        app_module.metricas_globales = METRICAS_V5
        assert _get_metricas_variable("presion", 24) is None


# ── RAMA-3/4: formato legacy v4 ───────────────────────────────────────────────

class TestFormatoLegacyV4:
    def test_R3_temperatura_legacy_v4(self):
        """RAMA-3: variable='temperatura' no en v5 → busca formato legacy."""
        app_module.metricas_globales = METRICAS_LEGACY_V4
        r = _get_metricas_variable("temperatura", 24)
        assert r is not None
        assert r["mae_celsius"] == 1.5

    def test_R4_humedad_legacy_retorna_none(self):
        """RAMA-4: variable != temperatura + formato legacy → m={} → None."""
        app_module.metricas_globales = METRICAS_LEGACY_V4
        assert _get_metricas_variable("humedad", 24) is None

    def test_R4_presion_legacy_retorna_none(self):
        """RAMA-4: presion tampoco existe en legacy → None."""
        app_module.metricas_globales = METRICAS_LEGACY_V4
        assert _get_metricas_variable("presion", 24) is None

    def test_R3_horizonte_inexistente_legacy_retorna_none(self):
        """RAMA-3: temperatura legacy pero horizonte 72h no existe → None."""
        app_module.metricas_globales = METRICAS_LEGACY_V4
        assert _get_metricas_variable("temperatura", 72) is None

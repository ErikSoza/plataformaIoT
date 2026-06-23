"""
Tests de cobertura de ramas y caminos para calcular_confianza().

La función tiene 8 caminos independientes (complejidad ciclomática = 8):
  C1: pred_om falsy (None o [])             → "Desconocido"
  C2: sum_peso == 0 (anclas sin match om)   → "Desconocido"
  C3: con mae_train, ratio < 1.5            → "Alto"   🟢
  C4: con mae_train, 1.5 ≤ ratio < 3.0     → "Medio"  🟡
  C5: con mae_train, ratio ≥ 3.0            → "Bajo"   🔴
  C6: sin mae_train, horizonte=72, mae ≤ 2.5 → "Alto"
  C7: sin mae_train, horizonte=72, mae ≤ 5.0 → "Medio"
  C8: sin mae_train, horizonte=72, mae > 5.0 → "Bajo"
"""
import pytest
from tests.conftest import make_pred_om
from app import calcular_confianza

ANCLAS = {24: 20.0, 48: 21.0, 72: 22.0}


# ── C1: pred_om ausente ───────────────────────────────────────────────────────

class TestSinOpenMeteo:
    def test_C1_pred_om_none(self):
        """C1: pred_om=None → nivel Desconocido, mae_diferencia=None."""
        r = calcular_confianza(ANCLAS, None, mae_entrenamiento=1.0)
        assert r["nivel"] == "Desconocido"
        assert r["mae_diferencia"] is None

    def test_C1_pred_om_lista_vacia(self):
        """C1b: pred_om=[] es falsy → también Desconocido."""
        r = calcular_confianza(ANCLAS, [], mae_entrenamiento=1.0)
        assert r["nivel"] == "Desconocido"
        assert r["badge"] == "⚪"


# ── C2: sin solape de horas ───────────────────────────────────────────────────

class TestSinSolape:
    def test_C2_anclas_sin_match_en_om(self):
        """C2: pred_om solo tiene hora_offset=1, anclas usan 24/48/72 → sum_peso=0."""
        pred_om = [{"hora_offset": 1, "valor": 20.0, "datetime": "x"}]
        r = calcular_confianza(ANCLAS, pred_om, mae_entrenamiento=1.0)
        assert r["nivel"] == "Desconocido"
        assert r["mae_diferencia"] is None


# ── C3-C5: con mae_entrenamiento ─────────────────────────────────────────────

class TestConMaeEntrenamiento:
    def test_C3_ratio_menor_1_5_alto(self):
        """C3: MAE_acuerdo=0.5, mae_train=1.0 → ratio=0.5 < 1.5 → Alto 🟢."""
        pred_om = make_pred_om(ANCLAS, delta=0.5)
        r = calcular_confianza(ANCLAS, pred_om, mae_entrenamiento=1.0)
        assert r["nivel"] == "Alto"
        assert r["badge"] == "🟢"
        assert r["mae_diferencia"] == pytest.approx(0.5, abs=0.05)

    def test_C4_ratio_entre_1_5_y_3_medio(self):
        """C4: MAE_acuerdo=2.0, mae_train=1.0 → ratio=2.0, 1.5≤2.0<3.0 → Medio 🟡."""
        pred_om = make_pred_om(ANCLAS, delta=2.0)
        r = calcular_confianza(ANCLAS, pred_om, mae_entrenamiento=1.0)
        assert r["nivel"] == "Medio"
        assert r["badge"] == "🟡"

    def test_C5_ratio_mayor_igual_3_bajo(self):
        """C5: MAE_acuerdo=5.0, mae_train=1.0 → ratio=5.0 ≥ 3.0 → Bajo 🔴."""
        pred_om = make_pred_om(ANCLAS, delta=5.0)
        r = calcular_confianza(ANCLAS, pred_om, mae_entrenamiento=1.0)
        assert r["nivel"] == "Bajo"
        assert r["badge"] == "🔴"

    def test_C3_limite_exacto_ratio_1_5(self):
        """Límite: ratio exactamente 1.5 cae en Medio (< 1.5 es falso)."""
        # MAE_acuerdo=1.5, mae_train=1.0 → ratio=1.5 → no < 1.5 → Medio
        pred_om = make_pred_om(ANCLAS, delta=1.5)
        r = calcular_confianza(ANCLAS, pred_om, mae_entrenamiento=1.0)
        assert r["nivel"] == "Medio"

    def test_C5_limite_exacto_ratio_3_0(self):
        """Límite: ratio exactamente 3.0 cae en Bajo (no < 3.0)."""
        pred_om = make_pred_om(ANCLAS, delta=3.0)
        r = calcular_confianza(ANCLAS, pred_om, mae_entrenamiento=1.0)
        assert r["nivel"] == "Bajo"

    def test_mae_entrenamiento_cero_usa_umbrales_fijos(self):
        """Condición mae_train>0: si mae_train=0 (falsy) se usa la rama de umbrales fijos."""
        pred_om = make_pred_om(ANCLAS, delta=1.0)
        r = calcular_confianza(ANCLAS, pred_om, mae_entrenamiento=0, horizonte=72)
        # Con mae≈1.0 y u_alto=2.5 para 72h → Alto
        assert r["nivel"] == "Alto"


# ── C6-C8: sin mae_entrenamiento, umbrales fijos por horizonte ────────────────

class TestSinMaeEntrenamiento:
    def test_C6_horizonte_72_mae_bajo_umbral_alto(self):
        """C6: horizonte=72, u_alto=2.5, mae=1.0 ≤ 2.5 → Alto."""
        pred_om = make_pred_om(ANCLAS, delta=1.0)
        r = calcular_confianza(ANCLAS, pred_om, horizonte=72)
        assert r["nivel"] == "Alto"

    def test_C7_horizonte_72_mae_entre_umbrales(self):
        """C7: horizonte=72, u_alto=2.5, u_medio=5.0, mae=3.5 → Medio."""
        pred_om = make_pred_om(ANCLAS, delta=3.5)
        r = calcular_confianza(ANCLAS, pred_om, horizonte=72)
        assert r["nivel"] == "Medio"

    def test_C8_horizonte_72_mae_sobre_umbral_medio(self):
        """C8: horizonte=72, u_medio=5.0, mae=6.0 > 5.0 → Bajo."""
        pred_om = make_pred_om(ANCLAS, delta=6.0)
        r = calcular_confianza(ANCLAS, pred_om, horizonte=72)
        assert r["nivel"] == "Bajo"

    def test_horizonte_24_umbrales_distintos(self):
        """Condición horizonte: horizonte=24 usa (u_alto=1.5, u_medio=2.5)."""
        # delta=2.0 → mae≈2.0 > u_alto(1.5) → Medio para 24h
        pred_om = make_pred_om(ANCLAS, delta=2.0)
        r = calcular_confianza(ANCLAS, pred_om, horizonte=24)
        assert r["nivel"] == "Medio"

    def test_horizonte_48_umbrales_distintos(self):
        """horizonte=48 usa (u_alto=2.0, u_medio=4.0)."""
        pred_om = make_pred_om(ANCLAS, delta=1.5)
        r = calcular_confianza(ANCLAS, pred_om, horizonte=48)
        assert r["nivel"] == "Alto"

    def test_horizonte_desconocido_usa_default(self):
        """horizonte no en tabla UMBRALES → usa default (2.5, 5.0)."""
        pred_om = make_pred_om(ANCLAS, delta=1.0)
        r = calcular_confianza(ANCLAS, pred_om, horizonte=96)
        assert r["nivel"] == "Alto"


# ── Estructura de respuesta ───────────────────────────────────────────────────

class TestEstructuraRespuesta:
    def test_campos_obligatorios_presentes(self):
        """Toda respuesta debe tener nivel, badge, mae_diferencia, descripcion."""
        pred_om = make_pred_om(ANCLAS, delta=0.5)
        r = calcular_confianza(ANCLAS, pred_om, mae_entrenamiento=1.0)
        assert "nivel" in r
        assert "badge" in r
        assert "mae_diferencia" in r
        assert "descripcion" in r

    def test_unidad_aparece_en_descripcion(self):
        """La unidad dinámica (hPa, %, km/h) aparece en la descripción."""
        pred_om = make_pred_om(ANCLAS, delta=0.5)
        r = calcular_confianza(ANCLAS, pred_om, mae_entrenamiento=1.0, unidad="hPa")
        assert "hPa" in r["descripcion"]

    def test_mae_diferencia_redondeado(self):
        """mae_diferencia debe estar redondeado a 2 decimales."""
        pred_om = make_pred_om(ANCLAS, delta=1.123456)
        r = calcular_confianza(ANCLAS, pred_om, mae_entrenamiento=1.0)
        assert r["mae_diferencia"] == round(r["mae_diferencia"], 2)

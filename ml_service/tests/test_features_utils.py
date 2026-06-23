"""
Tests de cobertura de ramas y caminos para construir_lags().

Ramas cubiertas:
  RAMA-A: i < n  (usa valor del historial)
  RAMA-B: i >= n (padding con valor actual)
  RAMA-C: presion en historial es None → fallback a presion_actual
  RAMA-D: presion en historial definida → usa historial

Caminos:
  CAMINO-1: historial vacío  → todo padding
  CAMINO-2: historial completo (n >= ventana) → todo historial
  CAMINO-3: historial parcial (0 < n < ventana) → mezcla
"""
import pytest
from types import SimpleNamespace
from features_utils import (
    construir_lags,
    LAG_WINDOW_TEMP,
    LAG_WINDOW_HUM_VIENTO,
    LAG_WINDOW_PRESION,
)


def lectura(temp=20.0, hum=60.0, viento=5.0, presion=1013.0):
    return SimpleNamespace(
        temperatura=temp,
        humedad=hum,
        velocidad_viento=viento,
        presion=presion,
    )


# ── CAMINO-1: historial vacío — todo padding ──────────────────────────────────

class TestHistorialVacio:
    def test_C1_todos_los_lags_son_padding(self):
        """CAMINO-1: sin historial, todos los lags == valor actual."""
        lt, lh, lv, lp = construir_lags([], 22.0, 55.0, 8.0, 1010.0)
        assert all(v == 22.0  for v in lt)
        assert all(v == 55.0  for v in lh)
        assert all(v == 8.0   for v in lv)
        assert all(v == 1010.0 for v in lp)

    def test_C1_longitudes_correctas(self):
        """CAMINO-1: cada array tiene la longitud de su ventana."""
        lt, lh, lv, lp = construir_lags([], 22.0, 55.0, 8.0, 1010.0)
        assert len(lt) == LAG_WINDOW_TEMP        # 24
        assert len(lh) == LAG_WINDOW_HUM_VIENTO  # 12
        assert len(lv) == LAG_WINDOW_HUM_VIENTO  # 12
        assert len(lp) == LAG_WINDOW_PRESION     # 12


# ── CAMINO-2: historial completo — todo del historial ────────────────────────

class TestHistorialCompleto:
    def test_C2_primer_lag_es_el_indice_0_del_historial(self):
        """CAMINO-2: índice 0 del historial → T-1h, no usa padding."""
        hist = [lectura(temp=float(i)) for i in range(LAG_WINDOW_TEMP)]
        lt, _, _, _ = construir_lags(hist, 99.0, 99.0, 99.0, 999.0)
        assert lt[0] == 0.0   # primer elemento del historial
        assert lt[1] == 1.0
        assert lt[23] == 23.0

    def test_C2_padding_nunca_aparece(self):
        """CAMINO-2: el valor de padding 99.0 no debe aparecer en ningún lag."""
        hist = [lectura(temp=10.0) for _ in range(LAG_WINDOW_TEMP)]
        lt, lh, lv, _ = construir_lags(hist, 99.0, 99.0, 99.0, 999.0)
        assert 99.0 not in lt
        assert 99.0 not in lh
        assert 99.0 not in lv

    def test_C2_todos_campos_correctos(self):
        """CAMINO-2: temperatura, humedad, viento se toman del historial."""
        hist = [lectura(temp=10.0, hum=50.0, viento=3.0, presion=995.0)
                for _ in range(LAG_WINDOW_TEMP)]
        lt, lh, lv, lp = construir_lags(hist, 99.0, 99.0, 99.0, 999.0)
        assert lt[0] == 10.0
        assert lh[0] == 50.0
        assert lv[0] == 3.0
        assert lp[0] == 995.0


# ── CAMINO-3: historial parcial — mezcla ────────────────────────────────────

class TestHistorialParcial:
    def test_C3_primeros_n_del_historial_resto_padding(self):
        """CAMINO-3: n=3 → índices 0,1,2 del historial; desde 3 en adelante padding."""
        hist = [lectura(temp=float(i)) for i in range(3)]
        lt, _, _, _ = construir_lags(hist, 99.0, 50.0, 5.0, 1013.0)
        assert lt[0] == 0.0   # historial
        assert lt[1] == 1.0   # historial
        assert lt[2] == 2.0   # historial
        assert lt[3] == 99.0  # padding
        assert lt[23] == 99.0 # padding

    def test_C3_un_solo_elemento(self):
        """CAMINO-3: n=1 → solo índice 0 del historial, resto padding."""
        hist = [lectura(temp=5.0)]
        lt, _, _, _ = construir_lags(hist, 99.0, 50.0, 5.0, 1013.0)
        assert lt[0] == 5.0
        assert lt[1] == 99.0


# ── RAMA-C/D: presion None en historial ──────────────────────────────────────

class TestPresionNone:
    def test_RC_presion_none_usa_presion_actual(self):
        """RAMA-C: historial[0].presion=None → lp[0] = presion_actual."""
        hist = [SimpleNamespace(
            temperatura=20.0, humedad=60.0, velocidad_viento=5.0, presion=None
        )]
        _, _, _, lp = construir_lags(hist, 20.0, 60.0, 5.0, 1013.0)
        assert lp[0] == 1013.0

    def test_RD_presion_definida_usa_historial(self):
        """RAMA-D: historial[0].presion=995.0 definida → lp[0] = 995.0."""
        hist = [lectura(presion=995.0)]
        _, _, _, lp = construir_lags(hist, 20.0, 60.0, 5.0, 1013.0)
        assert lp[0] == 995.0

    def test_RC_mezcla_none_y_definida(self):
        """RAMA-C+D: primer elemento tiene presion=None, segundo tiene valor."""
        hist = [
            SimpleNamespace(temperatura=20.0, humedad=60.0, velocidad_viento=5.0, presion=None),
            lectura(presion=990.0),
        ]
        _, _, _, lp = construir_lags(hist, 20.0, 60.0, 5.0, 1013.0)
        assert lp[0] == 1013.0  # None → fallback
        assert lp[1] == 990.0   # definida → historial


# ── Constantes de ventana ─────────────────────────────────────────────────────

class TestConstantes:
    def test_LAG_WINDOW_TEMP_es_24(self):
        assert LAG_WINDOW_TEMP == 24

    def test_LAG_WINDOW_HUM_VIENTO_es_12(self):
        assert LAG_WINDOW_HUM_VIENTO == 12

    def test_LAG_WINDOW_PRESION_es_12(self):
        assert LAG_WINDOW_PRESION == 12

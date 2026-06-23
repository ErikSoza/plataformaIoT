"""
Utilidades de construcción de lags para el modelo de predicción.

Extraído de predict_post() en app.py para permitir pruebas unitarias
independientes del router FastAPI y de los modelos .pkl.

Constantes de ventana también centralizadas aquí para que app.py las
importe y no haya duplicación.
"""

LAG_WINDOW_TEMP       = 24
LAG_WINDOW_HUM_VIENTO = 12
LAG_WINDOW_PRESION    = 12
PRESION_CURICO_MEDIA  = 993.0


def construir_lags(
    historial: list,
    temp_actual: float,
    humedad_actual: float,
    viento_actual: float,
    presion_actual: float,
) -> tuple[list[float], list[float], list[float], list[float]]:
    """
    Construye los cuatro arrays de lags a partir del historial de lecturas.

    Si hay menos entradas en el historial que el tamaño de la ventana,
    los índices restantes se rellenan con el valor actual (padding).
    Para presión, si la lectura histórica tiene presion=None, también
    se usa presion_actual como fallback (sensor BMP280 puede estar ausente).

    Args:
        historial:       Lista de objetos con atributos temperatura, humedad,
                         velocidad_viento, presion. Índice 0 = T-1h.
        temp_actual:     Temperatura de la lectura más reciente (°C).
        humedad_actual:  Humedad relativa más reciente (%).
        viento_actual:   Velocidad del viento más reciente (km/h).
        presion_actual:  Presión atmosférica más reciente (hPa).

    Returns:
        Tupla (lags_temp, lags_hum, lags_viento, lags_presion).
        Cada array tiene la longitud de su ventana correspondiente.
    """
    n = len(historial)

    lags_temp = [
        historial[i].temperatura if i < n else temp_actual
        for i in range(LAG_WINDOW_TEMP)
    ]
    lags_hum = [
        historial[i].humedad if i < n else humedad_actual
        for i in range(LAG_WINDOW_HUM_VIENTO)
    ]
    lags_viento = [
        historial[i].velocidad_viento if i < n else viento_actual
        for i in range(LAG_WINDOW_HUM_VIENTO)
    ]
    lags_presion = [
        historial[i].presion if i < n and historial[i].presion is not None
        else presion_actual
        for i in range(LAG_WINDOW_PRESION)
    ]

    return lags_temp, lags_hum, lags_viento, lags_presion

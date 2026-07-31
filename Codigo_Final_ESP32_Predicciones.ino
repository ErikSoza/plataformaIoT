/* ==========================================================================
 * ESTACIÓN METEOROLÓGICA UTALCA - VERSIÓN FINAL MQTT (CORREGIDA)
 * Cambios respecto a la versión original:
 *  - AHT20 reemplazado por DHT11 (GPIO4, digital 1-Wire)
 *  - MQ-135 integrado con MQUnifiedsensor: CO2, Alcohol y NH3 en ppm,
 *    calibrado con R0 en aire limpio, más el estado digital (D0)
 *  - Pin del anemómetro corregido de GPIO13 a GPIO25
 * ========================================================================== */

#include <Wire.h>
#include <DHT.h>
#include <Adafruit_BMP280.h>
#include <MQUnifiedsensor.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <time.h>
#include <string.h>

#include <Clima_Curico_inferencing.h>

// ==========================================================================
// ⚙️ CONFIGURACIÓN DE USUARIO
// ==========================================================================

// --- 1. WIFI ---
const char* SSID_WIFI = "Señora Berta 2,4 Movistar";
const char* PASS_WIFI = "41195900";

// --- 2. MQTT BROKER ---
const char* MQTT_SERVER = "192.168.1.87";  //esto puede que cambie
const int   MQTT_PORT = 1883;
const char* MQTT_TOPIC = "datos"; // Tópico donde publicaremos

// --- 3. TIEMPO (CHILE) ---
const char* NTP_SERVER = "pool.ntp.org";
const long  GMT_OFFSET_SEC = -14400; // UTC-4
const int   DAYLIGHT_OFFSET_SEC = 3600;

#define INTERVALO_LECTURA_MS  10000

// --- HARDWARE ---
#define SDA_PIN 21
#define SCL_PIN 22
#define PIN_ANEMOMETRO 25         // Corregido: antes estaba en 13, según Cuadro 4.3 va en GPIO25
#define VARIABLES_POR_MUESTRA 4

// --- DHT11 ---
#define DHT_PIN 4                 // Reemplaza al AHT20, según Cuadro 4.3: Data -> GPIO4
#define DHT_TYPE DHT11

// --- MQ-135 ---
#define MQ135_PLACA   "ESP-32"
#define MQ135_VOLTAJE 3.3
#define MQ135_ADC_RES 12
#define MQ135_PIN_AO  34          // Analógico, ADC1
#define MQ135_PIN_DO  35          // Digital (alarma por umbral), ADC1
#define MQ135_TIPO    "MQ-135"
#define MQ135_RATIO_AIRE_LIMPIO 3.6

// Objetos
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_BMP280 bmp;
MQUnifiedsensor MQ135(MQ135_PLACA, MQ135_VOLTAJE, MQ135_ADC_RES, MQ135_PIN_AO, MQ135_TIPO);
WiFiClient espClient;
PubSubClient client(espClient); // Objeto MQTT

// Variables Globales
String device_id = "GENERICO"; // Se calculará con la MAC
float features[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE];
unsigned long tiempo_ultima_lectura = 0;
int hora_actual = 0;

// Variables Anemómetro
volatile int pulsos_viento = 0;
unsigned long tiempo_ultimo_viento = 0;

// Prototipos
void initWiFi();
void initMQTT();
void reconnectMQTT();
String obtenerIDUnico();
void syncTime();
unsigned long getEpochTime();
int getRealHour();
void IRAM_ATTR contar_pulsos_viento();
float leer_viento_promedio();
void inicializar_buffer_inteligente(float t, float h, float v, int hora_fin_real);
void actualizar_fifo(float t, float h, float v, int hora);
void avanzar_hora();
int raw_feature_get_data(size_t offset, size_t length, float *out_ptr);
void calibrarMQ135();
void leerMQ135(float &co2, float &alcohol, float &nh3, bool &gasDetectado);
String generar_json(float t, float h, float p, float v, float pred, float co2, float alcohol, float nh3, bool gas_detectado);
void imprimir_buffer_completo();

void setup() {
    Serial.begin(115200);
    while(!Serial);
    delay(2000);

    Serial.println("\n>>> INICIANDO SISTEMA MQTT + ML <<<");

    // 1. HARDWARE
    pinMode(PIN_ANEMOMETRO, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_ANEMOMETRO), contar_pulsos_viento, FALLING);

    pinMode(MQ135_PIN_DO, INPUT);

    dht.begin();
    Wire.begin(SDA_PIN, SCL_PIN);
    if (!bmp.begin(0x76)) Serial.println("⚠️ BMP280 Error");

    // Calibración MQ-135 (bloqueante, una sola vez al encender)
    calibrarMQ135();

    // 2. CONEXIÓN Y HORA
    initWiFi();

    // Generamos ID basada en MAC antes de conectar MQTT
    device_id = obtenerIDUnico();
    Serial.print("🆔 ID ESTACIÓN: "); Serial.println(device_id);

    initMQTT(); // Configurar servidor MQTT
    syncTime();

    // 3. OBTENCIÓN DE HORA REAL
    hora_actual = getRealHour();
    Serial.printf("✅ Hora Real: %d:00\n", hora_actual);

    // 4. COLD START
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (isnan(t)) t = 20.0;
    if (isnan(h)) h = 50.0;
    float v = leer_viento_promedio();

    inicializar_buffer_inteligente(t, h, v, hora_actual);
    imprimir_buffer_completo();

    tiempo_ultima_lectura = millis();
    tiempo_ultimo_viento = millis();
}

void loop() {
    // A. GESTIÓN MQTT (Reconexión automática)
    if (!client.connected()) {
        reconnectMQTT();
    }
    client.loop(); // Mantener conexión viva

    delay(10);

    // B. CICLO DE LECTURA
    if (millis() - tiempo_ultima_lectura > INTERVALO_LECTURA_MS) {

        avanzar_hora();

        // Lecturas
        float t = dht.readTemperature();
        float h = dht.readHumidity();
        float p = bmp.readPressure() / 100.0F;
        float v = leer_viento_promedio();

        float co2 = 0, alcohol = 0, nh3 = 0;
        bool gas_detectado = false;
        leerMQ135(co2, alcohol, nh3, gas_detectado);

        if (isnan(t)) t = features[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE - 4];
        if (isnan(h)) h = 50.0;
        if (isnan(p)) p = 1013.25;

        // IA
        actualizar_fifo(t, h, v, hora_actual);
        imprimir_buffer_completo(); // Debug visual

        ei_impulse_result_t result = { 0 };
        signal_t features_signal;
        features_signal.total_length = EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE;
        features_signal.get_data = &raw_feature_get_data;

        float prediccion = 0.0;
        if (run_classifier(&features_signal, &result, false) == EI_IMPULSE_OK) {
            prediccion = result.classification[0].value;
        }

        // C. GENERAR Y PUBLICAR JSON
        String json_payload = generar_json(t, h, p, v, prediccion, co2, alcohol, nh3, gas_detectado);

        Serial.println("📡 Publicando a MQTT...");
        Serial.println(json_payload); // Ver en consola

        // Publicar al tópico definido
        // Convertimos String a const char* para la librería
        if (client.publish(MQTT_TOPIC, json_payload.c_str())) {
            Serial.println("✅ Publicación Exitosa");
        } else {
            Serial.println("❌ Falló Publicación");
        }
        Serial.println("=============================================");

        tiempo_ultima_lectura = millis();
    }
}

// =================================================================================
// MQ-135 (CALIBRACIÓN Y LECTURA)
// =================================================================================

void calibrarMQ135() {
    MQ135.setRegressionMethod(1);
    MQ135.setA(110.47); MQ135.setB(-2.862); // Curva CO2 del datasheet (valor inicial, se reasigna en cada lectura)
    MQ135.init();

    Serial.println("🔥 Precalentando MQ135 (60 segundos)...");
    delay(60000);

    Serial.println("⚙️ Calibrando R0...");
    float calcR0 = 0;
    for (int i = 1; i <= 10; i++) {
        MQ135.update();
        calcR0 += MQ135.calibrate(MQ135_RATIO_AIRE_LIMPIO);
        Serial.print(".");
        delay(500);
    }
    MQ135.setR0(calcR0 / 10);
    Serial.println("\n✅ Calibración MQ135 completa.");

    if (isinf(calcR0) || calcR0 == 0) {
        Serial.println("❌ ERROR calibración MQ135. Verificar circuito.");
        while (1);
    }

    Serial.print("R0 calculado: ");
    Serial.println(calcR0 / 10);
}

void leerMQ135(float &co2, float &alcohol, float &nh3, bool &gasDetectado) {
    MQ135.update();

    MQ135.setA(110.47); MQ135.setB(-2.862);
    co2 = MQ135.readSensor() + 400.0; // 400ppm línea base CO2 ambiental

    MQ135.setA(77.255); MQ135.setB(-3.18);
    alcohol = MQ135.readSensor();

    MQ135.setA(102.2); MQ135.setB(-2.473);
    nh3 = MQ135.readSensor();

    gasDetectado = (digitalRead(MQ135_PIN_DO) == LOW);
}

// =================================================================================
// GESTIÓN MQTT
// =================================================================================

void initMQTT() {
    client.setServer(MQTT_SERVER, MQTT_PORT);
    // Aumentamos buffer por si el JSON es grande (seguridad)
    client.setBufferSize(512);
}

void reconnectMQTT() {
    // Loop hasta que reconectemos (solo si hay WiFi)
    if (WiFi.status() != WL_CONNECTED) return;

    Serial.print("Intentando conexión MQTT...");

    // Usamos el device_id como Client ID para que sea único
    if (client.connect(device_id.c_str())) {
        Serial.println("Conectado!");
    } else {
        Serial.print("Falló, rc=");
        Serial.print(client.state());
        Serial.println(" reintentando en 2 segundos");
        // No bloqueamos con while(1) para no detener el anemómetro,
        // pero en este punto es crítico conectar.
    }
}

// =================================================================================
// GENERADOR DE ID (MAC)
// =================================================================================
String obtenerIDUnico() {
    String mac = WiFi.macAddress();
    // Quitamos los dos puntos
    mac.replace(":", "");
    // Devolvemos Prefijo + MAC Completa
    return "UTALCA_" + mac;
}

// =================================================================================
// GENERADOR JSON
// =================================================================================
String generar_json(float t, float h, float p, float v, float pred, float co2, float alcohol, float nh3, bool gas_detectado) {
    JsonDocument doc;
    doc["id"] = device_id; // ID Automática
    doc["timestamp"] = getEpochTime();

    JsonObject d = doc["datos"].to<JsonObject>();
    d["temperatura"] = serialized(String(t, 2));
    d["humedad"] = serialized(String(h, 2));
    d["presionAT"] = serialized(String(p, 1));
    d["velocidadViento"] = serialized(String(v, 1));
    d["prediccionTemp"] = serialized(String(pred, 2));
    d["co2"] = serialized(String(co2, 1));
    d["alcohol"] = serialized(String(alcohol, 1));
    d["nh3"] = serialized(String(nh3, 1));
    d["gasDetectado"] = gas_detectado;

    String output;
    serializeJson(doc, output);
    return output;
}

// =================================================================================
// RESTO DE FUNCIONES (Buffer, WiFi, Time, Anemometro) - IGUAL QUE ANTES
// =================================================================================

void imprimir_buffer_completo() {
    size_t num_pasos = EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE / VARIABLES_POR_MUESTRA;
    Serial.println("\n--- 🔍 BUFFER INTERNO ---");
    Serial.println("IDX | TEMP | HUM  | VIENTO | HORA");
    for (size_t i = 0; i < num_pasos; i++) {
        size_t base = i * VARIABLES_POR_MUESTRA;
        float hr = features[base + 3];
        Serial.printf(" #%02d | %4.1f | %4.1f | %4.1f   | %2.0f:00\n",
                      i, features[base+0], features[base+1], features[base+2], hr);
    }
}

void syncTime() {
    configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
    Serial.print("⏳ Sincronizando Hora");
    struct tm timeinfo;
    while(!getLocalTime(&timeinfo)){ Serial.print("."); delay(500); }
    Serial.println(" OK");
}

int getRealHour() {
    struct tm timeinfo;
    if(getLocalTime(&timeinfo)){ return timeinfo.tm_hour; }
    return 0;
}

void inicializar_buffer_inteligente(float t, float h, float v, int hora_fin_real) {
    int nb = EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE / VARIABLES_POR_MUESTRA;
    for (int i = 0; i < nb; i++) {
        int hc = hora_fin_real - ((nb - 1 - i) * 1);
        while (hc < 0) hc += 24;
        int idx = i * VARIABLES_POR_MUESTRA;
        features[idx+0]=t; features[idx+1]=h; features[idx+2]=v; features[idx+3]=(float)hc;
    }
}

void initWiFi() {
    Serial.print("Conectando WiFi: "); Serial.println(SSID_WIFI);
    WiFi.begin(SSID_WIFI, PASS_WIFI);
    while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
    Serial.println(" OK.");
}

unsigned long getEpochTime() { time_t now; time(&now); return now; }
void IRAM_ATTR contar_pulsos_viento() { pulsos_viento++; }
float leer_viento_promedio() {
    unsigned long t = millis(); unsigned long d = t - tiempo_ultimo_viento; if(d==0)return 0;
    float vel = (pulsos_viento/(d/1000.0))*2.4; pulsos_viento=0; tiempo_ultimo_viento=t; return vel;
}
void actualizar_fifo(float t, float h, float v, int hora) {
    size_t mv = (EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE - VARIABLES_POR_MUESTRA) * sizeof(float);
    memmove(&features[0], &features[VARIABLES_POR_MUESTRA], mv);
    size_t last = EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE - VARIABLES_POR_MUESTRA;
    features[last+0]=t; features[last+1]=h; features[last+2]=v; features[last+3]=(float)hora;
}
void avanzar_hora() { hora_actual++; if(hora_actual > 23) hora_actual = 0; }
int raw_feature_get_data(size_t offset, size_t length, float *out_ptr) {
    memcpy(out_ptr, features + offset, length * sizeof(float)); return 0;
}

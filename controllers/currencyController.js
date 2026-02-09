// Currency Controller - работает с внешним API exchangerate-api.com
const BASE_CURRENCY = "KZT"; // Базовая валюта - казахстанский тенге

// Бесплатный API для курсов валют (не требует ключа)
const API_URL = `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`;

// Кэш для курсов валют (обновляется раз в час)
let cachedRates = null;
let lastFetch = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 час

exports.getRates = async (req, res, next) => {
  try {
    const now = Date.now();
    
    // Проверяем кэш
    if (cachedRates && lastFetch && (now - lastFetch) < CACHE_DURATION) {
      return res.json({
        base: BASE_CURRENCY,
        rates: cachedRates,
        cached: true,
        lastUpdate: new Date(lastFetch).toISOString()
      });
    }

    // Получаем свежие данные с API
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`Currency API error: ${response.status}`);
    }

    const data = await response.json();

    // Сохраняем только нужные валюты
    const rates = {
      USD: data.rates.USD,
      EUR: data.rates.EUR,
      RUB: data.rates.RUB,
      KZT: 1
    };

    // Обновляем кэш
    cachedRates = rates;
    lastFetch = now;

    res.json({
      base: BASE_CURRENCY,
      rates: rates,
      cached: false,
      lastUpdate: new Date(now).toISOString()
    });

  } catch (error) {
    console.error('Currency API error:', error);
    
    // Если есть кэш - возвращаем его даже если устарел
    if (cachedRates) {
      return res.json({
        base: BASE_CURRENCY,
        rates: cachedRates,
        cached: true,
        error: 'Using cached data due to API error',
        lastUpdate: lastFetch ? new Date(lastFetch).toISOString() : null
      });
    }
    
    // Fallback - дефолтные курсы
    res.json({
      base: BASE_CURRENCY,
      rates: {
        USD: 0.0021,
        EUR: 0.0020,
        RUB: 0.21,
        KZT: 1
      },
      cached: false,
      error: 'Using fallback rates',
      lastUpdate: new Date().toISOString()
    });
  }
};

// Конвертация цены
exports.convertPrice = async (req, res) => {
  try {
    const { amount, to } = req.query;
    
    if (!amount || !to) {
      return res.status(400).json({ 
        error: "Bad Request", 
        details: ["amount and to currency required"] 
      });
    }

    const price = parseFloat(amount);
    if (isNaN(price)) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Получаем актуальные курсы
    const now = Date.now();
    if (!cachedRates || !lastFetch || (now - lastFetch) >= CACHE_DURATION) {
      const response = await fetch(API_URL);
      if (response.ok) {
        const data = await response.json();
        cachedRates = {
          USD: data.rates.USD,
          EUR: data.rates.EUR,
          RUB: data.rates.RUB,
          KZT: 1
        };
        lastFetch = now;
      }
    }

    const rate = cachedRates[to.toUpperCase()];
    if (!rate) {
      return res.status(400).json({ 
        error: "Invalid currency", 
        supported: ["USD", "EUR", "RUB", "KZT"] 
      });
    }

    const converted = (price * rate).toFixed(2);

    res.json({
      original: {
        amount: price,
        currency: BASE_CURRENCY
      },
      converted: {
        amount: parseFloat(converted),
        currency: to.toUpperCase()
      },
      rate: rate
    });

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: "Conversion failed" });
  }
};
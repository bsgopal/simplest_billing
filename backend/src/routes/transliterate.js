import express from 'express';
import axios from 'axios';

const router = express.Router();

const itcMap = {
  ta: 'ta-t-i0-und',
  hi: 'hi-t-i0-und',
  te: 'te-t-i0-und',
  kn: 'kn-t-i0-und',
  ml: 'ml-t-i0-und'
};

const cache = new Map();

router.get('/', async (req, res) => {
  try {
    const { text, lang = 'ta' } = req.query;
    if (!text || !text.trim() || lang === 'en') {
      return res.json({ original: text, converted: text });
    }

    const clean = text.trim();
    const itc = itcMap[lang];
    if (!itc) {
      return res.json({ original: clean, converted: clean });
    }

    const cacheKey = `${lang}:${clean.toLowerCase()}`;
    if (cache.has(cacheKey)) {
      return res.json({ original: clean, converted: cache.get(cacheKey) });
    }

    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(clean)}&itc=${itc}&num=3&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`;
    const response = await axios.get(url, { timeout: 4000 });

    if (response.data?.[0] === 'SUCCESS' && response.data[1]?.[0]?.[1]?.[0]) {
      const converted = response.data[1][0][1][0];
      cache.set(cacheKey, converted);
      return res.json({ original: clean, converted });
    }

    return res.json({ original: clean, converted: clean });
  } catch (error) {
    return res.json({ original: req.query.text || '', converted: req.query.text || '' });
  }
});

export default router;

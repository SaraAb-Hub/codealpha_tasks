require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 1. Initialisation d'un cache simple (en mémoire)
const translationCache = {};

app.post("/translate", async (req, res) => {
  const { text, targetLanguage } = req.body;

  if (!text) return res.status(400).json({ error: "Texte manquant" });

  // 2. Vérification du Cache
  const cacheKey = `${text.toLowerCase()}-${targetLanguage}`;
  if (translationCache[cacheKey]) {
    console.log("⚡ [CACHE] Récupération de la traduction sans appel API");
    return res.json({
      translatedText: translationCache[cacheKey],
      source: "cache", // Utile pour ton monitoring
    });
  }

  try {
    const start = Date.now();

    // 3. Appel API avec Instruction de Détection Automatique
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `Tu es un système intelligent de traduction. 
                     Détecte automatiquement la langue source. 
                     Traduis fidèlement en ${targetLanguage}. 
                     Ne renvoie que le texte traduit, sans commentaires.`,
          },
          { role: "user", content: text },
        ],
        temperature: 0.3, // Plus bas pour une traduction plus stable
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const result = response.data.choices[0].message.content.trim();
    const duration = Date.now() - start;

    // 4. Sauvegarde dans le cache pour la prochaine fois
    translationCache[cacheKey] = result;

    console.log(`✅ [API] Traduit en ${duration}ms`);
    res.json({
      translatedText: result,
      source: "api",
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error("Erreur:", error.response?.data || error.message);
    res.status(500).json({ error: "Erreur lors de la traduction" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur actif sur http://localhost:${PORT}`);
});

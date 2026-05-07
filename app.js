async function translateText() {
  // 1. Récupération des éléments
  const recognition = new (
    window.SpeechRecognition || window.webkitSpeechRecognition
  )();
  const inputElement = document.getElementById("text");
  const selectElement = document.getElementById("lang");
  const outputElement = document.getElementById("output");
  const btn = document.getElementById("translateBtn");
  const loader = document.getElementById("loader"); // Le petit cercle tournant
  const btnText = document.getElementById("btnText"); // Le texte "Process Translation"
  const statsInfo = document.getElementById("sourceInfo");
  const timerElement = document.getElementById("timer");

  const textToTranslate = inputElement.value.trim();
  const targetLanguage = selectElement.value;

  if (!textToTranslate) {
    outputElement.innerText = "Veuillez saisir du texte...";
    return;
  }

  // --- NOUVEAU : ACTIVATION DU CHARGEMENT ---
  loader.style.display = "inline-block"; // Affiche le loader
  btnText.style.display = "none"; // Cache le texte
  btn.disabled = true; // Désactive le bouton
  outputElement.style.opacity = "0.5"; // Effet visuel sur l'ancien texte

  try {
    const response = await fetch("http://localhost:3000/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: textToTranslate,
        targetLanguage: targetLanguage,
      }),
    });

    const data = await response.json();

    if (data.translatedText) {
      outputElement.innerText = data.translatedText;

      // Mise à jour des infos de performance
      statsInfo.innerText = `Status: ${data.source === "cache" ? "⚡ Cached" : "🌐 Neural API"}`;
      if (data.duration) timerElement.innerText = `⏱️ ${data.duration}`;

      // SAUVEGARDE DANS L'HISTORIQUE (la fonction que nous avons créée)
      saveToHistory(textToTranslate, data.translatedText);
    } else {
      outputElement.innerText = "Erreur : " + (data.error || "Problème API");
    }
  } catch (error) {
    console.error("Erreur Fetch:", error);
    outputElement.innerText = "Erreur : Impossible de joindre le serveur.";
  } finally {
    // --- NOUVEAU : DÉSACTIVATION DU CHARGEMENT ---
    loader.style.display = "none";
    btnText.style.display = "inline-block";
    btn.disabled = false;
    outputElement.style.opacity = "1";
  }
}

/** * AMÉLIORATIONS SUPPLÉMENTAIRES
 */

// --- 🎤 RECONNAISSANCE VOCALE ---
function startVoice() {
  const recognition = new (
    window.SpeechRecognition || window.webkitSpeechRecognition
  )();

  // Configuration Pro
  recognition.lang = "fr-FR";
  recognition.interimResults = false; // N'affiche que le résultat final
  recognition.maxAlternatives = 1;

  const micBtn = document.getElementById("micBtn");
  const textArea = document.getElementById("text");

  recognition.onstart = () => {
    micBtn.classList.add("mic-active");
    console.log("Listening...");
  };

  recognition.onresult = (event) => {
    // Récupération précise du texte
    const transcript = event.results[0][0].transcript;
    console.log("Transcript found:", transcript);

    // Injection directe
    textArea.value = transcript;

    // Forcer le focus pour simuler une saisie utilisateur
    textArea.focus();
  };

  recognition.onerror = (event) => {
    console.error("Speech Error:", event.error);
    micBtn.classList.remove("mic-active");
  };

  recognition.onend = () => {
    micBtn.classList.remove("mic-active");
    console.log("Microphone closed.");
  };

  // Lancement
  recognition.start();
}

// --- 🕒 GESTION DE L'HISTORIQUE ---
function saveToHistory(original, translated) {
  let history = JSON.parse(localStorage.getItem("tr_history") || "[]");
  history.unshift({
    original,
    translated,
    date: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  history = history.slice(0, 5);
  localStorage.setItem("tr_history", JSON.stringify(history));
  displayHistory();
}

function displayHistory() {
  const list = document.getElementById("history-list");
  const history = JSON.parse(localStorage.getItem("tr_history") || "[]");
  if (history.length === 0) return;

  list.innerHTML = history
    .map(
      (item) => `
        <div class="history-item">
            <div style="color: var(--text-dim); font-size: 10px;">${item.date}</div>
            <div><strong>In:</strong> ${item.original}</div>
            <div style="color: var(--primary);"><strong>Out:</strong> ${item.translated}</div>
        </div>
    `,
    )
    .join("");
}

// --- 🔊 SYNTHÈSE VOCALE ---
function speakText() {
  const text = document.getElementById("output").innerText;
  if (text && text !== "Output will appear here...") {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }
}

// --- 📋 COPIER LE TEXTE ---
function copyText() {
  const text = document.getElementById("output").innerText;
  if (text && text !== "Output will appear here...") {
    navigator.clipboard.writeText(text).then(() => {
      alert("Copié !");
    });
  }
}

// Charger l'historique dès l'ouverture de la page
window.onload = displayHistory;

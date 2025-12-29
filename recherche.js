document.addEventListener("DOMContentLoaded", () => {
  const chatBubble = document.getElementById('chatBubble');
const chatInput = document.getElementById('chatInput');

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  const p = document.createElement('p');
  p.textContent = text;
  chatBubble.appendChild(p);

  // Scroll automatique vers le bas pour voir le dernier message
  chatBubble.scrollTop = chatBubble.scrollHeight;

  chatInput.value = '';
}

  const bubble = document.getElementById("chat-bubble");
  const input = document.getElementById("user-input");
  const button = document.getElementById("send-btn");
  
  let isTyping = false;
  let menumode = false;
  let typingInterval = null;
  let navigationMode = false;
  let adviceMode = null; // null ou le plat suggéré
  
  const plats = ["pizza", "tacos", "panini", "burger", "sandwich"];

  const promotions = {
    pizza: ["Pizza Margherita -20%", "Pizza Pepperoni -15%"],
    burger: ["Burger Cheese -10%"],
    panini: ["Panini Jambon -5%"],
    tacos: ["Tacos Poulet -15%"],
    sandwich: ["Sandwich Thon -10%"]
  };

  const nouveaux = {
    pizza: ["Pizza Mexicaine"],
    burger: ["Burger Vegan"],
    panini: ["Panini Poulet Curry"],
    tacos: ["Tacos Kebab"],
    sandwich: ["Sandwich Club"]
  };

  const dynamicRules = [];
  const savedRules = localStorage.getItem("rules");
  if (savedRules) dynamicRules.push(...JSON.parse(savedRules));

  const platConseil = {
    pizza: "Je te suggère une Pizza Pepperoni 🍕",
    burger: "Je te suggère un Burger Cheese 🍔",
    panini: "Je te suggère un Panini Poulet Curry 🥪",
    tacos: "Je te suggère un Tacos Kebab 🌮",
    sandwich: "Je te suggère un Sandwich Club 🥪"
  };

  const platExplication = {
    pizza: "La Pizza Pepperoni est délicieuse car elle combine fromage fondant et pepperoni épicé. Tu peux aussi essayer la Margherita ou la Quattro Formaggi.",
    burger: "Le Burger Cheese est classique et savoureux, parfait pour un repas rapide. Tu peux aussi tester le Burger Vegan ou le Bacon Burger.",
    panini: "Le Panini Poulet Curry a un goût unique grâce au curry, idéal pour un déjeuner gourmand. Tu peux aussi essayer le Panini Jambon ou le Panini Végé.",
    tacos: "Le Tacos Kebab est croustillant et relevé, parfait pour les amateurs de saveurs épicées. Tu peux aussi tester le Tacos Poulet ou Tacos Vegan.",
    sandwich: "Le Sandwich Club est un classique équilibré, avec poulet, bacon et légumes. Tu peux aussi essayer le Sandwich Thon ou Jambon Fromage."
  };

  function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- N-GRAMS ----------
function getNGrams(str, n = 3) {
  const grams = [];
  for (let i = 0; i <= str.length - n; i++) {
    grams.push(str.slice(i, i + n));
  }
  return grams;
}

// ---------- COSINE SIMILARITY ----------
function cosineSimilarity(a, b) {
  const freqA = {};
  const freqB = {};

  a.forEach(x => freqA[x] = (freqA[x] || 0) + 1);
  b.forEach(x => freqB[x] = (freqB[x] || 0) + 1);

  let dot = 0, magA = 0, magB = 0;

  for (const k in freqA) {
    if (freqB[k]) dot += freqA[k] * freqB[k];
    magA += freqA[k] ** 2;
  }
  for (const k in freqB) magB += freqB[k] ** 2;

  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

// ---------- LEVENSHTEIN ----------
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) =>
      i === 0 ? j : j === 0 ? i : 0
    )
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

// ---------- IS SIMILAR (VERSION PRO) ----------
function isSimilar(input, target) {
  const a = normalize(input);
  const b = normalize(target);

  if (!a || !b) return false;

  // 1️⃣ inclusions rapides
  if (a.includes(b) || b.includes(a)) return true;

  // 2️⃣ n-grams + cosine
  const gramsA = getNGrams(a);
  const gramsB = getNGrams(b);
  const cosine = cosineSimilarity(gramsA, gramsB);

  // 3️⃣ Levenshtein normalisé
  const lev = levenshtein(a, b);
  const levScore = 1 - lev / Math.max(a.length, b.length);

  // 4️⃣ Score final pondéré
  const finalScore = (cosine * 0.6) + (levScore * 0.4);

  return finalScore >= 0.55;
}


  function showMessage(message) {
    if (typingInterval) clearInterval(typingInterval);
    bubble.textContent = "";
    let i = 0;
    isTyping = true;
    typingInterval = setInterval(() => {
      bubble.textContent += message[i];
      i++;
      if (i >= message.length) {
        clearInterval(typingInterval);
        typingInterval = null;
        isTyping = false;
      }
    }, 40);
  }

  const introMessages = [
    "Bonjour 👋",
    "Comment ça va aujourd’hui ?",
    "Que puis-je faire pour toi ?",
    "Écris ta demande ci-dessous 👇"
  ];

  let introIndex = 0;
  function playIntro() {
    if (introIndex >= introMessages.length) return;
    showMessage(introMessages[introIndex]);
    introIndex++;
    setTimeout(playIntro, 1800);
  }
  playIntro();
  
  function getResponse(msg) {
      msg = msg.toLowerCase();
    // ---- AJOUT / MODIF / SUPPRESSION / VOIR RÈGLES ----
        if (msg.startsWith("si on te dit")) {
      const match = msg.match(/si on te dit (.+) répond: (.+)/i);
      if (!match) return "Syntaxe incorrecte.";
      const keywords = match[1].split(",").map(k => k.trim());
      const response = match[2].trim();
      dynamicRules.push({ keywords, response });
      localStorage.setItem("rules", JSON.stringify(dynamicRules));
      return "Règle enregistrée ✅";
    }
    if (msg.startsWith("modifie règle")) {
      const match = msg.match(/modifie règle : (.+) répond: (.+)/i);
      if (!match) return "Syntaxe incorrecte.";
      const keywords = match[1].split(",").map(k => k.trim());
      const newResponse = match[2].trim();
      const rule = dynamicRules.find(r => r.keywords.length === keywords.length && r.keywords.every(k => keywords.includes(k)));
      if (!rule) return "Règle introuvable ❌";
      rule.response = newResponse;
      localStorage.setItem("rules", JSON.stringify(dynamicRules));
      return "Règle modifiée ✏️";
    }
    if (msg.startsWith("supprime règle")) {
      const match = msg.match(/supprime règle : (.+)/i);
      if (!match) return "Syntaxe incorrecte.";
      const keyword = match[1].trim();
      const before = dynamicRules.length;
      const filtered = dynamicRules.filter(r => !r.keywords.includes(keyword));
      if (filtered.length === before) return "Aucune règle trouvée.";
      dynamicRules.length = 0;
      dynamicRules.push(...filtered);
      localStorage.setItem("rules", JSON.stringify(dynamicRules));
      return "Règle supprimée 🗑️";
    }
    if (msg === "voir règles") {
      if (!dynamicRules.length) return "Aucune règle enregistrée.";
      return dynamicRules.map((r,i)=>`${i+1}. ${r.keywords.join(", ")} → ${r.response}`).join("\n");
    }
    // ---- STOP ----
    if (isSimilar(msg, "stop")) {
      navigationMode = false;
      adviceMode = null;
      if (typingInterval) clearInterval(typingInterval);
      bubble.textContent = "D’accord 👍";
      return null;
    }
    // ---- MODE ARGUMENTATION ----
    if (adviceMode && (msg.includes("pourquoi") || msg.includes("similaire"))) {
      const explanation = platExplication[adviceMode];
      adviceMode = null;
      return explanation;
    }

    // ---- DEMANDE DE NAVIGATION ----
    if (msg.includes("naviguer") || msg.includes("aide moi naviguer")) {
      navigationMode = true;
      return "Bien sûr 😊\nOù veux-tu aller ?\n• home\n• menu\n• point de vente";
    }

    // ---- MODE NAVIGATION ACTIF ----
    if (navigationMode) {
      if (msg.includes("home")) { navigationMode = false; window.location.href = "home.html"; return "Redirection vers la page Home 🏠"; }
      if (msg.includes("menu")) { navigationMode = false; window.location.href = "menu.html"; return "Ouverture du menu 📋"; }
      if (msg.includes("point de vente")) { navigationMode = false; window.location.href = "points.html"; return "Voici nos points de vente 📍"; }
      if (msg.includes("annule") || msg.includes("laisse tomber") || msg.includes("non")) { navigationMode = false; return "Comme tu veux 🙂"; }
      return "Choisis : home, menu ou point de vente 🙂";
    }

    
    // ---- SALUTATIONS ----
    if (isSimilar(msg, "bonjour") || isSimilar(msg, "salut")) return "Bonjour 😄 Comment puis-je t’aider ?";
    if (isSimilar(msg, "merci")) return "Avec plaisir 🙏";
    if (isSimilar(msg, "désolé") || isSimilar(msg, "desole")) return "Pas de souci 😊";

    // ---- HISTOIRE ----
    if (isSimilar(msg, "histoire") || isSimilar(msg, "extrapizza")) return "Extrapizza est née en 1995 avec la passion de bien nourrir tout le monde 🍕";

    if (!menumode && (msg.includes("commande") || isSimilar(msg, "menu"))) {
        menumode = true;
        return "Voir notre menu ?";
    }

    if (menumode) {
        if (msg.includes("oui")) {
            menumode = false;
            setTimeout(() => {
                window.location.href = "menu.html";
            }, 500);
            return "Très bien, redirection...";
        }

        if (
            msg.includes("non") ||
            isSimilar(msg, "laisse") ||
            isSimilar(msg, "tomber")
        ) {
            menumode = false;
            return "Bien, une autre requête alors ?";
        }

        return "Souhaitez-vous voir le menu ou passer commande ?";
    }
    // ---- CONSEIL PLAT ----
    for (const p of plats) {
      if (isSimilar(msg, p) || msg.includes("suggere") || msg.includes("conseil") || msg.includes("manger")) {
        adviceMode = p;
        return platConseil[p];
      }
    }
    // ---- PROMO / NOUVEAU ----
    if (msg.includes("promotion") || msg.includes("promo") || msg.includes("nouveau") || msg.includes("nouveaux")) {
      let res = "";
      for (const p of plats) {
        if (msg.includes(p)) {
          if (msg.includes("promotion") || msg.includes("promo")) res += `Promo ${p} : ${promotions[p].join(", ")}\n`;
          if (msg.includes("nouveau") || msg.includes("nouveaux")) res += `Nouveau ${p} : ${nouveaux[p].join(", ")}\n`;
        }
      }
      return res || "Voici nos offres actuelles disponibles 👌";
    }

    // ---- RÈGLES DYNAMIQUES ----
    for (const rule of dynamicRules) {
      if (rule.keywords.some(k => isSimilar(msg, k))) return rule.response;
    }

    return "Je ne sais pas encore répondre à ça 🤔";
  }

  function handleInput() {
    const text = input.value.trim();
    if (!text) return;
    const reply = getResponse(text);
    input.value = "";
    if (reply) showMessage(reply);
  }

  button.addEventListener("click", handleInput);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") handleInput();
  });

});


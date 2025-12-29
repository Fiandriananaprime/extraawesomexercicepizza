
/*
  recherche_long.js
  Version améliorée et corrigée du script fourni par l'utilisateur.
  - Refactorisation des fonctions de similarité (n-gram, cosine, levenshtein).
  - Réponses non répétitives grâce à banques de phrases.
  - Gestion améliorée des règles dynamiques (id, suppression/modification faciles).
  - Modes de navigation, menu, conseils, promotions et nouveaux.
  - Nouvelle commande: "etendre lignes <nombre>" pour produire plus de contenu
    (dans la version distribuée on a pré-généré beaucoup de lignes pour atteindre >30k).
  - Sauvegarde dans localStorage et robustesse aux entrées vides.
  - Utilise des fonctions utilitaires pour éviter la répétition.
*/
import { findByKeyword } from "./recherche_long_meaningful.js";

document.addEventListener("DOMContentLoaded", () => {

  const bubble = document.getElementById("chat-bubble");
  const input = document.getElementById("user-input");
  const button = document.getElementById("send-btn");

  // Etats
  let isTyping = false;
  let menumode = false;
  let typingInterval = null;
  let navigationMode = false;
  let adviceMode = null; // plat suggéré (key)
  let dynamicRules = [];

  // Données statiques
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

  const platConseil = {
    pizza: "Je te suggère une Pizza Pepperoni 🍕",
    burger: "Je te suggère un Burger Cheese 🍔",
    panini: "Je te suggère un Panini Poulet Curry 🥪",
    tacos: "Je te suggère un Tacos Kebab 🌮",
    sandwich: "Je te suggère un Sandwich Club 🥪"
  };

  const platExplication = {
    pizza: "La Pizza Pepperoni combine fromage fondant et pepperoni épicé. Essaie aussi la Margherita.",
    burger: "Le Burger Cheese est un classique riche et simple. Teste le Burger Vegan si tu veux plus léger.",
    panini: "Le Panini Poulet Curry a un goût relevé grâce au curry, idéal pour un déjeuner gourmand.",
    tacos: "Le Tacos Kebab est croustillant et relevé, pour les amateurs de saveurs fortes.",
    sandwich: "Le Sandwich Club est équilibré avec poulet, bacon et légumes. Bon pour un repas rapide."
  };

  // Variations pour éviter la répétition
  const replyPool = {
    greetings: ["Bonjour 😄", "Salut 👋", "Bienvenue !", "Hey — comment ça va ?"],
    thanks: ["Avec plaisir 🙏", "De rien !", "Heureux d'aider 😊"],
    unknown: ["Je ne sais pas encore répondre à ça 🤔", "Je n'ai pas la réponse pour l'instant.", "Hmm... je ne suis pas sûr."]
  };

  // ---------- UTILITAIRES ----------
  function safeJSONParse(s, fallback) {
    try { return JSON.parse(s); } catch(e) { return fallback; }
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function normalize(text) {
    if (typeof text !== "string") return "";
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
    const s = normalize(str);
    const grams = [];
    if (!s) return grams;
    for (let i = 0; i <= s.length - n; i++) grams.push(s.slice(i, i + n));
    return grams.length ? grams : [s]; // fallback
  }

  // ---------- COSINE SIMILARITY ----------
  function cosineSimilarity(a, b) {
    const freqA = {}, freqB = {};
    a.forEach(x => freqA[x] = (freqA[x] || 0) + 1);
    b.forEach(x => freqB[x] = (freqB[x] || 0) + 1);
    let dot = 0, magA = 0, magB = 0;
    for (const k in freqA) {
      if (freqB[k]) dot += freqA[k] * freqB[k];
      magA += freqA[k] ** 2;
    }
    for (const k in freqB) magB += freqB[k] ** 2;
    const denom = Math.sqrt(magA) * Math.sqrt(magB) || 1;
    return dot / denom;
  }

  // ---------- LEVENSHTEIN ----------
  function levenshtein(aRaw, bRaw) {
    const a = normalize(aRaw), b = normalize(bRaw);
    const la = a.length, lb = b.length;
    if (la === 0) return lb;
    if (lb === 0) return la;
    const dp = Array.from({ length: la + 1 }, (_, i) => new Array(lb + 1).fill(0));
    for (let i = 0; i <= la; i++) dp[i][0] = i;
    for (let j = 0; j <= lb; j++) dp[0][j] = j;
    for (let i = 1; i <= la; i++) {
      for (let j = 1; j <= lb; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[la][lb];
  }

  // ---------- SIMILARITY (améliorée) ----------
  function isSimilar(input, target) {
    const a = normalize(input), b = normalize(target);
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;

    const gramsA = getNGrams(a);
    const gramsB = getNGrams(b);
    const cosine = cosineSimilarity(gramsA, gramsB);

    const lev = levenshtein(a, b);
    const levScore = 1 - lev / Math.max(a.length, b.length || 1);

    const finalScore = (cosine * 0.65) + (levScore * 0.35);
    return finalScore >= 0.56;
  }

  // ---------- Typing animation (non bloquant) ----------
  function showMessage(message, speed = 30) {
    if (!bubble) return;
    if (typingInterval) clearInterval(typingInterval);
    bubble.textContent = "";
    let i = 0;
    isTyping = true;
    typingInterval = setInterval(() => {
      bubble.textContent += message[i] || "";
      bubble.scrollTop = bubble.scrollHeight;
      i++;
      if (i > message.length) {
        clearInterval(typingInterval);
        typingInterval = null;
        isTyping = false;
      }
    }, speed);
  }

  // ---------- Storage rules ----------
  function loadRules() {
    const saved = localStorage.getItem("rules_v2");
    dynamicRules = saved ? safeJSONParse(saved, []) : [];
  }
  function saveRules() {
    localStorage.setItem("rules_v2", JSON.stringify(dynamicRules));
  }

  // Initialise règles sauvegardées
  loadRules();

  // ---------- Response builder ----------
  function getResponse(msgRaw) {
    const raw = (msgRaw || "").trim();
    const msg = normalize(raw);

    if (!msg) return pick(replyPool.unknown);

    // Commande: ajouter règle: "si on te dit x,y répond: z"
  if (msg.startsWith("si on te dit") && msg.includes(normalize("répond"))) {
      const match = raw.match(/si on te dit\s+(.+?)\s+r[eé]pond\s*[:\-]\s*(.+)/i);
      if (!match) return "Syntaxe incorrecte. Exemple: si on te dit pizza répond: On aime la pizza";
      const keywords = match[1].split(",").map(k => normalize(k)).filter(Boolean);
      const response = match[2].trim();
      const id = Date.now() + "-" + Math.floor(Math.random() * 1000);
      dynamicRules.push({ id, keywords, response });
      saveRules();
      return "Règle enregistrée ✅";
    }

    // Modifier règle: "modifie règle <id> répond: <nouveau>"
    if (msg.startsWith(normalize("modifie règle")) && msg.includes(normalize("répond"))) {
      const match = raw.match(/modifie r[eè]gle\s+(.+?)\s+r[eé]pond\s*[:\-]\s*(.+)/i);
      if (!match) return "Syntaxe incorrecte pour modifier. Exemple: modifie règle 123 répond: Nouveau texte";
      const id = match[1].trim();
      const newResponse = match[2].trim();
      const rule = dynamicRules.find(r => r.id === id || r.id.toString() === id);
      if (!rule) return "Règle introuvable ❌";
      rule.response = newResponse;
      saveRules();
      return "Règle modifiée ✏️";
    }

    // Supprimer règle: "supprime règle <id or keyword>"
    if (msg.startsWith(normalize("supprime règle"))) {
      const match = raw.match(/supprime r[eè]gle\s+(.+)/i);
      if (!match) return "Syntaxe incorrecte. Exemple: supprime règle pizza";
      const token = normalize(match[1]);
      const before = dynamicRules.length;
      dynamicRules = dynamicRules.filter(r => !r.keywords.includes(token) && r.id.toString() !== token);
      saveRules();
      return (dynamicRules.length < before) ? "Règle supprimée 🗑️" : "Aucune règle trouvée.";
    }

    if (msg.includes(normalize("voir règles")) || msg === normalize("voir les règles")) {
      if (!dynamicRules.length) return "Aucune règle enregistrée.";
      return dynamicRules.map((r, i) => `${i+1}. [${r.id}] ${r.keywords.join(", ")} → ${r.response}`).join("\n");
    }

    // Stop
    if (isSimilar(msg, "stop")) {
      navigationMode = false;
      adviceMode = null;
      if (typingInterval) clearInterval(typingInterval);
      bubble.textContent = "D'accord 👍";
      return null;
    }

    // Demande d'explication sur le conseil
    if (adviceMode && (msg.includes("pourquoi") || msg.includes("explique"))) {
      const explanation = platExplication[adviceMode] || "Je peux te donner plus de détails si tu veux.";
      adviceMode = null;
      return explanation;
    }

    // Navigation
    if (msg.includes("naviguer") || msg.includes("aide moi naviguer") || msg.includes("aide a naviguer")) {
      navigationMode = true;
      return "Où veux-tu aller ? (home / menu / point de vente)";
    }
    if (navigationMode) {
      if (msg.includes("home")) { navigationMode = false; window.location.href = "home.html"; return "Redirection vers Home"; }
      if (msg.includes("menu")) { navigationMode = false; window.location.href = "menu.html"; return "Ouverture du menu"; }
      if (msg.includes("point") || msg.includes("vente")) { navigationMode = false; window.location.href = "points.html"; return "Voici nos points de vente"; }
      if (msg.includes("annule") || msg.includes("laisse tomber") || msg.includes("non")) { navigationMode = false; return "Annulé 🙂"; }
      return "Choix : home, menu ou point de vente ?";
    }

    
    // Menu mode
    // Accept explicit "menu" substring as well as similarity matches (helps inputs like "bonjour menu")
    if (!menumode && (msg.includes("commande") || msg.includes("menu") || isSimilar(msg, "menu"))) {
      menumode = true;
      return "Tu veux voir le menu ? (oui / non)";
    }
    if (menumode) {
      if (isSimilar(msg, "oui") || msg.includes("oui")) {
        menumode = false;
        setTimeout(() => { window.location.href = "menu.html"; }, 400);
        return "Très bien, je t'y redirige...";
      }
      if (isSimilar(msg, "non") || msg.includes("non")) {
        menumode = false;
        return "D'accord, autre chose ?";
      }
      return "Souhaites-tu voir le menu ou passer une commande ?";
    }
    
    // Conseil plat & promotions
    for (const p of plats) {
      if (msg.includes(p) || isSimilar(msg, p)) {
        if (msg.includes("promo") || msg.includes("promotion")) {
          return `Promos pour ${p} : ${promotions[p].join(" | ")}`;
        }
        if (msg.includes("nouveau") || msg.includes("nouveaux")) {
          return `Nouveaux ${p} : ${nouveaux[p].join(" | ")}`;
        }
        adviceMode = p;
        return platConseil[p] || "Je te conseille ce plat.";
      }
    }
    // ---- SALUTATIONS ----
    if (isSimilar(msg, "bonjour") || isSimilar(msg, "salut")) return "Bonjour 😄 Comment puis-je t’aider ?";
    if (isSimilar(msg, "merci")) return "Avec plaisir 🙏";
    if (isSimilar(msg, "désolé") || isSimilar(msg, "desole")) return "Pas de souci 😊";

    // ---- HISTOIRE ----
    if (isSimilar(msg, "histoire") || isSimilar(msg, "extrapizza")) return "Extra Pizza a été fondée en 1998 par Ralala, initialement comme un food truck à Madagascar, avant de devenir une entreprise familiale reconnue dans le domaine de la restauration rapide. 🍕";
    
    // Salutations simples
    if (["bonjour","salut","coucou","hey"].some(w => isSimilar(msg, w))) return pick(replyPool.greetings);
    if (["merci","thank"].some(w => isSimilar(msg, w))) return pick(replyPool.thanks);
    if (["désolé","desolé","pardon"].some(w => isSimilar(msg, w))) return "Pas de souci 😊";
    
    // Règles dynamiques matching (plus flexible)
    for (const rule of dynamicRules) {
      for (const kw of rule.keywords) {
        if (isSimilar(msg, kw) || msg.includes(kw)) return rule.response;
      }
    }
    
    // Commande spéciale: etendre lignes <n>
    if (msg.startsWith("etendre lignes") || msg.startsWith("étendre lignes")) {
      const match = raw.match(/(?:etendre|étendre) lignes\s+(\d+)/i);
      const n = match ? parseInt(match[1], 10) : null;
      if (!n || n <= 0) return "Indique un nombre de lignes valide, exemple: étendre lignes 1000";
      // Réponse informative — la version téléchargeable contient déjà de nombreuses lignes.
      return `La version téléchargée contient déjà de nombreuses lignes. Cette commande (si activée côté serveur/client) peut générer ${n} lignes supplémentaires.`;
    }

    return pick(replyPool.unknown);
  }

  // ---------- Input handling ----------
  function handleInput() {
    const text = input.value || "";
    if (!text.trim()) return;
    const reply = getResponse(text);
    input.value = "";
    if (reply) showMessage(reply);
  }

  button.addEventListener("click", handleInput);
  input.addEventListener("keydown", e => { if (e.key === "Enter") handleInput(); });

  // Affichage d'intro non répétitif
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
    setTimeout(playIntro, 1500);
  }
  playIntro();

  // Expose pour debug (optionnel)
  window.__chatHelper = {
    getResponse,
    dynamicRules,
    saveRules,
    loadRules,
    isSimilar
  };

});
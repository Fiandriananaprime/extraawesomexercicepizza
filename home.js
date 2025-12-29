document.querySelectorAll(".elements").forEach(btn => {
    btn.addEventListener("click", () => {
        // Récupérer l'objet existant dans localStorage
        let state = JSON.parse(localStorage.getItem("checkboxStates") || "{}");
        // Ajouter/modifier l'état
        state[btn.dataset.target] = true; // true = checked
        // Sauvegarder
        localStorage.setItem("checkboxStates", JSON.stringify(state));
    });
});
localStorage.setItem("test", "ok");
console.log(localStorage.getItem("test"));

const states = JSON.parse(localStorage.getItem("checkboxStates") || "{}");

Object.keys(states).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = states[id]; // coche si true
});

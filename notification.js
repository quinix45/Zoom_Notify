const params = new URLSearchParams(window.location.search);

document.getElementById("sender").textContent = params.get("sender") ?? "Unknown";
document.getElementById("text").textContent   = params.get("text")   ?? "";

const DURATION = 5000;
const FADE     = 400;

setTimeout(() => {
	document.body.classList.add("fade-out");
	setTimeout(() => window.close(), FADE);
}, DURATION - FADE);

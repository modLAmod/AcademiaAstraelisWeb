function loginDiscord() {
    // Simulación de login
    localStorage.setItem("user", JSON.stringify({
        name: "Usuario Discord",
        provider: "discord"
    }));
    window.location.href = "dashboard.html";
}

function loginSteam() {
    localStorage.setItem("user", JSON.stringify({
        name: "Usuario Steam",
        provider: "steam"
    }));
    window.location.href = "dashboard.html";
}

// Protección de rutas
function checkAuth() {
    const user = localStorage.getItem("user");
    if (!user) window.location.href = "index.html";
}

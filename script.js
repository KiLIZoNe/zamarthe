document.addEventListener("DOMContentLoaded", function() {
    const discoverButton = document.getElementById("discover-button");

    if (discoverButton) {
        discoverButton.addEventListener("click", function() {
            const target = document.getElementById("philosophy");
            if (target) {
                target.scrollIntoView({ behavior: "smooth" });
            }
        });
    }
});

(function () {
    window.NAYMARK = window.NAYMARK || {};

    window.NAYMARK.loadGoogle = function () {
        return new Promise((resolve, reject) => {
            // Already loaded
            if (window.google?.maps?.places?.Autocomplete) return resolve();

            const apiKey =
                localStorage.getItem("NAYMARK_GOOGLE_API_KEY") ||
                new URLSearchParams(location.search).get("api_key");

            if (!apiKey) return reject("Missing Google API key");

            const script = document.createElement("script");
            script.src =
                "https://maps.googleapis.com/maps/api/js?key=" +
                apiKey +
                "&libraries=places&language=he&region=IL&v=weekly";
            script.async = true;

            script.onload = () => resolve();
            script.onerror = () => reject("Google API load failed");

            document.head.appendChild(script);
        });
    };
})();

window.NAYMARK = window.NAYMARK || {};

window.NAYMARK.initAutocomplete = function (inputEl, callback) {
    if (!window.google || !google.maps.places.Autocomplete) {
        console.error("Google Places API not loaded");
        return;
    }

    const autocomplete = new google.maps.places.Autocomplete(inputEl, {
        fields: ["address_components", "formatted_address"],
        types: ["address"],
        componentRestrictions: { country: "il" }
    });

    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const parsed = window.NAYMARK.parseAddress(place);
        callback(parsed);
    });
};

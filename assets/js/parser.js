window.NAYMARK = window.NAYMARK || {};

window.NAYMARK.parseAddress = function (place) {
    const result = {
        street: "",
        house: "",
        city: "",
        zip: ""
    };

    if (!place || !place.address_components) return result;

    const components = place.address_components;

    for (let c of components) {
        const types = c.types;

        if (types.includes("route")) result.street = c.long_name;
        if (types.includes("street_number")) result.house = c.long_name;
        if (types.includes("locality")) result.city = c.long_name;
        if (types.includes("postal_code")) result.zip = c.long_name;
        if (types.includes("postal_code_prefix")) result.zip = c.long_name;
    }

    return result;
};

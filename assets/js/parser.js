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
        
        // Город - проверяем несколько вариантов
        if (types.includes("locality")) {
            result.city = c.long_name;
        } else if (types.includes("sublocality") && !result.city) {
            result.city = c.long_name;
        } else if (types.includes("administrative_area_level_2") && !result.city) {
            result.city = c.long_name;
        }
        
        // Почтовый индекс - проверяем все возможные варианты
        if (types.includes("postal_code")) {
            result.zip = c.long_name;
        } else if (types.includes("postal_code_prefix") && !result.zip) {
            result.zip = c.long_name;
        }
    }
    
    // Если zip не найден в components, пытаемся извлечь из formatted_address
    if (!result.zip && place.formatted_address) {
        // Ищем паттерн израильского почтового индекса (7 цифр)
        const zipMatch = place.formatted_address.match(/\b(\d{7})\b/);
        if (zipMatch) {
            result.zip = zipMatch[1];
        } else {
            // Пытаемся найти 5-значный код
            const zipMatch5 = place.formatted_address.match(/\b(\d{5})\b/);
            if (zipMatch5) {
                result.zip = zipMatch5[1];
            }
        }
    }

    return result;
};

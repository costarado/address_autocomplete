window.NAYMARK = window.NAYMARK || {};

window.NAYMARK.UI = {
    setValue(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val || "";
    },

    getValue(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : "";
    }
};

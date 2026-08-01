/**
 * Naymark Field Library
 * Центральная библиотека API-names для Zoho CRM полей адресов.
 *
 * Поддержка:
 * - Contacts: Mailing / Other
 * - SalesOrders: Billing / Shipping
 *
 * Важно:
 * - Для некоторых полей могут быть разные API-name в разных модулях (например Entry(H)).
 *   Поэтому тут кандидаты в виде массива: выбирай тот, который реально существует.
 */

(function (w) {
  const FIELD_LIBRARY = {
    Contacts: {
      mailing: {
        street_he: ["Mailing_Street"],
        street_en: ["Mailing_Street_E"],
        city_he:   ["Mailing_City"],
        city_en:   ["Mailing_City_E"],
        house:     ["House"],
        entry_he:  ["Entry_H", "Entry"],
        entry_en:  ["Entry_E"],
        apt:       ["Apt"],
        zip:       ["Mailing_Zip"],
        country:   ["Mailing_Country"],
      },

      other: {
        street_he: ["Other_Street"],
        street_en: ["Other_Street_E"],
        city_he:   ["Other_City"],
        city_en:   ["Other_City_E"],
        house:     ["Other_House"],
        entry_he:  ["Other_Entry_H", "Other_Entry"],
        entry_en:  ["Other_Entry_E"],
        apt:       ["Other_Apt"],
        zip:       ["Other_Zip"],
        country:   ["Other_Country"],
      },
    },

    SalesOrders: {
      billing: {
        street_he: ["Billing_Street"],
        street_en: ["Billing_Street_E"],
        city_he:   ["Billing_City"],
        city_en:   ["Billing_City_E"],
        house:     ["House"],
        entry_he:  ["Entry_H"],
        entry_en:  ["Entry_E"],
        apt:       ["Apt"],
        zip:       ["Billing_Code", "Billing_Zip"],
        country:   ["Billing_Country"],
      },

      shipping: {
        street_he: ["Shipping_Street"],
        street_en: ["Shipping_Street_E"],
        city_he:   ["Shipping_City"],
        city_en:   ["Shipping_City_E"],
        house:     ["Shipping_House"],
        entry_he:  ["Shipping_Entry_H"],
        entry_en:  ["Shipping_Entry_E"],
        apt:       ["Shipping_APT"],
        zip:       ["Shipping_Code", "Shipping_Zip"],
        country:   ["Shipping_Country"],
      },
    },
  };

  function detectContext() {
    const file = (location.pathname.split("/").pop() || "").toLowerCase();
    if (file.includes("contacts") && file.includes("mail")) return { module: "Contacts", target: "mailing" };
    if (file.includes("contacts") && file.includes("other")) return { module: "Contacts", target: "other" };
    if (file.includes("salesorders") && file.includes("bill")) return { module: "SalesOrders", target: "billing" };
    if (file.includes("salesorders") && file.includes("ship")) return { module: "SalesOrders", target: "shipping" };
    return { module: "Contacts", target: "mailing" };
  }

  function getMapping(moduleName, target) {
    const m = FIELD_LIBRARY[moduleName];
    if (!m) return null;
    return m[target] || null;
  }

  w.NAYMARK_FIELD_LIB = {
    FIELD_LIBRARY,
    detectContext,
    getMapping,
  };
})(window);

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
 * - В Zoho REST/Widget API модуль заказов = "Sales_Orders" (не "SalesOrders").
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
        house:     ["Billing_House", "House"],
        entry_he:  ["Billing_Entry_H", "Billing_Entry", "Entry_H", "Entry"],
        entry_en:  ["Billing_Entry_E", "Entry_E"],
        apt:       ["Billing_Apt", "Billing_APT", "Apt"],
        zip:       ["Billing_Code", "Billing_Zip"],
        country:   ["Billing_Country"],
      },

      shipping: {
        street_he: ["Shipping_Street"],
        street_en: ["Shipping_Street_E"],
        city_he:   ["Shipping_City"],
        city_en:   ["Shipping_City_E"],
        house:     ["Shipping_House"],
        entry_he:  ["Shipping_Entry_H", "Shipping_Entry"],
        entry_en:  ["Shipping_Entry_E"],
        apt:       ["Shipping_APT", "Shipping_Apt"],
        zip:       ["Shipping_Code", "Shipping_Zip"],
        country:   ["Shipping_Country"],
      },
    },
  };

  // Lookup fields on Sales Order that may point to the Contact
  const SO_CONTACT_LOOKUP_CANDIDATES = [
    "Contact_Name",
    "Contact",
    "Contacts",
    "Billing_Contact",
    "Customer",
  ];

  function normalizeModule(name) {
    const s = String(name || "").trim();
    if (!s) return "Contacts";
    if (/^sales[_\s]?orders?$/i.test(s) || s === "SalesOrders") return "SalesOrders";
    if (/^contacts?$/i.test(s)) return "Contacts";
    return s;
  }

  /** Entity string for ZOHO.CRM.API / META (Sales_Orders, not SalesOrders). */
  function apiEntity(moduleName) {
    const m = normalizeModule(moduleName);
    if (m === "SalesOrders") return "Sales_Orders";
    return m;
  }

  function detectContext() {
    const file = (location.pathname.split("/").pop() || "").toLowerCase();
    if (file.includes("contacts") && file.includes("mail")) return { module: "Contacts", target: "mailing" };
    if (file.includes("contacts") && file.includes("other")) return { module: "Contacts", target: "other" };
    if (file.includes("salesorders") && file.includes("bill")) return { module: "SalesOrders", target: "billing" };
    if (file.includes("salesorders") && file.includes("ship")) return { module: "SalesOrders", target: "shipping" };
    return { module: "Contacts", target: "mailing" };
  }

  /**
   * Detect module/target from Zoho widget PageLoad payload.
   * Custom buttons usually send Entity + EntityId (+ sometimes ButtonName).
   */
  function detectContextFromPageLoad(data) {
    const d = data || {};
    const rawEntity =
      d.Entity ||
      d.entity ||
      d.Module ||
      d.module ||
      (d.data && (d.data.Entity || d.data.module)) ||
      "";
    const moduleName = normalizeModule(rawEntity);

    const blob = [
      d.ButtonName,
      d.buttonName,
      d.Button_Name,
      d.action,
      d.Action,
      typeof d === "object" ? JSON.stringify(d) : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const file = (() => {
      try { return (location.pathname.split("/").pop() || "").toLowerCase(); }
      catch (_) { return ""; }
    })();

    // Billing → Shipping (within Sales Order), NOT from Contact
    const isBillToShip =
      blob.includes("счёт -> доставка") ||
      blob.includes("счет -> доставка") ||
      blob.includes("bill_to_ship") ||
      blob.includes("billing_to_shipping") ||
      (blob.includes("биллинг") && blob.includes("шип")) ||
      (blob.includes("счёт") && blob.includes("достав") && !blob.includes("контакт")) ||
      (blob.includes("счет") && blob.includes("достав") && !blob.includes("контакт")) ||
      file.includes("bill_to_ship");

    // Contact → Order (Mailing/Other → Billing/Shipping)
    const isCopyFromContact =
      !isBillToShip && (
        blob.includes("из контакт") ||
        blob.includes("from contact") ||
        blob.includes("billing_copy") ||
        file.includes("billing_copy") ||
        file.includes("widget_copy") ||
        (blob.includes("копи") && blob.includes("контакт")) ||
        (blob.includes("copy") && blob.includes("contact"))
      );

    let target;
    if (moduleName === "SalesOrders") {
      if (blob.includes("ship") && !blob.includes("bill")) target = "shipping";
      else target = "billing";
    } else {
      if (blob.includes("other")) target = "other";
      else target = "mailing";
    }

    let mode = "resolve";
    if (isBillToShip) mode = "bill_to_ship";
    else if (isCopyFromContact) mode = "copy";

    // Filename fallback if Entity missing
    if (!rawEntity) {
      const fileCtx = detectContext();
      return Object.assign({}, fileCtx, { mode });
    }
    return { module: moduleName, target, mode };
  }

  function getMapping(moduleName, target) {
    const m = FIELD_LIBRARY[normalizeModule(moduleName)];
    if (!m) return null;
    return m[target] || null;
  }

  w.NAYMARK_FIELD_LIB = {
    FIELD_LIBRARY,
    SO_CONTACT_LOOKUP_CANDIDATES,
    normalizeModule,
    apiEntity,
    detectContext,
    detectContextFromPageLoad,
    getMapping,
  };
})(window);

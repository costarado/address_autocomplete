// widgets/contacts/main.js
(function () {
  const qs = new URLSearchParams(location.search);

  const recordId = qs.get("record_id") || "";
  const target = (qs.get("target") || "").toLowerCase(); // Mailing / Other
  const addressType = target.includes("mail") ? "mailing" : "other";

  const $ = (id) => document.getElementById(id);
  const setMsg = (t) => { $("msg").textContent = t || ""; };

  if (!recordId) {
    setMsg("ERROR: missing record_id.\nFix Zoho button URL to pass real record id macro.");
    $("saveBtn").disabled = true;
    return;
  }

  $("title").textContent = addressType === "mailing" ? "Find Mailing Address" : "Find Other (Shipping) Address";

  // Google Places
  window.NAYMARK.loadGoogle()
    .then(() => {
      const inputEl = $("address-input");
      window.NAYMARK.initAutocomplete(inputEl, (parsed) => {
        window.NAYMARK.UI.setValue("street", parsed.street);
        window.NAYMARK.UI.setValue("house", parsed.house);
        window.NAYMARK.UI.setValue("city", parsed.city);
        window.NAYMARK.UI.setValue("zip", parsed.zip);
        setMsg("");
      });
    })
    .catch((err) => {
      setMsg("Google load error: " + err);
      $("saveBtn").disabled = true;
    });

  // Save
  $("saveBtn").addEventListener("click", async () => {
    try {
      $("saveBtn").disabled = true;
      setMsg("Saving...");

      const payload = {
        street: window.NAYMARK.UI.getValue("street"),
        house: window.NAYMARK.UI.getValue("house"),
        city: window.NAYMARK.UI.getValue("city"),
        zip: window.NAYMARK.UI.getValue("zip"),
      };

      if (!payload.street && !payload.city) {
        setMsg("Select address from Google suggestions first.");
        $("saveBtn").disabled = false;
        return;
      }

      const resp = await fetch("/.netlify/functions/send-to-zoho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, addressType, payload }),
      });

      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setMsg("ERROR saving to Zoho:\n" + JSON.stringify(json, null, 2));
        $("saveBtn").disabled = false;
        return;
      }

      setMsg("Saved ✅\n" + JSON.stringify(json, null, 2));
      $("saveBtn").disabled = false;

    } catch (e) {
      setMsg("Client error: " + String(e));
      $("saveBtn").disabled = false;
    }
  });
})();

function sendToCRM() {
  const payload = {
    street: window.NAYMARK.UI.getValue("street"),
    house: window.NAYMARK.UI.getValue("house"),
    city: window.NAYMARK.UI.getValue("city"),
    zip: window.NAYMARK.UI.getValue("zip"),
  };

  const params = new URLSearchParams(window.location.search);
  const recordId = params.get("record_id");

  if (!recordId) {
    alert("Zoho record ID not found");
    return;
  }

  fetch("/.netlify/functions/send-to-zoho", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recordId,
      addressType: "other",
      payload,
    }),
  })
    .then((r) => r.json())
    .then(() => alert("✅ Address saved"))
    .catch((e) => alert("❌ Error: " + e.message));
}

document
  .getElementById("sendToCRM")
  .addEventListener("click", sendToCRM);

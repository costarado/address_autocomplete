# Naymark_Contacts_Mailing_Resol (Zoho Sigma widget)

Production button **Find_Address** / **Find Mailing Address** loads this Internal Zoho widget (not Netlify `neon-pasca`).

## Why Approve did nothing on Detail

`Approve and Close` used only:

```js
ZOHO.CRM.UI.Record.populate(payload)
```

That API fills **Create/Edit** form fields. On **Detail** view it does not persist.

## Fix in this folder

`main.js` now:

1. Reads `EntityId` from `PageLoad`
2. On Detail → `ZOHO.CRM.API.updateRecord`
3. On Create/Edit → `populate` (as before)
4. Skips writing placeholder values `manual`

## Publish back to Zoho

1. Zoho CRM → Setup → Developer Space → Widgets / Sigma
2. Open widget **Naymark_Contacts_Mailing_Resol**
3. Replace `main.js` (and keep `widget.html` / `FIELD_LIBRARY.js`)
4. Save + Publish / bump version
5. Retest **Find_Address** on a Contact **Detail** page → Approve

## Temporary workaround (no publish)

Open contact → **Edit** → Find_Address → Approve → Save record.

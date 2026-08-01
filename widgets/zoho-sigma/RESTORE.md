# Restore / Detail fix upload

## Index Page in Zoho
Use exactly: `widget.html`  
(not `app/widget.html` — Zoho saves only without `app/`)

## Recommended zip for your Zoho UI
`Naymark_Contacts_Mailing_Resol_DETAIL_FIX_FLAT.zip`

Contains at zip root:
- widget.html
- FIELD_LIBRARY.js
- main.js

## Sigma-style zip (also ok if Zoho accepts it)
`Naymark_Contacts_Mailing_Resol_DETAIL_FIX.zip` with `app/` + `plugin-manifest.json`  
Index still: `widget.html`

## After publish
Status should show: `Ready. Detail save ON (id …)`  
Then search → Approve → contact mailing fields persist.

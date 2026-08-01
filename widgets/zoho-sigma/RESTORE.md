# Upload instructions (read this)

## Use ONLY this file
`Naymark_MAILING_USE_THIS.zip`

## Zip structure (required for Zoho hosting)
```
app/widget.html
app/FIELD_LIBRARY.js
app/main.js
plugin-manifest.json
```

## Zoho Widget settings
- Index / Start page: `widget.html`  ← WITHOUT `app/`
  (Zoho looks inside `app/` automatically)
- Save → Publish
- CRM: Ctrl+F5 → Find_Address

## Do NOT upload flat zips
Zips with files only at root (`widget.html` next to zip root) cause **Page Not Found**.

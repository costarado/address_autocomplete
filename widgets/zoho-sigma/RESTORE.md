# Restore Naymark_Contacts_Mailing_Resol (working UI)

Use these **original** files (search/ZIP UI works; Approve on Detail still only populate):

- `Naymark_Contacts_Mailing_Resol/widget.html`
- `Naymark_Contacts_Mailing_Resol/FIELD_LIBRARY.js`
- `Naymark_Contacts_Mailing_Resol/main.js`

Or zip: `Naymark_Universal_Widget_RESTORE.zip` (contains `app/` + `plugin-manifest.json`).

## Zoho steps
1. Copy all 3 files into your local `...\app\` folder (overwrite).
2. Zoho Setup → Widgets → Naymark_Contacts_Mailing_Resol.
3. Replace **all three** files (not only main.js).
4. Hosting start file = `widget.html`.
5. Save → Publish.
6. CRM Ctrl+F5 → Find_Address (must open form, not 404).

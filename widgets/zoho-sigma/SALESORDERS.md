# Sales Orders widgets

## Business rules (Copy)
1. Contact **Mailing** → Sales Order **Billing**
2. Contact **Other** → Sales Order **Shipping**
3. If **Other** is empty → **Mailing** goes into **both** Billing and Shipping  
   (parcels are sent via Shipping)

## Which Zoho widget to update

| CRM button | Zoho widget name | Upload |
|---|---|---|
| Копи адреса из контакта | `Naymark_SO_Billing_Copy_v1_0` | same `Naymark_MAILING_USE_THIS.zip` |
| Найти адрес счёта/доставки | `Naymark_SO_Find_Billing` | same zip |
| Find Address (Contacts) | `Naymark_Contacts_Mailing_Resol` | same zip |

Same zip package, three widget hosts. Index = `widget.html`.

### Copy button settings
- Action: Open a Widget → `Naymark_SO_Billing_Copy_v1_0`
- Position: **Details** (not Create/Clone — needs saved order + Contact)
- On open, widget auto-runs copy (Mailing→Billing, Other→Shipping / else both)

### Find button settings
- Action: Open a Widget → `Naymark_SO_Find_Billing`
- Position: Details
- Manual search → Approve (entity `Sales_Orders`)

Optional Deluge (if you prefer Function instead of Widget):  
`client-scripts/SalesOrders_Copy_Address_From_Contact.deluge`

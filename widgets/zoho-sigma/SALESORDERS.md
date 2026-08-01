# Sales Orders widgets

## Business rules (Copy)
1. Contact **Mailing** → Order **Billing**
2. Contact **Other** → Order **Shipping**
3. If **Other** empty → **Mailing** into **Billing and Shipping**

## Upload the same zip into each widget host
File: `Naymark_MAILING_USE_THIS.zip`

| CRM button | Widget | **Index Page** |
|---|---|---|
| Копи адреса из контакта (Details + Create/Clone) | `Naymark_SO_Billing_Copy_v1_0` | **`widget_copy.html`** |
| Найти адрес счёта/доставки | `Naymark_SO_Find_Billing` | `widget.html` |
| Find Address (Contacts) | `Naymark_Contacts_Mailing_Resol` | `widget.html` |

Важно: для Copy Index должен быть **`widget_copy.html`**, не `widget.html`.  
Иначе виджет «висит» в режиме поиска и не копирует сам.

### Create/Clone
1. Сначала выберите **Contact** в форме заказа.
2. Нажмите кнопку Copy.
3. Адреса заполнятся через `populate` в открытую форму (статус OK в виджете).

### Details
1. В заказе должен быть Contact_Name.
2. Кнопка Copy → `updateRecord` → при необходимости F5.

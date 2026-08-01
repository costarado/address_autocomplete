# Какие кнопки оставить на Заказах (Sales Orders)

## Оставить (минимум)

| Кнопка (имя) | Position | Action | Widget / Script | Index |
|---|---|---|---|---|
| **Копировать адрес из контакта** | Details | Widget | `Naymark_SO_Billing_Copy_v1_0` | `widget_copy.html` |
| **Копировать адрес из контакта** | Create/Clone | Widget | `Naymark_SO_Billing_Copy_v1_0` | `widget_copy.html` |
| **Найти адрес счёта/доставки** | Details | Widget | `Naymark_SO_Find_Billing` | `widget.html` |
| **Найти адрес счёта/доставки** | Create/Clone | Widget | `Naymark_SO_Find_Billing` | `widget.html` |
| **Скопировать счёт → доставка** | Details | Widget | тот же zip, Index **`widget_bill_to_ship.html`** (можно завести отдельный виджет-хост или переиспользовать любой SO widget) | `widget_bill_to_ship.html` |
| **Скопировать счёт → доставка** | Create/Clone | **Client Script** | `client-scripts/SalesOrders_Copy_Billing_To_Shipping.js` | — |
| **Скопировать доставку → счёт** | Create/Clone | Client Script | (аналог, если реально нужен) | — |

Логика:
- **Из контакта**: Mailing→Billing, Other→Shipping (если Other пуст — Mailing в обе части)
- **Счёт → доставка**: Billing→Shipping **внутри заказа**
- **Найти адрес**: Google/Supabase resolve

## Удалить / отключить (дубли)

Удали эти, если есть — они путают и смотрят не туда:

1. `Копи из почт адреса в доставку / copy Mailing Address to Billing Address`  
   — сейчас открывает **Contact Copy** виджет, а название про доставку. **Удалить** или перепривязать на `widget_bill_to_ship.html`.
2. Лишний дубль `Копи адреса из контакта` vs `Копировать адрес из контакта` на Details — оставь **один**.
3. `Найти адрес (правка)` на Edit — не обязателен, если есть Find на Details + Create.
4. `Адрес счёта или доставки` на Details — дубль Find; оставь один Find.

PayPlus / Baldar / WhatsApp / возвраты — **не трогай** (не адресные).

## Важно про кнопку Billing→Shipping

Она **не должна** открывать `widget_copy.html` (это из контакта).  
Нужен Index **`widget_bill_to_ship.html`**.

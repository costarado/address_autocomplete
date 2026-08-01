# Sales Orders — Find Address + Copy from Contact

## 1) Upload widget (same as Contacts)
File: `Naymark_MAILING_USE_THIS.zip`  
Index: `widget.html` → Publish

Open Find Address from a **Sales Order**. Status should show:
`Ready. Sales_Orders save ON (id …). Target: billing.`

If Module still says Contacts — switch to **SalesOrders** / billing or shipping, then Approve.

## 2) Copy address from Contact
In the widget (when Module = SalesOrders) use button:
**Copy address from Contact → Order**

- Mailing → Billing  
- Other → Shipping (if Other empty → copy Mailing to Shipping too)

Then F5 on the order if fields look empty.

## 3) Standalone CRM button that “does nothing”
Wire it to Deluge function:
`client-scripts/SalesOrders_Copy_Address_From_Contact.deluge`

Setup → Functions → Button / Sales Orders → paste → attach to your Copy button with Sales Order Id.

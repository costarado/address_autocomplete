/**
 * Zoho CRM Client Script — Sales Orders — Create/Clone (and Edit if needed)
 * Button: «Скопировать счёт -> доставка»
 *
 * Copies Billing_* fields into Shipping_* on the open form (no save required).
 *
 * Setup:
 * 1. Setup → Developer Space → Client Script → Sales Orders → Page: create_record (or clone)
 * 2. Event: onClick of custom button «Скопировать счёт -> доставка»
 * 3. Paste this code.
 */

function copyField(fromApi, toApi) {
  try {
    const src = ZDK.Page.getField(fromApi);
    const dst = ZDK.Page.getField(toApi);
    if (!src || !dst) return false;
    const v = src.getValue();
    if (v === null || v === undefined || v === '') return false;
    dst.setValue(v);
    return true;
  } catch (e) {
    return false;
  }
}

const pairs = [
  ['Billing_Street', 'Shipping_Street'],
  ['Billing_Street_E', 'Shipping_Street_E'],
  ['Billing_City', 'Shipping_City'],
  ['Billing_City_E', 'Shipping_City_E'],
  ['Billing_Code', 'Shipping_Code'],
  ['Billing_Zip', 'Shipping_Zip'],
  ['Billing_Country', 'Shipping_Country'],
  ['Billing_House', 'Shipping_House'],
  ['House', 'Shipping_House'],
  ['Billing_Entry_H', 'Shipping_Entry_H'],
  ['Entry_H', 'Shipping_Entry_H'],
  ['Billing_Entry_E', 'Shipping_Entry_E'],
  ['Entry_E', 'Shipping_Entry_E'],
  ['Billing_Apt', 'Shipping_APT'],
  ['Billing_APT', 'Shipping_APT'],
  ['Apt', 'Shipping_APT'],
];

let n = 0;
pairs.forEach(([a, b]) => { if (copyField(a, b)) n += 1; });

if (n === 0) {
  ZDK.Client.showMessage('Billing пустой или поля не найдены', { type: 'error' });
} else {
  ZDK.Client.showMessage('Скопировано полей Billing → Shipping: ' + n, { type: 'success' });
}

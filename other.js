// Отправка результата в Zoho
function sendToCRM() {
    const street = window.NAYMARK.UI.getValue("street");
    const house = window.NAYMARK.UI.getValue("house");
    const city = window.NAYMARK.UI.getValue("city");
    const zip = window.NAYMARK.UI.getValue("zip");

    // Валидация обязательных полей
    if (!street || !city) {
        alert("אנא מלא את שדות הרחוב והעיר");
        return;
    }

    const payload = {
        street: street,
        house: house,
        city: city,
        zip: zip
    };

    try {
        // Метод 1: postMessage (если открыто в popup окне)
        if (window.opener && !window.opener.closed) {
            try {
                window.opener.postMessage(
                    { type: "naymark_other", payload },
                    "*"
                );
                console.log("Data sent via postMessage");
                window.close();
                return;
            } catch (e) {
                console.warn("postMessage failed, trying redirect:", e);
            }
        }
        
        // Метод 2: URL redirect с параметрами (для новой вкладки)
        NAYMARK_redirectToZoho(payload);
        
    } catch (error) {
        console.error("Error sending data to CRM:", error);
        alert("שגיאה בשליחת הנתונים: " + error.message);
    }
}

function NAYMARK_redirectToZoho(payload) {
    // Метод 1: Пытаемся использовать postMessage через все возможные окна
    let messageSent = false;
    
    try {
        if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
                { type: "naymark_other", payload },
                "*"
            );
            console.log("Sent via window.opener");
            messageSent = true;
        }
        
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                { type: "naymark_other", payload },
                "*"
            );
            console.log("Sent via window.parent");
            messageSent = true;
        }
        
        if (window.top && window.top !== window) {
            window.top.postMessage(
                { type: "naymark_other", payload },
                "*"
            );
            console.log("Sent via window.top");
            messageSent = true;
        }
    } catch (e) {
        console.warn("postMessage failed:", e);
    }
    
    // Метод 2: Отправка через серверный прокси Netlify (если есть токен)
    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('record_id');
    const accessToken = urlParams.get('access_token');
    const apiDomain = urlParams.get('api_domain') || 'https://www.zohoapis.com';
    
    if (recordId && accessToken && !messageSent) {
        // Отправляем через Netlify Function
        fetch('https://spiffy-starburst-bb94f8.netlify.app/.netlify/functions/send-to-zoho', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recordId: recordId,
                accessToken: accessToken,
                apiDomain: apiDomain,
                addressType: 'other',
                payload: payload
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("✅ הנתונים נשלחו בהצלחה ל-CRM!");
                window.close();
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('Error sending via proxy:', error);
            // Fallback: показываем инструкцию
            NAYMARK_showManualInstruction(payload);
        });
        return;
    }
    
    // Метод 3: Если postMessage сработал, закрываем окно
    if (messageSent) {
        setTimeout(() => {
            window.close();
        }, 500);
        return;
    }
    
    // Метод 4: Fallback - показываем инструкцию
    NAYMARK_showManualInstruction(payload);
}

function NAYMARK_showManualInstruction(payload) {
    const instruction = "✅ הנתונים מוכנים!\n\n" +
        "אנא חזור לחלון Zoho CRM ולחץ על כפתור 'Reload' או 'Refresh'.\n\n" +
        "הנתונים:\n" +
        "רחוב: " + (payload.street || '') + "\n" +
        "מספר בית: " + (payload.house || '') + "\n" +
        "עיר: " + (payload.city || '') + "\n" +
        "מיקוד: " + (payload.zip || '');
    
    alert(instruction);
    
    // Пытаемся вернуться назад
    if (window.history.length > 1) {
        setTimeout(() => {
            window.history.back();
        }, 1000);
    } else {
        window.close();
    }
}

// Google Autocomplete
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await window.NAYMARK.loadGoogle();

        const input = document.getElementById("full_address");

        window.NAYMARK.initAutocomplete(input, (parsed) => {
            window.NAYMARK.UI.setValue("street", parsed.street);
            window.NAYMARK.UI.setValue("house", parsed.house);
            window.NAYMARK.UI.setValue("city", parsed.city);
            window.NAYMARK.UI.setValue("zip", parsed.zip);
        });

        // Привязка обработчика события кнопки
        const sendButton = document.getElementById("sendToCRM");
        if (sendButton) {
            sendButton.addEventListener("click", sendToCRM);
        }

    } catch (e) {
        alert("Google API load error: " + e);
    }
});

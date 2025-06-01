// Funkcja do wyświetlania powiadomienia
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`; // Dodajemy klasę success lub error
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

// Obsługa formularza newslettera
const newsletterForm = document.getElementById("newsletter-form");
if (newsletterForm) {
    newsletterForm.addEventListener("submit", async function(event) {
        event.preventDefault(); // Zapobiegamy domyślnemu przeładowaniu strony
        const emailInput = this.querySelector("input[type='email']").value;

        try {
            const response = await fetch('http://localhost:3000/api/newsletter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: emailInput }),
            });

            const result = await response.json();

            if (response.ok) {
                showNotification(`Dziękujemy! Zapisano Cię do newslettera na adres: ${emailInput}`, 'success');
            } else {
                showNotification(`Wystąpił problem: ${result.error}`, 'error');
            }
        } catch (error) {
            showNotification(`Wystąpił problem: ${error.message}`, 'error');
        }

        this.reset();
    });
} else {
    console.warn("Newsletter form not found on this page.");
}
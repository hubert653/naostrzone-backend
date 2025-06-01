let label, ShoppingCart;
let shopItemsData = [];
let discount = 0;
let selectedPaymentMethod = null;

// 'basket' will be provided by main.js
if (typeof basket === 'undefined') {
    basket = JSON.parse(localStorage.getItem("data")) || [];
}

document.addEventListener("DOMContentLoaded", async () => {
    label = document.getElementById("label") || document.querySelector(".order-summary");
    ShoppingCart = document.getElementById("shopping-cart") || document.querySelector(".delivery-payment-details");

    if (!label && !ShoppingCart) {
        console.warn("Required elements ('label' or 'shopping-cart') not found. This script may not be running on the correct page.");
        return;
    }

    const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));

    // Skip the fetch if the basket is empty or if the user is not logged in (showing account prompt)
    if (basket.length > 0 && loggedInUser) {
        try {
            const response = await fetch("http://localhost:3000/api/products");
            if (!response.ok) {
                throw new Error("Błąd podczas pobierania danych z API");
            }
            shopItemsData = await response.json();
            console.log("Fetched shopItemsData:", shopItemsData); // Debug log
        } catch (error) {
            console.error("Wystąpił błąd:", error);
            if (ShoppingCart) {
                ShoppingCart.innerHTML = "<p>Wystąpił błąd podczas ładowania produktów. Spróbuj ponownie później.</p>";
            }
        }
    }

    // Always call generateCartItems to render the appropriate UI (empty cart, account prompt, or cart items)
    generateCartItems();
    if (basket.length > 0 && shopItemsData.length > 0) {
        TotalAmount();
    }

    // Call updateCartIcon if it exists (should be in main.js)
    if (typeof updateCartIcon === "function") {
        updateCartIcon();
    } else {
        console.warn("updateCartIcon function is not available. Ensure main.js is loaded.");
    }
});

let generateCartItems = async () => {
    if (basket.length === 0) {
        if (ShoppingCart) ShoppingCart.innerHTML = ``;
        if (label) {
            label.innerHTML = `
                <h2>Koszyk jest pusty</h2>
                <a href="index.html">
                    <button class="HomeBtn">Powróć na stronę główną</button>
                </a>
            `;
        } else {
            console.warn("Element with ID 'label' or class 'order-summary' not found.");
        }
        return;
    }

    const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    const isGuestCheckout = sessionStorage.getItem("guestCheckout") === "true";

    // Show the cart UI if the user is logged in OR has chosen to proceed as a guest
    if (loggedInUser || isGuestCheckout) {
        await showOrderSummaryAndDelivery();
    } else {
        const backgroundColor = localStorage.getItem("theme") || "light";
        const bgColor = backgroundColor === "dark" ? "#2d2d2d" : "#e0e0e0";

        if (label) {
            label.innerHTML = `
                <div style="width: 40%; margin: 0 auto; background-color: ${bgColor}; padding: 15px; border-radius: 5px; border: 1px solid #ccc; margin-top: 0; line-height: 1.8;">
                    <h3>Zalecamy posiadanie konta do dokonywania zakupów!</h3>
                    <p>Korzystając z konta zyskujesz:</p>
                    <ul class="benefits-list">
                        <li>Szybki proces zamawiania</li>
                        <li>Pełna historia wszystkich zamówień</li>
                        <li>Specjalne kody rabatowe</li>
                        <li>Dostęp do unikalnych promocji</li>
                    </ul>
                    <div style="margin-top: 15px;">
                        <button onclick='showOrderSummaryAndDelivery()' style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px;">Kontynuuj jako gość</button>
                        <button onclick="registerAndCheckout()" style="padding: 10px 20px; background-color: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer;">Załóż konto lub zaloguj się</button>
                    </div>
                </div>
            `;
        }
        if (ShoppingCart) ShoppingCart.innerHTML = "";
    }
};

async function showOrderSummaryAndDelivery() {
    // Set the guestCheckout flag when the user chooses to proceed as a guest
    sessionStorage.setItem("guestCheckout", "true");

    // Fetch product data only when needed, if not already fetched
    if (shopItemsData.length === 0) {
        try {
            const response = await fetch("http://localhost:3000/api/products");
            if (!response.ok) {
                throw new Error("Błąd podczas pobierania danych z API");
            }
            shopItemsData = await response.json();
            console.log("Fetched shopItemsData in showOrderSummaryAndDelivery:", shopItemsData);
        } catch (error) {
            console.error("Wystąpił błąd w showOrderSummaryAndDelivery:", error);
            shopItemsData = []; // Fallback to empty array to avoid breaking the UI
        }
    }

    const cartItems = basket
        .map((x) => {
            let { id, item, name, price } = x;
            let search = shopItemsData.find((y) => y.id === id) || { name: 'Produkt', price: 0 };
            return `
                <div class="cart-list-item">
                    <span>${name || search.name}</span>
                    <div class="cart-item-controls">
                        <i onclick="decrement('${id}')" class="bi bi-dash-lg"></i>
                        <span id="quantity-${id}">${item}</span>
                        <i onclick="increment('${id}')" class="bi bi-plus-lg"></i>
                        <i onclick="removeItem('${id}')" class="bi bi-x-lg"></i>
                    </div>
                </div>
            `;
        })
        .join("");

    label.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0px; align-items: stretch; margin-top: 0;">
            <div style="display: flex; flex-direction: column; gap: 20px; align-items: stretch; margin-top: 0;">
                <div class="order-summary" style="background-color: #e0e0e0; padding: 15px; border-radius: 5px; border: 1px solid #ccc; height: auto; overflow-y: visible; margin-top: 0;">
                    <h2>Podsumowanie zamówienia</h2>
                    <div class="products">${cartItems}</div>
                    <div class="summary-item"><span>Produkty (bez VAT):</span><span id="productsTotal">0.00 zł</span></div>
                    <div class="summary-item"><span>Dostawa:</span><span id="deliveryCost">16.99 zł</span></div>
                    <div class="summary-item"><span>Zniżka:</span><span>${discount.toFixed(2)} zł</span></div>
                    <div class="summary-item total"><span>Całkowita wartość zamówienia:</span><span id="finalTotal">0.00 zł</span></div>
                    <div class="savings"><span>Twoje oszczędności na tym zamówieniu:</span><span>${discount.toFixed(2)} zł</span></div>
                    <div class="coupon-section">
                        <input type="text" id="coupon-code" placeholder="KUPON RABATOWY" style="padding: 5px; width: 60%; margin-right: 5px;" />
                        <button onclick="applyCoupon()" class="apply-coupon" style="padding: 5px 10px; background-color: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;">Zastosuj</button>
                    </div>
                </div>
                <div class="delivery-payment-details" style="background-color: #e0e0e0; padding: 15px; border-radius: 5px; border: 1px solid #ccc; height: auto; overflow-y: visible; margin-top: 0;">
                    <h3>Sposób dostawy</h3><br>
                    <div class="delivery-section" style="display: flex; justify-content: center; gap: 60px; margin-bottom: 15px; padding: 0 10px;">
                        <label>
                            <input type="radio" name="delivery-method" value="courier" checked style="margin-right: 5px;">
                            <i class="bi bi-truck" style="margin-right: 5px;"></i>Kurier
                        </label>
                        <label>
                            <input type="radio" name="delivery-method" value="post" style="margin-right: 5px;">
                            <i class="bi bi-envelope" style="margin-right: 5px;"></i>Poczta Polska
                        </label>
                        <label>
                            <input type="radio" name="delivery-method" value="pickup" style="margin-right: 5px;">
                            <i class="bi bi-shop" style="margin-right: 5px;"></i>Odbiór osobisty
                        </label>
                    </div>
                    <h3>Metoda płatności</h3><br>
                    <div class="payment-section" style="display: flex; justify-content: center; gap: 50px; margin-bottom: 15px; padding: 0 10px;">
                        <label>
                            <input type="radio" name="payment-method" value="card" checked style="margin-right: 5px;">
                            <i class="bi bi-credit-card" style="margin-right: 5px;"></i>Karta płatnicza
                        </label>
                        <label>
                            <input type="radio" name="payment-method" value="transfer" style="margin-right: 5px;">
                            <i class="bi bi-bank" style="margin-right: 5px;"></i>Przelew bankowy
                        </label>
                        <label>
                            <input type="radio" name="payment-method" value="cash" style="margin-right: 5px;">
                            <i class="bi bi-cash" style="margin-right: 5px;"></i>Płatność przy odbiorze
                        </label>
                    </div>
                    <div class="address-section" id="address-section">
                        <h3>Adres dostawy</h3>
                        <input type="text" id="full-name" placeholder="Imię i nazwisko" required style="width: 60%; padding: 5px; margin-bottom: 10px;" />
                        <input type="text" id="phone" placeholder="Numer telefonu (np. 123456789)" required style="width: 60%; padding: 5px; margin-bottom: 10px;" />
                        <input type="text" id="street" placeholder="Ulica i numer domu" required style="width: 60%; padding: 5px; margin-bottom: 10px;" />
                        <input type="text" id="city" placeholder="Miasto" required style="width: 60%; padding: 5px; margin-bottom: 10px;" />
                        <input type="text" id="postal-code" placeholder="Kod pocztowy (np. 00-000)" required style="width: 60%; padding: 5px; margin-bottom: 10px;" />
                        <input type="text" id="country" placeholder="Kraj" required style="width: 60%; padding: 5px;" />
                    </div>
                    <div class="pickup-section" id="pickup-section" style="display: none; font-family: 'Quicksand', sans-serif;">
                        <h3 style="font-family: 'Quicksand', sans-serif;">Wybierz punkt odbioru</h3><br>
                        <input type="text" id="pickup-full-name" placeholder="Imię i nazwisko" required style="width: 60%; padding: 5px; margin-bottom: 10px;" />
                        <input type="text" id="pickup-phone" placeholder="Numer telefonu (np. 123456789)" required style="width: 60%; padding: 5px; margin-bottom: 10px;" />
                        <select id="pickup-location" style="width: 60%; padding: 5px; margin-bottom: 10px; font-family: 'Quicksand', sans-serif;">
                            <option value="warszawa">Sklep Naostrzone - Warszawa, ul. Złota 12</option>
                            <option value="krakow">Sklep Naostrzone - Kraków, ul. Floriańska 8</option>
                            <option value="gdansk">Sklep Naostrzone - Gdańsk, ul. Długa 23</option>
                            <option value="wroclaw">Sklep Naostrzone - Wrocław, ul. Świdnicka 45</option>
                        </select>
                    </div>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <button onclick="handleCheckout()" class="checkout" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px;">Przejdź do płatności</button>
                <button onclick="clearCart()" class="removeAll" style="padding: 10px 20px; background-color: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer;">Opróżnij koszyk</button>
            </div>
        </div>
    `;
    ShoppingCart.innerHTML = "";

    // Add event listener for delivery method change
    document.querySelectorAll('input[name="delivery-method"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const deliveryCostElement = document.getElementById('deliveryCost');
            const addressSection = document.getElementById('address-section');
            const pickupSection = document.getElementById('pickup-section');
            let deliveryCost = 0;
            switch (e.target.value) {
                case 'courier':
                    deliveryCost = 16.99;
                    addressSection.style.display = 'block';
                    pickupSection.style.display = 'none';
                    break;
                case 'post':
                    deliveryCost = 12.99;
                    addressSection.style.display = 'block';
                    pickupSection.style.display = 'none';
                    break;
                case 'pickup':
                    deliveryCost = 0.00;
                    addressSection.style.display = 'none';
                    pickupSection.style.display = 'block';
                    break;
            }
            deliveryCostElement.textContent = `${deliveryCost.toFixed(2)} zł`;
            TotalAmount();
        });
    });

    // Add event listener for payment method change to update the selected method
    document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectedPaymentMethod = e.target.value;
            console.log(`Selected payment method: ${selectedPaymentMethod}`);
        });
    });

    TotalAmount();
}

let handleCheckout = () => {
    const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    const finalTotalElement = document.getElementById('finalTotal');
    const finalTotal = finalTotalElement ? finalTotalElement.textContent : '0.00 zł';
    selectedPaymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value || 'card';

    console.log("handleCheckout - finalTotal:", finalTotal, "paymentMethod:", selectedPaymentMethod);

    const deliveryMethod = document.querySelector('input[name="delivery-method"]:checked')?.value || 'courier';
    let fullName, phone, street, city, postalCode, country, pickupLocation;

    if (deliveryMethod === 'pickup') {
        fullName = document.getElementById('pickup-full-name')?.value || '';
        phone = document.getElementById('pickup-phone')?.value || '';
    } else {
        fullName = document.getElementById('full-name')?.value || '';
        phone = document.getElementById('phone')?.value || '';
    }

    // Validation for full name and phone number
    if (!fullName) {
        showNotification("Proszę podać imię i nazwisko.", "error");
        return;
    }
    if (!phone) {
        showNotification("Proszę podać numer telefonu.", "error");
        return;
    } else if (!/^\d{9}$/.test(phone.replace(/\s/g, ''))) {
        showNotification("Nieprawidłowy numer telefonu (powinien zawierać dokładnie 9 cyfr).", "error");
        return;
    }

    // Validate delivery-specific fields
    if (deliveryMethod === 'pickup') {
        pickupLocation = document.getElementById('pickup-location')?.value || '';
        if (!pickupLocation) {
            showNotification("Proszę wybrać punkt odbioru.", "error");
            return;
        }
    } else {
        street = document.getElementById('street')?.value || '';
        city = document.getElementById('city')?.value || '';
        postalCode = document.getElementById('postal-code')?.value || '';
        country = document.getElementById('country')?.value || '';

        console.log("Adres dostawy - street:", street, "city:", city, "postalCode:", postalCode, "country:", country);

        if (!street || !city || !postalCode || !country) {
            showNotification("Proszę podać pełny adres dostawy (ulica, miasto, kod pocztowy, kraj).", "error");
            return;
        }
    }

    // Save checkout data in sessionStorage with finalTotal
    const checkoutData = {
        finalTotal,
        selectedPaymentMethod,
        deliveryMethod,
        fullName,
        phone,
        street,
        city,
        postalCode,
        country,
        pickupLocation
    };
    sessionStorage.setItem("checkoutData", JSON.stringify(checkoutData));

    let paymentContent = '';

    console.log("Metoda płatności:", selectedPaymentMethod);

    switch (selectedPaymentMethod) {
        case 'card':
            paymentContent = `
                <h3>Płatność kartą</h3>
                <p>Kwota do zapłaty: ${finalTotal}</p>
                <div class="card-payment-section">
                    <input type="text" id="card-number" placeholder="Numer karty (np. 1234 5678 9012 3456)" required style="width: 60%; padding: 5px; margin-bottom: 10px; line-height: 1.8;" />
                    <input type="text" id="card-expiry" placeholder="Data ważności (MM/YY)" required style="width: 60%; padding: 5px; margin-bottom: 10px; line-height: 1.8;" />
                    <input type="text" id="card-cvv" placeholder="CVV (np. 123)" required style="width: 60%; padding: 5px; margin-bottom: 10px; line-height: 1.8;" />
                    <input type="text" id="card-name" placeholder="Imię i nazwisko na karcie" required style="width: 60%; padding: 5px; margin-bottom: 10px; line-height: 1.8;" /><br>
                    <button onclick="completePayment('${selectedPaymentMethod}')" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer; line-height: 1.8;">Zapłać</button>
                </div>
            `;
            break;
        case 'transfer':
            paymentContent = `
                <h3>Płatność przelewem</h3>
                <p>Kwota do zapłaty: ${finalTotal}</p>
                <div class="transfer-payment-section">
                    <p>Prosimy o wykonanie przelewu na poniższe dane:</p>
                    <p><strong>Nazwa odbiorcy:</strong> Naostrzone Sp. z o.o.</p>
                    <p><strong>Numer konta:</strong> PL12 3456 7890 1234 5678 9012 34</p>
                    <p><strong>Tytuł przelewu:</strong> Zamówienie ${Math.floor(Math.random() * 100000)}</p>
                    <button onclick="completePayment('${selectedPaymentMethod}')" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer; line-height: 1.8;">Potwierdź</button>
                </div>
            `;
            break;
        case 'cash':
            paymentContent = `
                <h3>Płatność przy odbiorze</h3>
                <p>Kwota do zapłaty: ${finalTotal}</p>
                <p>Prosimy przygotować podaną kwotę do zapłaty przy odbiorze zamówienia.</p>
                <button onclick="completePayment('${selectedPaymentMethod}')" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer; line-height: 1.8;">Potwierdź</button>
            `;
            break;
        default:
            paymentContent = `<p>Proszę wybrać metodę płatności.</p>`;
    }

    const backgroundColor = localStorage.getItem("theme") || "light";
    label.innerHTML = `
        <div style="width: 40%; margin: 0 auto; background-color: ${backgroundColor === "dark" ? "#2d2d2d" : "#e0e0e0"}; padding: 15px; border-radius: 5px; border: 1px solid #ccc; margin-top: 0; line-height: 1.8;">
            ${paymentContent}
        </div>
    `;
    ShoppingCart.innerHTML = "";
}

let TotalAmount = () => {
    if (basket.length !== 0) {
        let amount = basket
            .map((x) => {
                let { item, id, price } = x;
                // Fallback to shopItemsData if price is missing in basket
                let search = shopItemsData.find((y) => y.id === id) || { price: 0 };
                return item * (price || search.price || 0);
            })
            .reduce((x, y) => x + y, 0);

        let totalWithDiscount = amount - discount;
        let deliveryCost = parseFloat(document.getElementById('deliveryCost')?.textContent) || 0;
        let finalTotal = totalWithDiscount + deliveryCost;

        const productsTotalElement = document.getElementById("productsTotal");
        const finalTotalElement = document.getElementById("finalTotal");

        if (productsTotalElement) productsTotalElement.innerText = `${totalWithDiscount.toFixed(2)} zł`;
        if (finalTotalElement) finalTotalElement.innerText = `${finalTotal.toFixed(2)} zł`;
    }
};

function registerAndCheckout() {
    sessionStorage.setItem("checkoutData", JSON.stringify({ basket, discount }));
    window.location.href = "Moje Konto.html?redirect=checkout";
}

let completePayment = async (paymentMethod) => {
    let isValid = true;

    if (paymentMethod === 'card') {
        const cardNumber = document.getElementById('card-number')?.value;
        const cardExpiry = document.getElementById('card-expiry')?.value;
        const cardCvv = document.getElementById('card-cvv')?.value;
        const cardName = document.getElementById('card-name')?.value;

        if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
            showNotification("Proszę wypełnić wszystkie dane płatności kartą.", "error");
            isValid = false;
        } else if (!/^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/.test(cardNumber.replace(/\s/g, ''))) {
            showNotification("Nieprawidłowy numer karty (powinien zawierać 16 cyfr).", "error");
            isValid = false;
        } else if (!/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(cardExpiry)) {
            showNotification("Nieprawidłowa data ważności (MM/YY).", "error");
            isValid = false;
        } else if (!/^\d{3}$/.test(cardCvv)) {
            showNotification("Nieprawidłowy CVV (powinien zawierać 3 cyfry).", "error");
            isValid = false;
        }
    } else if (paymentMethod === 'transfer' || paymentMethod === 'cash') {
        isValid = true;
    }

    if (isValid) {
        const checkoutData = JSON.parse(sessionStorage.getItem("checkoutData")) || {};
        const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));

        // Use the stored finalTotal from checkoutData
        const finalTotal = checkoutData.finalTotal || '0.00 zł';
        const totalAmount = parseFloat(finalTotal.replace(' zł', '').replace(',', '.')) || 0;

        const orderData = {
            user_id: loggedInUser ? loggedInUser.id : null,
            total_amount: totalAmount,
            payment_method: checkoutData.selectedPaymentMethod || paymentMethod,
            delivery_method: checkoutData.deliveryMethod || 'courier',
            full_name: checkoutData.fullName || '',
            phone: checkoutData.phone || '',
            street: checkoutData.street || null,
            city: checkoutData.city || null,
            postal_code: checkoutData.postalCode || null,
            country: checkoutData.country || null,
            pickup_location: checkoutData.pickupLocation || null,
            order_date: new Date().toISOString(),
            items: basket.map(item => {
                let product = shopItemsData.find(p => p.id === item.id) || { name: 'Produkt', price: 0 };
                return {
                    product_id: item.id,
                    product_name: item.name || product.name || 'Produkt',
                    quantity: item.item,
                    price: item.price || product.price || 0
                };
            })
        };

        console.log("Dane wysyłane do backendu:", orderData);

        try {
            const response = await fetch("http://localhost:3000/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Błąd HTTP: ${response.status} - ${errorText}`);
            }

            showNotification("Płatność została zakończona pomyślnie! Dziękujemy za zakup. Za chwilę zostaniesz przekierowany na stronę główną.", "success");
            setTimeout(() => {
                clearCart();
                sessionStorage.removeItem("checkoutData");
                sessionStorage.removeItem("guestCheckout"); // Clear guest checkout flag after order
                window.location.href = "index.html";
            }, 3000);
        } catch (error) {
            console.error("Szczegółowy błąd podczas zapisywania zamówienia:", error);
            showNotification("Wystąpił błąd podczas zapisywania zamówienia. Spróbuj ponownie.", "error");
        }
    }
};

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
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

let increment = (id) => {
    let quantityElement = document.getElementById(`quantity-${id}`);
    if (!quantityElement) {
        console.error(`Quantity element with ID quantity-${id} not found.`);
        return;
    }
    let currentQuantity = parseInt(quantityElement.textContent);
    let newQuantity = currentQuantity + 1;
    quantityElement.textContent = newQuantity;

    // Update the basket
    let search = basket.find((x) => x.id === id);
    if (search) {
        search.item = newQuantity;
    }

    localStorage.setItem("data", JSON.stringify(basket));
    if (typeof updateCartIcon === "function") {
        updateCartIcon();
    }
    TotalAmount();
};

let decrement = (id) => {
    let quantityElement = document.getElementById(`quantity-${id}`);
    if (!quantityElement) {
        console.error(`Quantity element with ID quantity-${id} not found.`);
        return;
    }
    let currentQuantity = parseInt(quantityElement.textContent);
    if (currentQuantity <= 0) return;

    let newQuantity = currentQuantity - 1;
    quantityElement.textContent = newQuantity;

    // Update the basket
    let search = basket.find((x) => x.id === id);
    if (search) {
        if (newQuantity === 0) {
            basket = basket.filter((x) => x.id !== id);
        } else {
            search.item = newQuantity;
        }
    }

    localStorage.setItem("data", JSON.stringify(basket));
    if (typeof updateCartIcon === "function") {
        updateCartIcon();
    }
    TotalAmount();
    generateCartItems(); // Re-render the UI after decrementing to zero
};

let removeItem = (id) => {
    basket = basket.filter((x) => x.id !== id);
    localStorage.setItem("data", JSON.stringify(basket));
    if (typeof updateCartIcon === "function") {
        updateCartIcon();
    }
    generateCartItems();
    if (basket.length > 0) {
        TotalAmount();
    }
};

let clearCart = () => {
    basket = [];
    discount = 0;
    generateCartItems();
    localStorage.setItem("data", JSON.stringify(basket));
    if (typeof updateCartIcon === "function") {
        updateCartIcon();
    }
};

let applyCoupon = () => {
    let couponInput = document.getElementById("coupon-code").value.toUpperCase();
    if (couponInput === "SAVE10") {
        discount = basket
            .map((x) => {
                let { item, id, price } = x;
                let search = shopItemsData.find((y) => y.id === id) || { price: 0 };
                return item * (price || search.price || 0);
            })
            .reduce((x, y) => x + y, 0) * 0.1;
        alert("Kod promocyjny zastosowany! Oszczędzasz 10%.");
    } else {
        discount = 0;
        alert("Nieprawidłowy kod promocyjny.");
    }
    TotalAmount();
    showOrderSummaryAndDelivery();
};

// Note: This function should ideally be in main.js to avoid duplication
function updateCartIcon() {
    const cartAmount = basket.reduce((total, item) => total + item.item, 0);
    const cartIcon = document.getElementById("cartAmount");

    if (cartIcon) {
        cartIcon.innerText = cartAmount;
    }
}
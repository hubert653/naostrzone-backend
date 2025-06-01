document.addEventListener("DOMContentLoaded", () => {

    const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    console.log("Zalogowany użytkownik w account.js:", loggedInUser); // Debugowanie
    // Przełączanie zakładek
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            tabButtons.forEach(btn => btn.classList.remove("active"));
            tabContents.forEach(content => content.classList.remove("active"));
            button.classList.add("active");
            const tabId = button.dataset.tab;
            document.getElementById(`${tabId}-tab`).classList.add("active");

            if (tabId === "orders") {
                renderOrderHistory();
            } else if (tabId === "admin") {
                loadAdminPanel();
            }
        });
    });

    // Ładowanie danych profilu użytkownika
    const loginRegisterSection = document.getElementById("login-register-section");
    const userDetailsSection = document.getElementById("user-details-section");
    const adminTabButton = document.getElementById("admin-tab-button");
    const userInfo = document.querySelector(".user-info");
    const editProfileButton = document.getElementById("edit-profile-button");
    const profileForm = document.getElementById("profile-form");

    if (loggedInUser) {
        loginRegisterSection.style.display = "none";
        userDetailsSection.style.display = "block";
        updateUserInterface();
    } else {
        loginRegisterSection.style.display = "flex";
        userDetailsSection.style.display = "none";
    }

    function updateUserInterface() {
        const userNameSpan = document.getElementById("user-name");
        const userEmailSpanDetails = document.getElementById("user-email-details");
        const userFirstName = document.getElementById("user-firstname");
        const userLastName = document.getElementById("user-lastname");
        const userAddress = document.getElementById("user-address");
        const greetingComma = document.getElementById("greeting-comma");
        const userInfoHeader = document.getElementById("user-info");
        const userEmailSpan = document.getElementById("user-email");
        const logoutButton = document.getElementById("logout-button");

        console.log("updateUserInterface - loggedInUser:", loggedInUser); // Debugowanie

        if (userInfoHeader && userEmailSpan) {
            userInfoHeader.style.display = "flex";
            userEmailSpan.textContent = loggedInUser.firstname || loggedInUser.email.split('@')[0];
            userEmailSpan.style.cursor = "pointer";
            userEmailSpan.addEventListener("click", () => {
                window.location.href = "Moje konto.html";
            });
        }

        if (userNameSpan) {
            userNameSpan.textContent = loggedInUser.firstname || loggedInUser.email.split('@')[0];
            greetingComma.style.display = loggedInUser.firstname ? "inline" : "none";
        }

        if (userEmailSpanDetails) userEmailSpanDetails.textContent = loggedInUser.email;
        if (userFirstName) userFirstName.textContent = loggedInUser.firstname || "Brak danych";
        if (userLastName) userLastName.textContent = loggedInUser.lastname || "Brak danych";
        if (userAddress) userAddress.textContent = loggedInUser.address || "Brak danych";

        const areProfileDetailsComplete = () => loggedInUser.firstname && loggedInUser.lastname && loggedInUser.address;
        if (areProfileDetailsComplete()) {
            profileForm.style.display = "none";
            userInfo.style.display = "block";
            editProfileButton.style.display = "block";
        } else {
            profileForm.style.display = "block";
            userInfo.style.display = "none";
            editProfileButton.style.display = "none";
        }

        if (logoutButton) {
            logoutButton.addEventListener("click", () => {
                sessionStorage.removeItem("loggedInUser");
                showNotification("Wylogowano pomyślnie!", "success");
                setTimeout(() => {
                    window.location.href = "Index.html";
                }, 2000);
            });
        }

        if (adminTabButton) {
    console.log("Sprawdzanie roli:", loggedInUser.role, "Cały obiekt:", loggedInUser); // Rozszerzone debugowanie
    if (loggedInUser.role === 'admin') {
        adminTabButton.style.display = "block";
        adminTabButton.classList.add("active");
        console.log("Zakładka admina powinna być widoczna");
    } else {
        adminTabButton.style.display = "none";
        adminTabButton.classList.remove("active");
        console.log("Użytkownik nie jest adminem, zakładka ukryta");
    }
} else {
    console.error("Nie znaleziono elementu adminTabButton"); // Debugowanie
}
    }

    // Edycja profilu
    if (editProfileButton) {
        editProfileButton.addEventListener("click", () => {
            profileForm.style.display = "block";
            userInfo.style.display = "none";
            editProfileButton.style.display = "none";
        });
    }

    if (profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const firstname = document.getElementById("firstname").value || loggedInUser.firstname || '';
            const lastname = document.getElementById("lastname").value || loggedInUser.lastname || '';
            const address = document.getElementById("address").value || loggedInUser.address || '';

            try {
                const response = await fetch('http://localhost:3000/api/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: loggedInUser.email, firstname, lastname, address })
                });

                const result = await response.json();
                if (!response.ok) {
                    showNotification(result.error, "error");
                    return;
                }

                loggedInUser.firstname = firstname;
                loggedInUser.lastname = lastname;
                loggedInUser.address = address;
                sessionStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
                updateUserInterface();
                showNotification("Dane profilu zaktualizowane!", "success");
                profileForm.reset();

                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('redirect') === 'checkout') {
                    setTimeout(() => {
                        window.location.href = "Koszyk.html?redirect=checkout";
                    }, 1000);
                }
            } catch (error) {
                console.error('Błąd podczas aktualizacji profilu:', error);
                showNotification("Wystąpił błąd podczas aktualizacji profilu", "error");
            }
        });
    }

    // Zmiana hasła
    const passwordForm = document.getElementById("password-form");
    if (passwordForm) {
        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById("current-password").value;
            const newPassword = document.getElementById("new-password").value;
            const confirmNewPassword = document.getElementById("confirm-new-password").value;

            if (newPassword.length < 6) {
                showNotification("Nowe hasło musi mieć co najmniej 6 znaków!", "error");
                return;
            }

            if (newPassword !== confirmNewPassword) {
                showNotification("Nowe hasła nie są zgodne!", "error");
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: loggedInUser.email, password: newPassword, currentPassword })
                });

                const result = await response.json();
                if (!response.ok) {
                    showNotification(result.error || "Błąd podczas zmiany hasła", "error");
                    return;
                }

                showNotification("Hasło zmienione pomyślnie! Zaloguj się ponownie.", "success");
                passwordForm.reset();
                setTimeout(() => {
                    sessionStorage.removeItem("loggedInUser");
                    window.location.href = "Index.html";
                }, 2000);
            } catch (error) {
                console.error('Błąd podczas zmiany hasła:', error);
                showNotification("Wystąpił błąd podczas zmiany hasła", "error");
            }
        });
    }

    // Historia zamówień
async function renderOrderHistory() {
    const orderHistoryList = document.getElementById("order-history");
    if (!loggedInUser || !loggedInUser.id) {
        orderHistoryList.innerHTML = "<li>Proszę się zalogować, aby zobaczyć historię zamówień.</li>";
        return;
    }

    orderHistoryList.innerHTML = "<li>Ładowanie...</li>";
    try {
        const response = await fetch(`http://localhost:3000/api/orders/${loggedInUser.id}`);
        const orders = await response.json();

        if (!response.ok) {
            throw new Error(orders.error || 'Błąd podczas pobierania zamówień');
        }

        orderHistoryList.innerHTML = "";
        if (orders.length === 0) {
            orderHistoryList.innerHTML = "<li>Brak zamówień.</li>";
        } else {
            orders.forEach(order => {
                const li = document.createElement("li");
                li.style.display = "flex";
                li.style.flexDirection = "column"; // Ustawia układ w kolumnie
                li.style.alignItems = "center"; // Wyśrodkuje elementy w poziomie
                li.style.gap = "10px"; // Odstęp między elementami
                li.innerHTML = `
                    Zamówienie #${order.id} - ${new Date(order.date).toLocaleDateString('pl-PL')}
                    <button class="action-button" onclick="showOrderDetails(${order.id})">Szczegóły</button>
                    <div id="order-details-${order.id}" class="order-details" style="display: none;">
                        <p>Status: ${order.status}</p>
                        <p>Kwota: ${order.total} zł</p>
                        <p>Produkty:</p>
                        <ul>${order.items.map(item => `<li>${item.product_name} - ${item.quantity} szt. - ${item.price} zł</li>`).join('')}</ul>
                    </div>
                    <br>
                `;
                orderHistoryList.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Błąd podczas pobierania historii zamówień:', error);
        orderHistoryList.innerHTML = "<li>Wystąpił błąd podczas ładowania zamówień.</li>";
    }
}

    window.showOrderDetails = (orderId) => {
        const detailsDiv = document.getElementById(`order-details-${orderId}`);
        detailsDiv.style.display = detailsDiv.style.display === "none" ? "block" : "none";
    };

    // Lista życzeń
    const wishlistItems = document.getElementById("wishlist-items");
    const wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
    if (wishlistItems) {
        if (wishlist.length === 0) {
            wishlistItems.innerHTML = "<p>Lista życzeń jest pusta.</p>";
        } else {
            wishlistItems.innerHTML = wishlist.map(item => `
                <div class="wishlist-item">
                    <img src="${item.img}" alt="${item.name}">
                    <div>
                        <h4>${item.name}</h4>
                        <p>Cena: ${item.price} zł</p>
                        <button class="action-button" onclick="removeFromWishlist('${item.id}')">Usuń</button>
                    </div>
                </div>
            `).join('');
        }
    }

    window.removeFromWishlist = (productId) => {
        let wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
        wishlist = wishlist.filter(item => item.id !== productId);
        localStorage.setItem("wishlist", JSON.stringify(wishlist));
        location.reload();
    };

    // Panel admina
async function loadAdminPanel() {
    const productList = document.getElementById("product-list");
    if (!productList) {
        console.error("Element product-list nie istnieje w DOM!");
        return;
    }
    try {
        const response = await fetch('http://localhost:3000/api/products'); // Pełny adres
        if (!response.ok) throw new Error('Błąd odpowiedzi serwera');
        const products = await response.json();
        console.log("Odebrane produkty:", products);
        productList.innerHTML = '';
        if (products.length === 0) {
            productList.innerHTML = '<p>Brak produktów do wyświetlenia.</p>';
            return;
        }
        products.forEach((product, index) => {
            console.log(`Dodawanie produktu ${index + 1}:`, product);
            const productDiv = document.createElement('div');
            productDiv.classList.add('product-item'); // Dodajemy klasę
            productDiv.style.border = '1px solid #ddd';
            productDiv.style.padding = '10px';
            productDiv.style.marginBottom = '10px';
            productDiv.innerHTML = `
                <p><strong>${product.name}</strong> - ${product.price} zł</p>
                <img src="${product.img}" alt="${product.name}" style="width: 400px; height: 400px;"><br>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                <label>Cena (zł):</label>
                    <input type="number" id="edit-price-${product.id}" value="${product.price}" step="0.01" style="width: 100%; height: 40px; font-size: 1.1em; padding: 5px;">
                    <label>Nazwa produktu:</label>
                    <input type="text" id="edit-name-${product.id}" value="${product.name}" style="width: 100%; height: 40px; font-size: 1.1em; padding: 5px;">
                    <label>Opis:</label>
                    <textarea id="edit-description-${product.id}" rows="2" style="width: 100%; height: 200px; font-size: 1.1em; padding: 5px;">${product.description || ''}</textarea>
                    <label>Ścieżka do obrazu:</label>
                    <input type="text" id="edit-image-${product.id}" value="${product.img}" style="width: 100%; height: 40px; font-size: 1.1em; padding: 5px;">
                    <label>Kategoria:</label>
                    <input type="text" id="edit-category-${product.id}" value="${product.category || ''}" style="width: 100%; height: 40px; font-size: 1.1em; padding: 5px;"><br>
                    <div style="display: flex; justify-content: center; gap: 10px;">
                       <br> <button onclick="editProduct('${product.id}')" style="font-size: 1.2em; padding: 10px 20px; width: 200px;background-color: #ffcc00; color: #000;">Zapisz</button>
                        <button onclick="deleteProduct('${product.id}')" style="font-size: 1.2em; padding: 10px 20px; width: 200px;background-color: #ffcc00; color: #000;">Usuń</button>
                    </div>
                </div>
            `;
            productList.appendChild(productDiv);
            console.log("Produkt dodany do DOM:", productDiv);
        });
        console.log("Wszystkie produkty zostały dodane do DOM.");
    } catch (error) {
        console.error('Błąd w loadAdminPanel:', error);
        productList.innerHTML = '<p>Wystąpił błąd podczas ładowania produktów. Sprawdź konsolę.</p>';
    }
}

document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const description = document.getElementById('product-description').value;
    const img = document.getElementById('product-image').value;
    const category = document.getElementById('product-category').value;

    console.log("Dane produktu:", { name, price, description, img, category });

    const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    const token = loggedInUser?.token;

    if (!token) {
        showNotification("Brak tokena autoryzacyjnego. Zaloguj się ponownie.", "error");
        return;
    }

    const response = await fetch('http://localhost:3000/api/products', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, price, description, img, category })
    });

    console.log("Status odpowiedzi:", response.status);
    const result = await response.json();
    console.log("Odpowiedź serwera:", result);
    console.log("Token wysyłany:", token);

    if (response.ok) {
        showNotification('Produkt dodany!', 'success');
        loadAdminPanel();
        document.getElementById('add-product-form').reset();
    } else {
        showNotification(result.message || 'Błąd dodawania produktu', 'error');
    }
});

window.editProduct = async (id) => {
    const price = parseFloat(document.getElementById(`edit-price-${id}`).value);
    const name = document.getElementById(`edit-name-${id}`).value;
    const description = document.getElementById(`edit-description-${id}`).value;
    const img = document.getElementById(`edit-image-${id}`).value;
    const category = document.getElementById(`edit-category-${id}`).value;

    const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    const token = loggedInUser?.token;

    if (!token) {
        showNotification("Brak tokena autoryzacyjnego. Zaloguj się ponownie.", "error");
        return;
    }

    const response = await fetch(`http://localhost:3000/api/products/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, price, description, img, category })
    });

    if (response.ok) {
        showNotification('Produkt zaktualizowany!', 'success');
        loadAdminPanel();
    } else {
        const result = await response.json();
        showNotification(result.message || 'Błąd aktualizacji produktu', 'error');
    }
};

window.deleteProduct = async (id) => {
    const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    const token = loggedInUser?.token;

    if (!token) {
        showNotification("Brak tokena autoryzacyjnego. Zaloguj się ponownie.", "error");
        return;
    }

    const response = await fetch(`http://localhost:3000/api/products/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        showNotification('Produkt usunięty!', 'success');
        loadAdminPanel();
    } else {
        const result = await response.json();
        showNotification(result.message || 'Błąd usuwania produktu', 'error');
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
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

// Logowanie
    const loginForm = document.querySelector(".login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            console.log("Próba logowania:", { email, password });

            try {
                const response = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const result = await response.json();
                console.log("Odpowiedź serwera:", result);

                if (!response.ok) {
                    showNotification(result.error || 'Błąd logowania', 'error');
                    return;
                }

                // Zapisz cały obiekt użytkownika (w tym token) w sessionStorage
                sessionStorage.setItem("loggedInUser", JSON.stringify(result.user));
                showNotification(result.message, "success");
                setTimeout(() => {
                    window.location.href = "Moje konto.html";
                }, 2000);
            } catch (error) {
                console.error('Błąd podczas logowania:', error);
                showNotification("Wystąpił błąd podczas logowania. Spróbuj ponownie później.", "error");
                if (error.message.includes('Unexpected token')) {
                    showNotification("Błąd serwera: Sprawdź konsolę i serwer.", "error");
                }
            }
        });
    }


});
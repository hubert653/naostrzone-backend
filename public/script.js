document.addEventListener("DOMContentLoaded", () => {
    // Przełączanie motywu
    const themeToggle = document.getElementById("theme-toggle");
    const currentTheme = localStorage.getItem("theme") || "light";

    const updateTheme = (theme) => {
        if (theme === "dark") {
            document.body.classList.remove("light-theme");
            document.body.classList.add("dark-theme");
            themeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
        } else {
            document.body.classList.remove("dark-theme");
            document.body.classList.add("light-theme");
            themeToggle.innerHTML = '<i class="bi bi-moon-fill"></i>';
        }
        localStorage.setItem("theme", theme);
    };

    updateTheme(currentTheme);

    themeToggle.addEventListener("click", () => {
        const newTheme = document.body.classList.contains("dark-theme") ? "light" : "dark";
        updateTheme(newTheme);
    });

    // Pasek promocyjny
    const promoBar = document.getElementById('promo-bar');
    const checkScrollPosition = () => {
        if (promoBar) {
            if (window.scrollY === 0) {
                promoBar.classList.add('visible');
                promoBar.classList.remove('hidden');
            } else {
                promoBar.classList.remove('visible');
                promoBar.classList.add('hidden');
            }
        }
    };

    window.addEventListener('load', checkScrollPosition);
    window.addEventListener('scroll', checkScrollPosition);

    // Menu mobilne
    const menuOverlay = document.getElementById('menu-overlay');
    const menuButton = document.getElementById('menu-button');

    if (menuButton && menuOverlay) {
        menuButton.addEventListener('click', () => {
            if (menuOverlay.classList.contains('show')) {
                menuOverlay.classList.remove('show');
                menuButton.style.display = 'block';
            } else {
                menuOverlay.classList.add('show');
                menuButton.style.display = 'none';
            }
        });

        menuOverlay.addEventListener('mouseleave', () => {
            if (menuOverlay.classList.contains('show')) {
                menuOverlay.classList.remove('show');
                menuButton.style.display = 'block';
            }
        });
    }

    // Funkcja do filtrowania produktów
    const categoryLinks = document.querySelectorAll('.menu-items li a');
    const shop = document.getElementById('shop');

    function filterProducts(category) {
        const items = shop.querySelectorAll('.item');
        let visibleItemsCount = 0;

        items.forEach(item => {
            if (category === 'Wszystkie produkty' || item.dataset.category === category) {
                item.style.display = 'block';
                visibleItemsCount++;
            } else {
                item.style.display = 'none';
            }
        });

        shop.classList.remove('two-items');
        if (visibleItemsCount === 2) {
            shop.classList.add('two-items');
        }
    }

    if (categoryLinks) {
        categoryLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = link.textContent;
                filterProducts(category);
            });
        });
    }

    // Filtr kategorii z URL
    window.addEventListener('load', () => {
        const category = getQueryParam('category');
const products = document.querySelectorAll('.product, .product-card');

        if (category) {
            products.forEach(product => {
                const productCategory = product.getAttribute('data-category');
                product.style.display = productCategory === category ? 'block' : 'none';
            });
        } else {
            products.forEach(product => {
                product.style.display = 'block';
            });
        }
    });

    // Funkcja wyszukiwania
    window.applySearchFilter = () => {
        const searchQuery = getQueryParam('search');
const products = document.querySelectorAll('.product, .product-card');
        const shopContainer = document.getElementById('shop');
        const noResultsMessage = document.createElement('div');
        noResultsMessage.className = 'no-results-message';
        noResultsMessage.style.display = 'none';
    
        const bestsellersSection = document.querySelector('.products-container');
        const bestsellersHeader = bestsellersSection ? bestsellersSection.previousElementSibling : null;
    
        if (!searchQuery || document.referrer === window.location.href) {
            products.forEach(product => {
                product.style.display = 'block';
            });
    
            if (bestsellersSection) bestsellersSection.style.display = 'flex';
            if (bestsellersHeader) bestsellersHeader.style.display = 'block';
            noResultsMessage.style.display = 'none';
    
            if (searchQuery) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            return;
        }
    
        if (searchQuery && shopContainer) {
            const normalizedSearch = normalizeText(searchQuery);
            let foundProducts = 0;
    
            products.forEach(product => {
                const productName = normalizeText(product.querySelector('h3').textContent);
                const productCategory = normalizeText(product.getAttribute('data-category') || '');
    
                if (productName.includes(normalizedSearch) || productCategory.includes(normalizedSearch)) {
                    product.style.display = 'block';
                    foundProducts++;
                } else {
                    product.style.display = 'none';
                }
            });
    
            if (foundProducts > 0) {
                if (bestsellersSection) bestsellersSection.style.display = 'none';
                if (bestsellersHeader) bestsellersHeader.style.display = 'none';
                noResultsMessage.style.display = 'none';
            } else {
                noResultsMessage.innerHTML = `
                    <h3>Nie znaleziono produktów dla frazy: "${searchQuery}"</h3>
                    <p>Sprawdź nasze bestsellery, które mogą Cię zainteresować!</p>
                `;
                noResultsMessage.style.display = 'block';
                shopContainer.parentNode.insertBefore(noResultsMessage, shopContainer);
    
                if (bestsellersSection) bestsellersSection.style.display = 'flex';
                if (bestsellersHeader) bestsellersHeader.style.display = 'block';
            }
        }
    };


    //Rejestracja
const registerForm = document.getElementById("register-form");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("reg-email").value;
        const password = document.getElementById("reg-password").value;
        const confirmPassword = document.getElementById("confirm-password").value;

        if (password.length < 6) {
            showNotification("Hasło musi mieć co najmniej 6 znaków!", "error");
            return;
        }

        if (password !== confirmPassword) {
            showNotification("Hasła nie są zgodne!", "error");
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const result = await response.json();

            if (!response.ok) {
                showNotification(result.error, "error");
                return;
            }

            showNotification(result.message, "success");
            setTimeout(() => {
                // Sprawdź, czy jest parametr redirect=checkout
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('redirect') === 'checkout') {
                    window.location.href = "Koszyk.html?checkout=true";
                } else {
                    window.location.href = "Moje konto.html";
                }
            }, 2000);
        } catch (error) {
            console.error('Błąd podczas rejestracji:', error);
            showNotification("Wystąpił błąd podczas rejestracji. Spróbuj ponownie później.", "error");
        }
    });
}

// Logowanie


    // Pokazywanie/ukrywanie hasła
    const showPasswordLink = document.querySelector(".show-password");
    if (showPasswordLink) {
        showPasswordLink.addEventListener("click", (e) => {
            e.preventDefault();
            const passwordInput = document.getElementById("password");
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                showPasswordLink.textContent = "Ukryj hasło";
            } else {
                passwordInput.type = "password";
                showPasswordLink.textContent = "Pokaż hasło";
            }
        });
    }

    // Wyświetlanie zalogowanego użytkownika i ukrywanie przycisku "Moje konto"
    const userInfo = document.getElementById("user-info");
    const userEmailSpan = document.getElementById("user-email");
    const logoutButton = document.getElementById("logout-button");
    const accountLink = document.getElementById("account-link");

    const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
    if (loggedInUser && userInfo && userEmailSpan) {
        userInfo.style.display = "flex";
        userEmailSpan.textContent = loggedInUser.firstname || "Konto";
        
        userEmailSpan.style.cursor = "pointer";
        userEmailSpan.addEventListener("click", () => {
            window.location.href = "Moje konto.html";
        });

        if (accountLink) {
            accountLink.style.display = "none";
        }
    } else {
        if (accountLink) {
            accountLink.style.display = "block";
        }
        if (userInfo) {
            userInfo.style.display = "none";
        }
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

    // Aktualizacja widoku na stronie "Moje konto" po zalogowaniu
    const loginRegisterSection = document.getElementById("login-register-section");
    const userDetailsSection = document.getElementById("user-details-section");
    
    if (loginRegisterSection && userDetailsSection) {
        if (loggedInUser) {
            loginRegisterSection.style.display = "none";
            userDetailsSection.style.display = "block";
            
            const userNameSpan = document.getElementById("user-name");
            const userEmailSpanDetails = document.getElementById("user-email-details");
            
            if (userNameSpan) {
                const userName = loggedInUser.email.split('@')[0];
                userNameSpan.textContent = userName;
            }
            
            if (userEmailSpanDetails) {
                userEmailSpanDetails.textContent = loggedInUser.email;
            }
        } else {
            loginRegisterSection.style.display = "flex";
            userDetailsSection.style.display = "none";
        }
    }
});

// Funkcje pomocnicze
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function normalizeText(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .trim()
        .replace(/ą/g, "a")
        .replace(/ć/g, "c")
        .replace(/ę/g, "e")
        .replace(/ł/g, "l")
        .replace(/ń/g, "n")
        .replace(/ó/g, "o")
        .replace(/ś/g, "s")
        .replace(/ź/g, "z")
        .replace(/ż/g, "z");
}

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
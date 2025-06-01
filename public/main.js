let shop = document.getElementById("shop");

let basket = JSON.parse(localStorage.getItem("data")) || [];
let wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];

let generateShop = async () => {
    if (!shop) return;

    try {
        const response = await fetch("http://localhost:3000/api/products");
        if (!response.ok) {
            throw new Error("Błąd podczas pobierania danych z API");
        }
        const shopItemsData = await response.json();

        shop.innerHTML = shopItemsData
            .map((x) => {
                let { id, name, price, streszczenie, img, category } = x;
                return `
                    <div id="product-id-${id}" class="item product" data-category="${category}">
                        <img width="220" src="${img}" alt="">
                        <div class="details">
                            <h3><a href="/Product.html?id=${id}">${name}</a></h3>
                            <p>${streszczenie}</p>
                            <div class="price-quantity">
                                <h2 class="product-price">${price} zł</h2>
                                <div class="buttons">
                                    <i onclick="decrement('${id}')" class="bi bi-dash-lg"></i>
                                    <div id="quantity-${id}" class="quantity">0</div>
                                    <i onclick="increment('${id}')" class="bi bi-plus-lg"></i>
                                </div>
                            </div>
                            <div class="button-container">
                                <button class="product-action-button add-to-cart" data-id="${id}" data-name="${name}" data-price="${price}">
                                    <svg width="24" height="24" viewBox="0 0 16 16" class="bi bi-cart" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        <path fill-rule="evenodd" d="M0 2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.379L2.89 4H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 13H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                                    </svg>
                                    Dodaj do koszyka
                                </button>
                                <button class="product-action-button buy-now" data-id="${id}" data-name="${name}" data-price="${price}">
                                    <svg width="24" height="24" viewBox="0 0 16 16" class="bi bi-cart-check" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M11.354 6.354a.5.5 0 0 0-.708-.708L8 8.293 6.854 7.146a.5.5 0 0 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z"/>
                                        <path fill-rule="evenodd" d="M0 2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 12.5 11H4.707l1.5-1.5a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.854.354L2.467 8H.5a.5.5 0 0 1-.485-.379L0 6.5v-4zm1.5 0v-1h12v1H1.5zm3.5 9a.5.5 0 1 0 0 1h8a.5.5 0 1 0 0-1h-8z"/>
                                    </svg>
                                    Kup teraz
                                </button>
                                <button class="product-action-button add-to-wishlist" data-id="${id}" data-name="${name}" data-price="${price}" data-img="${img}">
                                    <svg width="24" height="24" viewBox="0 0 16 16" class="bi bi-heart" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        <path fill-rule="evenodd" d="M8 2.748l-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357a.5.5 0 0 0 .632 0c3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.837-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a.5.5 0 0 0 .708 0c.057-.059.116-.116.176-.171C12.72-3.042 23.333 4.867 8 15z"/>
                                    </svg>
                                    Dodaj do listy życzeń
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            })
            .join("");

        // Obsługa przycisków "Dodaj do koszyka"
        document.querySelectorAll(".add-to-cart").forEach(button => {
            button.addEventListener("click", () => {
                const id = button.getAttribute("data-id");
                const name = button.getAttribute("data-name");
                const price = parseFloat(button.getAttribute("data-price"));
                const quantityElement = document.getElementById(`quantity-${id}`);
                const quantity = parseInt(quantityElement.textContent);

                if (quantity === 0) {
                    showAddToCartMessage("Wybrana ilość produktów wynosi zero", false);
                    return;
                }

                let selectedItem = { id };
                let search = basket.find((x) => x.id === selectedItem.id);

                if (search === undefined) {
                    basket.push({
                        id: selectedItem.id,
                        name: name,
                        price: price,
                        item: quantity,
                    });
                } else {
                    search.item = quantity;
                    search.name = name;
                    search.price = price;
                }

                localStorage.setItem("data", JSON.stringify(basket));
                updateCartIcon();
                showAddToCartMessage(`Dodano "${name}" do koszyka!`, true);
            });
        });

        // Obsługa przycisków "Kup teraz"
        document.querySelectorAll(".buy-now").forEach(button => {
            button.addEventListener("click", () => {
                const id = button.getAttribute("data-id");
                const name = button.getAttribute("data-name");
                const price = parseFloat(button.getAttribute("data-price"));
                const productId = id;

                let selectedItem = { id: productId };
                let search = basket.find((x) => x.id === selectedItem.id);

                const quantity = 1;

                if (search === undefined) {
                    basket.push({
                        id: selectedItem.id,
                        name: name,
                        price: price,
                        item: quantity,
                    });
                } else {
                    search.item = quantity;
                    search.name = name;
                    search.price = price;
                }

                localStorage.setItem("data", JSON.stringify(basket));
                updateCartIcon();
                window.location.href = "Koszyk.html";
            });
        });

        // Obsługa przycisków "Dodaj do listy życzeń"
        document.querySelectorAll(".add-to-wishlist").forEach(button => {
            button.addEventListener("click", () => {
                const loggedInUser = JSON.parse(sessionStorage.getItem("loggedInUser"));
                if (!loggedInUser) {
                    showAddToCartMessage("Musisz założyć konto, aby dodać produkt do listy życzeń!", false);
                    return;
                }

                const id = button.getAttribute("data-id");
                const name = button.getAttribute("data-name");
                const price = button.getAttribute("data-price");
                const img = button.getAttribute("data-img");

                let search = wishlist.find((x) => x.id === id);
                if (search) {
                    showAddToCartMessage("Produkt już znajduje się na liście życzeń!", false);
                    return;
                }

                wishlist.push({
                    id: id,
                    name: name,
                    price: price,
                    img: img,
                });

                localStorage.setItem("wishlist", JSON.stringify(wishlist));
                showAddToCartMessage(`Dodano "${name}" do listy życzeń!`, true);
            });
        });

        // Wywołaj wyszukiwanie po załadowaniu produktów
        applySearchFilter();
    } catch (error) {
        console.error("Wystąpił błąd:", error);
        shop.innerHTML = "<p>Wystąpił błąd podczas ładowania produktów. Spróbuj ponownie później.</p>";
    }
};

let addToCart = (id, name, price) => {
    let product = basket.find((item) => item.id === id);

    if (product) {
        product.item += 1;
        product.name = name;
        product.price = price;
    } else {
        basket.push({ id: id, name: name, item: 1, price: price });
    }

    localStorage.setItem("data", JSON.stringify(basket));
    updateCartIcon();
};

if (shop) {
    generateShop();
}

let increment = (id) => {
    let quantityElement = document.getElementById(`quantity-${id}`);
    if (!quantityElement) {
        console.error(`Quantity element with ID quantity-${id} not found.`);
        return;
    }
    let currentQuantity = parseInt(quantityElement.textContent);
    quantityElement.textContent = currentQuantity + 1;
};

let decrement = (id) => {
    let quantityElement = document.getElementById(`quantity-${id}`);
    if (!quantityElement) {
        console.error(`Quantity element with ID quantity-${id} not found.`);
        return;
    }
    let currentQuantity = parseInt(quantityElement.textContent);
    if (currentQuantity > 0) {
        quantityElement.textContent = currentQuantity - 1;
    }
};

let calculation = () => {
    let cartIcon = document.getElementById("cartAmount");
    if (cartIcon) {
        cartIcon.innerHTML = basket.map((x) => x.item).reduce((x, y) => x + y, 0);
    }
};

const cartIcon = document.getElementById("cartAmount");
if (cartIcon) {
    calculation();
}

function showAddToCartMessage(message, success = true) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "add-to-cart-message";
    messageDiv.textContent = message;
    messageDiv.style.position = "fixed";
    messageDiv.style.top = "20px";
    messageDiv.style.right = "20px";
    messageDiv.style.backgroundColor = success ? "#4CAF50" : "#d32f2f";
    messageDiv.style.color = "white";
    messageDiv.style.padding = "10px 15px";
    messageDiv.style.borderRadius = "5px";
    messageDiv.style.zIndex = "10000";
    messageDiv.style.opacity = "0";
    messageDiv.style.transition = "opacity 0.5s ease-in-out";
    messageDiv.style.maxWidth = "300px";
    messageDiv.style.wordWrap = "break-word";
    messageDiv.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.style.opacity = "1";
    }, 100);

    setTimeout(() => {
        messageDiv.style.opacity = "0";
        setTimeout(() => {
            messageDiv.remove();
        }, 500);
    }, 3000);
}

function updateCartIcon() {
    const basket = JSON.parse(localStorage.getItem("data")) || [];
    const cartAmount = basket.reduce((total, item) => total + item.item, 0);
    const cartIcon = document.getElementById("cartAmount");
    if (cartIcon) cartIcon.textContent = cartAmount;
}

function applySearchFilter() {
    const searchInput = document.getElementById("searchInput");
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const searchTerm = searchInput.value.toLowerCase();
        const products = document.querySelectorAll(".product");

        products.forEach(product => {
            const name = product.querySelector("h3 a").textContent.toLowerCase();
            const description = product.querySelector("p").textContent.toLowerCase();
            if (name.includes(searchTerm) || description.includes(searchTerm)) {
                product.style.display = "block";
            } else {
                product.style.display = "none";
            }
        });
    });
}
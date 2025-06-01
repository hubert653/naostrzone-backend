const bcrypt = require('bcrypt');
const express = require('express');
const mysql = require('mysql2/promise'); // Użyj mysql2/promise dla async/await
const cors = require('cors');
const path = require('path');
const sgMail = require('@sendgrid/mail');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Ustaw klucz API SendGrid
sgMail.setApiKey('SG.QoJyB6tjSwi81PsTv5_I_A.S4uhdqqJ5i1ES1GX3YGwC51XjsTqdG6m_SgooLUoGYA');

// Middleware
app.use(cors({
    origin: 'http://localhost:3000', // Dopasuj do swojego frontendu
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));
app.use(express.json());

// Serwowanie statycznych plików z folderu 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Konfiguracja puli połączeń z bazą danych MySQL
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'hubert2002',
    database: 'mydb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Testowanie połączenia z bazą danych przy starcie serwera
(async () => {
    try {
        const connection = await db.getConnection();
        await connection.query('SELECT 1');
        connection.release();
        console.log('Połączono z bazą danych MySQL');
    } catch (err) {
        console.error('Błąd połączenia z bazą danych:', err);
        process.exit(1);
    }
})();

// Middleware do autoryzacji
const authenticate = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Brak tokena autoryzacyjnego' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Nieprawidłowy format tokena' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Błąd weryfikacji tokena:', error);
        return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
    }
};

// Middleware sprawdzające uprawnienia admina
const isAdmin = async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Brak uprawnień administratora' });
    }
    next();
};

// Utworzenie konta admina (wykonaj raz, jeśli nie istnieje)
(async () => {
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', ['admin@admin.pl']);
        if (users.length === 0) {
            const hashedPassword = await bcrypt.hash('admin', 10); // Jawne hashowanie hasła
            await db.query(
                'INSERT INTO users (email, password, firstname, lastname, address, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                ['admin@admin.pl', hashedPassword, 'Admin', 'Administrator', 'Admin Address']
            );
            console.log('Konto admina utworzone z hasłem admin.');
        } else {
            // Weryfikacja istniejącego hasła (opcjonalne)
            const user = users[0];
            const isPasswordValid = await bcrypt.compare('admin', user.password);
            if (!isPasswordValid) {
                const hashedPassword = await bcrypt.hash('admin', 10);
                await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, 'admin@admin.pl']);
                console.log('Hasło admina zaktualizowane na admin.');
            }
        }
    } catch (error) {
        console.error('Błąd podczas tworzenia/zaktualizowania konta admina:', error);
    }
})();

// Endpoint do zamawiania
app.post('/api/orders', async (req, res) => {
    const { user_id, total_amount, payment_method, delivery_method, full_name, phone, street, city, postal_code, country, pickup_location, order_date, items } = req.body;

    console.log('Żądanie do /api/orders otrzymane:', req.body);

    if (!total_amount || !payment_method || !delivery_method || !full_name || !phone || !items || items.length === 0) {
        console.error("Błąd walidacji: brakujące dane", { total_amount, payment_method, delivery_method, full_name, phone, items });
        return res.status(400).json({ error: 'Brakujące dane w zamówieniu' });
    }

    const formattedOrderDate = new Date(order_date).toISOString().replace('T', ' ').replace('Z', '').split('.')[0];

    try {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [orderResult] = await connection.query(
                'INSERT INTO orders (user_id, total_amount, payment_method, delivery_method, full_name, phone, street, city, postal_code, country, pickup_location, order_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [user_id, total_amount, payment_method, delivery_method, full_name, phone, street, city, postal_code, country, pickup_location, formattedOrderDate]
            );

            const orderId = orderResult.insertId;

            for (const item of items) {
                await connection.query(
                    'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)',
                    [orderId, item.product_id, item.product_name, item.quantity, item.price]
                );
            }

            await connection.commit();
            res.status(201).json({ message: 'Zamówienie zapisane pomyślnie', orderId });
        } catch (error) {
            await connection.rollback();
            console.error('Szczegółowy błąd podczas zapisywania zamówienia:', error);
            res.status(500).json({ error: 'Błąd podczas zapisywania zamówienia' });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Błąd połączenia z bazą danych:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Endpoint do pobierania historii zamówień użytkownika
app.get('/api/orders/:user_id', async (req, res) => {
    const userId = req.params.user_id;

    try {
        const connection = await db.getConnection();
        try {
            const [orders] = await connection.query(
                'SELECT id, total_amount, payment_method, delivery_method, order_date, status FROM orders WHERE user_id = ?',
                [userId]
            );

            const ordersWithItems = await Promise.all(
                orders.map(async (order) => {
                    const [items] = await connection.query(
                        'SELECT product_id, product_name, quantity, price FROM order_items WHERE order_id = ?',
                        [order.id]
                    );
                    return {
                        ...order,
                        items,
                        date: order.order_date,
                        total: order.total_amount,
                        status: order.status || 'Zrealizowane'
                    };
                })
            );

            res.json(ordersWithItems);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Błąd podczas pobierania historii zamówień:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Endpoint do rejestracji
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Adres e-mail i hasło są wymagane' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
    }

    const connection = await db.getConnection();
    try {
        const [results] = await connection.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
        if (results.length > 0) {
            return res.status(400).json({ error: 'Użytkownik z tym adresem e-mail już istnieje' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await connection.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
        res.status(200).json({ message: 'Rejestracja zakończona sukcesem' });
    } catch (error) {
        console.error('Błąd podczas rejestracji użytkownika:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    } finally {
        connection.release();
    }
});

// Endpoint do logowania
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Adres e-mail i hasło są wymagane' });
    }

    const connection = await db.getConnection();
    try {
        const [results] = await connection.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
        if (results.length === 0) {
            return res.status(401).json({ error: 'Nieprawidłowy e-mail lub hasło' });
        }

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Nieprawidłowy e-mail lub hasło' });
        }

        const role = user.email === 'admin@admin.pl' ? 'admin' : 'user';
        const token = jwt.sign(
            { id: user.id, email: user.email, role: role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'Logowanie zakończone sukcesem',
            user: {
                id: user.id,
                email: user.email,
                firstname: user.firstname,
                lastname: user.lastname,
                address: user.address,
                role: role,
                token: token
            }
        });
    } catch (error) {
        console.error('Błąd podczas logowania:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    } finally {
        connection.release();
    }
});

// Endpoint do aktualizacji profilu
app.put('/api/profile', async (req, res) => {
    const { email, firstname, lastname, address, password, currentPassword } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Adres e-mail jest wymagany' });
    }

    const connection = await db.getConnection();
    try {
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
            }

            const [results] = await connection.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
            if (results.length === 0) {
                return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
            }

            const user = results[0];
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Aktualne hasło jest nieprawidłowe' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            await connection.query('UPDATE users SET password = ? WHERE LOWER(email) = LOWER(?)', [hashedPassword, email]);
            res.status(200).json({ message: 'Hasło zaktualizowane' });
        } else {
            await connection.query('UPDATE users SET firstname = ?, lastname = ?, address = ? WHERE LOWER(email) = LOWER(?)', [firstname || '', lastname || '', address || '', email]);
            res.status(200).json({ message: 'Dane profilu zaktualizowane' });
        }
    } catch (error) {
        console.error('Błąd podczas aktualizacji profilu:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    } finally {
        connection.release();
    }
});

// Endpoint do pobierania produktów
app.get('/api/products', async (req, res) => {
    try {
        const connection = await db.getConnection();
        const [results] = await connection.query('SELECT * FROM produkty');
        connection.release();
        res.json(results);
    } catch (error) {
        console.error('Błąd podczas pobierania produktów:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Endpoint do pobierania produktu po ID
app.get('/api/products/:id', async (req, res) => {
    const productId = req.params.id;
    try {
        const connection = await db.getConnection();
        const [results] = await connection.query('SELECT * FROM produkty WHERE id = ?', [productId]);
        connection.release();
        if (results.length === 0) {
            res.status(404).json({ error: 'Produkt nie znaleziony' });
            return;
        }
        res.json(results[0]);
    } catch (error) {
        console.error('Błąd podczas pobierania produktu:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    }
});

// Endpoint do zapisywania do newslettera
app.post('/api/newsletter', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Adres e-mail jest wymagany' });
    }

    const connection = await db.getConnection();
    try {
        const [results] = await connection.query('SELECT * FROM newsletter_subscribers WHERE email = ?', [email]);
        if (results.length > 0) {
            return res.status(400).json({ error: 'Ten adres e-mail jest już zapisany do newslettera' });
        }

        await connection.query('INSERT INTO newsletter_subscribers (email) VALUES (?)', [email]);

        const msg = {
            to: email,
            from: 'hubert.stolarz@onet.pl',
            subject: 'Witaj w Naostrzone!',
            text: 'Dziękujemy za zapisanie się do naszego newslettera! Otrzymuj najnowsze okazje i rabaty.',
            html: '<h1>Witaj w Naostrzone!</h1><p>Dziękujemy za zapisanie się do naszego newslettera! Otrzymuj najnowsze okazje i rabaty.</p>',
        };

        await sgMail.send(msg);
        res.status(200).json({ message: 'Wysłano wiadomość newsletter' });
    } catch (error) {
        console.error('Błąd podczas zapisywania e-maila lub wysyłania:', error);
        res.status(500).json({ error: 'Błąd serwera' });
    } finally {
        connection.release();
    }
});

// Endpoint do dodawania produktu
app.post('/api/products', authenticate, isAdmin, async (req, res) => {
    const { name, price, description, img, category } = req.body;

    if (!name || !price) {
        return res.status(400).json({ error: 'Nazwa i cena są wymagane' });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
        return res.status(400).json({ error: 'Cena musi być liczbą' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        const [result] = await connection.query(
            'INSERT INTO produkty (name, price, description, img, category) VALUES (?, ?, ?, ?, ?)',
            [name, parsedPrice, description || '', img || '', category || '']
        );
        res.status(201).json({ success: true, product: { id: result.insertId, name, price: parsedPrice, description, img, category } });
    } catch (error) {
        console.error('Błąd dodawania produktu:', error.message, error.stack);
        res.status(500).json({ error: 'Błąd serwera', details: error.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Endpoint do edytowania produktu
app.put('/api/products/:id', authenticate, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, price, description, img, category } = req.body;

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
        return res.status(400).json({ error: 'Cena musi być liczbą' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.query(
            'UPDATE produkty SET name = ?, price = ?, description = ?, img = ?, category = ? WHERE id = ?',
            [name, parsedPrice, description || '', img || '', category || '', id]
        );
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Błąd edycji produktu:', error.message, error.stack);
        res.status(500).json({ error: 'Błąd serwera', details: error.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Endpoint do usuwania produktu
app.delete('/api/products/:id', authenticate, isAdmin, async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await db.getConnection();
        await connection.query('DELETE FROM produkty WHERE id = ?', [id]);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Błąd usuwania produktu:', error.message, error.stack);
        res.status(500).json({ error: 'Błąd serwera', details: error.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Obsługa wszystkich innych żądań
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
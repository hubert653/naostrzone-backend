const bcrypt = require('bcrypt');

bcrypt.hash('examplepassword', 10, (err, hash) => {
    if (err) {
        console.error('Błąd podczas hashowania:', err);
        return;
    }
    console.log('Wygenerowany hash:', hash);
});
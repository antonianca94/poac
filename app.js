const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const mysql = require('mysql2/promise');
const flash = require('express-flash');
const session = require('express-session');

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'sua-string-de-segredo-aqui',
    resave: false,
    saveUninitialized: true
}));

app.use(flash());

async function executeQuery(sql, values = []) {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'anne'
    });

    try {
        const [rows] = await connection.execute(sql, values);
        return rows;
    } catch (error) {
        console.error('Erro ao executar consulta SQL:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

app.get('/products', async (req, res) => {
    try {
        const products = await executeQuery('SELECT * FROM products');
        const successMessage = req.flash('success'); 
        res.render('products/index', { pageTitle: 'Produtos', products, successMessage });
    } catch (error) {
        res.status(500).send('Erro ao buscar produtos');
    }
});

app.get('/products/new', (req, res) => {
    res.render('products/new', { pageTitle: 'Inserir Produto' });
});

app.post('/products', async (req, res) => {
    const { name, price } = req.body;
    try {
        await executeQuery('INSERT INTO products (name, price) VALUES (?, ?)', [name, price]);
        req.flash('success', 'Produto cadastrado com sucesso!');
        res.redirect('/products');
    } catch (error) {
        res.status(500).send('Erro ao cadastrar produto');
    }
});

app.delete('/products/:id', async (req, res) => {
    const productId = req.params.id;
    try {
        await executeQuery('DELETE FROM products WHERE id = ?', [productId]);
        res.status(200).json({ message: 'Produto excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({ error: 'Erro ao excluir produto' });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const mysql = require('mysql2/promise');
const flash = require('express-flash');
const session = require('express-session');

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'poac-marketplace',
    resave: false,
    saveUninitialized: true
}));

app.use(flash());

// Inicialização do Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Rota para fazer logout
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Erro ao fazer logout:', err);
            return res.status(500).send('Erro ao fazer logout');
        }
        res.redirect('/login'); // Redireciona para a página de login
    });
});

// Configuração da estratégia de autenticação local
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            // Busca o usuário no banco de dados pelo nome de usuário
            const [user] = await executeQuery('SELECT * FROM users WHERE username = ?', [username]);

            // Se o usuário não for encontrado ou a senha estiver incorreta, retorna uma mensagem de erro
            if (!user || user.password !== password) {
                return done(null, false, { message: 'Nome de usuário ou senha incorretos.' });
            }

            // Se o usuário for encontrado e a senha estiver correta, retorna o usuário
            return done(null, user);
        } catch (error) {
            // Se ocorrer um erro ao buscar o usuário, retorna o erro
            return done(error);
        }
    }
));

// Serialização do usuário para a sessão
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Desserialização do usuário da sessão
passport.deserializeUser(async (id, done) => {
    try {
        // Busca o usuário no banco de dados pelo ID
        const [user] = await executeQuery('SELECT * FROM users WHERE id = ?', [id]);
        
        // Se o usuário for encontrado, retorna o usuário
        done(null, user);
    } catch (error) {
        // Se ocorrer um erro ao buscar o usuário, retorna o erro
        done(error);
    }
});



// LOGIN USER
// Rota de login
app.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}));

// Rota para renderizar o formulário de login
app.get('/login', (req, res) => {
    // Renderiza o arquivo login.ejs
    res.render('login', { message: req.flash('error') });
});
// LOGIN USER

// REGISTRO USER
// Rota para renderizar o formulário de cadastro de usuário
app.get('/register', (req, res) => {
    res.render('register', { message: req.flash('error') });
});

// Rota para processar o formulário de cadastro de usuário
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Verifica se o usuário já existe no banco de dados
        const existingUser = await executeQuery('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            req.flash('error', 'Nome de usuário já existe');
            return res.redirect('/register');
        }

        // Insere o novo usuário no banco de dados com roles_id padrão (1)
        await executeQuery('INSERT INTO users (username, password, roles_id) VALUES (?, ?, 1)', [username, password]);
        
        req.flash('success', 'Usuário cadastrado com sucesso!');
        res.redirect('/login'); // Redireciona para a página de login após o cadastro
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).send('Erro ao cadastrar usuário');
    }
});
// REGISTRO USER

// Middleware para verificar autenticação
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

async function executeQuery(sql, values = []) {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'poac'
    });

    try {
        const [result] = await connection.execute(sql, values);
        // console.log(result);

        return result; // Retorna o resultado da inserção ou outra operação
    } catch (error) {
        console.error('Erro ao executar consulta SQL:', error);
        throw error;
    } finally {
        await connection.end();
    }
}


app.get('/dashboard', isAuthenticated, async (req, res) => {
    res.render('dashboard/index', { pageTitle: 'Painel',username: req.user.username });

});

// PRODUCTS
app.get('/products', isAuthenticated, async (req, res) => {
    try {
        const products = await executeQuery('');
        const successMessage = req.flash('success'); 
        res.render('products/index', { pageTitle: 'Produtos', products, successMessage, username: req.user.username });

    } catch (error) {
        res.status(500).send('Erro ao buscar produtos');
    }
});


app.get('/products/new', isAuthenticated, async (req, res) => {
    try {
        const categories = await executeQuery('SELECT * FROM categories');
        res.render('products/new', { pageTitle: 'Inserir Produto', categories, username: req.user.username });
    } catch (error) {
        res.status(500).send('Erro ao carregar categorias para criar um novo produto');
    }
});

app.post('/products', async (req, res) => {
    const { name, price, categorias } = req.body;
    const userId = req.session.passport.user;

    if (!userId) {
        return res.status(401).send('Usuário não autenticado');
    }

    try {
        // Insere o produto na tabela products
        await executeQuery('INSERT INTO products (name, price, users_id, categories_products_id) VALUES (?, ?, ?, ?)', [name, price, userId]);


        req.flash('success', 'Produto cadastrado com sucesso!');
        res.redirect('/products');
    } catch (error) {
        console.error('Erro ao cadastrar produto:', error);
        res.status(500).send('Erro ao cadastrar produto');
    }
});






app.delete('/products/:id', isAuthenticated, async (req, res) => {
    const productId = req.params.id;
    try {
        await executeQuery('DELETE FROM products WHERE id = ?', [productId]);
        res.status(200).json({ message: 'Produto excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({ error: 'Erro ao excluir produto' });
    }
});

app.get('/products/:id/edit', isAuthenticated, async (req, res) => {
    const productId = req.params.id;
    try {
        const [product] = await executeQuery('SELECT * FROM products WHERE id = ?', [productId]);
        const categories = await executeQuery('SELECT * FROM categories'); // Busca todas as categorias

        res.render('products/edit', { pageTitle: 'Editar Produto', product, categories, username: req.user.username });
    } catch (error) {
        res.status(500).send('Erro ao buscar produto para edição');
    }
});

app.post('/products/:id', async (req, res) => {
    const productId = req.params.id;
    const { name, price } = req.body;
    try {
        await executeQuery('UPDATE products SET name = ?, price = ? WHERE id = ?', [name, price, productId]);
        req.flash('success', 'Produto atualizado com sucesso!');
        res.redirect('/products');
    } catch (error) {
        res.status(500).send('Erro ao atualizar produto');
    }
});
// PRODUCTS

// ROLES
app.get('/roles', isAuthenticated, async (req, res) => {
    try {
        const roles = await executeQuery('SELECT * FROM roles');
        const successMessage = req.flash('success'); 
        res.render('roles/index', { pageTitle: 'Roles', roles, successMessage, username: req.user.username });

    } catch (error) {
        res.status(500).send('Erro ao buscar roles');
    }
});

app.get('/roles/new', isAuthenticated, (req, res) => {
    res.render('roles/new', { pageTitle: 'Inserir Role' , username: req.user.username });
});

app.post('/roles', async (req, res) => {
    const { name, description } = req.body;
    const userId = req.session.passport.user; 

    if (!userId) {
        return res.status(401).send('Usuário não autenticado');
    }

    try {
        await executeQuery('INSERT INTO roles (name, description) VALUES (?, ?)', [name, description]);
        req.flash('success', 'Role cadastrada com sucesso!');
        res.redirect('/roles');
    } catch (error) {
        console.error('Erro ao cadastrar a role:', error);
        res.status(500).send('Erro ao cadastrar a role');
    }
});

app.delete('/roles/:id', isAuthenticated, async (req, res) => {
    const roleId = req.params.id;
    try {
        await executeQuery('DELETE FROM roles WHERE id = ?', [roleId]);
        res.status(200).json({ message: 'Role excluída com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir a role:', error);
        res.status(500).json({ error: 'Erro ao excluir a role' });
    }
});

app.get('/roles/:id/edit', isAuthenticated, async (req, res) => {
    const roleId = req.params.id;
    try {
        const [role] = await executeQuery('SELECT * FROM roles WHERE id = ?', [roleId]);
        res.render('roles/edit', { pageTitle: 'Editar Role', role, username: req.user.username });
    } catch (error) {
        res.status(500).send('Erro ao buscar role para edição');
    }
});

app.post('/roles/:id', async (req, res) => {
    const roleId = req.params.id;

    const { name, description } = req.body;
    try {
        await executeQuery('UPDATE roles SET name = ?, description = ? WHERE id = ?', [name, description,roleId]);
        req.flash('success', 'Role atualizada com sucesso!');
        res.redirect('/roles');
    } catch (error) {
        res.status(500).send('Erro ao atualizar a role');
    }
});
// ROLES

// CATEGORIES
app.get('/categories', isAuthenticated, async (req, res) => {
    try {
        const categories = await executeQuery('SELECT * FROM categories_products');
        const successMessage = req.flash('success'); 
        res.render('categories/index', { pageTitle: 'Categorias', categories, successMessage, username: req.user.username });

    } catch (error) {
        res.status(500).send('Erro ao buscar categorias');
    }
});

app.get('/categories/new', isAuthenticated, async(req, res) => {
    const categories = await executeQuery('SELECT * FROM categories_products');

    res.render('categories/new', { pageTitle: 'Inserir Categoria' , categories, username: req.user.username });
});

app.post('/categories', async (req, res) => {
    const { name, description, parent_id } = req.body;
    const userId = req.session.passport.user; 

    if (!userId) {
        return res.status(401).send('Usuário não autenticado');
    }

    try {
        await executeQuery('INSERT INTO categories_products (name, description, id_categories_products) VALUES (?, ?, ?)', [name, description, parent_id]);
        req.flash('success', 'Categoria cadastrada com sucesso!');
        res.redirect('/categories');
    } catch (error) {
        console.error('Erro ao cadastrar a categoria:', error);
        res.status(500).send('Erro ao cadastrar a categoria');
    }
});

app.delete('/categories/:id', isAuthenticated, async (req, res) => {
    const categoryId = req.params.id;
    try {
        await executeQuery('DELETE FROM categories_products WHERE id = ?', [categoryId]);
        res.status(200).json({ message: 'Categoria excluída com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir a categoria:', error);
        res.status(500).json({ error: 'Erro ao excluir a categoria' });
    }
});

app.get('/categories/:id/edit', isAuthenticated, async (req, res) => {
    const categoryId = req.params.id;
    try {
        const categories = await executeQuery('SELECT * FROM categories_products');
        const [category] = await executeQuery('SELECT * FROM categories_products WHERE id = ?', [categoryId]);
        res.render('categories/edit', { pageTitle: 'Editar Categoria', category, categories, username: req.user.username });
    } catch (error) {
        res.status(500).send('Erro ao buscar categoria para edição');
    }
});



app.post('/categories/:id', async (req, res) => {
    const categoryId = req.params.id;

    const { name, description, parent_id} = req.body;
    try {
        await executeQuery('UPDATE categories SET name = ?, description = ?, parent_id = ? WHERE id = ?', [name, description,parent_id,categoryId]);
        req.flash('success', 'Categoria atualizada com sucesso!');
        res.redirect('/categories');
    } catch (error) {
        res.status(500).send('Erro ao atualizar a categoria');
    }
});
// CATEGORIES

app.listen(PORT, () => {
    console.log(`O servidor está em execução http://localhost:${PORT}`);
});

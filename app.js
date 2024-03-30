const express = require('express');
const app = express();

const RoleController = require('./controllers/RoleController');
const userController = require('./controllers/UserController'); 
const CategoriesController = require('./controllers/CategoriesController');
const productController = require('./controllers/ProductController');
const RegisterController = require('./controllers/RegisterController');
const VendorsController = require('./controllers/VendorsController');

const cacheController = require('express-cache-controller');

const PORT = process.env.PORT || 3000;

const mysql = require('mysql2/promise');
const flash = require('express-flash');
const session = require('express-session');


const compression = require('compression');

const multer = require('multer');

function generateRandomCode(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // O diretório onde as imagens serão armazenadas
    },
    filename: function (req, file, cb) {
        const randomCode = generateRandomCode(12); // Gera um código aleatório com 6 dígitos
        const extension = file.originalname.split('.').pop(); // Obtém a extensão do arquivo
        const newFilename = randomCode + '.' + extension; // Nome do arquivo (código aleatório + extensão)
        cb(null, newFilename); 
    }
});

const upload = multer({ storage: storage });
var Images = upload.any();

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

app.use(compression());

app.use(cacheController({
    maxAge: '5 minutes' // Tempo de vida do cache em segundos
  }));
  
app.use('/public', express.static('public'))
app.use('/uploads', express.static('uploads'));


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
        res.redirect('/'); // Redireciona para a página de login
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


app.get('/status', (req, res) => {
    
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
app.get('/register', RegisterController.showRegisterUser);
app.post('/register', RegisterController.registerUser);
// REGISTRO USER

// HOME
app.get('/', async (req, res) => {

    const productsQuery = `
    SELECT p.*, i.path AS imagePath
    FROM products p
    LEFT JOIN images i ON p.id = i.products_id
    WHERE i.type = 'featured_image'
`;
const products = await executeQuery(productsQuery);
    // Renderiza o arquivo login.ejs
    res.render('site/home', { pageTitle: 'Home', message: req.flash('error'), products });
});
// HOME 

// Middleware para verificar autenticação
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        const userRole = req.user.roles_id;
        const allowedRoutes = getRoutesForRole(userRole);
        const requestedRoute = req.originalUrl;

        // Verifica se o usuário tem permissão para acessar a rota solicitada
        const isRouteAllowed = allowedRoutes.some(route => {
            // Verifica se a rota solicitada corresponde ao padrão da rota permitida
            const regex = new RegExp(`^${route.replace(/:\w+/g, '\\w+')}$`);
            return regex.test(requestedRoute);
        });

        if (isRouteAllowed) {
            return next(); // Prossiga para a próxima rota se for permitida
        } else {
            return res.redirect('/dashboard');
        }
    }
    res.redirect('/login');
};

const getRoutesForRole = (roleId) => {
    switch (roleId) {
        case 1: // Role de administrador
            return [
                '/dashboard',
                '/products',
                '/products/new',
                '/products/:id/edit',
                '/products/:id',
                '/categories',
                '/categories/new',
                '/categories/:id/edit',
                '/categories/:id',
                '/roles',
                '/roles/new',
                '/roles/:id/edit',
                '/roles/:id',
                '/users',
                '/users/new',
                '/users/:id/edit',
                '/users/:id',
                '/vendors',
                '/vendors/:id/edit',
                '/vendors/:id'
                // Adicione outras rotas permitidas para o administrador conforme necessário
            ];
        case 6: // Role de usuário normal
            return [
                '/dashboard',
                '/products',
                '/products/new',
                '/products/:id/edit',
                '/products/:id',
                // Adicione outras rotas permitidas para o usuário normal conforme necessário
            ];
        default:
            return [];
    }
};

async function executeQuery(sql, values = []) {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'diego',
        password: '84990999',
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

// ROLES
app.get('/roles', isAuthenticated, RoleController.getAllRoles);
app.get('/roles/new', isAuthenticated, RoleController.showNewRoleForm);
app.post('/roles', isAuthenticated, RoleController.createRole);
app.delete('/roles/:id', isAuthenticated, RoleController.deleteRole);
app.get('/roles/:id/edit', isAuthenticated, RoleController.showEditRoleForm);
app.post('/roles/:id', isAuthenticated, RoleController.updateRole);
app.get('/roles', isAuthenticated, RoleController.getAllRoles);
// ROLES
// USERS
app.get('/users', isAuthenticated, userController.getAllUsers);
app.get('/users/new', isAuthenticated, userController.showNewUserForm);
app.post('/users', userController.createUser);
app.delete('/users/:id', isAuthenticated, userController.deleteUser);
app.get('/users/:id/edit', isAuthenticated, userController.showEditUserForm);
app.post('/users/:id', userController.updateUser);
// USERS
// CATEGORIES
app.get('/categories', isAuthenticated, CategoriesController.getAllCategories);
app.get('/categories/new', isAuthenticated, CategoriesController.showNewCategoryForm);
app.post('/categories', isAuthenticated, CategoriesController.createCategory);
app.delete('/categories/:id', isAuthenticated, CategoriesController.deleteCategory);
app.get('/categories/:id/edit', isAuthenticated, CategoriesController.showEditCategoryForm);
app.post('/categories/:id', isAuthenticated, CategoriesController.updateCategory);
// CATEGORIES
// VENDORS
app.get('/vendors', isAuthenticated, VendorsController.getAllVendors);
app.delete('/vendors/:id', VendorsController.deleteVendor);
app.get('/vendors/:id/edit', isAuthenticated, VendorsController.showEditVendorForm);
app.post('/vendors/:id', isAuthenticated, VendorsController.updateVendor);


// VENDORS
app.get('/dashboard', isAuthenticated, async (req, res) => {
    res.render('dashboard/index', { pageTitle: 'Painel',username: req.user.username, userRole: req.user.roles_id });

});

// PRODUCTS
app.get('/products', isAuthenticated, productController.getAllProducts);
app.post('/products', Images, productController.createProduct);
app.get('/products/new', isAuthenticated, productController.showNewProductForm);
app.delete('/products/:id', productController.deleteProduct);
app.get('/products/:id/edit', productController.showEditProductForm);
app.post('/uploads/:filename', productController.deleteImage);
app.post('/products/:id', upload.any(), productController.updateProduct);
// PRODUCTS

// PRODUTO
app.get('/produto/:sku', productController.getProductBySKU);
// PRODUTO

app.listen(PORT, () => {
    console.log(`O servidor está em execução http://localhost:${PORT}`);
});

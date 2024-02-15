const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const mysql = require('mysql2/promise');
const flash = require('express-flash');
const session = require('express-session');

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

// HOME
app.get('/', (req, res) => {
    // Renderiza o arquivo login.ejs
    res.render('home', { pageTitle: 'Home', message: req.flash('error') });
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
                '/categories',
                '/categories/new',
                '/categories/:id/edit',
                '/roles',
                '/roles/new',
                '/roles/:id/edit',
                '/users',
                '/users/new',
                '/users/:id/edit'
                // Adicione outras rotas permitidas para o administrador conforme necessário
            ];
        case 6: // Role de usuário normal
            return [
                '/dashboard',
                '/products',
                '/products/new',
                '/products/:id/edit'
                // Adicione outras rotas permitidas para o usuário normal conforme necessário
            ];
        default:
            return [];
    }
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


app.get('/dashboard', async (req, res) => {
    res.render('dashboard/index', { pageTitle: 'Painel',username: req.user.username, userRole: req.user.roles_id });

});

// PRODUCTS
app.get('/products', isAuthenticated, async (req, res) => {
    try {
        const products = await executeQuery('SELECT products.id, products.sku, products.name, products.price,  products.quantity, categories_products.name AS category_name FROM products INNER JOIN categories_products ON products.categories_products_id = categories_products.id');
        const successMessage = req.flash('success'); 
        res.render('products/index', { pageTitle: 'Produtos', products, successMessage, username: req.user.username, userRole: req.user.roles_id });

    } catch (error) {
        res.status(500).send('Erro ao buscar produtos');
    }
});


app.get('/products/new', isAuthenticated, async (req, res) => {
    try {
        // Consulta SQL para obter todas as categorias principais (id_categories_products = 0)
        const parentCategoriesQuery = `SELECT * FROM categories_products WHERE id_categories_products = 0;`;
        const parentCategories = await executeQuery(parentCategoriesQuery);

        // Consulta SQL para obter todas as categorias
        const categoriesQuery = `SELECT * FROM categories_products;`;
        const categories = await executeQuery(categoriesQuery);

        // Construindo a estrutura de árvore de categorias
        const buildCategoryTree = (parentCategories, categories) => {
            return parentCategories.map(parent => {
                const children = categories.filter(child => child.id_categories_products === parent.id);
                return {
                    id: parent.id,
                    name: parent.name,
                    children: buildCategoryTree(children, categories)
                };
            });
        };

        // Construindo o JSON da árvore de categorias
        const categoryTree = buildCategoryTree(parentCategories, categories);
        // Renderiza a página com as categorias
        res.render('products/new', { 
            pageTitle: 'Inserir Produto', 
            categoryTree: categoryTree, 
            username: req.user.username,
            userRole: req.user.roles_id
        });
    } catch (error) {
        res.status(500).send('Erro ao carregar categorias para criar um novo produto');
    }
});


var Images = upload.any();

app.post('/products', Images, async (req, res) => { 
    try {
        // Verificar se algum arquivo foi enviado
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).send('Nenhum arquivo foi enviado.');
        }

        // Extrair os dados do produto do corpo da requisição
        const { code, name, price, categorias, quantity } = req.body;
        const userId = req.session.passport.user;

        // Verificar se o usuário está autenticado
        if (!userId) {
            return res.status(401).send('Usuário não autenticado');
        }


        let result;
        try {
            result = await executeQuery('INSERT INTO products (sku, name, price, users_id, quantity, categories_products_id) VALUES (?, ?, ?, ?, ?, ?)', [code, name, price, userId, quantity, categorias]);

            // Obter o host e a porta do servidor Express
            const serverHost = req.get('host');
            const serverPath = `${req.protocol}://${serverHost}`;

            // Processar os arquivos enviados e inserir na tabela de imagens
            req.files.forEach(async file => {
                const name = file.filename;
                const path = `${serverPath}/uploads/${file.filename}`;
                const type = file.fieldname;
                await executeQuery('INSERT INTO images (name, path, type, products_id) VALUES (?, ?, ?, ?)', [name, path, type, result.insertId]);
            });

        } catch (error) {
            console.error('Erro ao inserir produto:', error);
            res.status(500).send('Erro ao inserir produto.');
        } 

        req.flash('success', 'Produto cadastrado com sucesso!');
        res.redirect('/products');
    } catch (error) {
        console.error('Erro ao processar arquivos ou inserir produto:', error);
        res.status(500).send('Erro ao processar arquivos ou inserir produto.');
    }
});


const path = require('path');
const fs = require('fs');

app.delete('/products/:id', isAuthenticated, async (req, res) => {
    const productId = req.params.id;
    try {
        // Obter todas as imagens associadas ao produto
        const images = await executeQuery('SELECT * FROM images WHERE products_id = ?', [productId]);

        // Excluir cada imagem associada ao produto
        for (const image of images) {
            await executeQuery('DELETE FROM images WHERE id = ?', [image.id]);
            // Remova os arquivos de imagem do sistema de arquivos, se necessário
            const filePath = path.join(__dirname, 'uploads', image.name);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`${image.name} excluído com sucesso.`);
                } else {
                    console.error(`${image.name} não encontrado.`);
                }
            } catch (err) {
                console.error(`Erro ao excluir ${image.name}:`, err);
            }
        }

        // Excluir o produto
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
        const categories = await executeQuery('SELECT * FROM categories_products'); // Busca todas as categorias

        const parentCategoriesQuery = `SELECT * FROM categories_products WHERE id_categories_products = 0;`;
        const parentCategories = await executeQuery(parentCategoriesQuery);

        const categoriesQuery = `SELECT * FROM categories_products;`;
        const allCategories = await executeQuery(categoriesQuery);

        const buildCategoryTree = (parentCategories, categories) => {
            return parentCategories.map(parent => {
                const children = categories.filter(child => child.id_categories_products === parent.id);
                return {
                    id: parent.id,
                    name: parent.name,
                    children: buildCategoryTree(children, categories)
                };
            });
        };

        const categoryTree = buildCategoryTree(parentCategories, allCategories);

        // Consulta para obter a imagem destacada (featured_image) do produto
        const featuredImageQuery = 'SELECT * FROM images WHERE products_id = ? AND type = "featured_image"';
        const [featuredImage] = await executeQuery(featuredImageQuery, [productId]);

        // Consulta para obter as imagens da galeria (gallery_images) do produto
        const galleryImagesQuery = 'SELECT * FROM images WHERE products_id = ? AND type = "gallery_images[]"';
        const galleryImages = await executeQuery(galleryImagesQuery, [productId]);
        const galleryImagePaths = galleryImages.map(image => image.path);

        const galleryImageConfig = galleryImages.map(image => {
            return {
                caption: image.name,
                url: image.path,
                key: image.id,
                tipo: image.type,
                products_id: image.products_id,
                
            };
        });

        res.render('products/edit', { 
            pageTitle: 'Editar Produto', 
            product, 
            featuredImage,
            galleryImagePaths: JSON.stringify(galleryImagePaths), // Convertendo para uma string JSON
            galleryImageConfig: JSON.stringify(galleryImageConfig), // Convertendo para uma string JSON
            categories, 
            categoryTree, 
            username: req.user.username,
            userRole: req.user.roles_id
        });
    } catch (error) {
        res.status(500).send('Erro ao buscar produto para edição');
    }
});

// BOTÃO DA IMAGEM PARA EXCLUIR
app.post('/uploads/:filename', async (req, res) => {
    const filename = req.params.filename;
    try {
        // Buscar a imagem no banco de dados
        const [image] = await executeQuery('SELECT * FROM images WHERE name = ?', [filename]);

        // Verificar se a imagem existe
        if (!image) {
            return res.status(404).json({ error: 'Imagem não encontrada' });
        }

        // Excluir a imagem do banco de dados
        await executeQuery('DELETE FROM images WHERE name = ?', [filename]);

        // Remover o arquivo de imagem do sistema de arquivos
        const imagePath = path.join(__dirname, 'uploads', image.name);
        fs.unlinkSync(imagePath);

        // Enviar uma resposta de sucesso ao cliente
        res.status(200).json({ message: 'Imagem excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir imagem:', error);
        res.status(500).json({ error: 'Erro ao excluir imagem' });
    }
});

// app.post('/uploads', upload.single('gallery_images[]'), async (req, res) => {

// // console.log(productId)
//     const body = req.body; // Acessando o arquivo enviado
//     console.log(body)

    
//           // Obter o host e a porta do servidor Express
//         //   const serverHost = req.get('host');
//         //   const serverPath = `${req.protocol}://${serverHost}`;

//           // Processar os arquivos enviados e inserir na tabela de imagens
    
        

//             //   const [image] = await executeQuery('SELECT * FROM images WHERE name = ?', [name]);
// // console.log(image);
//             //   try {

//             // console.log(image)
//             //   const path = `${serverPath}/uploads/${file.filename}`;
//             //   const type = file.fieldname;
//             // await executeQuery('INSERT INTO images (name, path, type, products_id) VALUES (?, ?, ?, ?)', [name, path, type, image.products_id]);
//             //   } catch {

                
//             //   }
 
//     res.status(200).json({ message: 'Upload bem-sucedido.'});

//     // Faça algo com fileId
// });
// BOTÃO DA IMAGEM PARA EXCLUIR

app.post('/products/:id', Images, async (req, res) => {

    const productId = req.params.id;
    const { name, price, categorias, quantity } = req.body;

    try {
        // Atualiza o nome e o preço do produto
        await executeQuery('UPDATE products SET name = ?, price = ?, quantity = ? WHERE id = ?', [name, price, quantity, productId]);

        // Verifica se a categoria selecionada é válida
        const categoryExists = await executeQuery('SELECT id FROM categories_products WHERE id = ?', [categorias]);
        if (categoryExists.length === 0) {
            return res.status(400).send('Categoria inválida');
        }

        // Atualiza a categoria do produto
        await executeQuery('UPDATE products SET categories_products_id = ? WHERE id = ?', [categorias, productId]);

        // Obter o host e a porta do servidor Express
        const serverHost = req.get('host');
        const serverPath = `${req.protocol}://${serverHost}`;

        // Processar os arquivos enviados e inserir na tabela de imagens
        req.files.forEach(async file => {
            const name = file.filename;
            const path = `${serverPath}/uploads/${file.filename}`;
            const type = file.fieldname;
            await executeQuery('INSERT INTO images (name, path, type, products_id) VALUES (?, ?, ?, ?)', [name, path, type, productId]);
        });

        req.flash('success', 'Produto atualizado com sucesso!');
        res.redirect('/products');
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).send('Erro ao atualizar produto');
    }
});

// PRODUCTS

// ROLES
app.get('/roles', isAuthenticated, async (req, res) => {
    try {
        const roles = await executeQuery('SELECT * FROM roles');
        const successMessage = req.flash('success'); 
        res.render('roles/index', { pageTitle: 'Roles', roles, successMessage, username: req.user.username, userRole: req.user.roles_id });

    } catch (error) {
        res.status(500).send('Erro ao buscar roles');
    }
});

app.get('/roles/new', isAuthenticated, (req, res) => {
    res.render('roles/new', { pageTitle: 'Inserir Role' , username: req.user.username, userRole: req.user.roles_id });
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
        res.render('roles/edit', { pageTitle: 'Editar Role', role, errors: '', username: req.user.username, userRole: req.user.roles_id });
    } catch (error) {
        res.status(500).send('Erro ao buscar role para edição');
    }
});

app.post('/roles/:id', async (req, res) => {
    const roleId = req.params.id;
    const [role] = await executeQuery('SELECT * FROM roles WHERE id = ?', [roleId]);
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
        res.render('categories/index', { pageTitle: 'Categorias', categories, successMessage, username: req.user.username, userRole: req.user.roles_id });

    } catch (error) {
        res.status(500).send('Erro ao buscar categorias');
    }
});

app.get('/categories/new', isAuthenticated, async(req, res) => {
    const categories = await executeQuery('SELECT * FROM categories_products');

    res.render('categories/new', { pageTitle: 'Inserir Categoria' , categories, username: req.user.username, userRole: req.user.roles_id });
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

        res.render('categories/edit', { pageTitle: 'Editar Categoria', category, categories, username: req.user.username, userRole: req.user.roles_id });
    } 
    
    catch (error) {
        res.status(500).send('Erro ao buscar categoria para edição');
    }
});

app.post('/categories/:id', async (req, res) => {
    const categoryId = req.params.id;

    const { name, description, id_categories_products} = req.body;
    try {
        await executeQuery('UPDATE categories_products SET name = ?, description = ?, id_categories_products = ? WHERE id = ?', [name, description,id_categories_products,categoryId]);
        req.flash('success', 'Categoria atualizada com sucesso!');
        res.redirect('/categories');
    } catch (error) {
        res.status(500).send('Erro ao atualizar a categoria');
    }
});
// CATEGORIES

// USERS
app.get('/users', isAuthenticated, async (req, res) => {
    try {
        const users = await executeQuery('SELECT users.*, roles.name AS role_name FROM users INNER JOIN roles ON users.roles_id = roles.id');
        const successMessage = req.flash('success'); 
        res.render('users/index', { pageTitle: 'Usuários', users, successMessage, username: req.user.username, userRole: req.user.roles_id });

    } catch (error) {
        res.status(500).send('Erro ao buscar usuários');
    }
});

app.get('/users/new', isAuthenticated, async (req, res) => {
    const roles = await executeQuery('SELECT * FROM roles');
    res.render('users/new', { pageTitle: 'Inserir Usuário' , roles, username: req.user.username, userRole: req.user.roles_id });
});

app.post('/users', async (req, res) => {
    const { name, username, role, password } = req.body;
    const userId = req.session.passport.user; 

    if (!userId) {
        return res.status(401).send('Usuário não autenticado');
    }

    try {
        await executeQuery('INSERT INTO users (name, username, roles_id, password) VALUES (?, ?, ?, ?)', [name, username, role, password]);
        req.flash('success', 'Usuário cadastrado com sucesso!');
        res.redirect('/users');
    } catch (error) {
        console.error('Erro ao cadastrar o Usuário:', error);
        res.status(500).send('Erro ao cadastrar o Usuário');
    }
});

app.delete('/users/:id', isAuthenticated, async (req, res) => {
    const userId = req.params.id;
    try {
        await executeQuery('DELETE FROM users WHERE id = ?', [userId]);
        res.status(200).json({ message: 'Usuário excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir o Usuário:', error);
        res.status(500).json({ error: 'Erro ao excluir o Usuário' });
    }
});

app.get('/users/:id/edit', isAuthenticated, async (req, res) => {
    const userId = req.params.id;
    try {
        const [user] = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
        const [role] = await executeQuery('SELECT * FROM roles WHERE id = ?', [user.roles_id]);
        const roles = await executeQuery('SELECT * FROM roles');
        res.render('users/edit', { pageTitle: 'Editar Usuário', user, role, roles, username: req.user.username, userRole: req.user.roles_id });
    } catch (error) {
        res.status(500).send('Erro ao buscar usuário para edição');
    }
});

app.post('/users/:id', async (req, res) => {
    const userId = req.params.id;

    const { username, password, name, role } = req.body;
    try {
        await executeQuery('UPDATE users SET username = ?, password = ?, name = ? , roles_id = ? WHERE id = ?', [username, password, name, role, userId]);
        req.flash('success', 'Usuário atualizada com sucesso!');
        res.redirect('/users');
    } catch (error) {
        res.status(500).send('Erro ao atualizar a Usuário');
    }
});
// USERS

app.listen(PORT, () => {
    console.log(`O servidor está em execução http://localhost:${PORT}`);
});

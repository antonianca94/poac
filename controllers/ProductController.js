const { executeQuery } = require('../db');

const path = require('path');
const sharp = require('sharp');
const fs_promisses = require('fs').promises; // Importar o módulo fs com Promises
const fs = require('fs'); // Importar o módulo fs com Promises

const getAllProducts = async (req, res) => {
    try {
        let products;
        const userId = req.session.passport.user; // Obtém o ID do usuário autenticado

        if (req.user.roles_id === 1) { // Se o usuário for um administrador
            // Busca todos os produtos
            products = await executeQuery('SELECT products.id, products.sku, products.name, products.price, products.quantity, categories_products.name AS category_name FROM products INNER JOIN categories_products ON products.categories_products_id = categories_products.id');
        } else {
            // Busca apenas os produtos do usuário normal
            products = await executeQuery('SELECT products.id, products.sku, products.name, products.price, products.quantity, categories_products.name AS category_name FROM products INNER JOIN categories_products ON products.categories_products_id = categories_products.id WHERE products.users_id = ?', [userId]);
        }

        const successMessage = req.flash('success');
        res.render('products/index', { pageTitle: 'Produtos', products, successMessage, username: req.user.username, userRole: req.user.roles_id });

    } catch (error) {
        res.status(500).send('Erro ao buscar produtos');
    }
};


function generateRandomCode(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const createProduct = async (req, res) => {
    try {
        // Verificar se algum arquivo foi enviado
        if (!req.files || req.files.length === 0) {
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
            await Promise.all(req.files.map(async file => {
                // Converter a imagem para WebP
                const webpBuffer = await sharp(file.buffer).toFormat('webp').toBuffer();

                // Salvar a imagem no servidor com a extensão WebP
                const filename = `${generateRandomCode(12)}.webp`;
                const filepath = path.join(__dirname, '..', 'uploads', filename);
                await fs_promisses.writeFile(filepath, webpBuffer);

                // Inserir o caminho da imagem convertida na tabela de imagens
                const imagePath = `${serverPath}/uploads/${filename}`;
                await executeQuery('INSERT INTO images (name, path, type, products_id) VALUES (?, ?, ?, ?)', [filename, imagePath, file.fieldname, result.insertId]);
            }));

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
};

const showNewProductForm = async (req, res) => {
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
};

const deleteProduct = async (req, res) => {
    const productId = req.params.id;
    try {
        // Obter todas as imagens associadas ao produto
        const images = await executeQuery('SELECT * FROM images WHERE products_id = ?', [productId]);

        // Excluir cada imagem associada ao produto
        for (const image of images) {
            await executeQuery('DELETE FROM images WHERE id = ?', [image.id]);
            // Remova os arquivos de imagem do sistema de arquivos, se necessário
            const filePath = path.join(__dirname, '..', 'uploads', image.name);
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
};

const showEditProductForm = async (req, res) => {
    const productId = req.params.id;
    try {
        // Obtenha o produto com base no ID
        const [product] = await executeQuery('SELECT * FROM products WHERE id = ?', [productId]);

        // Obtenha todas as categorias
        const categories = await executeQuery('SELECT * FROM categories_products');

        // Construa a árvore de categorias
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
            galleryImagePaths: JSON.stringify(galleryImagePaths), 
            galleryImageConfig: JSON.stringify(galleryImageConfig), 
            categories, 
            categoryTree, 
            username: req.user.username,
            userRole: req.user.roles_id
        });
    } catch (error) {
        res.status(500).send('Erro ao buscar produto para edição');
    }
};

const deleteImage = async (req, res) => {
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
        const imagePath = path.join(__dirname, '..', 'uploads', image.name);
        try {
            fs.unlinkSync(imagePath);
            console.log(`Imagem ${filename} excluída com sucesso`);
        } catch (error) {
            console.error('Erro ao excluir imagem:', error);
            return res.status(500).json({ error: 'Erro ao excluir imagem' });
        }

        // Enviar uma resposta de sucesso ao cliente
        res.status(200).json({ message: 'Imagem excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir imagem:', error);
        res.status(500).json({ error: 'Erro ao excluir imagem' });
    }
};


const updateProduct = async (req, res) => {
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
        await Promise.all(req.files.map(async file => {
            // Converter a imagem para WebP
            const webpBuffer = await sharp(file.buffer).toFormat('webp').toBuffer();

            // Salvar a imagem no servidor com a extensão WebP
            const filename = `${generateRandomCode(12)}.webp`;
            const filepath = path.join(__dirname, '..', 'uploads', filename);
            await fs.promises.writeFile(filepath, webpBuffer);

            // Inserir o caminho da imagem convertida na tabela de imagens
            const imagePath = `${serverPath}/uploads/${filename}`;
            await executeQuery('INSERT INTO images (name, path, type, products_id) VALUES (?, ?, ?, ?)', [filename, imagePath, file.fieldname, productId]);
        }));

        req.flash('success', 'Produto atualizado com sucesso!');
        res.redirect('/products');
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).send('Erro ao atualizar produto');
    }
};


const getProductBySKU = async (req, res) => {
    const sku = req.params.sku; // Obter o SKU da URL
    const user = req.user; // Obter o usuário autenticado, se estiver disponível

    try {
        // Consulta para obter as informações do produto pelo SKU
        const product = await executeQuery('SELECT * FROM products WHERE sku = ?', [sku]);

        // Verificar se o produto foi encontrado
        if (product.length === 0) {
            return res.status(404).send('Produto não encontrado');
        }

        // Consulta para obter todas as imagens relacionadas ao produto
        const images = await executeQuery('SELECT * FROM images WHERE products_id = ?', [product[0].id]);
        const vendor = await executeQuery('SELECT * FROM vendors WHERE users_id = ?', [product[0].users_id]);
        res.render('site/product/index', { 
            pageTitle: 'Produto', 
            product,
            images,
            vendor,
            user
        });
    } catch (error) {
        console.error('Erro ao buscar produto por SKU:', error);
        res.status(500).send('Erro ao buscar produto por SKU');
    }
};


// Exportando as funções do controller para serem usadas em outros lugares
module.exports = {
    getAllProducts,
    createProduct,
    showNewProductForm,
    deleteProduct,
    showEditProductForm,
    deleteImage,
    updateProduct,
    getProductBySKU 
};

const { executeQuery } = require('../db');

const generateRandomCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 9; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
};

// Adicionar um item ao carrinho
const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user.id;

        // Verificar se o usuário está autenticado
        if (!userId) {
            return res.status(401).send('Usuário não autenticado');
        }

        // console.log(`PRODUTO: ${productId}, QUANTIDADE: ${quantity}, USUÁRIO: ${userId}`);

        // Verificar se o produto existe e está disponível em estoque
        const productQuery = 'SELECT * FROM products WHERE id = ? AND quantity >= ?';
        const product = await executeQuery(productQuery, [productId, parseInt(quantity)]);

        if (product.length === 0) {
            return res.status(404).send('Produto não encontrado ou não disponível em estoque');
        }

        // Verificar se o usuário já possui um carrinho de compras
        const cartQuery = 'SELECT * FROM shopping_cart WHERE users_id = ?';
        let shoppingCart = await executeQuery(cartQuery, [userId]);

        if (shoppingCart.length === 0) {
            const cartCode = generateRandomCode();

            // Se o usuário não tiver um carrinho, crie um novo
            const insertCartQuery = 'INSERT INTO shopping_cart (code, created_at, users_id) VALUES (?, NOW(), ?)';
            const result = await executeQuery(insertCartQuery, [cartCode, userId]);
            shoppingCart = [{ id: result.insertId, code: cartCode }];
        }

        // Verificar se o produto já está no carrinho
        const cartItemQuery = 'SELECT * FROM cart_items WHERE shopping_cart_id = ? AND products_id = ?';
        const cartItem = await executeQuery(cartItemQuery, [shoppingCart[0].id, productId]);
        // console.log('PRODUTO_CARRINHO:', cartItem);

        if (cartItem.length === 0) {
            // Se o produto não estiver no carrinho, adicione-o
            const insertItemQuery = 'INSERT INTO cart_items (quantity, shopping_cart_id, products_id) VALUES (?, ?, ?)';
            if (parseInt(quantity) > parseInt(product[0].quantity)) {
                return res.status(400).send('Quantidade solicitada excede a quantidade disponível em estoque');
            }
            await executeQuery(insertItemQuery, [parseInt(quantity), shoppingCart[0].id, productId]);
            // console.log('PRODUTO INSERIDO NO CARRINHO');
        } else {
            // Se o produto já estiver no carrinho, atualize a quantidade
            const newQuantity = parseInt(cartItem[0].quantity) + parseInt(quantity);
            if (newQuantity > parseInt(product[0].quantity)) {
                return res.status(400).send('Quantidade total solicitada excede a quantidade disponível em estoque');
            }
            const updateItemQuery = 'UPDATE cart_items SET quantity = ? WHERE id = ?';
            await executeQuery(updateItemQuery, [newQuantity, cartItem[0].id]);
            // console.log('QUANTIDADE DO PRODUTO ATUALIZADA ' +newQuantity);
        }

        res.status(200).send('Item adicionado ao carrinho com sucesso!');

    } catch (error) {
        console.error('Erro ao adicionar item ao carrinho:', error);
        res.status(500).send('Erro interno do servidor');
    }
};


// Remover um item do carrinho
const removeFromCart = async (req, res) => {
    try {
        const { itemId } = req.params;

        // Remover o item do carrinho
        await executeQuery('DELETE FROM cart_items WHERE id = ?', [itemId]);

        res.status(200).send('Item removido do carrinho com sucesso!');
    } catch (error) {
        console.error('Erro ao remover item do carrinho:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

const getCart = async (req, res) => {
    const user = req.user; // Obter o usuário autenticado, se estiver disponível
    try {
        const userId = req.user.id;

        // Buscar o carrinho no banco de dados usando o código fornecido
        const cart = await executeQuery('SELECT * FROM shopping_cart WHERE users_id = ?', [userId]);

        // Verificar se o carrinho foi encontrado
        if (cart.length === 0) {
            return res.status(404).send('Carrinho não encontrado');
        }

        const cartItemsQuery = `
        SELECT 
            ci.*, 
            p.name AS productName, 
            p.price AS productPrice, 
            p.sku AS Sku, 
            i.path AS imagePath
        FROM 
            cart_items ci
        INNER JOIN 
            products p ON ci.products_id = p.id
        INNER JOIN 
            images i ON p.id = i.products_id
        WHERE 
            ci.shopping_cart_id = ? 
            AND i.type = 'featured_image'
        `;

        // Buscar os itens do carrinho
        const cartItems = await executeQuery(cartItemsQuery, [cart[0].id]);

        // Calcular o total do carrinho
        let cartTotal = 0;

        // Para cada item no carrinho, obter os detalhes do produto associado
        for (const item of cartItems) {
            // Consulta SQL para obter os detalhes do produto
            const productQuery = 'SELECT name, price FROM products WHERE id = ?';
            const product = await executeQuery(productQuery, [item.products_id]);
            item.productName = product.length > 0 ? product[0].name : 'Produto não encontrado'; // Adiciona o nome do produto ao item do carrinho
            item.productPrice = product.length > 0 ? parseFloat(product[0].price) : 0; // Adiciona o preço do produto ao item do carrinho
            item.totalPrice = item.productPrice * item.quantity;

            // Formatar os valores monetários para o formato brasileiro (Real)
            item.productPriceFormatted = item.productPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            item.totalPriceFormatted = item.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            // Somar ao total do carrinho
            cartTotal += item.totalPrice;
        }

        // Formatar o total do carrinho para o formato brasileiro (Real)
        const cartTotalFormatted = cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        res.render('site/cart/index', { 
            pageTitle: 'Carrinho', 
            cart: cart[0], // Passa o carrinho como contexto para o template
            cartItems: cartItems,
            cartTotalFormatted: cartTotalFormatted,
            user
        });

    } catch (error) {
        console.error('Erro ao buscar carrinho:', error);
        res.status(500).send('Erro interno do servidor');
    }
};



const calculateCartTotal = async (cartId) => {
    const cartItems = await executeQuery('SELECT ci.quantity, p.price FROM cart_items ci INNER JOIN products p ON ci.products_id = p.id WHERE ci.shopping_cart_id = ?', [cartId]);
    let cartTotal = 0;
    cartItems.forEach(item => {
        cartTotal += item.quantity * item.price;
    });
    return cartTotal;
};

const incrementCartItem = async (req, res) => {
    try {
        const { itemId } = req.body;

        const cartItemQuery = 'SELECT * FROM cart_items WHERE id = ?';
        const cartItem = await executeQuery(cartItemQuery, [itemId]);

        if (cartItem.length === 0) {
            return res.status(404).send('Item não encontrado no carrinho');
        }

        const productQuery = 'SELECT * FROM products WHERE id = ?';
        const product = await executeQuery(productQuery, [cartItem[0].products_id]);

        if (cartItem[0].quantity + 1 > product[0].quantity) {
            return res.status(400).send('Quantidade solicitada excede a quantidade disponível em estoque');
        }

        const newQuantity = cartItem[0].quantity + 1;
        const updateItemQuery = 'UPDATE cart_items SET quantity = ? WHERE id = ?';
        await executeQuery(updateItemQuery, [newQuantity, itemId]);

        const newTotalPrice = newQuantity * product[0].price;
        const cartTotal = await calculateCartTotal(cartItem[0].shopping_cart_id);

        res.send({
            newQuantity,
            newTotalPriceFormatted: newTotalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            cartTotalFormatted: cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        });
    } catch (error) {
        console.error('Erro ao incrementar item no carrinho:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

const decrementCartItem = async (req, res) => {
    try {
        const { itemId } = req.body;

        const cartItemQuery = 'SELECT * FROM cart_items WHERE id = ?';
        const cartItem = await executeQuery(cartItemQuery, [itemId]);

        if (cartItem.length === 0) {
            return res.status(404).send('Item não encontrado no carrinho');
        }

        if (cartItem[0].quantity - 1 < 1) {
            return res.status(400).send('A quantidade mínima é 1');
        }

        const newQuantity = cartItem[0].quantity - 1;
        const updateItemQuery = 'UPDATE cart_items SET quantity = ? WHERE id = ?';
        await executeQuery(updateItemQuery, [newQuantity, itemId]);

        const productQuery = 'SELECT * FROM products WHERE id = ?';
        const product = await executeQuery(productQuery, [cartItem[0].products_id]);

        const newTotalPrice = newQuantity * product[0].price;
        const cartTotal = await calculateCartTotal(cartItem[0].shopping_cart_id);

        res.send({
            newQuantity,
            newTotalPriceFormatted: newTotalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            cartTotalFormatted: cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        });
    } catch (error) {
        console.error('Erro ao decrementar item no carrinho:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

module.exports = {
    addToCart,
    removeFromCart,
    getCart,
    incrementCartItem,
    decrementCartItem,
    calculateCartTotal
};

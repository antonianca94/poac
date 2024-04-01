const { executeQuery } = require('../db');

// Adicionar um item ao carrinho
const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.passport.user;

        // Verificar se o usuário está autenticado
        if (!userId) {
            return res.status(401).send('Usuário não autenticado');
        }

        // Verificar se o produto existe e está disponível em estoque
        const product = await executeQuery('SELECT * FROM products WHERE id = ? AND quantity >= ?', [productId, quantity]);
        if (product.length === 0) {
            return res.status(404).send('Produto não encontrado ou não disponível em estoque');
        }

        // Verificar se o usuário já possui um carrinho de compras
        let shoppingCart = await executeQuery('SELECT * FROM shopping_cart WHERE users_id = ?', [userId]);
        
        if (shoppingCart.length === 0) {
            // Se o usuário não tiver um carrinho, crie um novo
            const result = await executeQuery('INSERT INTO shopping_cart (code, created_at, users_id) VALUES (?, NOW(), ?)', ['CARRINHO', userId]);
            shoppingCart = [{ id: result.insertId }];
        }

        // Verificar se o produto já está no carrinho
        const cartItem = await executeQuery('SELECT * FROM cart_items WHERE shopping_cart_id = ? AND products_id = ?', [shoppingCart[0].id, productId]);

        if (cartItem.length === 0) {
            // Se o produto não estiver no carrinho, adicione-o
            await executeQuery('INSERT INTO cart_items (quantity, shopping_cart_id, products_id) VALUES (?, ?, ?)', [quantity, shoppingCart[0].id, productId]);
        } else {
            // Se o produto já estiver no carrinho, atualize a quantidade
            const newQuantity = parseInt(cartItem[0].quantity) + parseInt(quantity);
            await executeQuery('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQuantity, cartItem[0].id]);
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

// Exibir o carrinho de compras
const viewCart = async (req, res) => {
    try {
        const userId = req.session.passport.user;

        // Obter os itens do carrinho do usuário
        const cartItems = await executeQuery('SELECT * FROM cart_items WHERE shopping_cart_id = ?', [userId]);

        // Recuperar detalhes dos produtos no carrinho
        const cartProducts = [];
        for (const item of cartItems) {
            const product = await executeQuery('SELECT * FROM products WHERE id = ?', [item.products_id]);
            cartProducts.push({
                id: item.id,
                product: product[0],
                quantity: item.quantity
            });
        }

        res.render('cart', { pageTitle: 'Carrinho de Compras', cartProducts });
    } catch (error) {
        console.error('Erro ao exibir carrinho de compras:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

module.exports = {
    addToCart,
    removeFromCart,
    viewCart
};

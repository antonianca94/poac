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
            const cartCode = generateRandomCode();

            // Se o usuário não tiver um carrinho, crie um novo
            const result = await executeQuery('INSERT INTO shopping_cart (code, created_at, users_id) VALUES (?, NOW(), ?)', [cartCode, userId]);
            shoppingCart = [{ id: result.insertId, code: cartCode }];
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

const getCartByCode = async (req, res) => {
    try {
        const cartCode = req.params.code;

        // Buscar o carrinho no banco de dados usando o código fornecido
        const cart = await executeQuery('SELECT * FROM shopping_cart WHERE code = ?', [cartCode]);

        // Verificar se o carrinho foi encontrado
        if (cart.length === 0) {
            return res.status(404).send('Carrinho não encontrado');
        }

        // Buscar os itens do carrinho
        const cartItems = await executeQuery('SELECT * FROM cart_items WHERE shopping_cart_id = ?', [cart[0].id]);

        // Retorna o carrinho e seus itens como resposta
        res.status(200).json({ cart, cartItems });
    } catch (error) {
        console.error('Erro ao buscar carrinho:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

module.exports = {
    addToCart,
    removeFromCart,
    getCartByCode
};
